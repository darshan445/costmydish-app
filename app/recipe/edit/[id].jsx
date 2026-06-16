import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert, FlatList,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { KeyboardFormLayout } from '../../../components/ui/KeyboardFormLayout';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useRecipes } from '../../../hooks/useRecipes';
import { useRecipeCost } from '../../../hooks/useRecipeCost';
import { useIngredients } from '../../../hooks/useIngredients';
import useRecipeStore from '../../../stores/recipeStore';
import useSettingsStore from '../../../stores/settingsStore';
import { formatCurrency, formatFoodCostPercent } from '../../../utils/format';
import { formatSellingFormatName, labelPerSellingUnit } from '../../../utils/sellingFormat';
import { getIngredientUsageSummary } from '../../../utils/unitDisplay';
import { calculateSellingFormatMetrics } from '../../../lib/calculations';
import { useUnitSystem } from '../../../hooks/useUnitSystem';
import { formatUnitLabel, RECIPE_CATEGORIES } from '../../../constants/units';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../../constants/theme';

let _editFmtId = 0;
function newFmtId() { return `edit_${++_editFmtId}`; }

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { updateRecipe } = useRecipes();
  const { fetchRecipeWithIngredients, sellingUnits } = useRecipeStore();
  const { ingredients } = useIngredients();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();
  const { getCompatibleUnits } = useUnitSystem();

  const sellingUnitOptions = sellingUnits.length > 0
    ? sellingUnits.map((u) => ({ value: u.name, label: u.label ?? u.name }))
    : [{ value: 'piece', label: 'piece' }, { value: 'slice', label: 'slice' }, { value: 'pack', label: 'pack' }, { value: 'box', label: 'box' }];

  const scrollRef = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [sellingFormats, setSellingFormats] = useState([
    { id: newFmtId(), selling_unit_name: sellingUnitOptions[0]?.value ?? 'piece', unit_quantity: '1', selling_price: '' },
  ]);

  const [showCatPicker, setShowCatPicker] = useState(false);

  // Ingredient bottom sheet — two-step: search → configure
  const [showIngSheet, setShowIngSheet] = useState(false);
  const [ingSearch, setIngSearch] = useState('');
  const [ingSheetStep, setIngSheetStep] = useState('search');
  const [ingSheetIngredient, setIngSheetIngredient] = useState(null);
  const [ingSheetQty, setIngSheetQty] = useState('1');
  const [ingSheetUnit, setIngSheetUnit] = useState('');
  const [editingIngId, setEditingIngId] = useState(null);
  const [ingQtyError, setIngQtyError] = useState('');

  // Selling format bottom sheet
  const [showFmtSheet, setShowFmtSheet] = useState(false);
  const [fmtSheetUnit, setFmtSheetUnit] = useState(sellingUnitOptions[0]?.value ?? 'piece');
  const [fmtSheetQty, setFmtSheetQty] = useState('1');
  const [fmtSheetPrice, setFmtSheetPrice] = useState('');
  const [fmtPriceError, setFmtPriceError] = useState('');
  const [editingFmtId, setEditingFmtId] = useState(null);

  const { control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      category: 'other',
      target_food_cost_percent: '30',
    },
  });

  useEffect(() => {
    (async () => {
      const { data } = await fetchRecipeWithIngredients(id);
      if (data) {
        reset({
          name: data.name,
          category: data.category ?? 'other',
          target_food_cost_percent: String(data.target_food_cost_percent),
        });
        setRecipeIngredients(
          (data.recipe_ingredients ?? []).map((ri) => ({
            ingredient_id: ri.ingredient_id,
            ingredient: ri.ingredient,
            quantity: String(ri.quantity),
            unit: ri.unit,
          }))
        );
        if (data.selling_formats?.length > 0) {
          setSellingFormats(data.selling_formats.map((f) => ({ ...f, id: newFmtId() })));
        }
      }
      setPageLoading(false);
    })();
  }, [id]);

  const [watchCategory, watchTarget] = watch(['category', 'target_food_cost_percent']);

  const targetPct = parseFloat(watchTarget) || 30;
  const categoryLabel = RECIPE_CATEGORIES.find((c) => c.value === watchCategory)?.label ?? 'Other';

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
    setIngSheetQty('1');
    setIngSheetUnit('');
    setEditingIngId(null);
    setIngSearch('');
    setShowIngSheet(true);
  };

  const openEditIngSheet = (ri) => {
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
    } else {
      setRecipeIngredients((prev) => [
        ...prev,
        { ingredient_id: ingSheetIngredient.id, ingredient: ingSheetIngredient, quantity: qtyStr, unit: ingSheetUnit },
      ]);
    }
    setShowIngSheet(false);
  };

  const handleIngSheetClose = () => {
    setShowIngSheet(false);
    setIngSearch('');
    setIngSheetStep('search');
    setIngSheetIngredient(null);
    setEditingIngId(null);
    setIngQtyError('');
  };

  const removeIngredient = (ingredientId) => {
    setRecipeIngredients((prev) => prev.filter((r) => r.ingredient_id !== ingredientId));
  };

  const updateFormat = (fmtId, field, value) => {
    setSellingFormats((prev) => prev.map((f) => f.id === fmtId ? { ...f, [field]: value } : f));
  };

  const addFormat = () => {
    setSellingFormats((prev) => [
      ...prev,
      { id: newFmtId(), selling_unit_name: sellingUnitOptions[0]?.value ?? 'piece', unit_quantity: '1', selling_price: '' },
    ]);
  };

  // ── Selling format helpers ─────────────────────────────────────────────────

  const openAddFmtSheet = () => {
    setFmtSheetUnit(sellingUnitOptions[0]?.value ?? 'piece');
    setFmtSheetQty('1');
    setFmtSheetPrice('');
    setFmtPriceError('');
    setEditingFmtId(null);
    setShowFmtSheet(true);
  };

  const openEditFmtSheet = (fmt) => {
    setFmtSheetUnit(fmt.selling_unit_name);
    setFmtSheetQty(fmt.unit_quantity);
    setFmtSheetPrice(fmt.selling_price);
    setFmtPriceError('');
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
    setShowFmtSheet(false);
  };

  const removeFormat = (fmtId) => {
    setSellingFormats((prev) => prev.filter((f) => f.id !== fmtId));
  };

  const onSubmit = async (data) => {
    if (recipeIngredients.length === 0) {
      Alert.alert('No ingredients', 'Add at least one ingredient before saving.');
      return;
    }

    const submitIngredients = recipeIngredients.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: parseFloat(ri.quantity) || 0,
      unit: ri.unit,
    }));

    const namedFormats = sellingFormats.map((fmt) => {
      const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
      return { ...fmt, name: formatSellingFormatName(unitLabel, fmt.unit_quantity) };
    });

    const { error } = await updateRecipe(
      id,
      {
        name: data.name,
        category: data.category,
        target_food_cost_percent: targetPct,
      },
      submitIngredients,
      namedFormats
    );
    if (error) { Alert.alert('Error', error); return; }
    router.replace(`/recipe/${id}`);
  };

  if (pageLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit recipe</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Name field */}
          <View style={styles.skSection}>
            <Skeleton height={11} width={80} style={{ marginBottom: 8 }} />
            <Skeleton height={44} style={{ borderRadius: RADIUS.md }} />
          </View>

          {/* Category + Target % row */}
          <View style={[styles.skSection, { flexDirection: 'row', gap: SPACING.sm }]}>
            <View style={{ flex: 1 }}>
              <Skeleton height={11} width={70} style={{ marginBottom: 8 }} />
              <Skeleton height={44} style={{ borderRadius: RADIUS.md }} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton height={11} width={90} style={{ marginBottom: 8 }} />
              <Skeleton height={44} style={{ borderRadius: RADIUS.md }} />
            </View>
          </View>

          {/* Ingredients section card */}
          <View style={styles.skCard}>
            <Skeleton height={11} width={96} style={{ marginBottom: SPACING.sm }} />
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.skIngRow}>
                <View style={{ flex: 1 }}>
                  <Skeleton height={13} style={{ maxWidth: '55%', marginBottom: 6 }} />
                  <Skeleton height={11} style={{ maxWidth: '38%' }} />
                </View>
                <Skeleton height={13} width={60} />
              </View>
            ))}
          </View>

          {/* Selling formats section card */}
          <View style={styles.skCard}>
            <Skeleton height={11} width={110} style={{ marginBottom: SPACING.sm }} />
            {[1, 2].map((n) => (
              <View key={n} style={styles.skFmtRow}>
                <Skeleton height={14} style={{ flex: 1, maxWidth: '50%' }} />
                <Skeleton height={14} width={64} />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={styles.skFooter}>
          <Skeleton height={50} style={{ borderRadius: RADIUS.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit recipe</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardFormLayout
          scrollRef={scrollRef}
          contentContainerStyle={styles.scroll}
          scrollProps={{
            onLayout: () => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false }),
          }}
          footer={(
            <View style={styles.stickyFooter}>
              <Button title="Save changes" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" />
            </View>
          )}
        >

          {/* Recipe name */}
          <Controller control={control} name="name" rules={{ required: 'Name is required' }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Recipe name</Text>
                <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Recipe name"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
              </View>
            )} />

          {/* Category + Food cost target */}
          <View style={styles.twoCol}>
            <Controller control={control} name="category"
              render={({ field: { value } }) => (
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
              )} />

            <View style={{ width: SPACING.sm }} />

            <Controller control={control} name="target_food_cost_percent"
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
              )} />
          </View>

          {/* INGREDIENTS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>INGREDIENTS</Text>
          </View>
          <View style={styles.card}>
            {recipeIngredients.map((ri, idx) => {
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
                    <Text style={styles.ingName} numberOfLines={1}>{ri.ingredient?.name ?? ri.ingredient_id}</Text>
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
            })}

            {recipeIngredients.length === 0 && (
              <View style={styles.emptyIng}>
                <Text style={styles.emptyIngText}>No ingredients added yet</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.addIngBtn}
              onPress={openAddIngSheet}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.addIngText}>Add ingredient</Text>
            </TouchableOpacity>
          </View>

          {/* SELLING FORMATS */}
          <Text style={styles.sectionLabel}>SELLING FORMATS</Text>
          <View style={styles.card}>
            {sellingFormats.map((fmt, idx) => {
              const unitLabel = sellingUnitOptions.find((u) => u.value === fmt.selling_unit_name)?.label ?? fmt.selling_unit_name;
              const autoName = formatSellingFormatName(unitLabel, fmt.unit_quantity);
              const price = parseFloat(fmt.selling_price);
              return (
                <View key={fmt.id}>
                  {idx > 0 && <View style={styles.fmtDivider} />}
                  <TouchableOpacity style={styles.fmtSummaryRow} onPress={() => openEditFmtSheet(fmt)} activeOpacity={0.75}>
                    <View style={styles.fmtSummaryLeft}>
                      <Text style={styles.fmtAutoLabel}>{autoName}</Text>
                      {price > 0 ? (
                        <>
                          <Text style={styles.fmtPriceLabel}>{labelPerSellingUnit('Selling price per', unitLabel)}</Text>
                          <Text style={styles.fmtPriceDot}>{symbol}{price.toFixed(2)}</Text>
                        </>
                      ) : (
                        <Text style={styles.fmtPricePlaceholder}>{labelPerSellingUnit('Set selling price per', unitLabel)}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} style={{ marginLeft: SPACING.xs }} />
                    <TouchableOpacity
                      onPress={() => {
                        if (sellingFormats.length === 1) {
                          Alert.alert('Cannot remove', 'You need at least one selling format.');
                          return;
                        }
                        removeFormat(fmt.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ marginLeft: SPACING.sm }}
                    >
                      <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity style={styles.addFormatBtn} onPress={openAddFmtSheet} activeOpacity={0.7}>
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={styles.addFormatText}>Add selling format</Text>
            </TouchableOpacity>
          </View>

          {/* LIVE COST PREVIEW */}
          {richIngredients.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>LIVE COST PREVIEW</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Total recipe cost</Text>
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
                        <Text style={styles.previewLabel}>Total batch profit</Text>
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

        </KeyboardFormLayout>

      {/* Category picker */}
      <Modal visible={showCatPicker} onClose={() => setShowCatPicker(false)} title="Category" scrollable={false}>
        <Controller control={control} name="category"
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
          )} />
      </Modal>

      {/* ── Ingredient bottom sheet (two-step: search → configure) ── */}
      <Modal
        visible={showIngSheet}
        onClose={handleIngSheetClose}
        title={ingSheetStep === 'search' ? 'Add ingredient' : (ingSheetIngredient?.name ?? 'Configure')}
        scrollable={false}
        footer={ingSheetStep === 'config' ? (
          <>
            <Button
              title={editingIngId ? 'Update' : 'Add to recipe'}
              onPress={handleIngSheetConfirm}
              size="lg"
            />
            {editingIngId === null && (
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
            {ingredients.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No ingredients yet</Text>
                <Text style={styles.modalEmptyHint}>Go to the Ingredients tab to add some first.</Text>
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
                    placeholder="1"
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

      {/* ── Selling format bottom sheet ── */}
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
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  fieldGroup: { marginBottom: SPACING.md },
  twoCol: { flexDirection: 'row', alignItems: 'flex-start' },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  colLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
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
  suffix: { paddingRight: SPACING.md, fontSize: FONT_SIZE.base, color: COLORS.textSecondary, fontWeight: '500' },
  priceBox: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: { paddingLeft: SPACING.md, fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  previewFormatName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },

  // Ingredient list rows (tappable, read-only)
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
  emptyIng: { paddingVertical: SPACING.md, alignItems: 'center' },
  emptyIngText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
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
  },
  addIngText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },

  // Selling format summary rows
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
  fmtPricePlaceholder: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, fontWeight: '400' },

  // Shared sheet styles
  sheetLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  sheetSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  sheetUsageWrap: { marginTop: SPACING.xs, gap: 2 },
  sheetUsageLine: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 16 },
  sheetConvertedLine: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600', lineHeight: 16 },
  sheetBackBtn: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  sheetBackText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  // Format sheet chip/label
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
  removeFormatBtn: { padding: SPACING.xs },
  addFormatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  addFormatText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '500' },

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

  // Sticky cost strip + footer
  costStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  costStripMetric: { flex: 1, alignItems: 'center' },
  costStripLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 1 },
  costStripValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  costStripDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
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

  // Skeleton layout styles
  skSection: { marginBottom: SPACING.md },
  skCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  skIngRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  skFmtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  skFooter: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
