import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert, FlatList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { KeyboardFormLayout } from '../../components/ui/KeyboardFormLayout';
import { Skeleton } from '../../components/ui/Skeleton';
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
  hydrateDraftRecipeIngredients,
} from '../../lib/foodCostDraft';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { trackFoodCost } from '../../lib/foodCostAnalytics';
import { supabase } from '../../lib/supabase';
import {
  consumePendingAddToDishIngredientIds,
} from '../../lib/pendingRecipeIngredients';
import { useUnitSystem } from '../../hooks/useUnitSystem';
import { useSubscription } from '../../hooks/useSubscription';
import useIngredientStore from '../../stores/ingredientStore';
import { formatUnitLabel, RECIPE_CATEGORIES, getUnitGroupsForSystem, getDefaultPurchaseUnit, isUnitInSystem, inferUnitSystem, getCompatibleUnitsForIngredient, getDefaultUsedUnit, getDefaultSellingUnitForCategory, getUniqueSellingUnitOptions } from '../../constants/units';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { UnitSystemToggle } from '../../components/ui/UnitSystemToggle';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

let _fmtId = 0;
function newFmtId() { return ++_fmtId; }

function formatHistoryDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** One-line move hint from the latest price history row, e.g. "Up 12% vs previous price". */
function formatRecentPriceMoveHint(entry) {
  if (!entry) return null;
  const oldP = Number(entry.old_price);
  const newP = Number(entry.new_price);
  if (!(oldP > 0) || Number.isNaN(oldP) || Number.isNaN(newP) || oldP === newP) return null;
  const pct = ((newP - oldP) / oldP) * 100;
  if (Math.abs(pct) < 0.5) return null;
  const dir = pct > 0 ? 'Up' : 'Down';
  const when = entry.changed_at ? formatHistoryDate(entry.changed_at) : 'previous price';
  return `${dir} ${Math.abs(pct).toFixed(0)}% since ${when}`;
}

