import AsyncStorage from '@react-native-async-storage/async-storage';
import { FOOD_COST_COPY as C } from '../constants/copy';
import { supabase } from './supabase';

const LOCAL_DRAFT_KEY = '@costmydish/food-cost-draft';
const LOCAL_MIGRATED_KEY = '@costmydish/food-cost-draft-migrated-v1';

/**
 * @typedef {object} FoodCostDraft
 * @property {1|2|3} step
 * @property {{ name: string, category: string, target_food_cost_percent: string }} dish
 * @property {Array<{ ingredient_id: string, quantity: string, unit: string, name?: string }>} ingredients
 * @property {Array<{ id: number|string, selling_unit_name: string, unit_quantity: string, selling_price: string }>} sellingFormats
 * @property {string} updatedAt
 */

export function isMeaningfulDraft(draft) {
  if (!draft) return false;
  const name = draft.dish?.name?.trim();
  const hasIngredients = (draft.ingredients?.length ?? 0) > 0;
  const hasFormats = (draft.sellingFormats?.length ?? 0) > 0;
  return Boolean(name || hasIngredients || hasFormats);
}

export function getDraftDisplayName(draft) {
  const name = draft?.dish?.name?.trim();
  return name || C.draft.untitled;
}

export function getDraftStepLabel(step) {
  return C.draft.stepLabels[step] ?? C.draft.stepLabels[3];
}

function normalizeDraftPayload(draft) {
  return {
    step: draft.step >= 1 && draft.step <= 3 ? draft.step : 1,
    dish: {
      name: draft.dish?.name ?? '',
      category: draft.dish?.category ?? 'other',
      target_food_cost_percent: draft.dish?.target_food_cost_percent ?? '30',
    },
    ingredients: (draft.ingredients ?? []).map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: String(ri.quantity ?? ''),
      unit: ri.unit,
      ...(ri.ingredient?.name || ri.name
        ? { name: ri.ingredient?.name ?? ri.name }
        : {}),
    })),
    sellingFormats: (draft.sellingFormats ?? []).map((f) => ({
      id: f.id,
      selling_unit_name: f.selling_unit_name,
      unit_quantity: String(f.unit_quantity ?? '1'),
      selling_price: String(f.selling_price ?? ''),
    })),
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  };
}

function rowToDraft(row) {
  if (!row) return null;
  return normalizeDraftPayload({
    step: row.step,
    dish: row.dish ?? {},
    ingredients: row.ingredients ?? [],
    sellingFormats: row.selling_formats ?? [],
    updatedAt: row.updated_at ?? new Date().toISOString(),
  });
}

async function getUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function readLocalDraft() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return null;
    return normalizeDraftPayload(draft);
  } catch {
    return null;
  }
}

async function writeLocalCache(draft) {
  try {
    if (!draft || !isMeaningfulDraft(draft)) {
      await AsyncStorage.removeItem(LOCAL_DRAFT_KEY);
      return;
    }
    await AsyncStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Cache food cost draft failed:', error?.message);
  }
}

async function clearLocalCache() {
  try {
    await AsyncStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch (error) {
    console.warn('Clear local food cost draft failed:', error?.message);
  }
}

/**
 * One-time: push legacy AsyncStorage draft to Supabase if cloud has none.
 */
async function migrateLocalDraftIfNeeded(userId) {
  try {
    const migrated = await AsyncStorage.getItem(LOCAL_MIGRATED_KEY);
    if (migrated === '1') return;

    const local = await readLocalDraft();
    if (isMeaningfulDraft(local)) {
      const { data: existing } = await supabase
        .from('food_cost_drafts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('food_cost_drafts').upsert({
          user_id: userId,
          step: local.step,
          dish: local.dish,
          ingredients: local.ingredients,
          selling_formats: local.sellingFormats,
          updated_at: local.updatedAt || new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (error) {
          console.warn('Migrate food cost draft failed:', error.message);
          return;
        }
      }
    }

    await AsyncStorage.setItem(LOCAL_MIGRATED_KEY, '1');
  } catch (error) {
    console.warn('Migrate food cost draft failed:', error?.message);
  }
}

/** @returns {Promise<FoodCostDraft|null>} */
export async function loadFoodCostDraft() {
  const userId = await getUserId();
  if (!userId) {
    const local = await readLocalDraft();
    return isMeaningfulDraft(local) ? local : null;
  }

  await migrateLocalDraftIfNeeded(userId);

  try {
    const { data, error } = await supabase
      .from('food_cost_drafts')
      .select('step, dish, ingredients, selling_formats, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const draft = rowToDraft(data);
    if (isMeaningfulDraft(draft)) {
      await writeLocalCache(draft);
      return draft;
    }

    await clearLocalCache();
    return null;
  } catch (error) {
    console.warn('Load food cost draft failed:', error?.message);
    // Offline / network: fall back to last cached draft
    const local = await readLocalDraft();
    return isMeaningfulDraft(local) ? local : null;
  }
}

/** @param {Partial<FoodCostDraft>} draft */
export async function saveFoodCostDraft(draft) {
  const payload = normalizeDraftPayload(draft);

  if (!isMeaningfulDraft(payload)) {
    await clearFoodCostDraft();
    return null;
  }

  // Cache first so home / resume stay snappy even if network is slow
  await writeLocalCache(payload);

  const userId = await getUserId();
  if (!userId) return payload;

  try {
    const { error } = await supabase.from('food_cost_drafts').upsert({
      user_id: userId,
      step: payload.step,
      dish: payload.dish,
      ingredients: payload.ingredients,
      selling_formats: payload.sellingFormats,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) throw error;
    return payload;
  } catch (error) {
    console.warn('Save food cost draft failed:', error?.message);
    // Local cache already written — draft is not lost on this device
    return payload;
  }
}

export async function clearFoodCostDraft() {
  await clearLocalCache();

  const userId = await getUserId();
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('food_cost_drafts')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  } catch (error) {
    console.warn('Clear food cost draft failed:', error?.message);
  }
}
