import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateTotalRecipeCost, calculateSellingFormatMetrics } from '../lib/calculations';
import useAuthStore from './authStore';

// Transform raw Supabase recipe row into UI-friendly object
function transformRecipe(raw, defaultSellingPrice) {
  const { recipe_ingredients, ...rest } = raw;
  return {
    ...rest,
    selling_price: defaultSellingPrice ?? null,
  };
}

const useRecipeStore = create((set, get) => ({
  recipes: [],
  costSummaries: {},
  sellingUnits: [],
  loading: false,
  error: null,

  fetchSellingUnits: async () => {
    try {
      const { data } = await supabase.from('selling_units').select('*').order('sort_order');
      if (data) set({ sellingUnits: data });
    } catch (_) {}
  },

  fetchRecipes: async () => {
    set({ loading: true, error: null });
    try {
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
      let formatsMap = {}; // recipeId → [{ selling_price, unit_quantity, is_default }]
      if (recipeIds.length > 0) {
        const { data: allFormats } = await supabase
          .from('recipe_selling_formats')
          .select('recipe_id, selling_price, unit_quantity, is_default')
          .in('recipe_id', recipeIds);
        (allFormats ?? []).forEach((f) => {
          if (!formatsMap[f.recipe_id]) formatsMap[f.recipe_id] = [];
          formatsMap[f.recipe_id].push(f);
        });
      }

      // Overall margin status across all formats:
      // all green → 'good', all red → 'danger', all warning → 'warning', mixed → null (neutral)
      const overallFormatStatus = (statuses) => {
        if (!statuses?.length) return null;
        const unique = [...new Set(statuses)];
        return unique.length === 1 ? unique[0] : null;
      };

      const costSummaries = {};
      const recipes = (recipesRaw ?? []).map((raw) => {
        const formats = formatsMap[raw.id] ?? [];
        const defaultFmt = formats.find((f) => f.is_default) ?? formats[0] ?? null;
        const defaultSellingPrice = defaultFmt ? parseFloat(defaultFmt.selling_price) || null : null;
        const recipe = transformRecipe(raw, defaultSellingPrice);

        const { totalCost } = calculateTotalRecipeCost(raw.recipe_ingredients ?? []);

        const pricedFormats = formats.filter((f) => parseFloat(f.selling_price) > 0);
        const allFormatMetrics = pricedFormats.map((f) =>
          calculateSellingFormatMetrics({
            totalRecipeCost: totalCost,
            unitQuantity: f.unit_quantity,
            sellingPrice: f.selling_price,
            targetFoodCostPercent: raw.target_food_cost_percent,
          })
        );

        const defaultMetrics = defaultFmt && parseFloat(defaultFmt.selling_price) > 0
          ? calculateSellingFormatMetrics({
              totalRecipeCost: totalCost,
              unitQuantity: defaultFmt.unit_quantity,
              sellingPrice: defaultFmt.selling_price,
              targetFoodCostPercent: raw.target_food_cost_percent,
            })
          : calculateSellingFormatMetrics({
              totalRecipeCost: totalCost,
              unitQuantity: 1,
              sellingPrice: null,
              targetFoodCostPercent: raw.target_food_cost_percent,
            });

        // Overall status = uniform status if all formats agree, null (neutral) if mixed
        const overallMarginStatus = pricedFormats.length > 0
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
          worstFormatPrice = parseFloat(pricedFormats[worstIdx]?.selling_price) || null;
        }

        const formatProfits = allFormatMetrics
          .map((m) => m.profit)
          .filter((p) => p != null);

        costSummaries[raw.id] = {
          total_recipe_cost: totalCost,
          recommended_price: defaultMetrics.recommendedBundlePrice ?? defaultMetrics.recommendedPrice,
          cost_per_unit: defaultMetrics.costPerUnit,
          actual_food_cost_percent: defaultMetrics.foodCostPercent,
          worst_food_cost_percent: worstFcp,
          worst_format_price: worstFormatPrice,
          has_danger_format: allFormatMetrics.some((m) => m.marginStatus === 'danger'),
          gross_profit: defaultMetrics.profit,
          format_profits: formatProfits,
          all_formats_on_target: allFormatMetrics.length > 0
            && allFormatMetrics.every((m) => m.marginStatus === 'good' && (m.profit ?? 0) >= 0),
          marginStatus: overallMarginStatus,
          target_food_cost_percent: raw.target_food_cost_percent,
          format_count: pricedFormats.length,
        };

        return recipe;
      });

      set({ recipes, costSummaries });
    } catch (error) {
      console.error('Fetch recipes error:', error);
      set({ error: 'Failed to load recipes.' });
    } finally {
      set({ loading: false });
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
      const { data: formats } = await supabase
        .from('recipe_selling_formats')
        .select('*, selling_unit:selling_units (name, label)')
        .eq('recipe_id', id)
        .order('is_default', { ascending: false });

      const sellingFormats = (formats ?? []).map((f) => ({
        id: f.id,
        name: f.name ?? '',
        selling_unit_name: f.selling_unit?.name ?? 'piece',
        unit_quantity: String(f.unit_quantity ?? 1),
        selling_price: f.selling_price != null ? String(f.selling_price) : '',
        is_default: f.is_default,
      }));

      const defaultFormat = sellingFormats.find((f) => f.is_default) ?? sellingFormats[0];

      const data = {
        ...raw,
        selling_price: defaultFormat ? parseFloat(defaultFormat.selling_price) || null : null,
        selling_formats: sellingFormats,
      };

      return { data, error: null };
    } catch (error) {
      console.error('Fetch recipe detail error:', error);
      return { data: null, error: 'Failed to load recipe details.' };
    }
  },

  // sellingFormats: [{ name, selling_unit_name, unit_quantity, selling_price, is_default? }]
  createRecipe: async (recipeData, recipeIngredients, sellingFormats = []) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { sellingUnits } = get();

      const { batch_unit, batch_size, ...rest } = recipeData;

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({ ...rest, user_id: userId })
        .select()
        .single();
      if (recipeError) throw recipeError;

      if (recipeIngredients?.length > 0) {
        const ingredientRows = recipeIngredients.map((ri) => ({
          recipe_id: recipe.id,
          ingredient_id: ri.ingredient_id,
          quantity: ri.quantity,
          unit: ri.unit,
        }));
        const { error: riError } = await supabase.from('recipe_ingredients').insert(ingredientRows);
        if (riError) throw riError;
      }

      const validFormats = sellingFormats.filter((f) => parseFloat(f.selling_price) > 0);
      if (validFormats.length > 0) {
        const formatRows = validFormats.map((f, idx) => {
          const sellingUnitId = sellingUnits.find((u) => u.name === f.selling_unit_name)?.id
            ?? sellingUnits[0]?.id;
          return {
            recipe_id: recipe.id,
            name: f.name || 'Default',
            selling_unit_id: sellingUnitId,
            unit_quantity: parseFloat(f.unit_quantity) || 1,
            selling_price: parseFloat(f.selling_price),
            is_default: idx === 0,
          };
        }).filter((r) => r.selling_unit_id);
        if (formatRows.length > 0) {
          await supabase.from('recipe_selling_formats').insert(formatRows);
        }
      }

      get().fetchRecipes();
      return { data: recipe, error: null };
    } catch (error) {
      console.error('Create recipe error:', error);
      return { data: null, error: 'Failed to create recipe. Please try again.' };
    }
  },

  updateRecipe: async (id, recipeData, recipeIngredients, sellingFormats = []) => {
    try {
      const { sellingUnits } = get();

      const { batch_unit, batch_size, ...rest } = recipeData;

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (recipeError) throw recipeError;

      if (recipeIngredients !== undefined) {
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
        if (recipeIngredients.length > 0) {
          const ingredientRows = recipeIngredients.map((ri) => ({
            recipe_id: id,
            ingredient_id: ri.ingredient_id,
            quantity: ri.quantity,
            unit: ri.unit,
          }));
          const { error: riError } = await supabase.from('recipe_ingredients').insert(ingredientRows);
          if (riError) throw riError;
        }
      }

      // Replace all selling formats
      await supabase.from('recipe_selling_formats').delete().eq('recipe_id', id);
      const validFormats = sellingFormats.filter((f) => parseFloat(f.selling_price) > 0);
      if (validFormats.length > 0) {
        const formatRows = validFormats.map((f, idx) => {
          const sellingUnitId = sellingUnits.find((u) => u.name === f.selling_unit_name)?.id
            ?? sellingUnits[0]?.id;
          return {
            recipe_id: id,
            name: f.name || 'Default',
            selling_unit_id: sellingUnitId,
            unit_quantity: parseFloat(f.unit_quantity) || 1,
            selling_price: parseFloat(f.selling_price),
            is_default: idx === 0,
          };
        }).filter((r) => r.selling_unit_id);
        if (formatRows.length > 0) {
          await supabase.from('recipe_selling_formats').insert(formatRows);
        }
      }

      get().fetchRecipes();
      return { data: recipe, error: null };
    } catch (error) {
      console.error('Update recipe error:', error);
      return { data: null, error: 'Failed to update recipe. Please try again.' };
    }
  },

  deleteRecipe: async (id) => {
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
    }
  },

  getRecipeById: (id) => get().recipes.find((r) => r.id === id) ?? null,
}));

export default useRecipeStore;
