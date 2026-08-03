import AsyncStorage from '@react-native-async-storage/async-storage';
import { FOOD_COST_COPY as C } from '../constants/copy';

const DRAFT_KEY = '@costmydish/food-cost-draft';

/**
 * @typedef {object} FoodCostDraft
 * @property {1|2|3} step
 * @property {{ name: string, category: string, target_food_cost_percent: string }} dish
 * @property {Array<{ ingredient_id: string, quantity: string, unit: string }>} ingredients
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

/** @returns {Promise<FoodCostDraft|null>} */
export async function loadFoodCostDraft() {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return null;
    return draft;
  } catch (error) {
    console.warn('Load food cost draft failed:', error?.message);
    return null;
  }
}

/** @param {Partial<FoodCostDraft>} draft */
export async function saveFoodCostDraft(draft) {
  try {
    const payload = {
      step: draft.step ?? 1,
      dish: {
        name: draft.dish?.name ?? '',
        category: draft.dish?.category ?? 'other',
        target_food_cost_percent: draft.dish?.target_food_cost_percent ?? '30',
      },
      ingredients: (draft.ingredients ?? []).map((ri) => ({
        ingredient_id: ri.ingredient_id,
        quantity: String(ri.quantity ?? ''),
        unit: ri.unit,
      })),
      sellingFormats: (draft.sellingFormats ?? []).map((f) => ({
        id: f.id,
        selling_unit_name: f.selling_unit_name,
        unit_quantity: String(f.unit_quantity ?? '1'),
        selling_price: String(f.selling_price ?? ''),
      })),
      updatedAt: new Date().toISOString(),
    };

    if (!isMeaningfulDraft(payload)) {
      await AsyncStorage.removeItem(DRAFT_KEY);
      return null;
    }

    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return payload;
  } catch (error) {
    console.warn('Save food cost draft failed:', error?.message);
    return null;
  }
}

export async function clearFoodCostDraft() {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Clear food cost draft failed:', error?.message);
  }
}
