'use client';

// Saves a dish for the signed-in user exactly like the CostMyDish app's Calculate screen
// (app/recipe/create.jsx + stores/recipeStore.js): new ingredients go into the Library first,
// then the save_recipe RPC writes the dish, its ingredient lines and one default selling format.

import { parseDecimal, parsePositive, SELLING_UNITS } from '@/lib/food-cost';
import { nameKey, normalizeName } from '@/lib/library-match';
import { FREE_DISH_LIMIT, FREE_INGREDIENT_LIMIT, UPGRADE_HINT } from '@/lib/plans';
import { getSupabase } from '@/lib/supabase';

export { FREE_DISH_LIMIT, FREE_INGREDIENT_LIMIT };
const DEFAULT_CATEGORY = 'main_course';
const DEFAULT_DISH_NAME = 'Untitled dish';

export class DishSaveError extends Error {
  /** code: 'not_signed_in' | 'dish_limit' | 'ingredient_limit' | 'invalid' | 'failed' */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---- Selling format name: same as the app's utils/sellingFormat.js ----

const INVARIANT_WORDS = new Set(['dozen', 'each', 'other']);

function pluralWord(word) {
  if (INVARIANT_WORDS.has(word.toLowerCase())) return word;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

function pluralizeUnitWord(word, qty) {
  const w = String(word ?? '').trim();
  if (!w || parseFloat(qty) === 1) return w;
  return w.replace(/(\S+)$/, pluralWord);
}

/** e.g. "24 pieces (Chocolate chip cookies)", "1 whole dish (Banana bread)" */
export function sellingFormatName(sellingUnit, qty, dishName) {
  const label = SELLING_UNITS.find(([value]) => value === sellingUnit)?.[1] ?? sellingUnit;
  const lower = String(label ?? '').trim().toLowerCase() || 'unit';
  const word = lower === 'whole' ? 'whole dish' : lower;
  const q = parseFloat(qty) || 1;
  const base = `${q} ${pluralizeUnitWord(word, q)}`;
  const dish = normalizeName(dishName);
  if (!dish) return base;
  const short = dish.length > 48 ? `${dish.slice(0, 45).trimEnd()}…` : dish;
  return `${base} (${short})`;
}

// ---- Library matching ----

function sameLibraryItem(existing, row) {
  return (
    Number(existing.purchase_price) === row.purchasePrice
    && Number(existing.purchase_quantity) === row.purchaseQuantity
    && existing.purchase_unit === row.purchaseUnit
    && Number(existing.waste_percent ?? 0) === row.wastePercent
  );
}

function toLibraryRow(ingredient) {
  return {
    key: nameKey(ingredient.name),
    name: normalizeName(ingredient.name),
    purchasePrice: parsePositive(ingredient.buyPrice),
    purchaseQuantity: parsePositive(ingredient.buyQty),
    purchaseUnit: ingredient.buyUnit,
    wastePercent: parseDecimal(ingredient.wastePercent) || 0,
    useQuantity: parsePositive(ingredient.useQty),
    useUnit: ingredient.useUnit,
  };
}

async function requireUserId(supabase) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new DishSaveError('not_signed_in', 'Please sign in to save this dish.');
  return userId;
}

async function loadAccountState(supabase, userId) {
  const [profile, dishes, library] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', userId).maybeSingle(),
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('is_archived', false),
    supabase
      .from('ingredients')
      .select('id, name, purchase_price, purchase_quantity, purchase_unit, waste_percent')
      .eq('is_archived', false),
  ]);
  const failed = [profile, dishes, library].find((result) => result.error);
  if (failed) throw new DishSaveError('failed', 'Could not reach your account. Please try again.');
  return {
    isFree: (profile.data?.subscription_tier ?? 'free') === 'free',
    dishCount: dishes.count ?? 0,
    library: library.data ?? [],
  };
}

/**
 * Compares the dish's ingredients with the user's Library before saving.
 * Returns { currency, matches: [{ name, libraryId, samePrice }], newCount } so the UI can ask
 * whether to keep the Library price or update it when they differ.
 */
