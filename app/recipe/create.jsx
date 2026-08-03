import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert, FlatList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { KeyboardFormLayout } from '../../components/ui/KeyboardFormLayout';
import { WizardProgress } from '../../components/food-cost/WizardProgress';
import { useRecipes } from '../../hooks/useRecipes';
import { useIngredients } from '../../hooks/useIngredients';
import { useRecipeCost } from '../../hooks/useRecipeCost';
import useRecipeStore from '../../stores/recipeStore';
import useSettingsStore from '../../stores/settingsStore';
import { formatCurrency, formatFoodCostPercent } from '../../utils/format';
import { formatSellingFormatName, labelPerSellingUnit } from '../../utils/sellingFormat';
import { getIngredientUsageSummary } from '../../utils/unitDisplay';
import { calculateSellingFormatMetrics } from '../../lib/calculations';
import {
  clearFoodCostDraft,
  isMeaningfulDraft,
  loadFoodCostDraft,
  saveFoodCostDraft,
} from '../../lib/foodCostDraft';
import { trackFoodCost } from '../../lib/foodCostAnalytics';
import {
  consumePendingAddToDishIngredientIds,
} from '../../lib/pendingRecipeIngredients';
import { useUnitSystem } from '../../hooks/useUnitSystem';
import useIngredientStore from '../../stores/ingredientStore';
import { formatUnitLabel, RECIPE_CATEGORIES } from '../../constants/units';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

const HOW_MUCH_TITLE = 'How much do you use in this recipe?';

function howMuchTitle(ingredientName) {
  const name = ingredientName?.trim();
  if (!name) return HOW_MUCH_TITLE;
  return `How much ${name} do you use in this recipe?`;
}

let _fmtId = 0;
function newFmtId() { return ++_fmtId; }

