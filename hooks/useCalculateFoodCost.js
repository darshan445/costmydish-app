import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSubscription } from './useSubscription';
import useRecipeStore from '../stores/recipeStore';
import { track, AnalyticsEvents } from '../lib/analytics';
import { setDishEntrySource } from '../lib/foodCostAnalytics';

/**
 * Shared entry point for "Calculate food cost" (Home, Dishes, FAB).
 * Always gates free plan before opening the editor.
 * Waits for hydrated recipe count so an empty in-memory [] cannot bypass the 5-dish limit.
 * `source` names the exact button (home_start, home_footer, dishes_header, dishes_empty, dishes_footer, fab).
 */
export function useCalculateFoodCost() {
  const router = useRouter();
  const ensureRecipeCount = useRecipeStore((s) => s.ensureRecipeCount);
  const { canCreateRecipe } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const startCalculate = async (options = {}) => {
    const source = options?.source ?? 'cta';

    const recipeCount = await ensureRecipeCount();
    const allowed = canCreateRecipe(recipeCount);
    track(AnalyticsEvents.DISH_START_TAPPED, { source, recipe_count: recipeCount, allowed });
    if (!allowed) {
      track(AnalyticsEvents.DISH_START_BLOCKED, { source, recipe_count: recipeCount, reason: 'dish_limit' });
      track(AnalyticsEvents.PAYWALL_TRIGGERED, { reason: 'recipe', source });
      setShowPaywall(true);
      return;
    }

    setDishEntrySource(source);
    const prefill = options?.prefill;
    if (prefill?.name) {
      router.push({
        pathname: '/recipe/create',
        params: {
          name: prefill.name,
          ...(prefill.yieldQty ? { yield: prefill.yieldQty } : {}),
          ...(prefill.unit ? { unit: prefill.unit } : {}),
        },
      });
      return;
    }
    router.push('/recipe/create');
  };

  return {
    startCalculate,
    showPaywall,
    closePaywall: () => setShowPaywall(false),
  };
}
