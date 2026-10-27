import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSubscription } from './useSubscription';
import useRecipeStore from '../stores/recipeStore';
import { trackFoodCost } from '../lib/foodCostAnalytics';

/**
 * Shared entry point for "Calculate food cost" (Home, Dishes, FAB).
 * Always gates free plan before opening the editor.
 * Waits for hydrated recipe count so an empty in-memory [] cannot bypass the 5-dish limit.
 */
export function useCalculateFoodCost() {
  const router = useRouter();
  const ensureRecipeCount = useRecipeStore((s) => s.ensureRecipeCount);
  const { canCreateRecipe } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const startCalculate = async (options = {}) => {
    const source = options?.source ?? 'cta';

    const recipeCount = await ensureRecipeCount();
    if (!canCreateRecipe(recipeCount)) {
      trackFoodCost('paywall_shown', { reason: 'dish_limit', recipeCount });
      setShowPaywall(true);
      return;
    }

    trackFoodCost('wizard_started', { source });
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
