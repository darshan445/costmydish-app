import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateDishSummary, calculateSellingFormatMetrics, parsePositiveNumber } from '../lib/calculations';
import useAuthStore from './authStore';
import useIngredientStore from './ingredientStore';
import { formatSellingFormatName } from '../utils/sellingFormat';

// Transform raw Supabase recipe row into UI-friendly object
function transformRecipe(raw, defaultSellingPrice) {
  const { recipe_ingredients, ...rest } = raw;
  return {
    ...rest,
    selling_price: defaultSellingPrice ?? null,
  };
}

// Overall margin status across all formats:
// all green → 'good', all red → 'danger', all warning → 'warning', mixed → null (neutral)
function overallFormatStatus(statuses) {
  if (!statuses?.length) return null;
  const unique = [...new Set(statuses)];
  return unique.length === 1 ? unique[0] : null;
}

/**
 * List entry + cost summary for one dish. Used by the full reload and right after a
 * save, so the list shows the same numbers either way.
 * raw: recipe row with recipe_ingredients [{ quantity, unit, ingredient }]
 * formats: [{ selling_price, unit_quantity, is_default, selling_unit: { name, label } }]
 */
function buildRecipeEntry(raw, formats) {
  const defaultFmt = formats.find((f) => f.is_default) ?? formats[0] ?? null;

  const dish = calculateDishSummary({
    recipeIngredients: raw.recipe_ingredients ?? [],
    defaultFormat: defaultFmt,
    targetFoodCostPercent: raw.target_food_cost_percent,
  });
  const totalCost = dish.totalCost;
  const recipe = transformRecipe(raw, dish.sellingPrice);

  const pricedFormats = formats.filter((f) => parsePositiveNumber(f.selling_price) != null);
  const allFormatMetrics = pricedFormats.map((f) =>
    calculateSellingFormatMetrics({
      totalRecipeCost: totalCost,
      unitQuantity: f.unit_quantity,
      sellingPrice: f.selling_price,
      targetFoodCostPercent: raw.target_food_cost_percent,
    })
  );

  const defaultMetrics = calculateSellingFormatMetrics({
    totalRecipeCost: totalCost,
    unitQuantity: dish.quantityMade,
    sellingPrice: dish.sellingPrice,
    targetFoodCostPercent: raw.target_food_cost_percent,
  });

  // Overall status = uniform status if all formats agree, null (neutral) if mixed
  const overallMarginStatus = allFormatMetrics.length > 0
    ? overallFormatStatus(allFormatMetrics.map((m) => m.marginStatus).filter(Boolean))
    : null;

  // Worst-performing format's food cost % + price (for Needs Attention display)
  let worstFcp = null;
  let worstFormatPrice = null;
  if (allFormatMetrics.length > 0) {
    let worstIdx = 0;
    allFormatMetrics.forEach((m, i) => {
      if ((m.foodCostPercent ?? 0) > (allFormatMetrics[worstIdx].foodCostPercent ?? 0)) {
        worstIdx = i;
      }
    });
    worstFcp = allFormatMetrics[worstIdx].foodCostPercent ?? null;
    worstFormatPrice = parsePositiveNumber(pricedFormats[worstIdx]?.selling_price);
  }

  const formatProfits = allFormatMetrics
    .map((m) => m.batchProfit)
    .filter((p) => p != null);

  const foodCostPercents = allFormatMetrics
    .map((m) => m.foodCostPercent)
    .filter((v) => v != null && !Number.isNaN(v));

  const worstMarginStatus = allFormatMetrics.some((m) => m.marginStatus === 'danger')
    ? 'danger'
    : allFormatMetrics.some((m) => m.marginStatus === 'warning')
      ? 'warning'
      : allFormatMetrics.length > 0 && allFormatMetrics.every((m) => m.marginStatus === 'good')
        ? 'good'
        : null;

  const summary = {
    total_recipe_cost: totalCost,
    recommended_price: defaultMetrics.recommendedBundlePrice ?? defaultMetrics.recommendedPrice,
    cost_per_unit: defaultMetrics.costPerUnit,
    actual_food_cost_percent: defaultMetrics.foodCostPercent,
    worst_food_cost_percent: worstFcp,
    worst_format_price: worstFormatPrice,
    food_cost_percents: foodCostPercents,
    has_danger_format: allFormatMetrics.some((m) => m.marginStatus === 'danger'),
    gross_profit: defaultMetrics.batchProfit,
    format_profits: formatProfits,
    all_formats_on_target: allFormatMetrics.length > 0
      && allFormatMetrics.every((m) => m.marginStatus === 'good' && (m.profit ?? 0) >= 0),
    marginStatus: overallMarginStatus,
    worst_margin_status: worstMarginStatus,
    target_food_cost_percent: raw.target_food_cost_percent,
    format_count: allFormatMetrics.length,
    ingredient_count: raw.recipe_ingredients?.length ?? 0,
    has_any_cost: dish.hasAnyCost,
    has_selling_price: dish.hasSellingPrice,
    suggested_price: dish.suggestedPrice,
    yield_quantity: dish.yieldQuantity,
    yield_unit_label: defaultFmt?.selling_unit?.label ?? null,
    yield_unit_name: defaultFmt?.selling_unit?.name ?? null,
  };

  return { recipe, summary };
}