export default function CreateRecipeScreen({ recipeId: recipeIdProp, initialStep: initialStepProp } = {}) {
  const router = useRouter();
  const { fresh, editId: editIdParam, step: stepParam } = useLocalSearchParams();
  const recipeId = recipeIdProp
    ?? (typeof editIdParam === 'string' ? editIdParam : editIdParam?.[0])
    ?? null;
  const isEdit = Boolean(recipeId);
  const stepFromParams = (() => {
    const raw = stepParam == null
      ? null
      : (typeof stepParam === 'string' ? stepParam : stepParam?.[0]);
    const n = parseInt(raw, 10);
    return n >= 1 && n <= 3 ? n : null;
  })();
  const editStartStep = (
    initialStepProp >= 1 && initialStepProp <= 3
      ? initialStepProp
      : (stepFromParams ?? 1)
  );
  const startFresh = !isEdit && fresh === '1';
  const { createRecipe, updateRecipe } = useRecipes();
  const { ingredients, addIngredient, updateIngredient } = useIngredients();
  const ensureIngredientCount = useIngredientStore((s) => s.ensureIngredientCount);
  const { fetchRecipeWithIngredients, sellingUnits } = useRecipeStore();
  const settings = useSettingsStore((s) => s.settings);
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();
  const { unitSystem: settingsUnitSystem, defaultPurchaseUnit } = useUnitSystem();
  const { canAddIngredient, canViewPriceHistory } = useSubscription();

  const compatibleUsedUnits = useCallback(
    (purchaseUnit) => getCompatibleUnitsForIngredient(
      purchaseUnit,
      inferUnitSystem(purchaseUnit, settingsUnitSystem),
    ),
    [settingsUnitSystem],
  );

  const [step, setStep] = useState(1);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('ingredient');
  const [showPriceHistorySheet, setShowPriceHistorySheet] = useState(false);
  const [priceHistoryRows, setPriceHistoryRows] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

  const sellingUnitOptions = useMemo(() => {
    const opts = getUniqueSellingUnitOptions(sellingUnits);
    if (opts.length > 0) return opts;
    return [
      { value: 'piece', label: 'Piece' },
      { value: 'serving', label: 'Serving' },
      { value: 'plate', label: 'Plate' },
      { value: 'slice', label: 'Slice' },
      { value: 'cup', label: 'Cup' },
    ];
  }, [sellingUnits]);

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

  // Inline new-ingredient form (wizard — no /ingredient/create navigation)
  const [newIngName, setNewIngName] = useState('');
  const [newIngPurchaseQty, setNewIngPurchaseQty] = useState('');
  const [newIngPurchaseUnit, setNewIngPurchaseUnit] = useState(defaultPurchaseUnit);
  const [newIngPurchasePrice, setNewIngPurchasePrice] = useState('');
  const [newIngWastePercent, setNewIngWastePercent] = useState('0');
  const [newIngNotes, setNewIngNotes] = useState('');
  const [newIngShowOptional, setNewIngShowOptional] = useState(false);
  const [newIngUsedQty, setNewIngUsedQty] = useState('');
  const [newIngUsedUnit, setNewIngUsedUnit] = useState(() => getDefaultUsedUnit(defaultPurchaseUnit));
  const [newIngErrors, setNewIngErrors] = useState({});
  const [newIngSaving, setNewIngSaving] = useState(false);
  const [showPurchaseUnitPicker, setShowPurchaseUnitPicker] = useState(false);
  const [showUsedUnitPicker, setShowUsedUnitPicker] = useState(false);
  /** Local Metric/Imperial for purchase unit list — defaults to settings, not persisted */
  const [purchaseUnitSystem, setPurchaseUnitSystem] = useState(settingsUnitSystem);
  const purchaseUnitGroups = useMemo(
    () => getUnitGroupsForSystem(purchaseUnitSystem),
    [purchaseUnitSystem],
  );
  /** Create sheet opened with nothing left to pick — hide "Back to list" */
  const [ingCreateOnly, setIngCreateOnly] = useState(false);
  /**
   * Ingredient sheet mode:
   * - new: full create form (purchase + used qty)
   * - add-existing: used qty first, purchase collapsed (pick from list or tap dish row)
   * - edit-purchase: expand purchase fields from add-existing
   */
  const [ingFormMode, setIngFormMode] = useState('new');
  /** Snapshot of library fields when opening an existing ingredient (detect edits) */
  const ingFormBaselineRef = useRef(null);
  const newIngNameRef = useRef(null);
  const newIngPurchasePriceRef = useRef(null);
  const newIngPurchaseQtyRef = useRef(null);
  const newIngWasteRef = useRef(null);
  const newIngUsedQtyRef = useRef(null);
  /** Name / Purchased cost: no sheet lift (avoids pushing fields off the top). Other fields: full lift. */
  const [ingSkipKeyboardLift, setIngSkipKeyboardLift] = useState(false);

  const [showFmtSheet, setShowFmtSheet] = useState(false);
  const [showSellingUnitPicker, setShowSellingUnitPicker] = useState(false);
  const [fmtSheetUnit, setFmtSheetUnit] = useState('serving');
  const [fmtSheetQty, setFmtSheetQty] = useState('1');
  const [fmtSheetPrice, setFmtSheetPrice] = useState('');
  const [fmtPriceError, setFmtPriceError] = useState('');
  const [editingFmtId, setEditingFmtId] = useState(null);
  /** User closed empty price sheet on step 3 — don't force it open again until they leave step 3 */
  const fmtAutoOpenDismissedRef = useRef(false);
  /** One-shot: fill suggested price when dish cost arrives after sheet opened empty */
  const fmtPendingSuggestRef = useRef(false);
  /** Last dish cost (+ target %) we synced selling prices against */
  const priceSyncKeyRef = useRef(null);
  const sellingFormatsRef = useRef(sellingFormats);
  sellingFormatsRef.current = sellingFormats;
  const [priceUpdateNotice, setPriceUpdateNotice] = useState(false);
  const [updatedFormatIds, setUpdatedFormatIds] = useState(() => new Set());
  const [sheetPriceRefreshed, setSheetPriceRefreshed] = useState(false);
  /** Selling prices changed since last successful save */
  const [sellingPricesDirty, setSellingPricesDirty] = useState(false);
  const [showUnsavedLeaveModal, setShowUnsavedLeaveModal] = useState(false);
  const [unsavedLeaveSaving, setUnsavedLeaveSaving] = useState(false);
  const allowLeaveRef = useRef(false);
  const pendingLeaveActionRef = useRef(null);
  const navigation = useNavigation();

  const markSellingPricesDirty = useCallback(() => {
    setSellingPricesDirty(true);
  }, []);

  const clearSellingPricesDirty = useCallback(() => {
    setSellingPricesDirty(false);
  }, []);

  const { control, handleSubmit, watch, trigger, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      category: 'main_course',
      target_food_cost_percent: String(settings.default_food_cost_percent ?? 30),
    },
  });

  const [watchName, watchCategory, watchTarget] = watch(['name', 'category', 'target_food_cost_percent']);
  const targetPct = parseFloat(watchTarget) || 30;
  const categoryLabel = RECIPE_CATEGORIES.find((c) => c.value === watchCategory)?.label ?? 'Other';
  const dishName = (watchName ?? '').replace(/\s+/g, ' ').trim();

  const resolveStepCopy = (map) => {
    const value = map?.[step];
    return typeof value === 'function' ? value(dishName) : value;
  };

  const draftReadyRef = useRef(false);
  const [draftReady, setDraftReady] = useState(false);

  const persistDraft = useCallback(async (nextStep = step) => {
    if (isEdit) return;
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
  }, [isEdit, step, watchName, watchCategory, watchTarget, recipeIngredients, sellingFormats, settings.default_food_cost_percent]);

  const markDraftReady = useCallback(() => {
    draftReadyRef.current = true;
    setDraftReady(true);
  }, []);

  // Create: restore unfinished draft. Edit: load existing dish into the same wizard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isEdit) {
        setPageLoading(true);
        setLoadError(null);
        const { data, error } = await fetchRecipeWithIngredients(recipeId);
        if (cancelled) return;
        if (error || !data) {
          setLoadError(typeof error === 'string' ? error : 'Could not load this dish.');
          setPageLoading(false);
          markDraftReady();
          return;
        }
        reset({
          name: data.name ?? '',
          category: data.category ?? 'other',
          target_food_cost_percent: String(
            data.target_food_cost_percent ?? settings.default_food_cost_percent ?? 30
          ),
        });
        setRecipeIngredients(
          (data.recipe_ingredients ?? []).map((ri) => ({
            ingredient_id: ri.ingredient_id,
            ingredient: ri.ingredient,
            quantity: String(ri.quantity),
            unit: ri.unit,
          }))
        );
        setSellingFormats(
          (data.selling_formats ?? []).map((f) => ({
            id: newFmtId(),
            selling_unit_name: f.selling_unit_name ?? f.selling_unit?.name ?? 'piece',
            unit_quantity: String(f.unit_quantity ?? 1),
            selling_price: String(f.selling_price ?? ''),
          }))
        );
        priceSyncKeyRef.current = null;
        setPriceUpdateNotice(false);
        setUpdatedFormatIds(new Set());
        setSellingPricesDirty(false);
        setStep(isEdit ? editStartStep : 1);
        setIngredientError(false);
        setSellingFormatError(false);
        setPageLoading(false);
        markDraftReady();
        trackFoodCost(`step_${isEdit ? editStartStep : 1}`, { source: 'edit', recipeId });
        return;
      }

      if (startFresh) {
        await clearFoodCostDraft();
        if (cancelled) return;
        reset({
          name: '',
          category: 'main_course',
          target_food_cost_percent: String(settings.default_food_cost_percent ?? 30),
        });
        setStep(1);
        setRecipeIngredients([]);
        setSellingFormats([]);
        priceSyncKeyRef.current = null;
        setPriceUpdateNotice(false);
        setUpdatedFormatIds(new Set());
        setSellingPricesDirty(false);
        setIngredientError(false);
        setSellingFormatError(false);
        markDraftReady();
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
        const library = useIngredientStore.getState().ingredients ?? [];
        setRecipeIngredients(
          hydrateDraftRecipeIngredients(draft.ingredients, library)
        );
        setSellingFormats(draft.sellingFormats ?? []);
        priceSyncKeyRef.current = null;
        setPriceUpdateNotice(false);
        setUpdatedFormatIds(new Set());
        setSellingPricesDirty(false);
        trackFoodCost(`step_${restoredStep}`, { source: 'draft' });
      } else {
        trackFoodCost('step_1', { source: 'new' });
      }
      markDraftReady();
    })();
    return () => { cancelled = true; };
  }, [isEdit, recipeId, startFresh, editStartStep, markDraftReady]);

  // Attach live library rows when ingredients finish loading / update (and after draft restore)
  useEffect(() => {
    if (!draftReady) return;
    setRecipeIngredients((prev) => {
      if (prev.length === 0) return prev;
      const hydrated = hydrateDraftRecipeIngredients(
        prev.map((ri) => ({
          ingredient_id: ri.ingredient_id,
          quantity: ri.quantity,
          unit: ri.unit,
          name: ri.ingredient?.name,
          purchase_price: ri.ingredient?.purchase_price,
          purchase_quantity: ri.ingredient?.purchase_quantity,
          purchase_unit: ri.ingredient?.purchase_unit,
          waste_percent: ri.ingredient?.waste_percent,
        })),
        ingredients,
      );
      const changed = hydrated.some((row, idx) => {
        const prevIng = prev[idx]?.ingredient;
        const nextIng = row.ingredient;
        if (!prevIng || !nextIng) return prevIng !== nextIng;
        return (
          prevIng.id !== nextIng.id
          || prevIng.purchase_price !== nextIng.purchase_price
          || prevIng.purchase_quantity !== nextIng.purchase_quantity
          || prevIng.purchase_unit !== nextIng.purchase_unit
          || prevIng.waste_percent !== nextIng.waste_percent
          || prevIng.name !== nextIng.name
        );
      });
      return changed ? hydrated : prev;
    });
  }, [ingredients, draftReady]);

  // Autosave draft to Supabase while creating (not while editing a saved dish)
  useEffect(() => {
    if (isEdit || !draftReadyRef.current) return undefined;
    const timer = setTimeout(() => {
      persistDraft(step);
    }, 700);
    return () => clearTimeout(timer);
  }, [isEdit, persistDraft, step]);

  const richIngredients = useMemo(() =>
    recipeIngredients
      .filter((ri) => ri.ingredient)
      .map((ri) => ({ ...ri, quantity: parseFloat(ri.quantity) || 0 })),
    [recipeIngredients]
  );

  const { totalCost, ingredientCosts } = useRecipeCost({ recipeIngredients: richIngredients });

  const step2SuggestedPrice = useMemo(() => {
    if (!(totalCost > 0)) return null;
    const metrics = calculateSellingFormatMetrics({
      totalRecipeCost: totalCost,
      unitQuantity: 1,
      sellingPrice: null,
      targetFoodCostPercent: targetPct,
    });
    return metrics?.recommendedPrice > 0 ? metrics.recommendedPrice : null;
  }, [totalCost, targetPct]);

  const addedIds = useMemo(() => new Set(recipeIngredients.map((r) => r.ingredient_id)), [recipeIngredients]);

  const availableIngredients = useMemo(
    () => ingredients.filter((i) => !addedIds.has(i.id)),
    [ingredients, addedIds],
  );

  const filteredIngredients = useMemo(() => {
    const q = ingSearch.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!q) return availableIngredients;
    return availableIngredients.filter((i) =>
      i.name.toLowerCase().trim().includes(q)
    );
  }, [availableIngredients, ingSearch]);

  const resetNewIngredientForm = useCallback(() => {
    setNewIngName('');
    setNewIngPurchaseQty('');
    setNewIngPurchaseUnit(defaultPurchaseUnit);
    setNewIngPurchasePrice('');
    setNewIngWastePercent('0');
    setNewIngNotes('');
    setNewIngShowOptional(false);
    setNewIngUsedQty('');
    setNewIngUsedUnit(getDefaultUsedUnit(defaultPurchaseUnit));
    setNewIngErrors({});
    setNewIngSaving(false);
    setShowPurchaseUnitPicker(false);
    setShowUsedUnitPicker(false);
    setPurchaseUnitSystem(settingsUnitSystem);
    setIngFormMode('new');
    ingFormBaselineRef.current = null;
  }, [defaultPurchaseUnit, settingsUnitSystem]);

  const fillExistingIngredientForm = useCallback((ing, {
    usedQty = '',
    usedUnit = null,
    dishEditingId = null,
    createOnly = false,
    mode = 'add-existing',
  } = {}) => {
    if (!ing) return;
    const waste = ing.waste_percent != null ? String(ing.waste_percent) : '0';
    const notes = ing.notes ?? '';
    const purchaseUnit = ing.purchase_unit ?? defaultPurchaseUnit;
    const compatible = compatibleUsedUnits(purchaseUnit);
    // Keep an existing dish row unit; otherwise soft-default to a smaller recipe unit
    const nextUsed = usedUnit
      ?? getDefaultUsedUnit(purchaseUnit, compatible, settingsUnitSystem);

    setNewIngName(ing.name ?? '');
    setNewIngPurchaseQty(String(ing.purchase_quantity ?? 1));
    setNewIngPurchaseUnit(purchaseUnit);
    setNewIngPurchasePrice(String(ing.purchase_price ?? ''));
    setNewIngWastePercent(waste);
    setNewIngNotes(notes);
    setNewIngShowOptional(false);
    setNewIngUsedQty(usedQty != null ? String(usedQty) : '');
    setNewIngUsedUnit(nextUsed);
    setNewIngErrors({});
    setNewIngSaving(false);
    setShowPurchaseUnitPicker(false);
    setShowUsedUnitPicker(false);
    setPurchaseUnitSystem(inferUnitSystem(purchaseUnit, settingsUnitSystem));
    setIngFormMode(mode);

    ingFormBaselineRef.current = {
      name: (ing.name ?? '').trim(),
      purchase_price: Number(ing.purchase_price),
      purchase_quantity: Number(ing.purchase_quantity),
      purchase_unit: purchaseUnit,
      waste_percent: parseFloat(waste) || 0,
      notes: notes.trim() || null,
    };

    setIngSheetIngredient(ing);
    setEditingIngId(dishEditingId);
    setIngCreateOnly(createOnly || mode === 'edit-library');
    setIngSheetStep('create');
    setIngSkipKeyboardLift(false);
    setShowIngSheet(true);
  }, [defaultPurchaseUnit, compatibleUsedUnits, settingsUnitSystem]);

  const isLibraryEdit = ingFormMode === 'edit-library';
  const isPurchaseEdit = isLibraryEdit || ingFormMode === 'edit-purchase';
  const isAddExistingCollapsed = ingFormMode === 'add-existing';
  /** Used qty only when creating a brand-new ingredient; never while editing purchase details. */
  const showUsedQtyInPurchaseForm = ingFormMode === 'new';

  const cancelPurchaseEdit = useCallback(() => {
    if (ingFormMode === 'edit-library') {
      setShowIngSheet(false);
      setIngSheetIngredient(null);
      setEditingIngId(null);
      setIngCreateOnly(false);
      resetNewIngredientForm();
      return;
    }
    const baseline = ingFormBaselineRef.current;
    if (baseline) {
      setNewIngName(baseline.name);
      setNewIngPurchasePrice(String(baseline.purchase_price));
      setNewIngPurchaseQty(String(baseline.purchase_quantity));
      setNewIngPurchaseUnit(baseline.purchase_unit);
      setNewIngWastePercent(String(baseline.waste_percent ?? 0));
      setNewIngNotes(baseline.notes ?? '');
      setNewIngShowOptional(false);
      setNewIngErrors((e) => ({
        ...e,
        name: undefined,
        purchase_price: undefined,
        purchase_quantity: undefined,
      }));
    }
    setIngFormMode('add-existing');
  }, [ingFormMode, resetNewIngredientForm]);

  const recentPriceMoveHint = useMemo(
    () => formatRecentPriceMoveHint(priceHistoryRows[0]),
    [priceHistoryRows],
  );

  useEffect(() => {
    const shouldLoadHistory = (
      (ingFormMode === 'edit-library' || ingFormMode === 'edit-purchase')
      && ingSheetIngredient?.id
      && canViewPriceHistory
    );
    if (!shouldLoadHistory) {
      setPriceHistoryRows([]);
      setPriceHistoryLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setPriceHistoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('ingredient_price_history')
          .select('id, old_price, new_price, changed_at, change_source')
          .eq('ingredient_id', ingSheetIngredient.id)
          .order('changed_at', { ascending: false })
          .limit(8);
        if (!cancelled && !error) setPriceHistoryRows(data ?? []);
      } catch (_) {
        if (!cancelled) setPriceHistoryRows([]);
      } finally {
        if (!cancelled) setPriceHistoryLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ingFormMode, ingSheetIngredient?.id, canViewPriceHistory]);

  const openPriceHistoryFromForm = () => {
    if (!canViewPriceHistory) {
      track(AnalyticsEvents.PAYWALL_VIEWED, {
        reason: 'priceHistory',
        source: 'recipe_wizard_inline',
      });
      setPaywallReason('priceHistory');
      setShowPaywall(true);
      return;
    }
    setShowPriceHistorySheet(true);
    // Refetch so the sheet isn't stuck on a stale empty list
    if (ingSheetIngredient?.id) {
      (async () => {
        setPriceHistoryLoading(true);
        try {
          const { data, error } = await supabase
            .from('ingredient_price_history')
            .select('id, old_price, new_price, changed_at, change_source')
            .eq('ingredient_id', ingSheetIngredient.id)
            .order('changed_at', { ascending: false })
            .limit(8);
          if (!error) setPriceHistoryRows(data ?? []);
        } catch (_) {
          setPriceHistoryRows([]);
        } finally {
          setPriceHistoryLoading(false);
        }
      })();
    }
  };

  const openCreateIngredient = () => {
    trackFoodCost('add_to_library_tapped', { wizard_step: step, flow: 'inline' });
    resetNewIngredientForm();
    setIngCreateOnly(false);
    setIngFormMode('new');
    setIngSheetStep('create');
    setEditingIngId(null);
    setIngSheetIngredient(null);
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    setIngSkipKeyboardLift(false);
  };

  const openAddIngSheet = () => {
    trackFoodCost('ingredient_picker_opened', { wizard_step: step });
    setIngSheetIngredient(null);
    setIngSheetQty('');
    setIngSheetUnit('');
    setIngQtyError('');
    setEditingIngId(null);
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    setIngSearch('');
    setIngredientError(false);
    const leftover = ingredients.filter((i) => !addedIds.has(i.id));
    if (leftover.length === 0) {
      resetNewIngredientForm();
      setIngCreateOnly(true);
      setIngSheetStep('create');
      trackFoodCost('add_to_library_tapped', {
        wizard_step: step,
        flow: ingredients.length === 0 ? 'inline_empty_library' : 'inline_all_used',
      });
    } else {
      setIngCreateOnly(false);
      setIngSheetStep('search');
    }
    setShowIngSheet(true);
  };

  const openConfigForIngredient = useCallback((ing) => {
    if (!ing) return;
    fillExistingIngredientForm(ing, { createOnly: false });
  }, [fillExistingIngredientForm]);

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
      const next = resolveIngredient(pending[0]);
      if (next) {
        openConfigForIngredient(next);
        return true;
      }
      return false;
    };

    if (openFirst()) return;

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
        trackFoodCost('returned_from_library', {
          wizard_step: step,
          pending_count: pendingIds.length,
          flow: 'configure_saved',
        });
        reopenIngredientPickerRef.current = false;
        startAddToDishQueue(pendingIds);
        return;
      }
      if (reopenIngredientPickerRef.current) {
        reopenIngredientPickerRef.current = false;
        trackFoodCost('returned_from_library', { wizard_step: step, flow: 'picker' });
        openAddIngSheet();
      }
    }, [startAddToDishQueue, step])
  );

  useEffect(() => {
    recipeIngredientsRef.current = recipeIngredients;
  }, [recipeIngredients]);

  const setNewPurchaseUnit = (unit) => {
    setNewIngPurchaseUnit(unit);
    const compatible = compatibleUsedUnits(unit);
    setNewIngUsedUnit(getDefaultUsedUnit(unit, compatible, settingsUnitSystem));
    setShowPurchaseUnitPicker(false);
  };

  const switchPurchaseUnitSystem = (nextSystem) => {
    if (nextSystem === purchaseUnitSystem) return;
    setPurchaseUnitSystem(nextSystem);
    if (!isUnitInSystem(newIngPurchaseUnit, nextSystem)) {
      const nextUnit = getDefaultPurchaseUnit(nextSystem);
      setNewIngPurchaseUnit(nextUnit);
      const compatible = compatibleUsedUnits(nextUnit);
      setNewIngUsedUnit(getDefaultUsedUnit(nextUnit, compatible, nextSystem));
    }
  };

  const handleInlineCreateConfirm = async () => {
    const errors = {};
    const name = newIngName.trim();
    if (!name) errors.name = 'Enter a name';

    const price = parseFloat(newIngPurchasePrice);
    if (!newIngPurchasePrice.trim() || Number.isNaN(price) || price < 0) {
      errors.purchase_price = 'Enter a valid price';
    }

    const purchaseQty = parseFloat(newIngPurchaseQty);
    if (Number.isNaN(purchaseQty) || purchaseQty <= 0) {
      errors.purchase_quantity = 'Enter a valid quantity';
    }

    const isDishIngredientEdit = ingFormMode === 'edit-library';
    const isPurchaseOnlySave = isDishIngredientEdit || ingFormMode === 'edit-purchase';
    const usedQty = parseFloat(newIngUsedQty);
    if (!isPurchaseOnlySave) {
      if (!newIngUsedQty.trim() || Number.isNaN(usedQty) || usedQty <= 0) {
        errors.used_quantity = 'Enter how much you use';
      }
    }

    if (Object.keys(errors).length > 0) {
      setNewIngErrors(errors);
      return;
    }

    const isExisting = Boolean(ingSheetIngredient?.id);
    if (!isExisting) {
      const libraryCount = await ensureIngredientCount();
      if (!canAddIngredient(libraryCount)) {
        setPaywallReason('ingredient');
        setShowPaywall(true);
        return;
      }
    }

    setNewIngSaving(true);
    setNewIngErrors({});
    try {
      const wastePercent = parseFloat(newIngWastePercent) || 0;
      const notes = newIngNotes.trim() || null;
      const purchasePayload = {
        name,
        purchase_price: price,
        purchase_quantity: purchaseQty,
        purchase_unit: newIngPurchaseUnit,
        waste_percent: wastePercent,
        notes,
      };

      let saved = ingSheetIngredient;

      if (isExisting) {
        const baseline = ingFormBaselineRef.current;
        const changed = !baseline || (
          name !== baseline.name
          || price !== baseline.purchase_price
          || purchaseQty !== baseline.purchase_quantity
          || newIngPurchaseUnit !== baseline.purchase_unit
          || wastePercent !== baseline.waste_percent
          || notes !== baseline.notes
        );

        if (changed) {
          const { data, error } = await updateIngredient(ingSheetIngredient.id, purchasePayload);
          if (error || !data) {
            Alert.alert('Could not update', typeof error === 'string' ? error : 'Please try again.');
            return;
          }
          saved = data;
          track(AnalyticsEvents.INGREDIENT_UPDATED, {
            price_changed: baseline ? price !== baseline.purchase_price : true,
            source: 'recipe_wizard_inline',
          });
          // Refresh history so the sheet reflects the new change
          if (canViewPriceHistory && baseline && price !== baseline.purchase_price) {
            try {
              const { data: hist } = await supabase
                .from('ingredient_price_history')
                .select('id, old_price, new_price, changed_at, change_source')
                .eq('ingredient_id', saved.id)
                .order('changed_at', { ascending: false })
                .limit(8);
              setPriceHistoryRows(hist ?? []);
            } catch (_) { /* ignore */ }
          }
        }
    } else {
        const { data, error } = await addIngredient({
          ...purchasePayload,
          category_id: null,
        });

        if (error || !data) {
          track(AnalyticsEvents.INGREDIENT_CREATE_FAILED, {
            count: 1,
            message: error ?? 'unknown',
            source: 'recipe_wizard_inline',
          });
          Alert.alert('Could not save', typeof error === 'string' ? error : 'Please try again.');
          return;
        }

        saved = data;
        track(AnalyticsEvents.INGREDIENT_CREATED, {
          count: 1,
          failed_count: 0,
          source: 'recipe_wizard_inline',
          total_ingredients_after: ingredients.length + 1,
        });
      }

      // Editing ingredient already on the dish — update library fields only, keep used qty/unit
      if (isDishIngredientEdit) {
        setRecipeIngredients((prev) => prev.map((r) => (
          r.ingredient_id === saved.id
            ? { ...r, ingredient: saved }
            : r
        )));
        resetNewIngredientForm();
        setIngSheetIngredient(null);
        setEditingIngId(null);
        setShowIngSheet(false);
        return;
      }

      // Editing purchase while adding/editing on dish — save library fields, return to used-qty step
      if (ingFormMode === 'edit-purchase') {
        setIngSheetIngredient(saved);
        ingFormBaselineRef.current = {
          name,
          purchase_price: price,
          purchase_quantity: purchaseQty,
          purchase_unit: newIngPurchaseUnit,
          waste_percent: wastePercent,
          notes,
        };
        setNewIngName(saved.name ?? name);
        setNewIngPurchasePrice(String(saved.purchase_price ?? price));
        setNewIngPurchaseQty(String(saved.purchase_quantity ?? purchaseQty));
        setNewIngPurchaseUnit(saved.purchase_unit ?? newIngPurchaseUnit);
        setNewIngWastePercent(String(saved.waste_percent ?? wastePercent));
        setNewIngNotes(saved.notes ?? '');
        setNewIngShowOptional(false);
        if (editingIngId) {
          setRecipeIngredients((prev) => prev.map((r) => (
            r.ingredient_id === saved.id
              ? { ...r, ingredient: saved }
              : r
          )));
        }
        setIngFormMode('add-existing');
        return;
      }

      const qtyStr = String(usedQty);
      const targetId = saved.id;

      setRecipeIngredients((prev) => {
        if (prev.some((r) => r.ingredient_id === targetId)) {
          return prev.map((r) => r.ingredient_id === targetId
            ? { ...r, quantity: qtyStr, unit: newIngUsedUnit, ingredient: saved }
            : r);
        }
        return [
        ...prev,
          { ingredient_id: saved.id, ingredient: saved, quantity: qtyStr, unit: newIngUsedUnit },
        ];
      });
      setIngredientError(false);

      trackFoodCost('ingredient_added', {
        wizard_step: step,
        ingredient_id: saved.id,
        recipe_ingredient_count: recipeIngredients.length + 1,
        from_inline_create: !isExisting,
        from_existing: isExisting,
        from_queue: addToDishQueueRef.current.length > 0,
      });

      const queue = addToDishQueueRef.current;
      if (queue.length > 1) {
        const rest = queue.slice(1);
        addToDishQueueRef.current = rest;
        setAddToDishQueue(rest);
        const nextIng = resolveIngredient(rest[0]);
        if (nextIng) {
          fillExistingIngredientForm(nextIng, { createOnly: false });
          return;
        }
      }

      addToDishQueueRef.current = [];
      setAddToDishQueue([]);
      resetNewIngredientForm();
      setIngSheetIngredient(null);
      setEditingIngId(null);
      setIngSheetStep('search');
    setShowIngSheet(false);
    } catch (err) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
    } finally {
      setNewIngSaving(false);
    }
  };

  const openEditIngSheet = (ri) => {
    if (!ri?.ingredient) return;
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    fillExistingIngredientForm(ri.ingredient, {
      usedQty: ri.quantity,
      usedUnit: ri.unit,
      dishEditingId: ri.ingredient_id,
      createOnly: true,
      mode: 'add-existing',
    });
  };

  const handleIngSelect = (ing) => {
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    fillExistingIngredientForm(ing, { createOnly: false, mode: 'add-existing' });
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
    setIngCreateOnly(false);
    setIngSkipKeyboardLift(false);
    resetNewIngredientForm();
  };

  const removeIngredient = (ingredientId) => {
    setRecipeIngredients((prev) => prev.filter((r) => r.ingredient_id !== ingredientId));
  };

  const applySuggestedFmtPrice = useCallback((qtyStr, { markRefreshed = false, force = false } = {}) => {
    if (!(totalCost > 0)) return;
    const metrics = calculateSellingFormatMetrics({
      totalRecipeCost: totalCost,
      unitQuantity: qtyStr || '1',
      sellingPrice: null,
      targetFoodCostPercent: targetPct,
    });
    if (metrics?.recommendedPrice != null && metrics.recommendedPrice > 0) {
      const next = metrics.recommendedPrice.toFixed(2);
      setFmtSheetPrice((prev) => {
        // User cleared the field (or left it empty) — never force-fill unless opening / cost just arrived
        if (!force && !prev.trim()) return prev;

        const prevNum = parseFloat(prev);
        const nextNum = parseFloat(next);
        if (
          markRefreshed
          && prev.trim()
          && !Number.isNaN(prevNum)
          && Math.abs(prevNum - nextNum) >= 0.01
        ) {
          requestAnimationFrame(() => setSheetPriceRefreshed(true));
        }
        return next;
      });
      setFmtPriceError('');
    }
  }, [totalCost, targetPct]);

  const openAddFmtSheet = () => {
    const unit = getDefaultSellingUnitForCategory(watchCategory, sellingUnitOptions);
    const qty = '1';
    let suggested = '';
    if (totalCost > 0) {
      const metrics = calculateSellingFormatMetrics({
        totalRecipeCost: totalCost,
        unitQuantity: qty,
        sellingPrice: null,
        targetFoodCostPercent: targetPct,
      });
      if (metrics?.recommendedPrice != null && metrics.recommendedPrice > 0) {
        suggested = metrics.recommendedPrice.toFixed(2);
      }
    }
    setFmtSheetUnit(unit);
    setFmtSheetQty(qty);
    setFmtSheetPrice(suggested);
    // Only wait for cost if we couldn't suggest yet — do not refill after the user clears
    fmtPendingSuggestRef.current = !suggested && !(totalCost > 0);
    setFmtPriceError('');
    setSheetPriceRefreshed(false);
    setEditingFmtId(null);
    setSellingFormatError(false);
    setShowSellingUnitPicker(false);
    fmtAutoOpenDismissedRef.current = false;
    setShowFmtSheet(true);
  };

  const closeFmtSheet = () => {
    setShowFmtSheet(false);
    setSheetPriceRefreshed(false);
    fmtPendingSuggestRef.current = false;
    if (sellingFormats.length === 0 && !editingFmtId) {
      fmtAutoOpenDismissedRef.current = true;
    }
  };

  // Auto-open selling price sheet when landing on step 3 with no prices yet
  useEffect(() => {
    if (step !== 3) {
      fmtAutoOpenDismissedRef.current = false;
      return undefined;
    }
    if (!draftReadyRef.current) return undefined;
    if (sellingFormats.length > 0) return undefined;
    if (showFmtSheet) return undefined;
    if (fmtAutoOpenDismissedRef.current) return undefined;

    const frame = requestAnimationFrame(() => {
      openAddFmtSheet();
    });
    return () => cancelAnimationFrame(frame);
  }, [step, sellingFormats.length, showFmtSheet, totalCost]);

  // One-shot: if sheet opened before dish cost was ready, fill suggestion once when cost arrives
  useEffect(() => {
    if (!showFmtSheet || editingFmtId) return;
    if (!fmtPendingSuggestRef.current) return;
    if (!(totalCost > 0)) return;
    fmtPendingSuggestRef.current = false;
    applySuggestedFmtPrice(fmtSheetQty, { force: true });
  }, [totalCost, showFmtSheet, editingFmtId, fmtSheetQty, applySuggestedFmtPrice]);

  /**
   * When dish cost / food-cost target changes and selling prices already exist,
   * refresh each format to the new suggested price and surface a notice.
   * Empty state (no prices yet) is left alone — current add-sheet flow handles that.
   */
  useEffect(() => {
    if (!(totalCost > 0)) return;

    const syncKey = `${totalCost.toFixed(4)}|${targetPct}`;
    const formats = sellingFormatsRef.current;

    if (formats.length === 0) {
      priceSyncKeyRef.current = syncKey;
      return;
    }

    const prevKey = priceSyncKeyRef.current;
    if (prevKey == null) {
      // First time we see formats + cost — baseline only, no "updated" notice
      priceSyncKeyRef.current = syncKey;
      return;
    }
    if (prevKey === syncKey) return;
    priceSyncKeyRef.current = syncKey;

    const changedIds = [];
    const nextFormats = formats.map((fmt) => {
      const metrics = calculateSellingFormatMetrics({
        totalRecipeCost: totalCost,
        unitQuantity: fmt.unit_quantity,
        sellingPrice: null,
        targetFoodCostPercent: targetPct,
      });
      const suggested = metrics?.recommendedPrice;
      if (suggested == null || suggested <= 0) return fmt;
      const nextPrice = Number(suggested.toFixed(2));
      const oldPrice = parseFloat(fmt.selling_price);
      if (!Number.isNaN(oldPrice) && Math.abs(oldPrice - nextPrice) < 0.01) return fmt;
      changedIds.push(fmt.id);
      return { ...fmt, selling_price: nextPrice.toFixed(2) };
    });

    if (changedIds.length === 0) return;

    setSellingFormats(nextFormats);
    setUpdatedFormatIds(new Set(changedIds));
    setPriceUpdateNotice(true);
    markSellingPricesDirty();

    // Keep open sheet in sync when editing one of the refreshed formats (or adding)
    if (showFmtSheet) {
      if (editingFmtId && changedIds.includes(editingFmtId)) {
        const updated = nextFormats.find((f) => f.id === editingFmtId);
        if (updated) {
          setFmtSheetPrice(updated.selling_price);
          setSheetPriceRefreshed(true);
        }
      } else if (!editingFmtId) {
        applySuggestedFmtPrice(fmtSheetQty, { markRefreshed: true });
      }
    }
  }, [totalCost, targetPct, showFmtSheet, editingFmtId, fmtSheetQty, applySuggestedFmtPrice, markSellingPricesDirty]);

  // Clear "updated" badges when leaving the price step
  useEffect(() => {
    if (step !== 3) {
      setPriceUpdateNotice(false);
      setUpdatedFormatIds(new Set());
    }
  }, [step]);

  const openEditFmtSheet = (fmt) => {
    setFmtSheetUnit(fmt.selling_unit_name);
    setFmtSheetQty(String(fmt.unit_quantity ?? '1'));
    setFmtSheetPrice(String(fmt.selling_price ?? ''));
    setFmtPriceError('');
    setSheetPriceRefreshed(updatedFormatIds.has(fmt.id));
    setEditingFmtId(fmt.id);
    fmtPendingSuggestRef.current = false;
    setShowSellingUnitPicker(false);
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
      trackFoodCost('selling_format_added', {
        wizard_step: step,
        selling_format_count: sellingFormats.length + 1,
        unit: fmtSheetUnit,
      });
    }
    markSellingPricesDirty();
    setSellingFormatError(false);
    setShowFmtSheet(false);
  };

  const removeFormat = (id) => {
    setSellingFormats((prev) => prev.filter((f) => f.id !== id));
    markSellingPricesDirty();
  };

  const requestLeaveWizard = useCallback(() => {
    if (step === 3 && sellingPricesDirty) {
      pendingLeaveActionRef.current = null;
      setShowUnsavedLeaveModal(true);
      return;
    }
    allowLeaveRef.current = true;
    router.back();
  }, [step, sellingPricesDirty, router]);

  const confirmLeaveWithoutSaving = useCallback(() => {
    allowLeaveRef.current = true;
    setShowUnsavedLeaveModal(false);
    clearSellingPricesDirty();
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    if (action) {
      navigation.dispatch(action);
    } else {
      router.back();
    }
  }, [navigation, router, clearSellingPricesDirty]);

  const dismissUnsavedLeaveModal = useCallback(() => {
    setShowUnsavedLeaveModal(false);
    pendingLeaveActionRef.current = null;
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) return;
      if (!(step === 3 && sellingPricesDirty)) return;
      e.preventDefault();
      pendingLeaveActionRef.current = e.data.action;
      setShowUnsavedLeaveModal(true);
    });
    return unsub;
  }, [navigation, step, sellingPricesDirty]);

  const goBack = async () => {
    // Edit always came from dish detail — exit the wizard instead of stepping back
    if (isEdit) {
      requestLeaveWizard();
      return;
    }
    if (step > 1) {
      const prev = step - 1;
      await persistDraft(prev);
      setStep(prev);
      trackFoodCost(`step_${prev}`, { direction: 'back', source: 'create' });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
      return;
    }
    await persistDraft(1);
    requestLeaveWizard();
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
      else {
        setStep(3);
        fmtAutoOpenDismissedRef.current = false;
        requestAnimationFrame(() => openAddFmtSheet());
      }
      return;
    }

    const submitIngredients = recipeIngredients.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: parseFloat(ri.quantity) || 0,
      unit: ri.unit,
    }));

    const namedFormats = pricedFormats.map((fmt) => {
      const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
      return { ...fmt, name: formatSellingFormatName(unitLabel, fmt.unit_quantity, dishName) };
    });

    const recipePayload = {
        name: data.name,
        category: data.category,
        target_food_cost_percent: targetPct,
    };

    if (isEdit) {
      const { error } = await updateRecipe(
        recipeId,
        recipePayload,
      submitIngredients,
      namedFormats
    );
    if (error) { Alert.alert('Error', error); return; }
      clearSellingPricesDirty();
      allowLeaveRef.current = true;
      trackFoodCost('wizard_completed', {
        recipeId,
        ingredient_count: recipeIngredients.length,
        selling_format_count: sellingFormats.length,
        source: 'edit',
      });
      router.replace(`/recipe/${recipeId}`);
      return;
    }

    const { data: recipe, error } = await createRecipe(
      recipePayload,
      submitIngredients,
      namedFormats
    );
    if (error) { Alert.alert('Error', error); return; }
    await clearFoodCostDraft();
    clearSellingPricesDirty();
    allowLeaveRef.current = true;
    trackFoodCost('wizard_completed', {
      recipeId: recipe.id,
      ingredient_count: recipeIngredients.length,
      selling_format_count: sellingFormats.length,
      source: 'create',
    });
    router.replace({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, justSaved: '1' },
    });
  };

  const handleSaveFromUnsavedLeave = () => {
    setUnsavedLeaveSaving(true);
    handleSubmit(async (data) => {
      try {
        await onSubmit(data);
      } finally {
        setUnsavedLeaveSaving(false);
        setShowUnsavedLeaveModal(false);
        pendingLeaveActionRef.current = null;
      }
    })();
  };

  const footerButton = () => {
    if (step === 1) {
      return <Button title={C.action.continue} onPress={goNextFromDish} size="lg" />;
    }
    if (step === 2) {
      if (recipeIngredients.length === 0) {
        return (
          <Button
            title={C.action.addIngredient}
            onPress={openAddIngSheet}
            size="lg"
          />
        );
      }
      return (
        <View style={styles.footerStack}>
          <Button
            title={C.action.addAnotherIngredient}
            onPress={openAddIngSheet}
            variant="secondary"
            size="lg"
          />
          <Button title={C.action.continueToPricing} onPress={goNextFromIngredients} size="lg" />
        </View>
      );
    }
    if (sellingFormats.length === 0) {
      return (
        <Button
          title={C.action.addSellingPriceFor(dishName)}
          onPress={openAddFmtSheet}
          size="lg"
        />
      );
    }
    return (
      <View style={styles.footerStack}>
        <Button
          title={C.action.addAnotherSellingPrice}
          onPress={openAddFmtSheet}
          variant="secondary"
          size="lg"
        />
        <Button
          title={isEdit ? C.action.saveChanges : C.action.seeResult}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          size="lg"
        />
      </View>
    );
  };

  if (pageLoading) {
  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? C.edit.header : C.wizard.header}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.editLoadingBody}>
          <Skeleton height={18} width="55%" style={{ marginBottom: SPACING.md }} />
          <Skeleton height={44} style={{ borderRadius: RADIUS.md, marginBottom: SPACING.md }} />
          <Skeleton height={44} style={{ borderRadius: RADIUS.md, marginBottom: SPACING.md }} />
          <Skeleton height={120} style={{ borderRadius: RADIUS.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{C.edit.header}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.editLoadingBody}>
          <Text style={styles.loadErrorText}>{loadError}</Text>
          <Button title="Go back" onPress={() => router.back()} size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? C.edit.header : C.wizard.header}</Text>
        <View style={{ width: 24 }} />
      </View>

      <WizardProgress step={step} onStepPress={goToStep} canReachStep={canReachStep} />

      <KeyboardFormLayout
        scrollRef={scrollRef}
          contentContainerStyle={styles.scroll}
        footer={<View style={styles.stickyFooter}>{footerButton()}</View>}
      >
        <Text style={styles.stepTitle}>
          {isEdit
            ? resolveStepCopy(C.edit.stepTitles) ?? resolveStepCopy(C.wizard.stepTitles)
            : resolveStepCopy(C.wizard.stepTitles)}
        </Text>
        <Text style={styles.stepSub}>
          {isEdit
            ? resolveStepCopy(C.edit.stepSubs) ?? resolveStepCopy(C.wizard.stepSubs)
            : resolveStepCopy(C.wizard.stepSubs)}
        </Text>
        {step === 2 ? (
          <Text style={styles.stepCountHint}>
            {recipeIngredients.length === 0
              ? '0 ingredients in this dish'
              : `${recipeIngredients.length} ingredient${recipeIngredients.length === 1 ? '' : 's'} in this dish`}
          </Text>
        ) : null}

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
                <View style={styles.stepEmpty}>
                  <Text style={[styles.stepEmptyTitle, ingredientError && styles.stepEmptyTitleError]}>
                    No ingredients yet
                  </Text>
                  <Text style={styles.stepEmptySub}>
                    Add each item this dish uses — flour, butter, eggs, and so on.
                  </Text>
          </View>
              ) : (
                recipeIngredients.map((ri, idx) => {
              const usage = getIngredientUsageSummary(ri.ingredient, ri.quantity, ri.unit, symbol);
                  const costItem = ingredientCosts.find((c) => c.ingredientId === ri.ingredient_id);
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
                          {costItem?.cost != null && !costItem?.error ? (
                            <Text style={styles.ingRowCost}>
                              {formatCurrency(costItem.cost, symbol)}
                            </Text>
                          ) : null}
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
            </View>

            {recipeIngredients.length > 0 && totalCost > 0 ? (
              <View style={[styles.previewCard, { marginTop: SPACING.md }]}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>{C.wizard.totalDishCost}</Text>
                  <Text style={[styles.previewValue, styles.step2CostValue]}>
                    {formatCurrency(totalCost, symbol)}
                  </Text>
                </View>
                {step2SuggestedPrice != null ? (
                  <Text style={styles.step2CostHint}>
                    {C.wizard.step2SuggestedPrefix(targetPct)}{' '}
                    {formatCurrency(step2SuggestedPrice, symbol)}
                  </Text>
                ) : (
                  <Text style={styles.step2CostHint}>{C.wizard.step2CostHint}</Text>
                )}
              </View>
            ) : null}
          </>
        )}

        {step === 3 && (
          <>
            {priceUpdateNotice && sellingFormats.length > 0 ? (
              <View style={styles.priceUpdateBanner}>
                <Ionicons name="refresh-outline" size={18} color={COLORS.primary} style={{ marginTop: 1 }} />
                <View style={styles.priceUpdateBannerText}>
                  <Text style={styles.priceUpdateBannerTitle}>{C.wizard.pricesUpdatedTitle}</Text>
                  <Text style={styles.priceUpdateBannerSub}>{C.wizard.pricesUpdatedSub}</Text>
                </View>
            <TouchableOpacity
                  onPress={() => {
                    setPriceUpdateNotice(false);
                    setUpdatedFormatIds(new Set());
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                >
                  <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
            ) : null}

            <View style={[styles.card, sellingFormatError && styles.cardError]}>
              {sellingFormats.length === 0 ? (
                <View style={styles.stepEmpty}>
                  <View style={[styles.stepEmptyIcon, sellingFormatError && styles.stepEmptyIconError]}>
                    <Ionicons
                      name="pricetag-outline"
                      size={28}
                      color={sellingFormatError ? COLORS.error : COLORS.primary}
                    />
                  </View>
                  <Text style={[styles.stepEmptyTitle, sellingFormatError && styles.stepEmptyTitleError]}>
                    No selling price yet
                  </Text>
                  <Text style={styles.stepEmptySub}>
                    Enter what you charge so we can show food cost % and profit.
                  </Text>
                </View>
              ) : (
                sellingFormats.map((fmt, idx) => {
              const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
                  const autoName = formatSellingFormatName(unitLabel, fmt.unit_quantity, dishName);
              const price = parseFloat(fmt.selling_price);
                  const wasUpdated = updatedFormatIds.has(fmt.id);
              return (
                <View key={fmt.id}>
                  {idx > 0 && <View style={styles.fmtDivider} />}
                  <TouchableOpacity style={styles.fmtSummaryRow} onPress={() => openEditFmtSheet(fmt)} activeOpacity={0.75}>
                    <View style={styles.fmtSummaryLeft}>
                          <View style={styles.fmtLabelRow}>
                            <Text style={styles.fmtAutoLabel} numberOfLines={1}>{autoName}</Text>
                            {wasUpdated ? (
                              <View style={styles.updatedBadge}>
                                <Text style={styles.updatedBadgeText}>{C.wizard.priceUpdatedBadge}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.fmtPriceLabel}>{labelPerSellingUnit('Selling price per', unitLabel)}</Text>
                          <Text style={[styles.fmtPriceDot, wasUpdated && styles.fmtPriceDotUpdated]}>
                            {symbol}{price.toFixed(2)}
                          </Text>
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
          </View>

          {richIngredients.length > 0 && (
            <>
                <View style={styles.liveCostHeader}>
                  <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>LIVE FOOD COST</Text>
                  <View style={[styles.scrollHintRow, { marginBottom: 0 }]}>
                    <Ionicons name="swap-vertical-outline" size={14} color={COLORS.textTertiary} />
                    <Text style={styles.scrollHintText}>{C.wizard.scrollForMoreLiveCost}</Text>
                  </View>
                </View>
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>{C.wizard.totalDishCost}</Text>
                  <Text style={styles.previewValue}>{formatCurrency(totalCost, symbol)}</Text>
                </View>

                {sellingFormats.map((fmt) => {
                  const price = parseFloat(fmt.selling_price);
                  if (!price) return null;
                  const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
                    const fmtLabel = formatSellingFormatName(unitLabel, fmt.unit_quantity, dishName);
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

      <Modal visible={showCatPicker} onClose={() => setShowCatPicker(false)} title="Category" scrollable>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <>
              <View style={styles.scrollHintRow}>
                <Ionicons name="swap-vertical-outline" size={14} color={COLORS.textTertiary} />
                <Text style={styles.scrollHintText}>{C.wizard.scrollForMoreCategories}</Text>
              </View>
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
            : isPurchaseEdit
              ? 'Edit ingredient'
              : ingSheetIngredient
                ? (ingSheetIngredient.name || 'Add to dish')
                : 'New ingredient'
        }
        scrollable={ingSheetStep === 'create'}
        keyboardLift
        keyboardOffset={
          ingSheetStep === 'create' && ingSkipKeyboardLift ? 0 : null
        }
        footer={
          ingSheetStep === 'create' ? (
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
                  newIngSaving
                    ? 'Saving…'
                    : isPurchaseEdit || editingIngId
                      ? 'Update'
                      : addToDishQueue.length > 1
                        ? 'Next'
                        : 'Add to dish'
                }
                onPress={handleInlineCreateConfirm}
                loading={newIngSaving}
                size="lg"
              />
              {!ingCreateOnly && !isPurchaseEdit && !editingIngId && addToDishQueue.length === 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    resetNewIngredientForm();
                    setIngSheetIngredient(null);
                    setIngSheetStep('search');
                  }}
                  style={styles.sheetBackBtn}
                >
                  <Text style={styles.sheetBackText}>← Back to list</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null
        }
      >
        {ingSheetStep === 'search' ? (
          <>
            <Text style={styles.pickerIntro}>
              Pick one you already saved, or add a new one if it’s not listed.
            </Text>

            <Text style={styles.pickerSectionLabel}>Your ingredients</Text>
            <View style={[styles.inputBox, { marginBottom: SPACING.sm }]}>
              <Ionicons name="search" size={16} color={COLORS.textTertiary} style={{ marginLeft: SPACING.md }} />
              <TextInput
                style={styles.textInput}
                value={ingSearch}
                onChangeText={setIngSearch}
                placeholder="Search..."
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
              />
            </View>
            {filteredIngredients.length > 4 ? (
              <View style={[styles.scrollHintRow, { marginBottom: SPACING.xs }]}>
                <Ionicons name="swap-vertical-outline" size={14} color={COLORS.textTertiary} />
                <Text style={styles.scrollHintText}>{C.wizard.scrollForMoreIngredients}</Text>
              </View>
            ) : null}
              <FlatList
                data={filteredIngredients}
                keyExtractor={(i) => i.id}
              style={{ maxHeight: 260 }}
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
                  <Text style={styles.modalEmptyHint}>
                    {ingSearch.trim()
                      ? 'No match in your list.'
                      : 'Nothing left to pick from your list.'}
                  </Text>
                  </View>
                }
              />

            <View style={styles.pickerOrDivider}>
              <View style={styles.pickerOrLine} />
              <Text style={styles.pickerOrText}>or</Text>
              <View style={styles.pickerOrLine} />
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
                <Text style={styles.createIngredientTitle}>Add new ingredient</Text>
                <Text style={styles.createIngredientHint}>Not in the list? Enter what you bought</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </>
        ) : ingSheetStep === 'create' ? (
          <>
            {isAddExistingCollapsed ? (
              <>
                <Text style={styles.inlineSectionLabel}>Used in this dish</Text>
                <View style={[styles.twoCol, { marginBottom: SPACING.md }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetLabel}>Used quantity</Text>
                    <View
                      ref={newIngUsedQtyRef}
                      collapsable={false}
                      style={[styles.inputBox, newIngErrors.used_quantity && styles.inputBoxError]}
                    >
                      <TextInput
                        style={styles.textInput}
                        value={newIngUsedQty}
                        onChangeText={(v) => {
                          setNewIngUsedQty(v);
                          setNewIngErrors((e) => ({ ...e, used_quantity: undefined }));
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={COLORS.textTertiary}
                        autoFocus={!editingIngId}
                        onFocus={() => setIngSkipKeyboardLift(false)}
                      />
                    </View>
                    {newIngErrors.used_quantity ? (
                      <Text style={styles.errorText}>{newIngErrors.used_quantity}</Text>
                    ) : null}
                  </View>
                  <View style={{ width: SPACING.sm }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetLabel}>Used unit</Text>
                    <TouchableOpacity
                      style={[styles.inputBox, styles.unitBox]}
                      onPress={() => setShowUsedUnitPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unitSelectText} numberOfLines={1}>
                        {formatUnitLabel(newIngUsedUnit)}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.boughtSummary}>
                  <View style={styles.boughtSummaryText}>
                    <Text style={styles.boughtSummaryLabel}>What you bought</Text>
                    <Text style={styles.boughtSummaryValue} numberOfLines={2}>
                      {newIngName.trim() || 'Ingredient'}
                      {' · '}
                      {symbol}{newIngPurchasePrice || '0'} / {newIngPurchaseQty || '1'}{' '}
                      {formatUnitLabel(newIngPurchaseUnit)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIngFormMode('edit-purchase')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.boughtSummaryEdit}
                    accessibilityRole="button"
                    accessibilityLabel="Edit what you bought"
                  >
                    <Text style={styles.boughtSummaryEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
          </>
        ) : (
          <>
                {ingSheetIngredient && isPurchaseEdit ? (
                  <View style={styles.impactNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color={COLORS.warning}
                      style={{ marginTop: 1 }}
                    />
                    <Text style={styles.impactNoticeTextActive}>
                      Changing purchased cost, quantity, or unit updates this ingredient on every dish that uses it.
              </Text>
                  </View>
                ) : null}

                <View style={styles.purchaseEditHeader}>
                  <Text style={[styles.inlineSectionLabel, { marginBottom: 0, flex: 1 }]}>
                    What you bought
                  </Text>
                  {ingSheetIngredient && isPurchaseEdit ? (
                    <TouchableOpacity onPress={cancelPurchaseEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.boughtSummaryEditText}>
                        {isLibraryEdit ? 'Close' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.sheetLabel}>Name</Text>
                <View
                  ref={newIngNameRef}
                  collapsable={false}
                  style={[styles.inputBox, newIngErrors.name && styles.inputBoxError, { marginBottom: SPACING.md }]}
                >
                  <TextInput
                    style={styles.textInput}
                    value={newIngName}
                    onChangeText={(v) => { setNewIngName(v); setNewIngErrors((e) => ({ ...e, name: undefined })); }}
                    placeholder="e.g. Butter, Flour..."
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="words"
                    onFocus={() => setIngSkipKeyboardLift(true)}
                  />
                </View>
                {newIngErrors.name ? <Text style={[styles.errorText, { marginTop: -SPACING.sm, marginBottom: SPACING.sm }]}>{newIngErrors.name}</Text> : null}

                <View style={{ marginBottom: SPACING.sm }}>
                  <Text style={styles.sheetLabel}>Purchased cost</Text>
                  <View
                    ref={newIngPurchasePriceRef}
                    collapsable={false}
                    style={[styles.inputBox, styles.priceBox, newIngErrors.purchase_price && styles.inputBoxError]}
                  >
                    <Text style={styles.currencyPrefix}>{symbol}</Text>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={newIngPurchasePrice}
                      onChangeText={(v) => {
                        setNewIngPurchasePrice(v);
                        setNewIngErrors((e) => ({ ...e, purchase_price: undefined }));
                      }}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textTertiary}
                      onFocus={() => setIngSkipKeyboardLift(true)}
                    />
                  </View>
                  {newIngErrors.purchase_price ? (
                    <Text style={styles.errorText}>{newIngErrors.purchase_price}</Text>
                  ) : null}

                  {ingSheetIngredient && isPurchaseEdit ? (
                    <View style={styles.priceHistoryBlock}>
                      {canViewPriceHistory && recentPriceMoveHint ? (
                        <Text style={styles.priceHistoryHint}>{recentPriceMoveHint}</Text>
                      ) : null}
                      <TouchableOpacity
                        style={styles.priceHistoryRow}
                        onPress={openPriceHistoryFromForm}
                        activeOpacity={0.7}
                      >
                        <View style={styles.priceHistoryRowIcon}>
                          <Ionicons
                            name="trending-up-outline"
                            size={18}
                            color={canViewPriceHistory ? COLORS.primary : COLORS.textTertiary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.priceHistoryRowTitle}>
                            {canViewPriceHistory ? 'See price history' : 'Price history · Hobbyist'}
                          </Text>
                          <Text style={styles.priceHistoryRowSub}>
                            {canViewPriceHistory
                              ? (priceHistoryLoading
                                ? 'Loading…'
                                : priceHistoryRows.length > 0
                                  ? `${priceHistoryRows.length} recent change${priceHistoryRows.length === 1 ? '' : 's'}`
                                  : 'No changes recorded yet')
                              : 'Unlock to see past price changes'}
                          </Text>
                        </View>
                        <Ionicons
                          name={canViewPriceHistory ? 'chevron-forward' : 'lock-closed-outline'}
                          size={16}
                          color={COLORS.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.purchaseRow, { marginBottom: SPACING.sm }]}>
                  <View style={[styles.purchaseCol, { flex: 1 }]}>
                    <Text style={styles.sheetLabel}>Purchased quantity</Text>
                    <View
                      ref={newIngPurchaseQtyRef}
                      collapsable={false}
                      style={[styles.inputBox, newIngErrors.purchase_quantity && styles.inputBoxError]}
                    >
                      <TextInput
                        style={styles.textInput}
                        value={newIngPurchaseQty}
                        onChangeText={(v) => {
                          setNewIngPurchaseQty(v);
                          setNewIngErrors((e) => ({ ...e, purchase_quantity: undefined }));
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={COLORS.textTertiary}
                        onFocus={() => setIngSkipKeyboardLift(false)}
                      />
                </View>
                    {newIngErrors.purchase_quantity ? (
                      <Text style={styles.errorText}>{newIngErrors.purchase_quantity}</Text>
                      ) : null}
                    </View>
                  <View style={styles.purchaseColGap} />
                  <View style={[styles.purchaseCol, { flex: 1 }]}>
                    <Text style={styles.sheetLabel}>Purchased unit</Text>
                    <TouchableOpacity
                      style={[styles.inputBox, styles.unitBox]}
                      onPress={() => setShowPurchaseUnitPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unitSelectText} numberOfLines={1}>
                        {formatUnitLabel(newIngPurchaseUnit)}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {(() => {
                  const q = parseFloat(newIngPurchaseQty) || 1;
                  const p = parseFloat(newIngPurchasePrice);
                  if (!newIngPurchasePrice?.trim() || Number.isNaN(p) || p <= 0) return null;
                  return (
                    <Text style={styles.inlineCostHint}>
                      Bought {q} {formatUnitLabel(newIngPurchaseUnit)} for {symbol}{p.toFixed(2)}
                    </Text>
                  );
                })()}

                <TouchableOpacity
                  style={styles.optionalToggle}
                  onPress={() => setNewIngShowOptional((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={newIngShowOptional ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.optionalToggleText}>
                    {newIngShowOptional ? 'Hide optional fields' : 'Waste % & notes (optional)'}
                  </Text>
                </TouchableOpacity>

                {newIngShowOptional ? (
                  <View style={styles.optionalFields}>
                    <Text style={styles.sheetLabel}>Waste %</Text>
                    <View
                      ref={newIngWasteRef}
                      collapsable={false}
                      style={[styles.inputBox, { marginBottom: SPACING.sm }]}
                    >
                      <TextInput
                        style={styles.textInput}
                        value={newIngWastePercent}
                        onChangeText={setNewIngWastePercent}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={COLORS.textTertiary}
                        onFocus={() => setIngSkipKeyboardLift(false)}
                      />
              </View>
                    <Text style={styles.sheetLabel}>Notes</Text>
                    <View style={[styles.inputBox, styles.multilineBox, { marginBottom: SPACING.sm }]}>
                      <TextInput
                        style={[styles.textInput, styles.multilineInput]}
                        value={newIngNotes}
                        onChangeText={setNewIngNotes}
                        placeholder="Brand, supplier..."
                        placeholderTextColor={COLORS.textTertiary}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                        onFocus={() => setIngSkipKeyboardLift(false)}
                      />
                    </View>
                  </View>
                ) : null}

                {showUsedQtyInPurchaseForm ? (
                  <>
                    <View style={styles.inlineDivider} />
                    <Text style={styles.inlineSectionLabel}>Used in this dish</Text>
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetLabel}>Used quantity</Text>
                        <View
                          ref={newIngUsedQtyRef}
                          collapsable={false}
                          style={[styles.inputBox, newIngErrors.used_quantity && styles.inputBoxError]}
                        >
                          <TextInput
                            style={styles.textInput}
                            value={newIngUsedQty}
                            onChangeText={(v) => {
                              setNewIngUsedQty(v);
                              setNewIngErrors((e) => ({ ...e, used_quantity: undefined }));
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={COLORS.textTertiary}
                            onFocus={() => setIngSkipKeyboardLift(false)}
                          />
                        </View>
                        {newIngErrors.used_quantity ? (
                          <Text style={styles.errorText}>{newIngErrors.used_quantity}</Text>
                        ) : null}
                      </View>
                      <View style={{ width: SPACING.sm }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetLabel}>Used unit</Text>
                        <TouchableOpacity
                          style={[styles.inputBox, styles.unitBox]}
                          onPress={() => setShowUsedUnitPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.unitSelectText} numberOfLines={1}>
                            {formatUnitLabel(newIngUsedUnit)}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </Modal>

      <Modal
        visible={showPurchaseUnitPicker}
        onClose={() => setShowPurchaseUnitPicker(false)}
        title="Purchased unit"
        scrollable={false}
      >
        <UnitSystemToggle
          value={purchaseUnitSystem}
          onChange={switchPurchaseUnitSystem}
        />
        {purchaseUnitGroups.map((group) => (
          <View key={group.label} style={styles.unitGroup}>
            <Text style={styles.unitGroupLabel}>{group.label}</Text>
                <View style={styles.chipWrap}>
              {group.units.map((u) => (
                    <TouchableOpacity
                      key={u.value}
                  style={[styles.chip, newIngPurchaseUnit === u.value && styles.chipActive]}
                  onPress={() => setNewPurchaseUnit(u.value)}
                    >
                  <Text style={[styles.chipText, newIngPurchaseUnit === u.value && styles.chipTextActive]}>
                    {u.label}
                  </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
        ))}
      </Modal>

      <Modal
        visible={showUsedUnitPicker}
        onClose={() => setShowUsedUnitPicker(false)}
        title="Used unit"
        scrollable={false}
      >
        <View style={styles.chipWrap}>
          {compatibleUsedUnits(newIngPurchaseUnit).map((u) => (
            <TouchableOpacity
              key={u.value}
              style={[styles.chip, newIngUsedUnit === u.value && styles.chipActive]}
              onPress={() => {
                setNewIngUsedUnit(u.value);
                setShowUsedUnitPicker(false);
              }}
            >
              <Text style={[styles.chipText, newIngUsedUnit === u.value && styles.chipTextActive]}>
                {u.label}
              </Text>
            </TouchableOpacity>
          ))}
            </View>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
      />

      <Modal
        visible={showPriceHistorySheet}
        onClose={() => setShowPriceHistorySheet(false)}
        title="Price history"
        scrollable={false}
      >
        {priceHistoryLoading ? (
          <View style={styles.priceHistoryEmpty}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : priceHistoryRows.length === 0 ? (
          <View style={styles.priceHistoryEmpty}>
            <Text style={styles.modalEmptyHint}>No price changes recorded yet.</Text>
          </View>
        ) : (
          <FlatList
            data={priceHistoryRows}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 320 }}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => {
              const oldP = Number(item.old_price);
              const newP = Number(item.new_price);
              const up = newP > oldP;
              const down = newP < oldP;
              const pct = oldP > 0 ? ((newP - oldP) / oldP) * 100 : null;
              return (
                <View style={styles.priceHistoryItem}>
                  <View style={styles.priceHistoryItemTop}>
                    <Text style={styles.priceHistoryOld}>
                      {symbol}{oldP.toFixed(2)}
                    </Text>
                    <Ionicons
                      name={up ? 'arrow-up' : down ? 'arrow-down' : 'remove'}
                      size={14}
                      color={up ? COLORS.error : down ? COLORS.success : COLORS.textTertiary}
                      style={{ marginHorizontal: 6 }}
                    />
                    <Text style={[
                      styles.priceHistoryNew,
                      up && { color: COLORS.error },
                      down && { color: COLORS.success },
                    ]}>
                      {symbol}{newP.toFixed(2)}
                    </Text>
                    {pct != null && Math.abs(pct) >= 0.5 ? (
                      <Text style={[
                        styles.priceHistoryPct,
                        up && { color: COLORS.error },
                        down && { color: COLORS.success },
                      ]}>
                        {up ? '+' : ''}{pct.toFixed(1)}%
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.priceHistoryDate}>{formatHistoryDate(item.changed_at)}</Text>
                </View>
              );
            }}
          />
        )}
      </Modal>

      <Modal
        visible={showFmtSheet}
        onClose={closeFmtSheet}
        title={editingFmtId
          ? C.action.editSellingPriceFor(dishName)
          : C.action.addSellingPriceFor(dishName)}
        scrollable
        keyboardLift
        footer={(
          <Button
            title={editingFmtId ? C.action.updateSellingPrice : C.action.addSellingPrice}
            onPress={handleFmtSheetConfirm}
            size="lg"
          />
        )}
      >
        <Text style={styles.fmtSheetHint}>{C.wizard.sellingFormatHint}</Text>

        <Text style={styles.sheetLabel}>Selling unit</Text>
        <TouchableOpacity
          style={[styles.inputBox, styles.unitBox, { marginBottom: SPACING.md }]}
          onPress={() => setShowSellingUnitPicker(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select selling unit"
        >
          <Text style={styles.unitSelectText} numberOfLines={1}>
            {sellingUnitOptions.find((u) => u.value === fmtSheetUnit)?.label
              ?? formatUnitLabel(fmtSheetUnit)
              ?? 'Serving'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetLabel}>Quantity</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={fmtSheetQty}
                onChangeText={(v) => {
                  setFmtSheetQty(v);
                  applySuggestedFmtPrice(v);
                }}
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
                onChangeText={(v) => {
                  setFmtSheetPrice(v);
                  setFmtPriceError('');
                  setSheetPriceRefreshed(false);
                }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            {fmtPriceError ? <Text style={styles.errorText}>{fmtPriceError}</Text> : null}
            {sheetPriceRefreshed && !fmtPriceError ? (
              <Text style={styles.sheetPriceRefreshedText}>{C.wizard.sheetPriceRefreshed}</Text>
            ) : null}
          </View>
        </View>

        {(() => {
          const unitLabel = sellingUnitOptions.find((u) => u.value === fmtSheetUnit)?.label ?? fmtSheetUnit;
          const autoName = formatSellingFormatName(unitLabel, fmtSheetQty, dishName);
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

      <Modal
        visible={showSellingUnitPicker}
        onClose={() => setShowSellingUnitPicker(false)}
        title="Selling unit"
        scrollable
      >
        {sellingUnitOptions.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={styles.listRow}
            onPress={() => {
              setFmtSheetUnit(u.value);
              setShowSellingUnitPicker(false);
            }}
          >
            <Text style={styles.listRowText}>{u.label}</Text>
            {fmtSheetUnit === u.value ? (
              <Ionicons name="checkmark" size={18} color={COLORS.primary} />
            ) : null}
          </TouchableOpacity>
        ))}
      </Modal>

      <ConfirmModal
        visible={showUnsavedLeaveModal}
        onClose={dismissUnsavedLeaveModal}
        onConfirm={handleSaveFromUnsavedLeave}
        onCancel={confirmLeaveWithoutSaving}
        title={C.wizard.unsavedPricesTitle}
        message={C.wizard.unsavedPricesMessage}
        confirmLabel={isEdit ? C.action.saveChanges : C.action.seeResult}
        cancelLabel={C.action.leaveWithoutSaving}
        variant="primary"
        loading={unsavedLeaveSaving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  editLoadingBody: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    gap: SPACING.sm,
  },
  loadErrorText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
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
  stepCountHint: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
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
  liveCostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
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
  impactNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
    backgroundColor: '#FFFBEB',
  },
  impactNoticeTextActive: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
    lineHeight: 20,
  },
  priceHistoryBlock: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  priceHistoryHint: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  priceHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  priceHistoryRowIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  priceHistoryRowTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceHistoryRowSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  priceHistoryEmpty: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  priceHistoryItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceHistoryItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceHistoryOld: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  priceHistoryNew: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceHistoryPct: {
    marginLeft: 'auto',
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  priceHistoryDate: {
    marginTop: 4,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
  purchaseEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  boughtSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  boughtSummaryText: { flex: 1 },
  boughtSummaryLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  boughtSummaryValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  boughtSummaryEdit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  boughtSummaryEditText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stepEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.sm,
  },
  stepEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  stepEmptyIconError: { backgroundColor: '#FEF2F2' },
  stepEmptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  stepEmptyTitleError: { color: COLORS.error },
  stepEmptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
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
  ingRowCost: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  step2CostValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLORS.primary,
  },
  step2CostHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 17,
  },

  fmtDivider: { height: 1, backgroundColor: COLORS.border },
  fmtSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    minHeight: 44,
  },
  fmtSummaryLeft: { flex: 1, gap: 2 },
  fmtAutoLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  fmtPriceLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  fmtPriceDot: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  fmtPriceDotUpdated: { color: COLORS.accent },
  fmtLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  updatedBadge: {
    backgroundColor: '#FFF4E6',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  updatedBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.accent,
  },
  priceUpdateBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  priceUpdateBannerText: { flex: 1, gap: 2 },
  priceUpdateBannerTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  priceUpdateBannerSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  sheetPriceRefreshedText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },

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
  fmtSheetHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.md,
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
  footerStack: {
    gap: SPACING.sm,
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
  pickerIntro: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  scrollHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  scrollHintText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  pickerSectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  pickerOrDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  pickerOrLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  pickerOrText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
  },
  inlineHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  inlineSectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: SPACING.sm,
  },
  inlineDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  purchaseRow: { flexDirection: 'row', alignItems: 'flex-start' },
  purchaseCol: {},
  purchaseColGap: { width: SPACING.xs },
  unitBox: { justifyContent: 'space-between', paddingHorizontal: SPACING.sm },
  inlineCostHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  optionalToggleText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  optionalFields: {
    marginBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  multilineBox: { alignItems: 'flex-start' },
  multilineInput: { minHeight: 56, paddingTop: SPACING.sm, textAlignVertical: 'top' },
  unitSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  unitSelectText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    fontWeight: '500',
    marginRight: SPACING.xs,
  },
  unitGroup: { marginBottom: SPACING.md },
  unitGroupLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
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