export async function previewDishSave(dish, { recipeId = null } = {}) {
  const supabase = getSupabase();
  const userId = await requireUserId(supabase);
  const [{ isFree, dishCount, library }, settings] = await Promise.all([
    loadAccountState(supabase, userId),
    supabase.from('user_settings').select('currency').eq('user_id', userId).maybeSingle(),
  ]);
  const byName = new Map(library.map((item) => [nameKey(item.name), item]));
  const seen = new Set();
  const matches = [];
  let newCount = 0;
  for (const ingredient of dish.ingredients.map(toLibraryRow)) {
    if (seen.has(ingredient.key)) continue;
    seen.add(ingredient.key);
    const existing = byName.get(ingredient.key);
    if (existing) matches.push({ name: existing.name, libraryId: existing.id, samePrice: sameLibraryItem(existing, ingredient) });
    else newCount += 1;
  }
  return {
    isFree,
    currency: settings.data?.currency ?? null,
    dishCount,
    libraryCount: library.length,
    matches,
    newCount,
    dishLimitReached: !recipeId && isFree && dishCount >= FREE_DISH_LIMIT,
    ingredientLimitReached: isFree && library.length + newCount > FREE_INGREDIENT_LIMIT,
  };
}

function validateDish(dish) {
  if (!Array.isArray(dish.ingredients) || dish.ingredients.length === 0) {
    throw new DishSaveError('invalid', 'Add at least one ingredient before saving.');
  }
  const rows = dish.ingredients.map(toLibraryRow);
  const incomplete = rows.some(
    (row) => !row.name || !row.purchasePrice || !row.purchaseQuantity || !row.purchaseUnit || !row.useQuantity || !row.useUnit
      || row.wastePercent < 0 || row.wastePercent >= 100,
  );
  if (incomplete) throw new DishSaveError('invalid', 'Fix the highlighted ingredient fields before saving.');
  const firstByKey = new Map();
  for (const row of rows) {
    const first = firstByKey.get(row.key);
    if (!first) firstByKey.set(row.key, row);
    else if (first.purchasePrice !== row.purchasePrice || first.purchaseQuantity !== row.purchaseQuantity
      || first.purchaseUnit !== row.purchaseUnit || first.wastePercent !== row.wastePercent) {
      throw new DishSaveError('invalid', `“${row.name}” is in this dish twice with different prices. Use one price for both.`);
    }
  }
  if (!SELLING_UNITS.some(([value]) => value === dish.yieldUnit)) {
    throw new DishSaveError('invalid', 'Choose how you sell this dish.');
  }
  return rows;
}

/**
 * Saves the dish to the signed-in user's account.
 *
 * dish: {
 *   name, yieldQty, yieldUnit (selling unit, e.g. 'piece'), targetPercent,
 *   sellingPrice (optional), suggestedPrice (used when no price is entered, as in the app),
 *   ingredients: [{ name, buyPrice, buyQty, buyUnit, wastePercent, useQty, useUnit }]
 * }
 * updateLibrary: Library ingredient ids whose price should be replaced with the dish's price;
 *   other name matches reuse the Library item as it is.
 * recipeId: update this dish instead of creating one (its category and description stay).
 * extraFormats: the dish's other selling formats to keep when updating,
 *   [{ unitName, unitQuantity, sellingPrice }]; they are renamed for the dish name like the app does.
 *
 * Returns { recipeId }. Throws DishSaveError with a user-friendly message.
 */
