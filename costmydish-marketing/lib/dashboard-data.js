'use client';

// Reads and writes for the signed-in dashboard, matching the CostMyDish app
// (stores/recipeStore.js, stores/ingredientStore.js, lib/calculations.js).

import { getCurrency, isCurrencyCode } from '@/lib/currency';
import { ingredientLineCost, roundPriceUp } from '@/lib/food-cost';
import { UPGRADE_HINT } from '@/lib/plans';
import { FREE_INGREDIENT_LIMIT } from '@/lib/save-dish';
import { getSupabase } from '@/lib/supabase';

export class DashboardError extends Error {
  /** code: 'duplicate' | 'limit' | 'not_found' | 'failed' */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const LOAD_FAILED = 'Couldn’t load your data. Check your connection and try again.';

function ensure(result, message = LOAD_FAILED) {
  if (result.error) throw new DashboardError('failed', message);
  return result.data;
}

/** Currency symbol and code from the user's settings (falls back to USD). */
export async function loadAccountCurrency(userId) {
  const { data } = await getSupabase().from('user_settings').select('currency').eq('user_id', userId).maybeSingle();
  const code = isCurrencyCode(data?.currency) ? data.currency : 'USD';
  return { code, symbol: getCurrency(code).symbol };
}

async function loadTier(userId) {
  const { data } = await getSupabase().from('profiles').select('subscription_tier').eq('id', userId).maybeSingle();
  return data?.subscription_tier ?? 'free';
}

// ---- Cost maths (same as the app's calculateSellingFormatMetrics / calculateDishSummary) ----

function normalizePercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Metrics for one selling format: price is per selling unit, unitQuantity is how many the batch makes. */
export function formatMetrics({ totalCost, unitQuantity, sellingPrice, targetPercent }) {
  const quantity = Math.max(Number(unitQuantity) || 1, 0.0001);
  const price = positive(sellingPrice);
  const target = normalizePercent(targetPercent ?? 30) || 30;
  const costPerUnit = totalCost / quantity;
  const suggestedPrice = totalCost > 0 ? roundPriceUp(costPerUnit / (target / 100)) : null;

  let foodCostPercent = null;
  let profit = null;
  let status = null;
  if (price != null) {
    foodCostPercent = normalizePercent((costPerUnit / price) * 100);
    profit = price - costPerUnit;
    const diff = foodCostPercent - target;
    if (profit < 0) status = 'loss';
    else if (diff <= 0) status = 'good';
    else if (diff <= 5) status = 'warning';
    else status = 'danger';
  }
  return { quantity, price, target, costPerUnit, suggestedPrice, foodCostPercent, profit, batchProfit: profit != null ? profit * quantity : null, status };
}

function lineFor(row) {
  const ingredient = row.ingredient;
  if (!ingredient) return { id: row.id, name: 'Removed ingredient', quantity: row.quantity, unit: row.unit, cost: null, missing: true };
  const { cost, error } = ingredientLineCost({
    buyPrice: String(ingredient.purchase_price ?? ''),
    buyQty: String(ingredient.purchase_quantity ?? ''),
    buyUnit: ingredient.purchase_unit,
    useQty: String(row.quantity ?? ''),
    useUnit: row.unit,
    wastePercent: String(ingredient.waste_percent ?? 0),
  });
  return { id: row.id, ingredientId: ingredient.id, name: ingredient.name, quantity: Number(row.quantity), unit: row.unit, cost, error };
}

/** Full cost picture of one dish: lines, total, default format and every priced format. */
export function dishCost(recipe, formats) {
  const lines = (recipe.recipe_ingredients ?? []).map(lineFor);
  const totalCost = lines.reduce((sum, line) => sum + (line.cost ?? 0), 0);
  const ordered = [...formats].sort((a, b) => Number(b.is_default) - Number(a.is_default));
  const target = recipe.target_food_cost_percent;
  const formatRows = ordered.map((format) => ({
    id: format.id,
    name: format.name,
    isDefault: format.is_default,
    unitName: format.selling_unit?.name ?? null,
    unitLabel: format.selling_unit?.label ?? null,
    ...formatMetrics({ totalCost, unitQuantity: format.unit_quantity, sellingPrice: format.selling_price, targetPercent: target }),
  }));
  const main = formatRows[0] ?? { ...formatMetrics({ totalCost, unitQuantity: 1, sellingPrice: null, targetPercent: target }), unitName: null, unitLabel: null };
  const priced = formatRows.filter((format) => format.status);
  const listStatus = priced.length === 0
    ? null
    : priced.some((format) => format.status !== 'good') ? 'over_target' : 'on_target';
  return { lines, totalCost, main, formats: formatRows, listStatus, target: normalizePercent(target ?? 30) || 30 };
}

const DISH_SELECT = `
  id, name, category, target_food_cost_percent, created_at, updated_at,
  recipe_ingredients ( id, quantity, unit, ingredient:ingredients ( id, name, purchase_price, purchase_quantity, purchase_unit, waste_percent ) )
`;
const FORMAT_SELECT = 'id, recipe_id, name, unit_quantity, selling_price, is_default, created_at, selling_unit:selling_units ( name, label )';

/** Dishes newest first, each with its cost picture. */
export async function loadDishes() {
  const supabase = getSupabase();
  const recipes = ensure(
    await supabase.from('recipes').select(DISH_SELECT).eq('is_archived', false).order('created_at', { ascending: false }),
  ) ?? [];
  if (recipes.length === 0) return [];
  const formats = ensure(
    await supabase.from('recipe_selling_formats').select(FORMAT_SELECT).in('recipe_id', recipes.map((r) => r.id)).order('created_at'),
  ) ?? [];
  return recipes.map((recipe) => ({ ...recipe, cost: dishCost(recipe, formats.filter((f) => f.recipe_id === recipe.id)) }));
}

export async function loadDish(id) {
  const supabase = getSupabase();
  const recipe = ensure(await supabase.from('recipes').select(DISH_SELECT).eq('id', id).eq('is_archived', false).maybeSingle());
  if (!recipe) throw new DashboardError('not_found', 'This dish doesn’t exist or was deleted.');
  const formats = ensure(await supabase.from('recipe_selling_formats').select(FORMAT_SELECT).eq('recipe_id', id).order('created_at')) ?? [];
  return { ...recipe, cost: dishCost(recipe, formats) };
}

/** Same order as the app: formats, ingredient lines, then the dish. */
export async function deleteDish(id) {
  const supabase = getSupabase();
  const failed = 'Couldn’t delete this dish. Please try again.';
  ensure(await supabase.from('recipe_selling_formats').delete().eq('recipe_id', id), failed);
  ensure(await supabase.from('recipe_ingredients').delete().eq('recipe_id', id), failed);
  ensure(await supabase.from('recipes').delete().eq('id', id), failed);
}

// ---- Home ----

/** Dishes plus the counts the home screen shows. */
export async function loadHome(userId) {
  const [dishes, ingredients, tier, currency] = await Promise.all([
    loadDishes(),
    getSupabase().from('ingredients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
    loadTier(userId),
    loadAccountCurrency(userId),
  ]);
  ensure(ingredients);
  return { dishes, ingredientCount: ingredients.count ?? 0, isFree: tier === 'free', symbol: currency.symbol };
}

/** Same rule as the app's "Needs attention": a format priced over target by more than 5 points, or at a loss. */
export function worstFormat(dish) {
  const flagged = dish.cost.formats.filter((format) => format.status === 'danger' || format.status === 'loss');
  if (flagged.length === 0) return null;
  return flagged.reduce((worst, format) => (format.foodCostPercent > worst.foodCostPercent ? format : worst));
}

// ---- Settings ----

const SETTINGS_FAILED = 'Couldn’t save your settings. Please try again.';

export async function loadSettings(userId) {
  const supabase = getSupabase();
  const [profile, settings, dishes, ingredients] = await Promise.all([
    supabase.from('profiles').select('full_name, subscription_tier, subscription_expires_at').eq('id', userId).maybeSingle(),
    supabase.from('user_settings').select('currency, default_food_cost_percent, unit_system').eq('user_id', userId).maybeSingle(),
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('ingredients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
  ]);
  [profile, settings, dishes, ingredients].forEach((result) => ensure(result));
  const tier = profile.data?.subscription_tier ?? 'free';
  return {
    name: profile.data?.full_name ?? '',
    isFree: tier === 'free',
    expiresAt: profile.data?.subscription_expires_at ?? null,
    currency: isCurrencyCode(settings.data?.currency) ? settings.data.currency : 'USD',
    target: Number(settings.data?.default_food_cost_percent) || 30,
    unitSystem: settings.data?.unit_system === 'imperial' ? 'imperial' : 'metric',
    dishCount: dishes.count ?? 0,
    ingredientCount: ingredients.count ?? 0,
  };
}

/** updates: any of { currency, default_food_cost_percent, unit_system } — same upsert as the app's settings store. */
export async function updateSettings(userId, updates) {
  const values = { ...updates };
  if (values.currency) values.currency_symbol = getCurrency(values.currency).symbol;
  const { error } = await getSupabase().from('user_settings').upsert({ user_id: userId, ...values }, { onConflict: 'user_id' });
  if (error) throw new DashboardError('failed', SETTINGS_FAILED);
}

/** Same as the app: checks the current password by signing in, then sets the new one. */
export async function changePassword(email, currentPassword, newPassword) {
  const supabase = getSupabase();
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) throw new DashboardError('wrong_password', 'Current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const sameAsOld = /different from the old/i.test(error.message ?? '') || error.code === 'same_password';
    throw new DashboardError('failed', sameAsOld ? 'Choose a password different from your current one.' : 'Couldn’t update your password. Please try again.');
  }
}

export async function sendFeedback(userId, message) {
  const { error } = await getSupabase().from('app_feedback').insert({
    user_id: userId,
    source: 'settings',
    message: message.trim(),
    platform: 'web',
  });
  if (error) throw new DashboardError('failed', 'Couldn’t send your message. Please try again.');
}

/** Same RPC as the app: removes the account and everything in it. */
export async function deleteAccount() {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('delete_user_account');
  if (error) throw new DashboardError('failed', 'Couldn’t delete your account. Please try again.');
  try {
    await supabase.auth.signOut();
  } catch {
    // The account is already gone
  }
}

// ---- Library ----

/** Library newest first, with how many dishes use each item. */
export async function loadLibrary(userId) {
  const supabase = getSupabase();
  const [items, uses, tier] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, purchase_price, purchase_quantity, purchase_unit, waste_percent, notes, created_at')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase.from('recipe_ingredients').select('ingredient_id, recipe_id'),
    loadTier(userId),
  ]);
  const library = ensure(items) ?? [];
  const usage = new Map();
  for (const row of ensure(uses) ?? []) {
    const set = usage.get(row.ingredient_id) ?? new Set();
    set.add(row.recipe_id);
    usage.set(row.ingredient_id, set);
  }
  return {
    isFree: tier === 'free',
    items: library.map((item) => ({ ...item, dishCount: usage.get(item.id)?.size ?? 0 })),
  };
}