let recipeFetchFlight = null;
/** Final autosave of a dish editor that is closing; readers wait on it before loading. */
let pendingDishSave = null;
/**
 * Bumped when a write starts and when it finishes. A reload that overlapped a write may
 * have read old rows, so it is thrown away and run again instead of overwriting newer data.
 */
let writeVersion = 0;
const MAX_FETCH_ATTEMPTS = 3;

const useRecipeStore = create((set, get) => ({
  recipes: [],
  costSummaries: {},
  sellingUnits: [],
  /** True after at least one successful fetch for the current session/user. */
  hydrated: false,
  loading: false,
  error: null,

  trackDishSave: (promise) => {
    const tracked = Promise.resolve(promise)
      .catch(() => {})
      .finally(() => { if (pendingDishSave === tracked) pendingDishSave = null; });
    pendingDishSave = tracked;
    return tracked;
  },

  waitForDishSave: () => pendingDishSave ?? Promise.resolve(),

  reset: () => {
    recipeFetchFlight = null;
    pendingDishSave = null;
    set({ recipes: [], costSummaries: {}, hydrated: false, loading: false, error: null });
  },

  fetchSellingUnits: async () => {
    try {
      const { data } = await supabase.from('selling_units').select('*').order('sort_order');
      if (data) set({ sellingUnits: data });
    } catch (_) {}
  },

  fetchRecipes: async () => {
    if (recipeFetchFlight) return recipeFetchFlight;

    const loadAll = async () => {
        const { data: recipesRaw, error } = await supabase
          .from('recipes')
          .select(`
            *,
            recipe_ingredients (
              *,
              ingredient:ingredients (*)
            )
          `)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch ALL selling formats for all recipes in one query
        const recipeIds = (recipesRaw ?? []).map((r) => r.id);
        let formatsMap = {}; // recipeId → [{ selling_price, unit_quantity, is_default, selling_unit }]
        if (recipeIds.length > 0) {
          const { data: allFormats, error: formatsError } = await supabase
            .from('recipe_selling_formats')
            .select('recipe_id, selling_price, unit_quantity, is_default, selling_unit:selling_units (name, label)')
            .in('recipe_id', recipeIds);
          if (formatsError) throw formatsError;
          (allFormats ?? []).forEach((f) => {
            if (!formatsMap[f.recipe_id]) formatsMap[f.recipe_id] = [];
            formatsMap[f.recipe_id].push(f);
          });
        }

        const costSummaries = {};
        const recipes = (recipesRaw ?? []).map((raw) => {
          const { recipe, summary } = buildRecipeEntry(raw, formatsMap[raw.id] ?? []);
          costSummaries[raw.id] = summary;
          return recipe;
        });
        return { recipes, costSummaries };
    };

    recipeFetchFlight = (async () => {
      set({ loading: true, error: null });
      try {
        let result;
        let fresh = false;
        for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS && !fresh; attempt += 1) {
          const startedAt = writeVersion;
          result = await loadAll();
          fresh = startedAt === writeVersion;
        }
        // Still overlapping writes: the list already has them applied locally, keep it
        if (!fresh && get().hydrated) return get().recipes;
        set({ ...result, hydrated: true, error: null });
        return result.recipes;
      } catch (error) {
        console.error('Fetch recipes error:', error);
        set({ error: 'Failed to load recipes.' });
        return null;
      } finally {
        set({ loading: false });
        recipeFetchFlight = null;
      }
    })();

    return recipeFetchFlight;
  },

  /**
   * Ensures dishes are loaded, then returns active recipe count.
   * Prefer in-memory after hydrate; fall back to a cheap DB count if fetch failed.
   */
  ensureRecipeCount: async () => {
    const state = get();
    if (state.hydrated) return state.recipes.length;

    await get().fetchRecipes();
    if (get().hydrated) return get().recipes.length;

    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false);
      if (error) throw error;
      return count ?? 0;
    } catch (e) {
      console.error('ensureRecipeCount fallback:', e);
      return Number.MAX_SAFE_INTEGER;
    }
  },

  fetchRecipeWithIngredients: async (id) => {
    try {
      const { data: raw, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            ingredient:ingredients (*)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;

      // Fetch all selling formats for this recipe
      const { data: formats, error: formatsError } = await supabase
        .from('recipe_selling_formats')
        .select('*, selling_unit:selling_units (name, label)')
        .eq('recipe_id', id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (formatsError) throw formatsError;

      const sellingFormats = (formats ?? []).map((f) => ({
        id: f.id,
        name: f.name ?? '',
        selling_unit_name: f.selling_unit?.name ?? 'piece',
        selling_unit_label: f.selling_unit?.label ?? null,
        unit_quantity: String(f.unit_quantity ?? 1),
        selling_price: f.selling_price != null ? String(f.selling_price) : '',
        is_default: f.is_default,
      }));

      const data = { ...raw, selling_formats: sellingFormats };

      return { data, error: null };
    } catch (error) {
      console.error('Fetch recipe detail error:', error);
      return { data: null, error: 'Failed to load recipe details.' };
    }
  },

  /**
   * Creates (recipeId null) or updates a dish atomically via the save_recipe RPC.
   * recipeData:      { name, description?, category, target_food_cost_percent }
   * recipeIngredients: [{ ingredient_id, quantity, unit }]
   * sellingFormats:  [{ name, selling_unit_name, unit_quantity, selling_price?, is_default? }]
   *                  First format is the default (dish yield) unless one is flagged.
   * refresh:         reload the dish list afterwards (autosave passes false and refreshes once on leave)
   */
  saveRecipe: async ({ recipeId = null, recipeData, recipeIngredients, sellingFormats, refresh = true }) => {
    writeVersion += 1;
    try {
      if (!useAuthStore.getState().user?.id) throw new Error('Not authenticated');

      if (get().sellingUnits.length === 0) await get().fetchSellingUnits();
      const { sellingUnits } = get();

      const flaggedDefault = sellingFormats.findIndex((f) => f.is_default);
      const defaultIdx = flaggedDefault >= 0 ? flaggedDefault : 0;

      const formats = sellingFormats.map((f, idx) => ({
        name: f.name?.trim() || 'Default',
        selling_unit_id: sellingUnits.find((u) => u.name === f.selling_unit_name)?.id ?? null,
        unit_quantity: parsePositiveNumber(f.unit_quantity) ?? 1,
        selling_price: parsePositiveNumber(f.selling_price),
        is_default: idx === defaultIdx,
      }));
      if (formats.length === 0 || formats.some((f) => !f.selling_unit_id)) {
        throw new Error('Unknown selling unit');
      }

      const ingredients = recipeIngredients.map((ri) => ({
        ingredient_id: ri.ingredient_id,
        quantity: parsePositiveNumber(ri.quantity),
        unit: ri.unit,
      }));
      if ((!recipeId && ingredients.length === 0) || ingredients.some((ri) => ri.quantity == null || !ri.unit)) {
        throw new Error('Invalid ingredient rows');
      }

      const { data: savedId, error } = await supabase.rpc('save_recipe', {
        p_recipe_id: recipeId,
        p_recipe: {
          name: recipeData.name,
          description: recipeData.description ?? null,
          category: recipeData.category,
          target_food_cost_percent: recipeData.target_food_cost_percent,
        },
        p_ingredients: ingredients,
        p_formats: formats,
      });
      if (error) throw error;

      writeVersion += 1;
      get().applySavedRecipe({ id: savedId, recipeData, ingredients, formats });
      if (refresh) get().fetchRecipes();
      return { data: { id: savedId }, error: null };
    } catch (error) {
      console.error('Save recipe error:', error);
      writeVersion += 1;
      return {
        data: null,
        error: recipeId
          ? 'Couldn\u2019t save your changes. Please try again.'
          : 'Couldn\u2019t save this dish. Please try again.',
      };
    }
  },

  /**
   * Puts a just-saved dish into the list with its full cost summary, computed exactly
   * like a reload, so lists never show a half-filled dish while the reload runs.
   */
  applySavedRecipe: ({ id, recipeData, ingredients, formats }) => {
    const library = useIngredientStore.getState().ingredients;
    const { sellingUnits, recipes } = get();
    const existing = recipes.find((r) => r.id === id);

    const recipeIngredients = ingredients.map((ri) => ({
      ...ri,
      ingredient: library.find((i) => i.id === ri.ingredient_id) ?? null,
    }));
    const formatRows = formats.map((f) => {
      const unit = sellingUnits.find((u) => u.id === f.selling_unit_id);
      return { ...f, selling_unit: unit ? { name: unit.name, label: unit.label } : null };
    });

    const raw = {
      is_sample: false,
      is_archived: false,
      created_at: new Date().toISOString(),
      ...existing,
      id,
      name: recipeData.name,
      description: recipeData.description ?? null,
      category: recipeData.category,
      target_food_cost_percent: recipeData.target_food_cost_percent,
      recipe_ingredients: recipeIngredients,
    };
    const { recipe, summary } = buildRecipeEntry(raw, formatRows);
    // An ingredient missing from the library cache would under-count the cost; let the reload fill it in
    const complete = recipeIngredients.every((ri) => ri.ingredient);

    set((state) => {
      const costSummaries = { ...state.costSummaries };
      if (complete) costSummaries[id] = summary;
      else delete costSummaries[id];
      return {
        hydrated: true,
        recipes: existing
          ? state.recipes.map((r) => (r.id === id ? recipe : r))
          : [recipe, ...state.recipes],
        costSummaries,
      };
    });
  },

  deleteRecipe: async (id) => {
    writeVersion += 1;
    try {
      await supabase.from('recipe_selling_formats').delete().eq('recipe_id', id);
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== id),
        costSummaries: Object.fromEntries(
          Object.entries(state.costSummaries).filter(([k]) => k !== id)
        ),
      }));
      return { error: null };
    } catch (error) {
      console.error('Delete recipe error:', error);
      return { error: 'Failed to delete recipe. Please try again.' };
    } finally {
      writeVersion += 1;
    }
  },

  /**
   * Adds (formatId null) or updates one selling format of a saved dish, leaving its
   * ingredients and other formats untouched.
   * format: { selling_unit_name, unit_quantity, selling_price }
   */
  saveSellingFormat: async ({ recipeId, formatId = null, dishName, format }) => {
    writeVersion += 1;
    try {
      if (get().sellingUnits.length === 0) await get().fetchSellingUnits();
      const unit = get().sellingUnits.find((u) => u.name === format.selling_unit_name);
      const quantity = parsePositiveNumber(format.unit_quantity);
      const price = parsePositiveNumber(format.selling_price);
      if (!unit || quantity == null || price == null) throw new Error('Invalid selling format');

      const row = {
        name: formatSellingFormatName(unit.label ?? unit.name, quantity, dishName),
        selling_unit_id: unit.id,
        unit_quantity: quantity,
        selling_price: price,
      };
      const { error } = formatId
        ? await supabase.from('recipe_selling_formats').update(row).eq('id', formatId).eq('recipe_id', recipeId)
        : await supabase.from('recipe_selling_formats').insert({ ...row, recipe_id: recipeId, is_default: false });
      if (error) throw error;

      writeVersion += 1;
      get().fetchRecipes();
      return { error: null };
    } catch (error) {
      console.error('Save selling format error:', error);
      writeVersion += 1;
      return { error: 'Couldn\u2019t save this price. Please try again.' };
    }
  },

  /** Removes an extra selling format; the dish's own (default) format is never deleted here. */
  deleteSellingFormat: async ({ recipeId, formatId }) => {
    writeVersion += 1;
    try {
      const { error } = await supabase
        .from('recipe_selling_formats')
        .delete()
        .eq('id', formatId)
        .eq('recipe_id', recipeId)
        .eq('is_default', false);
      if (error) throw error;

      writeVersion += 1;
      get().fetchRecipes();
      return { error: null };
    } catch (error) {
      console.error('Delete selling format error:', error);
      writeVersion += 1;
      return { error: 'Couldn\u2019t remove it. Please try again.' };
    }
  },

  getRecipeById: (id) => get().recipes.find((r) => r.id === id) ?? null,
}));

export default useRecipeStore;