export default function CreateRecipeScreen() {
  const router = useRouter();
  const { fresh } = useLocalSearchParams();
  const startFresh = fresh === '1';
  const { createRecipe } = useRecipes();
  const { ingredients } = useIngredients();
  const { sellingUnits } = useRecipeStore();
  const settings = useSettingsStore((s) => s.settings);
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();
  const { getCompatibleUnits } = useUnitSystem();

  const [step, setStep] = useState(1);

  const sellingUnitOptions = sellingUnits.length > 0
    ? sellingUnits.map((u) => ({ value: u.name, label: u.label ?? u.name }))
    : [{ value: 'piece', label: 'piece' }, { value: 'slice', label: 'slice' }, { value: 'pack', label: 'pack' }, { value: 'box', label: 'box' }];

  const scrollRef = useRef(null);

  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [sellingFormats, setSellingFormats] = useState([]);
  const [ingredientError, setIngredientError] = useState(false);
  const [sellingFormatError, setSellingFormatError] = useState(false);

  const [showCatPicker, setShowCatPicker] = useState(false);

  const [showIngSheet, setShowIngSheet] = useState(false);
  const [ingSearch, setIngSearch] = useState('');
  const [ingSheetStep, setIngSheetStep] = useState('search');
  const [ingSheetIngredient, setIngSheetIngredient] = useState(null);
  const [ingSheetQty, setIngSheetQty] = useState('');
  const [ingSheetUnit, setIngSheetUnit] = useState('');
  const [ingQtyError, setIngQtyError] = useState('');
  const [editingIngId, setEditingIngId] = useState(null);
  /** Remaining ingredient IDs to configure after saving new ones from library */
  const [addToDishQueue, setAddToDishQueue] = useState([]);
  const reopenIngredientPickerRef = useRef(false);
  const addToDishQueueRef = useRef([]);
  const recipeIngredientsRef = useRef(recipeIngredients);

  const [showFmtSheet, setShowFmtSheet] = useState(false);
  const [fmtSheetUnit, setFmtSheetUnit] = useState(sellingUnitOptions[0]?.value ?? 'piece');
  const [fmtSheetQty, setFmtSheetQty] = useState('1');
  const [fmtSheetPrice, setFmtSheetPrice] = useState('');
  const [fmtPriceError, setFmtPriceError] = useState('');
  const [editingFmtId, setEditingFmtId] = useState(null);

  const { control, handleSubmit, watch, trigger, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      category: 'other',
      target_food_cost_percent: String(settings.default_food_cost_percent ?? 30),
    },
  });

  const [watchName, watchCategory, watchTarget] = watch(['name', 'category', 'target_food_cost_percent']);
  const targetPct = parseFloat(watchTarget) || 30;
  const categoryLabel = RECIPE_CATEGORIES.find((c) => c.value === watchCategory)?.label ?? 'Other';

  const draftReadyRef = useRef(false);

  const persistDraft = useCallback(async (nextStep = step) => {
    await saveFoodCostDraft({
      step: nextStep,
      dish: {
        name: watchName ?? '',
        category: watchCategory ?? 'other',
        target_food_cost_percent: watchTarget ?? String(settings.default_food_cost_percent ?? 30),
      },
      ingredients: recipeIngredients,
      sellingFormats,
    });
  }, [step, watchName, watchCategory, watchTarget, recipeIngredients, sellingFormats, settings.default_food_cost_percent]);

  // Restore unfinished draft once on mount (unless starting fresh after discard)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (startFresh) {
        await clearFoodCostDraft();
        if (cancelled) return;
        reset({
          name: '',
          category: 'other',
          target_food_cost_percent: String(settings.default_food_cost_percent ?? 30),
        });
        setStep(1);
        setRecipeIngredients([]);
        setSellingFormats([]);
        setIngredientError(false);
        setSellingFormatError(false);
        draftReadyRef.current = true;
        trackFoodCost('step_1', { source: 'fresh' });
        return;
      }
      const draft = await loadFoodCostDraft();
      if (cancelled) return;
      if (isMeaningfulDraft(draft)) {
        reset({
          name: draft.dish?.name ?? '',
          category: draft.dish?.category ?? 'other',
          target_food_cost_percent: draft.dish?.target_food_cost_percent
            ?? String(settings.default_food_cost_percent ?? 30),
        });
        const restoredStep = draft.step >= 1 && draft.step <= 3 ? draft.step : 1;
        setStep(restoredStep);
        setRecipeIngredients(draft.ingredients ?? []);
        setSellingFormats(draft.sellingFormats ?? []);
        trackFoodCost(`step_${restoredStep}`, { source: 'draft' });
      } else {
        trackFoodCost('step_1', { source: 'new' });
      }
      draftReadyRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [startFresh]);

  // Attach live library rows when ingredients finish loading / update
  useEffect(() => {
    if (!draftReadyRef.current) return;
    setRecipeIngredients((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((ri) => {
        const live = ingredients.find((i) => i.id === ri.ingredient_id);
        if (live && live !== ri.ingredient) {
          changed = true;
          return { ...ri, ingredient: live };
        }
        return ri;
      });
      return changed ? next : prev;
    });
  }, [ingredients]);

  // Autosave draft while editing
  useEffect(() => {
    if (!draftReadyRef.current) return undefined;
    const timer = setTimeout(() => {
      persistDraft(step);
    }, 450);
    return () => clearTimeout(timer);
  }, [persistDraft, step]);

  const richIngredients = useMemo(() =>
    recipeIngredients
      .filter((ri) => ri.ingredient)
      .map((ri) => ({ ...ri, quantity: parseFloat(ri.quantity) || 0 })),
    [recipeIngredients]
  );

  const { totalCost } = useRecipeCost({ recipeIngredients: richIngredients });

  const addedIds = useMemo(() => new Set(recipeIngredients.map((r) => r.ingredient_id)), [recipeIngredients]);

  const filteredIngredients = useMemo(() =>
    ingredients.filter(
      (i) => !addedIds.has(i.id) && i.name.toLowerCase().includes(ingSearch.toLowerCase())
    ),
    [ingredients, ingSearch, addedIds]
  );

  const getCompatibleUnitsForIng = (ing) => {
    if (!ing) return [];
    return getCompatibleUnits(ing.purchase_unit);
  };

  const openAddIngSheet = () => {
    setIngSheetStep('search');
    setIngSheetIngredient(null);
    setIngSheetQty('');
    setIngSheetUnit('');
    setIngQtyError('');
    setEditingIngId(null);
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    setIngSearch('');
    setIngredientError(false);
    setShowIngSheet(true);
  };

  const openConfigForIngredient = useCallback((ing) => {
    if (!ing) return;
    setIngSheetIngredient(ing);
    const compatible = getCompatibleUnits(ing.purchase_unit);
    const defaultUnit = compatible.find((u) => u.value === ing.purchase_unit)?.value
      ?? compatible[0]?.value
      ?? ing.purchase_unit;
    setIngSheetUnit(defaultUnit);
    setIngSheetQty('');
    setIngQtyError('');
    setEditingIngId(null);
    setIngSheetStep('config');
    setShowIngSheet(true);
  }, [getCompatibleUnits]);

  const resolveIngredient = useCallback((id) => (
    ingredients.find((i) => i.id === id)
    ?? useIngredientStore.getState().getIngredientById(id)
  ), [ingredients]);

  const startAddToDishQueue = useCallback((ids) => {
    const already = new Set(recipeIngredientsRef.current.map((r) => r.ingredient_id));
    const pending = ids.filter((id) => id && !already.has(id));
    if (pending.length === 0) return;

    addToDishQueueRef.current = pending;
    setAddToDishQueue(pending);

    const openFirst = () => {
      const ing = resolveIngredient(pending[0]);
      if (ing) {
        openConfigForIngredient(ing);
        return true;
      }
      return false;
    };

    if (openFirst()) return;

    // Store may still be settling — brief retries
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (openFirst() || attempts >= 10) clearInterval(timer);
    }, 50);
  }, [openConfigForIngredient, resolveIngredient]);

  useFocusEffect(
    useCallback(() => {
      const pendingIds = consumePendingAddToDishIngredientIds();
      if (pendingIds.length > 0) {
        reopenIngredientPickerRef.current = false;
        startAddToDishQueue(pendingIds);
        return;
      }
      if (reopenIngredientPickerRef.current) {
        reopenIngredientPickerRef.current = false;
        openAddIngSheet();
      }
    }, [startAddToDishQueue])
  );

  useEffect(() => {
    recipeIngredientsRef.current = recipeIngredients;
  }, [recipeIngredients]);

  const openCreateIngredient = () => {
    reopenIngredientPickerRef.current = true;
    setShowIngSheet(false);
    router.push({
      pathname: '/ingredient/create',
      params: { fromRecipe: '1' },
    });
  };

  const openEditIngSheet = (ri) => {
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    setIngSheetStep('config');
    setIngSheetIngredient(ri.ingredient);
    setIngSheetQty(String(ri.quantity));
    const compatible = getCompatibleUnits(ri.ingredient.purchase_unit);
    const unit = compatible.find((u) => u.value === ri.unit)?.value
      ?? compatible[0]?.value
      ?? ri.unit;
    setIngSheetUnit(unit);
    setEditingIngId(ri.ingredient_id);
    setIngQtyError('');
    setShowIngSheet(true);
  };

  const handleIngSelect = (ing) => {
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    setIngSheetIngredient(ing);
    const compatible = getCompatibleUnits(ing.purchase_unit);
    const defaultUnit = compatible.find((u) => u.value === ing.purchase_unit)?.value
      ?? compatible[0]?.value
      ?? ing.purchase_unit;
    setIngSheetUnit(defaultUnit);
    setIngSheetQty('');
    setIngQtyError('');
    setIngSheetStep('config');
  };

  const handleIngSheetConfirm = () => {
    if (!ingSheetIngredient) return;
    const qty = parseFloat(ingSheetQty);
    if (!ingSheetQty.trim() || Number.isNaN(qty) || qty <= 0) {
      setIngQtyError('Enter a quantity');
      return;
    }
    setIngQtyError('');
    const qtyStr = String(qty);
    if (editingIngId) {
      setRecipeIngredients((prev) =>
        prev.map((r) => r.ingredient_id === editingIngId ? { ...r, quantity: qtyStr, unit: ingSheetUnit } : r)
      );
      setIngredientError(false);
      setShowIngSheet(false);
      return;
    }

    setRecipeIngredients((prev) => {
      if (prev.some((r) => r.ingredient_id === ingSheetIngredient.id)) {
        return prev.map((r) => r.ingredient_id === ingSheetIngredient.id
          ? { ...r, quantity: qtyStr, unit: ingSheetUnit, ingredient: ingSheetIngredient }
          : r);
      }
      return [
        ...prev,
        { ingredient_id: ingSheetIngredient.id, ingredient: ingSheetIngredient, quantity: qtyStr, unit: ingSheetUnit },
      ];
    });
    setIngredientError(false);

    const queue = addToDishQueueRef.current;
    if (queue.length > 1) {
      const rest = queue.slice(1);
      addToDishQueueRef.current = rest;
      setAddToDishQueue(rest);
      const nextIng = resolveIngredient(rest[0]);
      if (nextIng) {
        openConfigForIngredient(nextIng);
        return;
      }
    }

    addToDishQueueRef.current = [];
    setAddToDishQueue([]);
    setShowIngSheet(false);
  };

  const handleIngSheetClose = () => {
    setShowIngSheet(false);
    setIngSearch('');
    setIngSheetStep('search');
    setIngSheetIngredient(null);
    setEditingIngId(null);
    setIngQtyError('');
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
  };

  const removeIngredient = (ingredientId) => {
    setRecipeIngredients((prev) => prev.filter((r) => r.ingredient_id !== ingredientId));
  };

  const openAddFmtSheet = () => {
    setFmtSheetUnit(sellingUnitOptions[0]?.value ?? 'piece');
    setFmtSheetQty('1');
    setFmtSheetPrice('');
    setFmtPriceError('');
    setEditingFmtId(null);
    setSellingFormatError(false);
    setShowFmtSheet(true);
  };

  const openEditFmtSheet = (fmt) => {
    setFmtSheetUnit(fmt.selling_unit_name);
    setFmtSheetQty(fmt.unit_quantity);
    setFmtSheetPrice(fmt.selling_price);
    setEditingFmtId(fmt.id);
    setShowFmtSheet(true);
  };

  const handleFmtSheetConfirm = () => {
    const price = parseFloat(fmtSheetPrice);
    if (!fmtSheetPrice.trim() || Number.isNaN(price) || price <= 0) {
      setFmtPriceError('Enter a selling price per unit');
      return;
    }
    setFmtPriceError('');
    if (editingFmtId) {
      setSellingFormats((prev) => prev.map((f) =>
        f.id === editingFmtId
          ? { ...f, selling_unit_name: fmtSheetUnit, unit_quantity: fmtSheetQty, selling_price: fmtSheetPrice }
          : f
      ));
    } else {
      setSellingFormats((prev) => [
        ...prev,
        { id: newFmtId(), selling_unit_name: fmtSheetUnit, unit_quantity: fmtSheetQty, selling_price: fmtSheetPrice },
      ]);
    }
    setSellingFormatError(false);
    setShowFmtSheet(false);
  };

  const removeFormat = (id) => {
    setSellingFormats((prev) => prev.filter((f) => f.id !== id));
  };

  const goBack = async () => {
    if (step > 1) {
      const prev = step - 1;
      await persistDraft(prev);
      setStep(prev);
      trackFoodCost(`step_${prev}`, { direction: 'back' });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
      return;
    }
    await persistDraft(1);
    router.back();
  };

  const canReachStep = useCallback((target) => {
    if (target === step) return true;
    if (target < step) return true;
    if (target === 2) return Boolean(watchName?.trim());
    if (target === 3) {
      return Boolean(watchName?.trim()) && recipeIngredients.length > 0;
    }
    return false;
  }, [step, watchName, recipeIngredients.length]);

  const goToStep = async (target) => {
    if (target === step) return;

    if (target > step) {
      if (target >= 2) {
        const ok = await trigger('name');
        if (!ok) {
          setStep(1);
          return;
        }
      }
      if (target >= 3 && recipeIngredients.length === 0) {
        setIngredientError(true);
        if (step !== 2) {
          await persistDraft(2);
          setStep(2);
        }
        return;
      }
    }

    await persistDraft(target);
    setStep(target);
    trackFoodCost(`step_${target}`, { direction: target < step ? 'jump_back' : 'jump_forward' });
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const goNextFromDish = async () => {
    const ok = await trigger('name');
    if (!ok) return;
    await persistDraft(2);
    setStep(2);
    trackFoodCost('step_2', { direction: 'forward' });
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const goNextFromIngredients = async () => {
    if (recipeIngredients.length === 0) {
      setIngredientError(true);
      return;
    }
    setIngredientError(false);
    await persistDraft(3);
    setStep(3);
    trackFoodCost('step_3', { direction: 'forward' });
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const onSubmit = async (data) => {
    const hasIngredients = recipeIngredients.length > 0;
    const pricedFormats = sellingFormats.filter((f) => parseFloat(f.selling_price) > 0);
    const hasSellingFormat = pricedFormats.length > 0;

    setIngredientError(!hasIngredients);
    setSellingFormatError(!hasSellingFormat);

    if (!hasIngredients || !hasSellingFormat) {
      if (!hasIngredients) setStep(2);
      else setStep(3);
      return;
    }

    const submitIngredients = recipeIngredients.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: parseFloat(ri.quantity) || 0,
      unit: ri.unit,
    }));

    const namedFormats = pricedFormats.map((fmt) => {
      const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
      return { ...fmt, name: formatSellingFormatName(unitLabel, fmt.unit_quantity) };
    });

    const { data: recipe, error } = await createRecipe(
      {
        name: data.name,
        category: data.category,
        target_food_cost_percent: targetPct,
      },
      submitIngredients,
      namedFormats
    );
    if (error) { Alert.alert('Error', error); return; }
    await clearFoodCostDraft();
    trackFoodCost('wizard_completed', { recipeId: recipe.id });
    router.replace({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, justSaved: '1' },
    });
  };

  const footerButton = () => {
    if (step === 1) {
      return <Button title={C.action.continue} onPress={goNextFromDish} size="lg" />;
    }
    if (step === 2) {
      return <Button title={C.action.continue} onPress={goNextFromIngredients} size="lg" />;
    }
    return (
      <Button
        title={C.action.seeResult}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        size="lg"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{C.wizard.header}</Text>
        <View style={{ width: 24 }} />
      </View>

      <WizardProgress step={step} onStepPress={goToStep} canReachStep={canReachStep} />

      <KeyboardFormLayout
        scrollRef={scrollRef}
        contentContainerStyle={styles.scroll}
        footer={<View style={styles.stickyFooter}>{footerButton()}</View>}
      >
        <Text style={styles.stepTitle}>{C.wizard.stepTitles[step]}</Text>
        <Text style={styles.stepSub}>{C.wizard.stepSubs[step]}</Text>

        {step === 1 && (
          <>
            <Controller
              control={control}
              name="name"
              rules={{ required: C.wizard.dishNameRequired }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{C.wizard.dishName}</Text>
                  <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="e.g. Chocolate chip cookies"
                      placeholderTextColor={COLORS.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
                </View>
              )}
            />

            <View style={styles.twoCol}>
              <Controller
                control={control}
                name="category"
                render={() => (
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <TouchableOpacity
                      style={[styles.inputBox, styles.pickerBox]}
                      onPress={() => setShowCatPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pickerText}>{categoryLabel}</Text>
                      <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              <View style={{ width: SPACING.sm }} />
              <Controller
                control={control}
                name="target_food_cost_percent"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.fieldGroup, { flex: 0.65 }]}>
                    <Text style={styles.fieldLabel}>Food cost target</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="30"
                        placeholderTextColor={COLORS.textTertiary}
                      />
                      <Text style={styles.suffix}>%</Text>
                    </View>
                  </View>
                )}
              />
            </View>
            <Text style={styles.hint}>A common food cost target is 25–35%.</Text>
          </>
        )}

        {step === 2 && (
          <>
            <View style={[styles.card, ingredientError && styles.cardError]}>
              {recipeIngredients.length === 0 ? (
                <Text style={[styles.emptySectionHint, ingredientError && styles.emptySectionHintError]}>
                  Add at least one ingredient to continue.
                </Text>
              ) : (
                recipeIngredients.map((ri, idx) => {
                  const usage = getIngredientUsageSummary(ri.ingredient, ri.quantity, ri.unit, symbol);
                  return (
                    <View key={ri.ingredient_id}>
                      {idx > 0 && <View style={styles.ingRowDivider} />}
                      <TouchableOpacity
                        style={styles.ingRow}
                        onPress={() => openEditIngSheet(ri)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.ingRowLeft}>
                          <Text style={styles.ingName} numberOfLines={1}>{ri.ingredient?.name}</Text>
                          {usage ? (
                            <Text style={styles.ingUsageLine}>{usage.usageLine}</Text>
                          ) : null}
                        </View>
                        <View style={styles.ingMeta}>
                          <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
                        </View>
                        <TouchableOpacity
                          onPress={() => removeIngredient(ri.ingredient_id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ marginLeft: SPACING.xs }}
                        >
                          <Ionicons name="close" size={16} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              <TouchableOpacity style={styles.addIngBtn} onPress={openAddIngSheet} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={COLORS.primary} />
                <Text style={styles.addIngText}>Add ingredient</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={[styles.card, sellingFormatError && styles.cardError]}>
              {sellingFormats.length === 0 ? (
                <Text style={[styles.emptySectionHint, sellingFormatError && styles.emptySectionHintError]}>
                  Add at least one selling price to see food cost and margins.
                </Text>
              ) : (
                sellingFormats.map((fmt, idx) => {
                  const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
                  const autoName = formatSellingFormatName(unitLabel, fmt.unit_quantity);
                  const price = parseFloat(fmt.selling_price);
                  return (
                    <View key={fmt.id}>
                      {idx > 0 && <View style={styles.fmtDivider} />}
                      <TouchableOpacity style={styles.fmtSummaryRow} onPress={() => openEditFmtSheet(fmt)} activeOpacity={0.75}>
                        <View style={styles.fmtSummaryLeft}>
                          <Text style={styles.fmtAutoLabel}>{autoName}</Text>
                          <Text style={styles.fmtPriceLabel}>{labelPerSellingUnit('Selling price per', unitLabel)}</Text>
                          <Text style={styles.fmtPriceDot}>{symbol}{price.toFixed(2)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} style={{ marginLeft: SPACING.xs }} />
                        <TouchableOpacity
                          onPress={() => removeFormat(fmt.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ marginLeft: SPACING.sm }}
                        >
                          <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              <TouchableOpacity style={styles.addIngBtn} onPress={openAddFmtSheet} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={COLORS.primary} />
                <Text style={styles.addIngText}>
                  {sellingFormats.length === 0 ? 'Add selling price' : 'Add another selling format'}
                </Text>
              </TouchableOpacity>
            </View>

            {richIngredients.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>LIVE FOOD COST</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>{C.wizard.totalDishCost}</Text>
                    <Text style={styles.previewValue}>{formatCurrency(totalCost, symbol)}</Text>
                  </View>

                  {sellingFormats.map((fmt) => {
                    const price = parseFloat(fmt.selling_price);
                    if (!price) return null;
                    const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
                    const fmtLabel = formatSellingFormatName(unitLabel, fmt.unit_quantity);
                    const metrics = calculateSellingFormatMetrics({
                      totalRecipeCost: totalCost,
                      unitQuantity: fmt.unit_quantity,
                      sellingPrice: fmt.selling_price,
                      targetFoodCostPercent: targetPct,
                    });
                    const fcp = metrics.foodCostPercent ?? 0;
                    const color = metrics.marginStatus === 'good' ? COLORS.success
                      : metrics.marginStatus === 'warning' ? COLORS.warning
                      : metrics.marginStatus === 'danger' ? COLORS.error
                      : COLORS.text;
                    const qty = (metrics.quantityMade ?? parseFloat(fmt.unit_quantity)) || 1;
                    return (
                      <View key={fmt.id}>
                        <View style={styles.previewDivider} />
                        <Text style={styles.previewFormatName}>{fmtLabel}</Text>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>{labelPerSellingUnit('Cost per', unitLabel)}</Text>
                          <Text style={styles.previewValue}>{formatCurrency(metrics.costPerUnit, symbol)}</Text>
                        </View>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>{labelPerSellingUnit('Selling price per', unitLabel)}</Text>
                          <Text style={styles.previewValue}>{formatCurrency(price, symbol)}</Text>
                        </View>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Food cost %</Text>
                          <Text style={[styles.previewValue, { color, fontWeight: '700' }]}>
                            {formatFoodCostPercent(fcp)}
                          </Text>
                        </View>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>{labelPerSellingUnit('Profit per', unitLabel)}</Text>
                          <Text style={styles.previewValue}>{formatCurrency(metrics.profit, symbol)}</Text>
                        </View>
                        <View style={styles.previewRow}>
                          <Text style={styles.previewLabel}>Total dish profit</Text>
                          <Text style={styles.previewValue}>
                            {formatCurrency(metrics.batchProfit, symbol)}
                            <Text style={styles.previewHint}>
                              {` (${qty} × ${formatCurrency(metrics.profit, symbol)})`}
                            </Text>
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </KeyboardFormLayout>

      <Modal visible={showCatPicker} onClose={() => setShowCatPicker(false)} title="Category" scrollable={false}>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <>
              {RECIPE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={styles.listRow}
                  onPress={() => { onChange(cat.value); setShowCatPicker(false); }}
                >
                  <Text style={styles.listRowText}>{cat.label}</Text>
                  {value === cat.value && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </>
          )}
        />
      </Modal>

      <Modal
        visible={showIngSheet}
        onClose={handleIngSheetClose}
        title={
          ingSheetStep === 'search'
            ? 'Add ingredient'
            : editingIngId
              ? (ingSheetIngredient?.name ?? 'Configure')
              : howMuchTitle(ingSheetIngredient?.name)
        }
        scrollable={false}
        footer={ingSheetStep === 'config' ? (
          <>
            {addToDishQueue.length > 1 ? (
              <View style={styles.sheetQueueFooter}>
                <Text style={styles.sheetQueueCount}>
                  {addToDishQueue.length} ingredients left to add
                </Text>
                <Text style={styles.sheetQueueHint}>
                  Tap Next to add another ingredient to this dish
                </Text>
              </View>
            ) : null}
            <Button
              title={
                editingIngId
                  ? 'Update'
                  : addToDishQueue.length > 1
                    ? 'Next'
                    : 'Add to dish'
              }
              onPress={handleIngSheetConfirm}
              size="lg"
            />
            {editingIngId === null && addToDishQueue.length === 0 && (
              <TouchableOpacity onPress={() => setIngSheetStep('search')} style={styles.sheetBackBtn}>
                <Text style={styles.sheetBackText}>← Back to search</Text>
              </TouchableOpacity>
            )}
          </>
        ) : null}
      >
        {ingSheetStep === 'search' ? (
          <>
            <View style={[styles.inputBox, { marginBottom: SPACING.sm }]}>
              <Ionicons name="search" size={16} color={COLORS.textTertiary} style={{ marginLeft: SPACING.md }} />
              <TextInput
                style={styles.textInput}
                value={ingSearch}
                onChangeText={setIngSearch}
                placeholder="Search ingredients..."
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={styles.createIngredientBtn}
              onPress={openCreateIngredient}
              activeOpacity={0.7}
            >
              <View style={styles.createIngredientIcon}>
                <Ionicons name="add" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.createIngredientCopy}>
                <Text style={styles.createIngredientTitle}>New ingredient</Text>
                <Text style={styles.createIngredientHint}>Add one you haven’t used before</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            {ingredients.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No ingredients yet</Text>
                <Text style={styles.modalEmptyHint}>Tap New ingredient above to add your first one.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredIngredients}
                keyExtractor={(i) => i.id}
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.listRow} onPress={() => handleIngSelect(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowText}>{item.name}</Text>
                      <Text style={styles.listRowSub}>
                        {symbol}{item.purchase_price} / {item.purchase_quantity} {formatUnitLabel(item.purchase_unit)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyHint}>No matching ingredients</Text>
                  </View>
                }
              />
            )}
          </>
        ) : (
          <>
            {ingSheetIngredient && (
              <Text style={styles.sheetSub}>
                Purchased: {symbol}{ingSheetIngredient.purchase_price} / {ingSheetIngredient.purchase_quantity} {formatUnitLabel(ingSheetIngredient.purchase_unit)}
              </Text>
            )}
            <View style={[styles.twoCol, { marginTop: SPACING.md }]}>
              <View style={{ width: 88 }}>
                <Text style={styles.sheetLabel}>Quantity</Text>
                <View style={[styles.inputBox, ingQtyError ? styles.inputBoxError : null]}>
                  <TextInput
                    style={[styles.textInput, { textAlign: 'center' }]}
                    value={ingSheetQty}
                    onChangeText={(v) => { setIngSheetQty(v); setIngQtyError(''); }}
                    keyboardType="numeric"
                    placeholder="Qty"
                    placeholderTextColor={COLORS.textTertiary}
                    autoFocus={editingIngId === null}
                  />
                </View>
                {ingQtyError ? <Text style={styles.errorText}>{ingQtyError}</Text> : null}
                {(() => {
                  const usage = getIngredientUsageSummary(ingSheetIngredient, ingSheetQty, ingSheetUnit, symbol);
                  if (!usage) return null;
                  return (
                    <View style={styles.sheetUsageWrap}>
                      <Text style={styles.sheetUsageLine}>{usage.usageLine}</Text>
                      {usage.convertedLine ? (
                        <Text style={styles.sheetConvertedLine}>{usage.convertedLine}</Text>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.sheetLabel}>Unit</Text>
                <View style={styles.chipWrap}>
                  {getCompatibleUnitsForIng(ingSheetIngredient).map((u) => (
                    <TouchableOpacity
                      key={u.value}
                      style={[styles.chip, ingSheetUnit === u.value && styles.chipActive]}
                      onPress={() => setIngSheetUnit(u.value)}
                    >
                      <Text style={[styles.chipText, ingSheetUnit === u.value && styles.chipTextActive]}>{u.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}
      </Modal>

      <Modal
        visible={showFmtSheet}
        onClose={() => setShowFmtSheet(false)}
        title={editingFmtId ? 'Edit format' : 'Add selling format'}
        scrollable={false}
        footer={(
          <Button
            title={editingFmtId ? 'Update format' : 'Add format'}
            onPress={handleFmtSheetConfirm}
            size="lg"
          />
        )}
      >
        <Text style={styles.sheetLabel}>Selling unit</Text>
        <View style={[styles.chipWrap, { marginBottom: SPACING.md }]}>
          {sellingUnitOptions.map((u) => (
            <TouchableOpacity
              key={u.value}
              style={[styles.chip, fmtSheetUnit === u.value && styles.chipActive]}
              onPress={() => setFmtSheetUnit(u.value)}
            >
              <Text style={[styles.chipText, fmtSheetUnit === u.value && styles.chipTextActive]}>{u.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetLabel}>Quantity</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={fmtSheetQty}
                onChangeText={setFmtSheetQty}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
          <View style={{ width: SPACING.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetLabel}>{labelPerSellingUnit('Selling price per', sellingUnitOptions.find((u) => u.value === fmtSheetUnit)?.label ?? fmtSheetUnit)}</Text>
            <View style={[styles.inputBox, styles.priceBox, fmtPriceError ? styles.inputBoxError : null]}>
              <Text style={styles.currencyPrefix}>{symbol}</Text>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={fmtSheetPrice}
                onChangeText={(v) => { setFmtSheetPrice(v); setFmtPriceError(''); }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            {fmtPriceError ? <Text style={styles.errorText}>{fmtPriceError}</Text> : null}
          </View>
        </View>

        {(() => {
          const unitLabel = sellingUnitOptions.find((u) => u.value === fmtSheetUnit)?.label ?? fmtSheetUnit;
          const autoName = formatSellingFormatName(unitLabel, fmtSheetQty);
          const qty = parseFloat(fmtSheetQty) || 1;
          const fmtMetrics = totalCost > 0
            ? calculateSellingFormatMetrics({
                totalRecipeCost: totalCost,
                unitQuantity: qty,
                sellingPrice: null,
                targetFoodCostPercent: targetPct,
              })
            : null;
          return (
            <View style={[styles.formatMeta, { marginTop: SPACING.md }]}>
              <Text style={styles.formatMetaName} numberOfLines={2}>{autoName}</Text>
              {fmtMetrics?.recommendedPrice != null && (
                <Text style={styles.formatMetaSuggested}>
                  Suggested min price per {unitLabel.toLowerCase()}: {symbol}{fmtMetrics.recommendedPrice.toFixed(2)}
                </Text>
              )}
            </View>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  stepTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepSub: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    marginTop: -SPACING.sm,
  },
  teachCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F0FDF4',
  },
  teachText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  fieldGroup: { marginBottom: SPACING.md },
  twoCol: { flexDirection: 'row', alignItems: 'flex-start' },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    minHeight: 44,
  },
  inputBoxError: { borderColor: COLORS.error },
  textInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    minHeight: 44,
  },
  pickerBox: { justifyContent: 'space-between', paddingHorizontal: SPACING.md },
  pickerText: { fontSize: FONT_SIZE.base, color: COLORS.text, flex: 1 },
  suffix: {
    paddingRight: SPACING.md,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  priceBox: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: { paddingLeft: SPACING.md, fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  cardError: { borderColor: COLORS.error },
  emptySectionHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  emptySectionHintError: { color: COLORS.error },
  previewFormatName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },

  ingRowDivider: { height: 1, backgroundColor: COLORS.border },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    minHeight: 44,
  },
  ingRowLeft: { flex: 1, marginRight: SPACING.sm },
  ingName: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  ingUsageLine: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  ingMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    minHeight: 44,
  },
  addIngText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },

  fmtDivider: { height: 1, backgroundColor: COLORS.border },
  fmtSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    minHeight: 44,
  },
  fmtSummaryLeft: { flex: 1, gap: 2 },
  fmtAutoLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  fmtPriceLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  fmtPriceDot: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },

  sheetLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  sheetSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  sheetQueueFooter: {
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  sheetQueueCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  sheetQueueHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  sheetUsageWrap: { marginTop: SPACING.xs, gap: 2 },
  sheetUsageLine: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 16 },
  sheetConvertedLine: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600', lineHeight: 16 },
  sheetBackBtn: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  sheetBackText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  formatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  formatMetaName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  formatMetaSuggested: {
    flexShrink: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'right',
  },

  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
  },
  previewLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, flex: 1 },
  previewValue: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '600', textAlign: 'right' },
  previewHint: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '400' },
  previewDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  stickyFooter: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listRowText: { fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },
  listRowSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  modalEmpty: { paddingVertical: SPACING.lg, alignItems: 'center' },
  modalEmptyText: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  modalEmptyHint: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },
  createIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: '#F0FDF4',
  },
  createIngredientIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  createIngredientCopy: { flex: 1 },
  createIngredientTitle: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '700' },
  createIngredientHint: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingTop: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: '#D1FAE5' },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
});