export async function saveDish(dish, { updateLibrary = [], recipeId = null, extraFormats = [] } = {}) {
  const rows = validateDish(dish);
  const supabase = getSupabase();
  const userId = await requireUserId(supabase);
  const { isFree, dishCount, library } = await loadAccountState(supabase, userId);

  if (!recipeId && isFree && dishCount >= FREE_DISH_LIMIT) {
    throw new DishSaveError('dish_limit', `The free plan includes ${FREE_DISH_LIMIT} dishes. ${UPGRADE_HINT}`);
  }

  const byName = new Map(library.map((item) => [nameKey(item.name), item]));
  const idByKey = new Map();
  const toCreate = [];
  const toUpdate = [];
  for (const row of rows) {
    if (idByKey.has(row.key) || toCreate.some((item) => nameKey(item.name) === row.key)) continue;
    const existing = byName.get(row.key);
    if (existing) {
      idByKey.set(row.key, existing.id);
      if (updateLibrary.includes(existing.id) && !sameLibraryItem(existing, row)) toUpdate.push({ id: existing.id, row });
    } else {
      toCreate.push({
        user_id: userId,
        category_id: null,
        name: row.name,
        purchase_price: row.purchasePrice,
        purchase_quantity: row.purchaseQuantity,
        purchase_unit: row.purchaseUnit,
        waste_percent: row.wastePercent,
        notes: null,
      });
    }
  }

  if (isFree && library.length + toCreate.length > FREE_INGREDIENT_LIMIT) {
    throw new DishSaveError(
      'ingredient_limit',
      `The free plan includes ${FREE_INGREDIENT_LIMIT} ingredients. ${UPGRADE_HINT}`,
    );
  }

  try {
    if (toCreate.length > 0) {
      const { data, error } = await supabase.from('ingredients').insert(toCreate).select('id, name');
      if (error) throw error;
      for (const item of data) idByKey.set(nameKey(item.name), item.id);
    }

    for (const { id, row } of toUpdate) {
      const { error } = await supabase
        .from('ingredients')
        .update({
          purchase_price: row.purchasePrice,
          purchase_quantity: row.purchaseQuantity,
          purchase_unit: row.purchaseUnit,
          waste_percent: row.wastePercent,
        })
        .eq('id', id);
      if (error) throw error;
    }

    const { data: units, error: unitsError } = await supabase.from('selling_units').select('id, name');
    if (unitsError) throw unitsError;
    const sellingUnitId = units.find((unit) => unit.name === dish.yieldUnit)?.id;
    if (!sellingUnitId) throw new Error('Unknown selling unit');

    const dishName = normalizeName(dish.name) || DEFAULT_DISH_NAME;
    const yieldQuantity = parsePositive(dish.yieldQty) ?? 1;
    const price = parsePositive(dish.sellingPrice) ?? (Number(dish.suggestedPrice) > 0 ? Number(dish.suggestedPrice) : null);

    const keptFormats = extraFormats.map((format) => {
      const unitId = units.find((unit) => unit.name === format.unitName)?.id;
      if (!unitId) throw new Error('Unknown selling unit');
      const quantity = parsePositive(String(format.unitQuantity)) ?? 1;
      return {
        name: sellingFormatName(format.unitName, quantity, dishName),
        selling_unit_id: unitId,
        unit_quantity: quantity,
        selling_price: format.sellingPrice ?? null,
        is_default: false,
      };
    });

    const recipeFields = { name: dishName, target_food_cost_percent: parsePositive(dish.targetPercent) ?? 30 };
    const { data: savedId, error } = await supabase.rpc('save_recipe', {
      p_recipe_id: recipeId,
      p_recipe: recipeId ? recipeFields : { ...recipeFields, description: null, category: DEFAULT_CATEGORY },
      p_ingredients: rows.map((row) => ({
        ingredient_id: idByKey.get(row.key),
        quantity: row.useQuantity,
        unit: row.useUnit,
      })),
      p_formats: [
        {
          name: sellingFormatName(dish.yieldUnit, yieldQuantity, dishName),
          selling_unit_id: sellingUnitId,
          unit_quantity: yieldQuantity,
          selling_price: price,
          is_default: true,
        },
        ...keptFormats,
      ],
    });
    if (error) throw error;
    return { recipeId: savedId };
  } catch (error) {
    if (error instanceof DishSaveError) throw error;
    if (error?.code === '23505') {
      throw new DishSaveError('failed', 'An ingredient with one of these names already exists. Please try again.');
    }
    throw new DishSaveError('failed', 'Couldn’t save this dish. Please try again.');
  }
}
