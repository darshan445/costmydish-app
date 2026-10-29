import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert, AppState, FlatList, Keyboard,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { SellingFormatSheet } from '../../components/recipe/SellingFormatSheet';
import { Modal } from '../../components/ui/Modal';
import { KeyboardFormLayout } from '../../components/ui/KeyboardFormLayout';
import { Skeleton } from '../../components/ui/Skeleton';
import { useIngredients } from '../../hooks/useIngredients';
import useRecipeStore from '../../stores/recipeStore';
import useSettingsStore from '../../stores/settingsStore';
import { capitalize, formatCurrency, formatFoodCostPercent, marginStatusLabel } from '../../utils/format';
import { formatSellingFormatName, labelPerSellingUnit, yieldUnitText } from '../../utils/sellingFormat';
import { getIngredientUsageSummary } from '../../utils/unitDisplay';
import {
  calculateDishSummary,
  calculateSellingFormatMetrics,
  parsePositiveNumber,
} from '../../lib/calculations';
import { track, AnalyticsEvents } from '../../lib/analytics';
import {
  endDishSession, getDishSessionLastAction, setDishSessionRecipeId, startDishSession, trackDish,
} from '../../lib/foodCostAnalytics';
import { supabase } from '../../lib/supabase';
import {
  consumePendingAddToDishIngredientIds,
} from '../../lib/pendingRecipeIngredients';
import { useUnitSystem } from '../../hooks/useUnitSystem';
import { useSubscription } from '../../hooks/useSubscription';
import useIngredientStore from '../../stores/ingredientStore';
import { areUnitsCompatible } from '../../lib/units';
import { formatUnitLabel, getUnitFamily, RECIPE_CATEGORIES, getUnitGroupsForSystem, getDefaultPurchaseUnit, isUnitInSystem, inferUnitSystem, getCompatibleUnitsForIngredient, getDefaultUsedUnit, getDefaultSellingUnitForCategory, getUniqueSellingUnitOptions } from '../../constants/units';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { UnitSystemToggle } from '../../components/ui/UnitSystemToggle';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

const DEFAULT_CATEGORY = 'main_course';

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

/**
 * Exactly what save_recipe receives for the dish on screen. Its JSON doubles as the
 * fingerprint used to skip saves when nothing changed.
 * Until a price is entered, the default format is saved at the suggested price.
 */
function buildDishPayload({
  name, category, targetPct, yieldQty, yieldUnit, defaultPrice, suggestedPrice,
  recipeIngredients, sellingFormats, unitLabel,
}) {
  const dishName = String(name ?? '').replace(/\s+/g, ' ').trim() || C.wizard.untitledDish;
  const yieldQuantity = parsePositiveNumber(yieldQty) ?? 1;
  const enteredPrice = parsePositiveNumber(defaultPrice);
  return {
    recipeData: { name: dishName, category, target_food_cost_percent: targetPct },
    recipeIngredients: recipeIngredients
      .filter((ri) => parsePositiveNumber(ri.quantity) != null && ri.unit)
      .map((ri) => ({ ingredient_id: ri.ingredient_id, quantity: ri.quantity, unit: ri.unit })),
    sellingFormats: [
      {
        name: formatSellingFormatName(unitLabel(yieldUnit), yieldQuantity, dishName),
        selling_unit_name: yieldUnit,
        unit_quantity: yieldQuantity,
        selling_price: enteredPrice ?? suggestedPrice ?? null,
        is_default: true,
      },
      ...sellingFormats.map((f) => ({
        name: formatSellingFormatName(unitLabel(f.selling_unit_name), f.unit_quantity, dishName),
        selling_unit_name: f.selling_unit_name,
        unit_quantity: f.unit_quantity,
        selling_price: f.selling_price,
        is_default: false,
      })),
    ],
  };
}

function validateTarget(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return (Number.isFinite(n) && n > 0 && n <= 100) || 'Enter a % between 1 and 100';
}