function writeError(error, name, fallback) {
  if (error?.code === '23505') return new DashboardError('duplicate', `An ingredient named “${name}” already exists. Use a different name.`);
  if (error?.code === '23514') return new DashboardError('failed', 'Some values are out of range. Check the price, quantity and waste.');
  return new DashboardError('failed', fallback);
}

/** values: { name, purchase_price, purchase_quantity, purchase_unit, waste_percent, notes } */
export async function addIngredient(userId, values) {
  const supabase = getSupabase();
  const [tier, count] = await Promise.all([
    loadTier(userId),
    supabase.from('ingredients').select('id', { count: 'exact', head: true }).eq('is_archived', false),
  ]);
  if (count.error) throw new DashboardError('failed', 'Couldn’t save this ingredient. Please try again.');
  if (tier === 'free' && (count.count ?? 0) >= FREE_INGREDIENT_LIMIT) {
    throw new DashboardError('limit', `The free plan includes ${FREE_INGREDIENT_LIMIT} ingredients. ${UPGRADE_HINT}`);
  }
  const { error } = await supabase.from('ingredients').insert({ ...values, user_id: userId, category_id: null });
  if (error) throw writeError(error, values.name, 'Couldn’t save this ingredient. Please try again.');
}

export async function updateIngredient(id, values) {
  const { error } = await getSupabase().from('ingredients').update(values).eq('id', id);
  if (error) throw writeError(error, values.name, 'Couldn’t update this ingredient. Please try again.');
}

/** Same as the app: removes it from any dishes first, then deletes it. */
export async function deleteIngredient(id) {
  const supabase = getSupabase();
  const failed = 'Couldn’t delete this ingredient. Please try again.';
  ensure(await supabase.from('recipe_ingredients').delete().eq('ingredient_id', id), failed);
  ensure(await supabase.from('ingredients').delete().eq('id', id), failed);
}