export default function CreateRecipeScreen({ recipeId: recipeIdProp } = {}) {
  const router = useRouter();
  const {
    editId: editIdParam,
    name: prefillNameParam,
    yield: prefillYieldParam,
    unit: prefillUnitParam,
  } = useLocalSearchParams();
  const recipeId = recipeIdProp
    ?? (typeof editIdParam === 'string' ? editIdParam : editIdParam?.[0])
    ?? null;
  const isEdit = Boolean(recipeId);
  const { ingredients, addIngredient, updateIngredient } = useIngredients();
  const ensureIngredientCount = useIngredientStore((s) => s.ensureIngredientCount);
  const {
    fetchRecipeWithIngredients, sellingUnits, saveRecipe, deleteRecipe, fetchRecipes, trackDishSave,
  } = useRecipeStore();
  const settings = useSettingsStore((s) => s.settings);
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();
  const { unitSystem: settingsUnitSystem, defaultPurchaseUnit } = useUnitSystem();
  const { canAddIngredient, canViewPriceHistory } = useSubscription();
  const defaultTarget = String(settings.default_food_cost_percent ?? 30);

  const compatibleUsedUnits = useCallback(
    (purchaseUnit) => getCompatibleUnitsForIngredient(
      purchaseUnit,
      inferUnitSystem(purchaseUnit, settingsUnitSystem),
    ),
    [settingsUnitSystem],
  );

  const [pageLoading, setPageLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
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
  // Came from Home with the dish basics filled in: open at the ingredients step
  const fromHome = !isEdit && Boolean(prefillNameParam) && Boolean(prefillYieldParam);
  const scrolledToIngredients = useRef(false);
  const handleIngredientsLayout = useCallback((e) => {
    if (!fromHome || scrolledToIngredients.current) return;
    scrolledToIngredients.current = true;
    const y = Math.max(0, e.nativeEvent.layout.y - SPACING.sm);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: true }));
  }, [fromHome]);

  const [recipeIngredients, setRecipeIngredients] = useState([]);
  /** Extra (non-default) selling formats. The default format is yield + defaultPrice. */
  const [sellingFormats, setSellingFormats] = useState([]);
  const [ingredientError, setIngredientError] = useState(false);

  const [yieldQty, setYieldQty] = useState('');
  /** null = follow the category default until the user picks a unit */
  const [yieldUnitChoice, setYieldUnitChoice] = useState(null);
  /** Selling price per yield unit; '' = not entered yet, so the suggested price is saved */
  const [defaultPrice, setDefaultPrice] = useState('');
  const [showYieldUnitPicker, setShowYieldUnitPicker] = useState(false);
  const [showPriceSheet, setShowPriceSheet] = useState(false);
  const [priceSheetValue, setPriceSheetValue] = useState('');
  const [priceSheetError, setPriceSheetError] = useState('');

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

  // Inline new-ingredient form (no /ingredient/create navigation)
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
  /** Used unit lists every unit like the purchase picker; a mismatch is flagged, not hidden */
  const [usedUnitSystem, setUsedUnitSystem] = useState(settingsUnitSystem);
  const usedUnitGroups = useMemo(() => getUnitGroupsForSystem(usedUnitSystem), [usedUnitSystem]);
  const openUsedUnitPicker = () => {
    Keyboard.dismiss();
    setUsedUnitSystem(inferUnitSystem(newIngUsedUnit, settingsUnitSystem));
    setShowUsedUnitPicker(true);
  };
  const usedUnitError = areUnitsCompatible(newIngPurchaseUnit, newIngUsedUnit)
    ? null
    : C.wizard.usedUnitMismatch(getUnitFamily(newIngPurchaseUnit), formatUnitLabel(newIngPurchaseUnit));
  /** Create sheet opened with nothing left to pick — hide "Back to list" */
  const [ingCreateOnly, setIngCreateOnly] = useState(false);
  /**
   * Ingredient sheet mode:
   * - new: full create form (purchase + used qty)
   * - add-existing: used qty first, purchase collapsed (pick from list or tap dish row)
   * - edit-purchase: expand purchase fields from add-existing
   * - edit-library: purchase fields only for an ingredient already on the dish
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

  /** Dish id once it exists in the DB (edit mode, or after the first autosave). */
  const savedRecipeIdRef = useRef(recipeId);
  /** Created by autosave during this visit — removed again if left with no ingredients. */
  const createdHereRef = useRef(false);
  /** Fingerprint of the last payload the DB accepted. */
  const lastSavedRef = useRef(null);
  const saveChainRef = useRef(null);
  const saveQueuedRef = useRef(false);
  /** Last autosave failed — shown so the owner can retry. */
  const [saveFailed, setSaveFailed] = useState(false);
  const autosaveFailedRef = useRef(false);
  /** Owner tapped Save dish and it went through */
  const savedTappedRef = useRef(false);
  /** Values on open — dish_name_entered etc. fire once the owner changes them */
  const fieldBaselineRef = useRef(null);
  const fieldTrackedRef = useRef({});
  /** Per opening of the ingredient sheet: what the owner did before closing it */
  const ingSheetTrackRef = useRef({ added: 0, filled: new Set(), searched: false });
  const resetIngSheetTrack = () => {
    ingSheetTrackRef.current = { added: 0, filled: new Set(), searched: false };
  };

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      category: DEFAULT_CATEGORY,
      target_food_cost_percent: defaultTarget,
    },
  });

  const [watchName, watchCategory, watchTarget] = watch(['name', 'category', 'target_food_cost_percent']);
  const targetPct = validateTarget(watchTarget) === true
    ? Number(String(watchTarget).replace(',', '.'))
    : (Number(defaultTarget) || 30);
  const categoryLabel = RECIPE_CATEGORIES.find((c) => c.value === watchCategory)?.label ?? 'Other';
  const yieldUnit = yieldUnitChoice ?? getDefaultSellingUnitForCategory(watchCategory, sellingUnitOptions);
  const yieldUnitOptionLabel = sellingUnitOptions.find((u) => u.value === yieldUnit)?.label;
  const yieldUnitWord = yieldUnitText(yieldUnit, yieldUnitOptionLabel);
  const yieldInvalid = yieldQty.trim() !== '' && parsePositiveNumber(yieldQty) == null;

  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const markLoaded = useCallback(() => {
    loadedRef.current = true;
    setLoaded(true);
  }, []);

  // Edit: load the saved dish. Create: start empty (the dish row is created with the first ingredient).
  useEffect(() => {
    let cancelled = false;

    const applyDefaultFormat = (fmt) => {
      const qty = fmt?.unit_quantity;
      setYieldQty(qty != null && String(qty).trim() !== '' ? String(qty) : '');
      setYieldUnitChoice(fmt?.selling_unit_name || null);
      setDefaultPrice(parsePositiveNumber(fmt?.selling_price) != null ? String(fmt.selling_price) : '');
    };

    const toFormatState = (f) => ({
      id: newFmtId(),
      selling_unit_name: f.selling_unit_name ?? 'piece',
      unit_quantity: String(f.unit_quantity ?? 1),
      selling_price: parsePositiveNumber(f.selling_price) != null ? String(f.selling_price) : '',
    });

    (async () => {
      if (isEdit) {
        setPageLoading(true);
        setLoadError(null);
        const { data, error } = await fetchRecipeWithIngredients(recipeId);
        if (cancelled) return;
        if (error || !data) {
          setLoadError(typeof error === 'string' ? error : 'Could not load this dish.');
          setPageLoading(false);
          return;
        }
        reset({
          name: data.name ?? '',
          category: data.category ?? 'other',
          target_food_cost_percent: String(data.target_food_cost_percent ?? defaultTarget),
        });
        setRecipeIngredients(
          (data.recipe_ingredients ?? []).map((ri) => ({
            ingredient_id: ri.ingredient_id,
            ingredient: ri.ingredient,
            quantity: String(ri.quantity),
            unit: ri.unit,
          }))
        );
        const formats = data.selling_formats ?? [];
        const defaultFmt = formats.find((f) => f.is_default) ?? formats[0] ?? null;
        applyDefaultFormat(defaultFmt);
        setSellingFormats(formats.filter((f) => f !== defaultFmt).map(toFormatState));
        setIngredientError(false);
        setPageLoading(false);
        markLoaded();
        startDishSession({ mode: 'edit', recipeId });
        trackDish(AnalyticsEvents.DISH_EDITOR_OPENED, {
          ingredient_count: data.recipe_ingredients?.length ?? 0,
          selling_format_count: formats.length,
        });
        return;
      }

      // Started from Home with a dish name, and optionally how many it makes and the unit
      const firstParam = (v) => (Array.isArray(v) ? v[0] : v) || null;
      const prefillName = firstParam(prefillNameParam);
      if (prefillName) {
        reset({ name: prefillName, category: DEFAULT_CATEGORY, target_food_cost_percent: defaultTarget });
        const prefillYield = firstParam(prefillYieldParam);
        if (parsePositiveNumber(prefillYield) != null) setYieldQty(prefillYield);
        const prefillUnit = firstParam(prefillUnitParam);
        if (prefillUnit) setYieldUnitChoice(prefillUnit);
      }

      startDishSession({ mode: 'new' });
      trackDish(AnalyticsEvents.DISH_EDITOR_OPENED, {
        prefilled_name: Boolean(prefillName),
        prefilled_yield: parsePositiveNumber(firstParam(prefillYieldParam)) != null,
        prefilled_unit: firstParam(prefillUnitParam),
        library_count: ingredients.length,
      });
      markLoaded();
    })();
    return () => { cancelled = true; };
  }, [isEdit, recipeId, markLoaded]);

  // Keep dish rows pointing at the live library entry (e.g. after a price is added)
  useEffect(() => {
    if (!loaded) return;
    setRecipeIngredients((prev) => {
      let changed = false;
      const next = prev.map((ri) => {
        const live = ingredients.find((i) => i.id === ri.ingredient_id);
        if (!live || live === ri.ingredient) return ri;
        changed = true;
        return { ...ri, ingredient: live };
      });
      return changed ? next : prev;
    });
  }, [ingredients, loaded]);

  // When an ingredient is added, keep the list end and the add button in view
  const prevIngCount = useRef(null);
  useEffect(() => {
    if (!loaded) return undefined;
    const prev = prevIngCount.current;
    prevIngCount.current = recipeIngredients.length;
    if (prev == null || recipeIngredients.length <= prev) return undefined;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [loaded, recipeIngredients.length]);

  const richIngredients = useMemo(() =>
    recipeIngredients
      .filter((ri) => ri.ingredient)
      .map((ri) => ({ ...ri, quantity: parseFloat(ri.quantity) || 0 })),
    [recipeIngredients]
  );

  const dish = useMemo(() => calculateDishSummary({
    recipeIngredients: richIngredients,
    defaultFormat: { unit_quantity: yieldQty, selling_price: defaultPrice },
    targetFoodCostPercent: targetPct,
  }), [richIngredients, yieldQty, defaultPrice, targetPct]);
  const { totalCost, ingredientCosts } = dish;

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

  // The paywall can't open over the ingredient sheet on iOS: hide the sheet (form state is kept) and bring it back after
  const resumeIngSheetAfterPaywall = useRef(false);
  const showPaywallOverIngSheet = () => {
    Keyboard.dismiss();
    resumeIngSheetAfterPaywall.current = true;
    setShowIngSheet(false);
    setShowPaywall(true);
  };
  const closePaywall = () => {
    setShowPaywall(false);
    if (resumeIngSheetAfterPaywall.current) {
      resumeIngSheetAfterPaywall.current = false;
      setShowIngSheet(true);
    }
  };

  const openPriceHistoryFromForm = () => {
    if (!canViewPriceHistory) {
      track(AnalyticsEvents.PAYWALL_TRIGGERED, {
        reason: 'priceHistory',
        source: 'dish_ingredient_form',
      });
      setPaywallReason('priceHistory');
      showPaywallOverIngSheet();
      return;
    }
    Keyboard.dismiss();
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
    trackDish(AnalyticsEvents.DISH_NEW_INGREDIENT_FORM_OPENED, { trigger: 'picker_button' });
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
    resetIngSheetTrack();
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
    trackDish(AnalyticsEvents.DISH_ADD_INGREDIENT_TAPPED, {
      ingredient_count: recipeIngredients.length,
      library_count: ingredients.length,
      opens: leftover.length === 0 ? 'new_form' : 'library_list',
    });
    if (leftover.length === 0) {
      resetNewIngredientForm();
      setIngCreateOnly(true);
      setIngSheetStep('create');
      trackDish(AnalyticsEvents.DISH_NEW_INGREDIENT_FORM_OPENED, {
        trigger: ingredients.length === 0 ? 'empty_library' : 'all_used',
      });
    } else {
      setIngCreateOnly(false);
      setIngSheetStep('search');
    }
    setShowIngSheet(true);
  };
  const openAddIngSheetRef = useRef(openAddIngSheet);
  openAddIngSheetRef.current = openAddIngSheet;

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
        trackDish(AnalyticsEvents.DISH_RETURNED_FROM_LIBRARY, {
          pending_count: pendingIds.length,
          flow: 'configure_saved',
        });
        resetIngSheetTrack();
        reopenIngredientPickerRef.current = false;
        startAddToDishQueue(pendingIds);
        return;
      }
      if (reopenIngredientPickerRef.current) {
        reopenIngredientPickerRef.current = false;
        trackDish(AnalyticsEvents.DISH_RETURNED_FROM_LIBRARY, { flow: 'picker' });
        openAddIngSheetRef.current();
      }
    }, [startAddToDishQueue])
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
      if (usedUnitError) errors.used_unit = usedUnitError;
    }

    if (Object.keys(errors).length > 0) {
      trackDish(AnalyticsEvents.DISH_INGREDIENT_VALIDATION_FAILED, {
        fields: Object.keys(errors),
        form_mode: ingFormMode,
      });
      setNewIngErrors(errors);
      return;
    }

    const isExisting = Boolean(ingSheetIngredient?.id);
    if (!isExisting) {
      const libraryCount = await ensureIngredientCount();
      if (!canAddIngredient(libraryCount)) {
        track(AnalyticsEvents.PAYWALL_TRIGGERED, { reason: 'ingredient', source: 'dish_ingredient_form' });
        setPaywallReason('ingredient');
        showPaywallOverIngSheet();
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
            source: 'dish_ingredient_form',
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
            source: 'dish_ingredient_form',
          });
          Alert.alert('Could not save', typeof error === 'string' ? error : 'Please try again.');
          return;
        }

        saved = data;
        track(AnalyticsEvents.INGREDIENT_CREATED, {
          count: 1,
          failed_count: 0,
          source: 'dish_ingredient_form',
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

      const alreadyOnDish = recipeIngredientsRef.current.some((r) => r.ingredient_id === targetId);
      if (alreadyOnDish) {
        trackDish(AnalyticsEvents.DISH_INGREDIENT_QTY_UPDATED, { used_unit: newIngUsedUnit });
      } else {
        ingSheetTrackRef.current.added += 1;
        trackDish(AnalyticsEvents.DISH_INGREDIENT_ADDED, {
          ingredient_count_after: recipeIngredientsRef.current.length + 1,
          is_first: recipeIngredientsRef.current.length === 0,
          source: !isExisting ? 'new' : addToDishQueueRef.current.length > 0 ? 'library_tab' : 'library_list',
          name_has_comma: name.includes(','),
          purchase_unit: newIngPurchaseUnit,
          used_unit: newIngUsedUnit,
          has_waste: wastePercent > 0,
        });
      }

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
    resetIngSheetTrack();
    trackDish(AnalyticsEvents.DISH_INGREDIENT_EDIT_OPENED);
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
    trackDish(AnalyticsEvents.DISH_LIBRARY_INGREDIENT_PICKED, {
      library_count: ingredients.length,
      searched: Boolean(ingSearch.trim()),
    });
    setAddToDishQueue([]);
    addToDishQueueRef.current = [];
    fillExistingIngredientForm(ing, { createOnly: false, mode: 'add-existing' });
  };

  // Unit lists and price history open inside the ingredient sheet (iOS can't stack modals)
  const ingSubView = showPurchaseUnitPicker
    ? 'purchaseUnit'
    : showUsedUnitPicker
      ? 'usedUnit'
      : showPriceHistorySheet
        ? 'priceHistory'
        : null;
  const ingSubViewTitle = {
    purchaseUnit: 'Purchased unit',
    usedUnit: 'Used unit',
    priceHistory: 'Price history',
  }[ingSubView];
  const closeIngSubView = () => {
    setShowPurchaseUnitPicker(false);
    setShowUsedUnitPicker(false);
    setShowPriceHistorySheet(false);
  };

  const handleIngSheetClose = () => {
    const sheetTrack = ingSheetTrackRef.current;
    trackDish(AnalyticsEvents.DISH_INGREDIENT_SHEET_CLOSED, {
      step: ingSheetStep,
      form_mode: ingSheetStep === 'create' ? ingFormMode : null,
      added: sheetTrack.added > 0,
      added_count: sheetTrack.added,
      filled_fields: [...sheetTrack.filled],
      searched: sheetTrack.searched,
    });
    setShowIngSheet(false);
    setShowPriceHistorySheet(false);
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
    trackDish(AnalyticsEvents.DISH_INGREDIENT_REMOVED, {
      ingredient_count_after: Math.max(0, recipeIngredients.length - 1),
    });
    setRecipeIngredients((prev) => prev.filter((r) => r.ingredient_id !== ingredientId));
  };

  const sellingUnitLabel = useCallback(
    (value) => sellingUnitOptions.find((u) => u.value === value)?.label ?? formatUnitLabel(value) ?? value,
    [sellingUnitOptions],
  );

  // ---- Default (yield) selling price ----

  const openPriceSheet = () => {
    trackDish(AnalyticsEvents.DISH_PRICE_SHEET_OPENED, { has_price: parsePositiveNumber(defaultPrice) != null });
    setPriceSheetValue(defaultPrice);
    setPriceSheetError('');
    setShowPriceSheet(true);
  };

  const confirmPriceSheet = () => {
    const raw = priceSheetValue.trim();
    if (raw === '') {
      if (parsePositiveNumber(defaultPrice) != null) trackDish(AnalyticsEvents.DISH_PRICE_REMOVED);
      setDefaultPrice('');
      setShowPriceSheet(false);
      return;
    }
    const price = parsePositiveNumber(raw);
    if (price == null) {
      setPriceSheetError('Enter a price above 0, or leave it empty');
      return;
    }
    trackDish(AnalyticsEvents.DISH_PRICE_SET, {
      first_time: parsePositiveNumber(defaultPrice) == null,
      food_cost_percent: priceSheetMetrics?.foodCostPercent ?? null,
      margin_status: priceSheetMetrics?.marginStatus ?? null,
    });
    setDefaultPrice(String(price));
    setShowPriceSheet(false);
  };

  const removeDefaultPrice = () => {
    trackDish(AnalyticsEvents.DISH_PRICE_REMOVED);
    setDefaultPrice('');
    setPriceSheetValue('');
    setShowPriceSheet(false);
  };

  const priceSheetMetrics = useMemo(() => {
    const price = parsePositiveNumber(priceSheetValue);
    if (price == null || !dish.hasAnyCost) return null;
    return calculateSellingFormatMetrics({
      totalRecipeCost: totalCost,
      unitQuantity: dish.quantityMade,
      sellingPrice: price,
      targetFoodCostPercent: targetPct,
    });
  }, [priceSheetValue, dish.hasAnyCost, dish.quantityMade, totalCost, targetPct]);

  // ---- Autosave: the DB always mirrors the dish on screen ----

  const latestRef = useRef(null);
  latestRef.current = {
    name: watchName,
    category: watchCategory,
    targetPct,
    yieldQty,
    yieldUnit,
    defaultPrice,
    suggestedPrice: dish.suggestedPrice,
    recipeIngredients,
    sellingFormats,
    unitLabel: sellingUnitLabel,
  };

  const currentFingerprint = () => JSON.stringify(buildDishPayload(latestRef.current));

  const performSave = useCallback(async () => {
    if (!loadedRef.current) return;
    const payload = buildDishPayload(latestRef.current);
    const id = savedRecipeIdRef.current;
    if (!id && payload.recipeIngredients.length === 0) return;
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === lastSavedRef.current) return;

    const { data, error } = await saveRecipe({ recipeId: id, ...payload, refresh: false });
    if (error || !data?.id) {
      if (!autosaveFailedRef.current) {
        autosaveFailedRef.current = true;
        trackDish(AnalyticsEvents.DISH_AUTOSAVE_FAILED, { creating: !id }, { countsAsAction: false });
      }
      setSaveFailed(true);
      return;
    }
    autosaveFailedRef.current = false;
    setSaveFailed(false);
    lastSavedRef.current = fingerprint;
    if (!id) {
      savedRecipeIdRef.current = data.id;
      createdHereRef.current = true;
      setDishSessionRecipeId(data.id);
      trackDish(AnalyticsEvents.DISH_CREATED, {
        ingredient_count: payload.recipeIngredients.length,
      }, { countsAsAction: false });
    }
  }, [saveRecipe]);

  /**
   * Saves run one at a time; changes made while a save is in flight are picked up by
   * one follow-up save. This keeps the first save the only one that creates the dish.
   */
  const runSave = useCallback(() => {
    if (saveChainRef.current) {
      saveQueuedRef.current = true;
      return saveChainRef.current;
    }
    const chain = (async () => {
      do {
        saveQueuedRef.current = false;
        await performSave();
      } while (saveQueuedRef.current);
    })().finally(() => { saveChainRef.current = null; });
    saveChainRef.current = chain;
    return chain;
  }, [performSave]);

  const structureKey = useMemo(() => JSON.stringify([
    watchCategory,
    yieldUnitChoice,
    defaultPrice,
    recipeIngredients.map((ri) => [ri.ingredient_id, String(ri.quantity ?? ''), ri.unit]),
    sellingFormats.map((f) => [f.selling_unit_name, String(f.unit_quantity ?? ''), String(f.selling_price ?? '')]),
  ]), [watchCategory, yieldUnitChoice, defaultPrice, recipeIngredients, sellingFormats]);
  const typingKey = JSON.stringify([watchName ?? '', watchTarget ?? '', yieldQty]);

  // Edit: the loaded dish is already what the DB has
  useEffect(() => {
    if (loaded && recipeId && lastSavedRef.current == null) {
      lastSavedRef.current = currentFingerprint();
    }
  }, [loaded, recipeId]);

  // Ingredients, price, formats, unit, category: save right away
  useEffect(() => {
    if (loaded) runSave();
  }, [loaded, structureKey, runSave]);

  useEffect(() => {
    if (loaded && !fieldBaselineRef.current) {
      fieldBaselineRef.current = { name: watchName ?? '', yieldQty, targetPct };
    }
  }, [loaded]);

  /** Name, yield and target: one event each, the first time the owner changes them. */
  const trackFieldChanges = () => {
    const base = fieldBaselineRef.current;
    const latest = latestRef.current;
    if (!base || !latest) return;
    const done = fieldTrackedRef.current;
    const name = String(latest.name ?? '').trim();
    if (!done.name && name && latest.name !== base.name) {
      done.name = true;
      trackDish(AnalyticsEvents.DISH_NAME_ENTERED, {
        was_prefilled: Boolean(String(base.name).trim()),
        length: name.length,
      });
    }
    if (!done.yield && parsePositiveNumber(latest.yieldQty) != null && latest.yieldQty !== base.yieldQty) {
      done.yield = true;
      trackDish(AnalyticsEvents.DISH_YIELD_ENTERED, {
        was_prefilled: parsePositiveNumber(base.yieldQty) != null,
        yield_unit: latest.yieldUnit,
      });
    }
    if (!done.target && latest.targetPct !== base.targetPct) {
      done.target = true;
      trackDish(AnalyticsEvents.DISH_TARGET_CHANGED, { target: latest.targetPct, previous: base.targetPct });
    }
  };

  // New ingredient form: which fields the owner fills before adding (or giving up)
  useEffect(() => {
    if (!showIngSheet || ingSheetStep !== 'create' || ingFormMode !== 'new') return;
    const { filled } = ingSheetTrackRef.current;
    [
      ['name', newIngName],
      ['price', newIngPurchasePrice],
      ['purchase_qty', newIngPurchaseQty],
      ['used_qty', newIngUsedQty],
    ].forEach(([field, value]) => {
      if (!filled.has(field) && String(value ?? '').trim()) {
        filled.add(field);
        trackDish(AnalyticsEvents.DISH_INGREDIENT_FIELD_FILLED, { field });
      }
    });
  }, [showIngSheet, ingSheetStep, ingFormMode, newIngName, newIngPurchasePrice, newIngPurchaseQty, newIngUsedQty]);

  // Name, yield, target: save once typing pauses
  useEffect(() => {
    if (!loaded) return undefined;
    const timer = setTimeout(() => {
      runSave();
      trackFieldChanges();
    }, 800);
    return () => clearTimeout(timer);
  }, [loaded, typingKey, runSave]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        trackDish(AnalyticsEvents.DISH_APP_BACKGROUNDED, {
          ingredient_count: latestRef.current?.recipeIngredients?.length ?? 0,
          last_action: getDishSessionLastAction(),
        }, { countsAsAction: false });
      }
      if (state === 'background' || state === 'inactive') runSave();
    });
    return () => sub.remove();
  }, [runSave]);

  // Leaving by any route: flush, drop a dish created here but emptied again, refresh lists
  useEffect(() => () => {
    const latest = latestRef.current;
    const ingredientCount = latest?.recipeIngredients?.length ?? 0;
    trackDish(AnalyticsEvents.DISH_EDITOR_LEFT, {
      saved: savedTappedRef.current,
      dish_created: Boolean(savedRecipeIdRef.current),
      ingredient_count: ingredientCount,
      has_name: Boolean(String(latest?.name ?? '').trim()),
      has_yield: parsePositiveNumber(latest?.yieldQty) != null,
      has_price: parsePositiveNumber(latest?.defaultPrice) != null,
      extra_format_count: latest?.sellingFormats?.length ?? 0,
      last_action: getDishSessionLastAction(),
      empty_dish_removed: Boolean(savedRecipeIdRef.current && createdHereRef.current && ingredientCount === 0),
    }, { countsAsAction: false });
    endDishSession();
    trackDishSave((async () => {
      await runSave();
      const id = savedRecipeIdRef.current;
      const emptied = (latestRef.current?.recipeIngredients?.length ?? 0) === 0;
      if (id && createdHereRef.current && emptied) await deleteRecipe(id);
    })().finally(() => { fetchRecipes(); }));
  }, []);

  // ---- Save dish ----

  const saveBlocker = recipeIngredients.length === 0 ? C.wizard.saveNeedsIngredient : null;

  /** Everything is already autosaved; this flushes the last change and opens the dish. */
  const onSaveDish = async () => {
    trackDish(AnalyticsEvents.DISH_SAVE_TAPPED, {
      ingredient_count: recipeIngredients.length,
      blocked: recipeIngredients.length === 0 ? 'no_ingredients' : yieldInvalid ? 'invalid_yield' : null,
    });
    if (recipeIngredients.length === 0) {
      setIngredientError(true);
      return;
    }
    if (yieldInvalid) return;

    setSaving(true);
    try {
      await runSave();
      const id = savedRecipeIdRef.current;
      if (!id || lastSavedRef.current !== currentFingerprint()) {
        trackDish(AnalyticsEvents.DISH_SAVE_FAILED);
        Alert.alert('Couldn\u2019t save', 'Check your connection and try again.');
        return;
      }

      savedTappedRef.current = true;
      trackDish(AnalyticsEvents.DISH_SAVED, {
        ingredient_count: recipeIngredients.length,
        has_yield: dish.yieldQuantity != null,
        has_selling_price: dish.hasSellingPrice,
        extra_format_count: sellingFormats.length,
      });

      if (isEdit) {
        if (router.canGoBack()) router.back();
        else router.replace(`/recipe/${id}`);
      } else {
        router.replace({ pathname: '/recipe/[id]', params: { id, justSaved: '1' } });
      }
    } finally {
      setSaving(false);
    }
  };

  const marginColor = dish.marginStatus === 'good'
    ? COLORS.marginGood
    : dish.marginStatus === 'warning'
      ? COLORS.marginWarning
      : dish.marginStatus === 'danger'
        ? COLORS.marginDanger
        : COLORS.text;

  // With more than one way to sell, yield and price are edited per format in "Ways you sell it",
  // which shows how the recipe's cost lands on each of them.
  const hasOtherFormats = sellingFormats.length > 0;
  const formatPreviews = useMemo(() => {
    if (!hasOtherFormats) return [];
    return [
      { key: 'default', selling_unit_name: yieldUnit, unit_quantity: yieldQty, selling_price: defaultPrice },
      ...sellingFormats.map((f) => ({ key: f.id, ...f })),
    ].map((f) => {
      const metrics = calculateSellingFormatMetrics({
        totalRecipeCost: totalCost,
        unitQuantity: f.unit_quantity,
        sellingPrice: f.selling_price,
        targetFoodCostPercent: targetPct,
      });
      return {
        key: f.key,
        label: formatSellingFormatName(sellingUnitLabel(f.selling_unit_name), parsePositiveNumber(f.unit_quantity) ?? 1, ''),
        price: parsePositiveNumber(f.selling_price),
        costPerUnit: metrics.costPerUnit,
        foodCostPercent: metrics.foodCostPercent,
        marginStatus: metrics.marginStatus,
      };
    });
  }, [hasOtherFormats, yieldUnit, yieldQty, defaultPrice, sellingFormats, totalCost, targetPct, sellingUnitLabel]);

  const marginColorFor = (status) => (status === 'good'
    ? COLORS.marginGood
    : status === 'warning'
      ? COLORS.marginWarning
      : status === 'danger'
        ? COLORS.marginDanger
        : COLORS.textSecondary);

  const formatsStatus = useMemo(() => {
    if (!hasOtherFormats || !dish.hasAnyCost) return null;
    const over = formatPreviews.filter((f) => f.marginStatus === 'warning' || f.marginStatus === 'danger').length;
    if (over > 0) {
      const danger = formatPreviews.some((f) => f.marginStatus === 'danger');
      return { text: C.wizard.formatsOverTarget(over), color: danger ? COLORS.marginDanger : COLORS.marginWarning };
    }
    return { text: C.wizard.formatsOnTarget, color: COLORS.marginGood };
  }, [hasOtherFormats, dish.hasAnyCost, formatPreviews]);

  // ---- Ways to sell (2+ formats): edited here with the same form as the dish page ----

  /** null | { mode: 'add' | 'edit', key, initialFormat } — key 'default' is the yield + price format */
  const [formatSheet, setFormatSheet] = useState(null);
  const openFormatSheet = (key) => {
    trackDish(AnalyticsEvents.DISH_SELLING_FORMAT_SHEET_OPENED, { mode: key == null ? 'add' : 'edit' });
    if (key == null) {
      setFormatSheet({ mode: 'add', key: null, initialFormat: { selling_unit_name: yieldUnit } });
      return;
    }
    const src = key === 'default'
      ? { selling_unit_name: yieldUnit, unit_quantity: yieldQty || '1', selling_price: defaultPrice }
      : sellingFormats.find((f) => f.id === key);
    if (!src) return;
    setFormatSheet({ mode: 'edit', key, initialFormat: { ...src } });
  };

  const handleFormatSubmit = ({ selling_unit_name, unit_quantity, selling_price }) => {
    const key = formatSheet?.key;
    if (key === 'default') {
      setYieldUnitChoice(selling_unit_name);
      setYieldQty(String(unit_quantity));
      setDefaultPrice(String(selling_price));
    } else if (key != null) {
      setSellingFormats((prev) => prev.map((f) => (f.id === key
        ? { ...f, selling_unit_name, unit_quantity: String(unit_quantity), selling_price: String(selling_price) }
        : f)));
    } else {
      setSellingFormats((prev) => [...prev, {
        id: newFmtId(),
        selling_unit_name,
        unit_quantity: String(unit_quantity),
        selling_price: String(selling_price),
      }]);
      trackDish(AnalyticsEvents.DISH_SELLING_FORMAT_ADDED, {
        format_count_after: sellingFormats.length + 2,
        unit: selling_unit_name,
      });
    }
    setFormatSheet(null);
  };

  const handleFormatDelete = () => {
    const key = formatSheet?.key;
    if (key == null || sellingFormats.length === 0) return;
    trackDish(AnalyticsEvents.DISH_SELLING_FORMAT_REMOVED, { format_count_after: sellingFormats.length });
    if (key === 'default') {
      // The next way to sell becomes the dish's main yield and price
      const [next, ...rest] = sellingFormats;
      setYieldUnitChoice(next.selling_unit_name);
      setYieldQty(String(next.unit_quantity));
      setDefaultPrice(next.selling_price ?? '');
      setSellingFormats(rest);
    } else {
      setSellingFormats((prev) => prev.filter((f) => f.id !== key));
    }
    setFormatSheet(null);
  };

  const resultBar = (
    <View style={styles.stickyFooter}>
      {hasOtherFormats ? (
        <>
          <View style={styles.formatsTotalRow}>
            <Text style={styles.resultLabel}>{C.wizard.totalCost}</Text>
            <Text style={styles.formatsTotalValue}>
              {dish.hasAnyCost ? formatCurrency(totalCost, symbol) : '—'}
            </Text>
          </View>
          {formatsStatus ? (
            <Text style={[styles.formatsHint, { color: formatsStatus.color }]}>{formatsStatus.text}</Text>
          ) : null}
        </>
      ) : (
      <>
      <View style={styles.resultGrid}>
        <View style={styles.resultCell}>
          <Text style={styles.resultLabel} numberOfLines={1}>{C.wizard.totalCost}</Text>
          <Text style={styles.resultValue} numberOfLines={1}>
            {dish.hasAnyCost ? formatCurrency(totalCost, symbol) : '—'}
          </Text>
        </View>
        <View style={[styles.resultCell, styles.resultCellCenter]}>
          <Text style={[styles.resultLabel, styles.resultLabelCenter]} numberOfLines={2}>{C.wizard.costPer(yieldUnitWord)}</Text>
          <Text style={styles.resultValue} numberOfLines={1}>
            {dish.hasAnyCost ? formatCurrency(dish.costPerUnit, symbol) : '—'}
          </Text>
        </View>
        <View style={[styles.resultCell, styles.resultCellRight]}>
          <Text style={[styles.resultLabel, styles.resultLabelRight]} numberOfLines={2}>
            {dish.hasSellingPrice ? C.wizard.yourPricePer(yieldUnitWord) : C.wizard.suggestedPer(yieldUnitWord)}
          </Text>
          <Text
            style={[styles.resultValue, styles.resultValueAccent, dish.hasSellingPrice && { color: marginColor }]}
            numberOfLines={1}
          >
            {dish.hasSellingPrice
              ? formatCurrency(dish.sellingPrice, symbol)
              : dish.hasAnyCost ? formatCurrency(dish.suggestedPrice, symbol) : '—'}
          </Text>
        </View>
      </View>

      {dish.hasSellingPrice && dish.foodCostPercent != null ? (
        <View style={styles.resultStatusRow}>
          <Text style={[styles.resultStatusText, { color: marginColor }]}>
            {C.wizard.foodCost} {formatFoodCostPercent(dish.foodCostPercent)}
            {dish.marginStatus ? (
              <Text style={styles.resultStatusMuted}>{` · ${marginStatusLabel(dish.marginStatus, dish.profit)}`}</Text>
            ) : null}
          </Text>
        </View>
      ) : null}
      </>
      )}

      <View style={styles.footerRow}>
        {hasOtherFormats ? null : (
          <Button
            title={dish.hasSellingPrice ? C.action.editMyPrice : C.action.setMyPrice}
            onPress={openPriceSheet}
            disabled={recipeIngredients.length === 0}
            variant="secondary"
            size="lg"
            style={styles.footerBtn}
          />
        )}
        <Button
          title={isEdit ? C.action.saveChanges : C.action.saveDish}
          onPress={handleSubmit(onSaveDish)}
          loading={saving}
          disabled={Boolean(saveBlocker) || yieldInvalid}
          size="lg"
          style={styles.footerBtn}
        />
      </View>
      {saveBlocker ? (
        <Text style={styles.saveBlockerText}>{saveBlocker}</Text>
      ) : saveFailed ? (
        <TouchableOpacity onPress={runSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.saveBlockerText, styles.saveErrorText]}>{C.wizard.saveFailedStatus}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const headerBar = (title, onBack) => (
        <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
  );

  if (pageLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {headerBar(isEdit ? C.edit.header : C.wizard.header, () => router.back())}
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
        {headerBar(C.edit.header, () => router.back())}
        <View style={styles.editLoadingBody}>
          <Text style={styles.loadErrorText}>{loadError}</Text>
          <Button title="Go back" onPress={() => router.back()} size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {headerBar(isEdit ? C.edit.header : C.wizard.header, () => router.back())}

      <KeyboardFormLayout
        scrollRef={scrollRef}
          contentContainerStyle={styles.scroll}
        footer={resultBar}
      >
        <Controller
          control={control}
          name="name"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{C.wizard.dishName}</Text>
                <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                  placeholder={C.wizard.dishNamePlaceholder}
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="words"
                  returnKeyType="next"
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
              </View>
          )}
        />

        {hasOtherFormats ? null : (
          <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{C.wizard.yieldLabel}</Text>
            <View style={[styles.inputBox, yieldInvalid && styles.inputBoxError]}>
              <TextInput
                style={styles.textInput}
                value={yieldQty}
                onChangeText={setYieldQty}
                autoFocus={!isEdit && Boolean(prefillNameParam) && !prefillYieldParam}
                keyboardType="decimal-pad"
                placeholder={C.wizard.yieldPlaceholder}
                placeholderTextColor={COLORS.textTertiary}
                accessibilityLabel={`${C.wizard.yieldLabel}. ${C.wizard.yieldHelper}`}
              />
            </View>
            <Text style={[styles.fieldHelper, yieldInvalid && styles.fieldHelperError]}>
              {yieldInvalid ? 'Enter a number above 0' : C.wizard.yieldHelper}
            </Text>
          </View>
          <View style={{ width: SPACING.sm }} />
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{C.wizard.yieldUnitLabel}</Text>
                  <TouchableOpacity
                    style={[styles.inputBox, styles.pickerBox]}
              onPress={() => setShowYieldUnitPicker(true)}
                    activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Yield unit: ${yieldUnitWord}`}
                  >
              <Text style={styles.pickerText} numberOfLines={1}>{capitalize(yieldUnitWord)}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
        </View>
        )}

        <View style={styles.twoCol}>
          <Controller
            control={control}
            name="target_food_cost_percent"
            rules={{ validate: validateTarget }}
            render={({ field: { onChange, value } }) => (
              <View style={[styles.fieldGroup, { flex: 0.75 }]}>
                <Text style={styles.fieldLabel}>{C.wizard.targetLabel}</Text>
                <View style={[styles.inputBox, errors.target_food_cost_percent && styles.inputBoxError]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="decimal-pad"
                    placeholder="30"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                  <Text style={styles.suffix}>%</Text>
                </View>
                {errors.target_food_cost_percent ? (
                  <Text style={styles.errorText}>{errors.target_food_cost_percent.message}</Text>
                ) : null}
              </View>
            )}
          />
          <View style={{ width: SPACING.sm }} />
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{C.wizard.categoryLabel}</Text>
            <TouchableOpacity
              style={[styles.inputBox, styles.pickerBox]}
              onPress={() => setShowCatPicker(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Category: ${categoryLabel}`}
            >
              <Text style={styles.pickerText} numberOfLines={1}>{categoryLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.hint}>{C.wizard.targetHint}</Text>

        <Text style={styles.sectionLabel} onLayout={handleIngredientsLayout}>
          {C.wizard.ingredientsTitle.toUpperCase()}
          {recipeIngredients.length > 0 ? ` · ${recipeIngredients.length}` : ''}
        </Text>
        <View style={[styles.card, ingredientError && styles.cardError]}>
          {recipeIngredients.length === 0 ? (
            <View style={styles.stepEmpty}>
              <Text style={[styles.stepEmptyTitle, ingredientError && styles.stepEmptyTitleError]}>
                {C.wizard.ingredientsEmptyTitle}
              </Text>
              <Text style={styles.stepEmptySub}>{C.wizard.ingredientsEmptySub}</Text>
          </View>
          ) : (
            recipeIngredients.map((ri, idx) => {
              const usage = getIngredientUsageSummary(ri.ingredient, ri.quantity, ri.unit);
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
                      {costItem?.error ? (
                        <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                      ) : costItem?.cost != null ? (
                        <Text style={styles.ingRowCost}>{formatCurrency(costItem.cost, symbol)}</Text>
                      ) : null}
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
                  </View>
                  <TouchableOpacity
                    onPress={() => removeIngredient(ri.ingredient_id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginLeft: SPACING.xs }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${ri.ingredient?.name ?? 'ingredient'}`}
                  >
                    <Ionicons name="close" size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            );
            })
          )}
          {fromHome && recipeIngredients.length === 0 ? (
            <View style={styles.addIngCta}>
              <Button title={`+ ${C.action.addIngredient}`} onPress={openAddIngSheet} size="lg" />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addRowBtn, recipeIngredients.length > 0 && styles.addRowBtnDivided]}
              onPress={openAddIngSheet}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addRowBtnText}>
                {recipeIngredients.length > 0 ? C.action.addAnotherIngredient : C.action.addIngredient}
              </Text>
            </TouchableOpacity>
          )}
          </View>
        {ingredientError ? <Text style={styles.errorText}>{C.wizard.saveNeedsIngredient}</Text> : null}

        {hasOtherFormats ? (
          <>
            <Text style={styles.sectionLabel}>
              {`${C.wizard.waysToSellTitle.toUpperCase()} · ${formatPreviews.length}`}
            </Text>
          <View style={styles.card}>
              {formatPreviews.map((f, idx) => (
                <View key={f.key}>
                  {idx > 0 && <View style={styles.ingRowDivider} />}
                    <TouchableOpacity
                    style={styles.formatRow}
                    onPress={() => openFormatSheet(f.key)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`${C.action.editSellingPrice}: ${f.label}`}
                  >
                    <View style={styles.ingRowLeft}>
                      <Text style={styles.ingName} numberOfLines={1}>{f.label}</Text>
                      <Text style={styles.ingUsageLine} numberOfLines={1}>
                        {C.wizard.formatPreviewCost(
                          dish.hasAnyCost ? formatCurrency(f.costPerUnit, symbol) : '—',
                          f.price != null ? formatCurrency(f.price, symbol) : '—',
                        )}
                      </Text>
                </View>
                    <View style={styles.ingMeta}>
                      <Text style={[styles.formatPreviewFcp, { color: marginColorFor(f.marginStatus) }]}>
                        {dish.hasAnyCost && f.foodCostPercent != null ? formatFoodCostPercent(f.foodCostPercent) : '—'}
                        </Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
                      </View>
                  </TouchableOpacity>
                      </View>
              ))}
              <TouchableOpacity
                style={[styles.addRowBtn, styles.addRowBtnDivided]}
                onPress={() => openFormatSheet(null)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.addRowBtnText}>{C.result.addAnotherWay}</Text>
              </TouchableOpacity>
              </View>
            </>
        ) : null}
      </KeyboardFormLayout>

      <SellingFormatSheet
        visible={formatSheet != null}
        mode={formatSheet?.mode ?? 'add'}
        initialFormat={formatSheet?.initialFormat ?? null}
        unitOptions={sellingUnitOptions}
        totalRecipeCost={totalCost}
        hasAnyCost={dish.hasAnyCost}
        targetFoodCostPercent={targetPct}
        dishName={watchName}
        currencySymbol={symbol}
        onSubmit={handleFormatSubmit}
        onDelete={formatSheet?.key && hasOtherFormats ? handleFormatDelete : undefined}
        onClose={() => setFormatSheet(null)}
      />

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
                  onPress={() => {
                    if (cat.value !== value) trackDish(AnalyticsEvents.DISH_CATEGORY_CHANGED, { category: cat.value });
                    onChange(cat.value);
                    setShowCatPicker(false);
                  }}
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
        onBack={ingSubView ? closeIngSubView : undefined}
        title={
          ingSubView
            ? ingSubViewTitle
            : ingSheetStep === 'search'
            ? 'Add ingredient'
            : isPurchaseEdit
              ? 'Edit ingredient'
              : ingSheetIngredient
                ? (ingSheetIngredient.name || 'Add to dish')
                : 'New ingredient'
        }
        scrollable={ingSubView ? ingSubView !== 'priceHistory' : ingSheetStep === 'create'}
        keyboardLift
        keyboardOffset={
          !ingSubView && ingSheetStep === 'create' && ingSkipKeyboardLift ? 0 : null
        }
        footer={
          !ingSubView && ingSheetStep === 'create' ? (
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
                disabled={!isPurchaseEdit && Boolean(usedUnitError)}
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
        {ingSubView === 'purchaseUnit' ? (
          <>
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
          </>
        ) : ingSubView === 'usedUnit' ? (
          <>
            <UnitSystemToggle value={usedUnitSystem} onChange={setUsedUnitSystem} />
            {usedUnitGroups.map((group) => (
              <View key={group.label} style={styles.unitGroup}>
                <Text style={styles.unitGroupLabel}>{group.label}</Text>
                <View style={styles.chipWrap}>
                  {group.units.map((u) => (
                    <TouchableOpacity
                      key={u.value}
                      style={[styles.chip, newIngUsedUnit === u.value && styles.chipActive]}
                      onPress={() => {
                        setNewIngUsedUnit(u.value);
                        setNewIngErrors((e) => ({ ...e, used_unit: undefined }));
                        setShowUsedUnitPicker(false);
                      }}
                    >
                      <Text style={[styles.chipText, newIngUsedUnit === u.value && styles.chipTextActive]}>
                        {u.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : ingSubView === 'priceHistory' ? (
          priceHistoryLoading ? (
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
          )
        ) : ingSheetStep === 'search' ? (
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
                onChangeText={(v) => {
                  setIngSearch(v);
                  if (!ingSheetTrackRef.current.searched && v.trim()) {
                    ingSheetTrackRef.current.searched = true;
                    trackDish(AnalyticsEvents.DISH_INGREDIENT_SEARCHED, { library_count: ingredients.length });
                  }
                }}
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
                      {formatCurrency(item.purchase_price, symbol)} / {item.purchase_quantity} {formatUnitLabel(item.purchase_unit)}
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
                      style={[styles.inputBox, styles.unitBox, usedUnitError && styles.inputBoxError]}
                      onPress={openUsedUnitPicker}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unitSelectText} numberOfLines={1}>
                        {formatUnitLabel(newIngUsedUnit)}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
              </View>
                </View>
                {usedUnitError ? <Text style={styles.errorText}>{usedUnitError}</Text> : null}

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
                    placeholder="e.g. Butter"
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
                      onPress={() => { Keyboard.dismiss(); setShowPurchaseUnitPicker(true); }}
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
                          style={[styles.inputBox, styles.unitBox, usedUnitError && styles.inputBoxError]}
                          onPress={openUsedUnitPicker}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.unitSelectText} numberOfLines={1}>
                            {formatUnitLabel(newIngUsedUnit)}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                        </TouchableOpacity>
        </View>
                    </View>
                    {usedUnitError ? <Text style={styles.errorText}>{usedUnitError}</Text> : null}
                  </>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={closePaywall}
        reason={paywallReason}
      />

      <Modal
        visible={showPriceSheet}
        onClose={() => setShowPriceSheet(false)}
        title={C.wizard.priceSheetTitle(yieldUnitWord)}
        scrollable
        keyboardLift
        footer={(
          <>
            <Button title="Done" onPress={confirmPriceSheet} size="lg" />
            {parsePositiveNumber(defaultPrice) != null ? (
              <TouchableOpacity onPress={removeDefaultPrice} style={styles.sheetBackBtn} accessibilityRole="button">
                <Text style={styles.removePriceText}>{C.wizard.removePrice}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      >
        <Text style={styles.fmtSheetHint}>{C.wizard.priceSheetHint(parsePositiveNumber(yieldQty), yieldUnitWord)}</Text>
        <View style={[styles.inputBox, styles.priceBox, priceSheetError ? styles.inputBoxError : null]}>
          <Text style={styles.currencyPrefix}>{symbol}</Text>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={priceSheetValue}
            onChangeText={(v) => {
              setPriceSheetValue(v);
              setPriceSheetError('');
            }}
            keyboardType="decimal-pad"
            placeholder={dish.hasAnyCost && dish.suggestedPrice ? dish.suggestedPrice.toFixed(2) : '0.00'}
            placeholderTextColor={COLORS.textTertiary}
            autoFocus
            accessibilityLabel={C.wizard.priceSheetTitle(yieldUnitWord)}
          />
        </View>
        {priceSheetError ? <Text style={styles.errorText}>{priceSheetError}</Text> : null}

        {dish.hasAnyCost && dish.suggestedPrice > 0 ? (
          <TouchableOpacity
            style={styles.suggestChip}
            onPress={() => {
              setPriceSheetValue(dish.suggestedPrice.toFixed(2));
              setPriceSheetError('');
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
            <Text style={styles.suggestChipText}>
              {C.wizard.useSuggested(formatCurrency(dish.suggestedPrice, symbol))}
            </Text>
          </TouchableOpacity>
        ) : null}

        {priceSheetMetrics ? (
          <View style={[styles.previewCard, { marginTop: SPACING.md }]}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>{C.wizard.foodCost}</Text>
              <Text style={[
                styles.previewValue,
                { fontWeight: '700' },
                priceSheetMetrics.marginStatus === 'good' && { color: COLORS.marginGood },
                priceSheetMetrics.marginStatus === 'warning' && { color: COLORS.marginWarning },
                priceSheetMetrics.marginStatus === 'danger' && { color: COLORS.marginDanger },
              ]}>
                {formatFoodCostPercent(priceSheetMetrics.foodCostPercent)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>{labelPerSellingUnit('Profit per', yieldUnitWord)}</Text>
              <Text style={styles.previewValue}>{formatCurrency(priceSheetMetrics.profit, symbol)}</Text>
            </View>
          </View>
        ) : null}
      </Modal>

      <Modal
        visible={showYieldUnitPicker}
        onClose={() => setShowYieldUnitPicker(false)}
        title={C.wizard.yieldUnitLabel}
        scrollable
      >
        {sellingUnitOptions.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={styles.listRow}
            onPress={() => {
              if (u.value !== yieldUnit) trackDish(AnalyticsEvents.DISH_YIELD_UNIT_CHANGED, { unit: u.value });
              setYieldUnitChoice(u.value);
              setShowYieldUnitPicker(false);
            }}
          >
            <Text style={styles.listRowText}>{capitalize(yieldUnitText(u.value, u.label))}</Text>
            {yieldUnit === u.value ? (
              <Ionicons name="checkmark" size={18} color={COLORS.primary} />
            ) : null}
          </TouchableOpacity>
        ))}
      </Modal>

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
  fieldHelper: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: SPACING.xs },
  fieldHelperError: { color: COLORS.error },
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
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: 48,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(45, 106, 79, 0.06)',
  },
  addRowBtnDivided: {
    marginTop: SPACING.md,
  },
  addRowBtnText: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.primary },
  addIngCta: { padding: SPACING.md, paddingTop: 0 },
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
  removePriceText: { fontSize: FONT_SIZE.sm, color: COLORS.error, fontWeight: '600' },
  sheetBackText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

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

  stickyFooter: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  resultGrid: { flexDirection: 'row', gap: SPACING.sm },
  resultCell: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  resultCellCenter: { alignItems: 'center' },
  resultCellRight: { alignItems: 'flex-end' },
  resultLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600' },
  resultLabelCenter: { textAlign: 'center' },
  resultLabelRight: { textAlign: 'right' },
  resultValue: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '800', marginTop: 2 },
  resultValueAccent: { color: COLORS.primary },
  resultStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  resultStatusText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  resultStatusMuted: { color: COLORS.textTertiary, fontWeight: '500' },
  formatsTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  formatsTotalValue: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '800' },
  formatPreviewFcp: { minWidth: 44, textAlign: 'right', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  formatRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: SPACING.sm },
  formatsHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  footerRow: { flexDirection: 'row', gap: SPACING.sm },
  footerBtn: { flex: 1, paddingHorizontal: SPACING.sm },
  saveBlockerText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, textAlign: 'center' },
  saveErrorText: { color: COLORS.error, fontWeight: '600' },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: 44,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F0FDF4',
  },
  suggestChipText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },

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
