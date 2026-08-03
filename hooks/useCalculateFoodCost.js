import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSubscription } from './useSubscription';
import useRecipeStore from '../stores/recipeStore';
import { showAppAlert } from '../lib/appAlert';
import { trackFoodCost } from '../lib/foodCostAnalytics';
import { FOOD_COST_COPY as C } from '../constants/copy';
import {
  clearFoodCostDraft,
  getDraftDisplayName,
  isMeaningfulDraft,
  loadFoodCostDraft,
} from '../lib/foodCostDraft';

/**
 * Shared entry point for "Calculate food cost" (Home, Dishes, FAB).
 * Always gates free plan before opening the wizard.
 */
export function useCalculateFoodCost() {
  const router = useRouter();
  const recipes = useRecipeStore((s) => s.recipes);
  const { canCreateRecipe } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const openPaywall = () => {
    trackFoodCost('paywall_shown', { reason: 'dish_limit', recipeCount: recipes.length });
    setShowPaywall(true);
  };

  const openWizard = ({ source = 'new', fresh = false } = {}) => {
    if (fresh) {
      trackFoodCost('wizard_started', { source, fresh: true });
      router.push({ pathname: '/recipe/create', params: { fresh: '1' } });
      return;
    }
    trackFoodCost(source === 'resume' ? 'draft_resumed' : 'wizard_started', { source });
    router.push('/recipe/create');
  };

  const resumeCalculate = () => {
    if (!canCreateRecipe(recipes.length)) {
      openPaywall();
      return;
    }
    openWizard({ source: 'resume' });
  };

  const startCalculate = async (options = {}) => {
    const source = options?.source ?? 'cta';
    if (!canCreateRecipe(recipes.length)) {
      openPaywall();
      return;
    }

    const draft = await loadFoodCostDraft();
    if (isMeaningfulDraft(draft)) {
      showAppAlert({
        title: C.draft.conflictTitle,
        message: C.draft.conflictMessage(getDraftDisplayName(draft)),
        variant: 'warning',
        primaryLabel: C.action.resume,
        onPrimary: () => openWizard({ source: 'resume' }),
        secondaryLabel: C.action.discardAndStartNew,
        onSecondary: async () => {
          await clearFoodCostDraft();
          trackFoodCost('draft_discarded', { source: 'conflict' });
          openWizard({ source, fresh: true });
        },
      });
      return;
    }

    openWizard({ source });
  };

  return {
    startCalculate,
    resumeCalculate,
    showPaywall,
    closePaywall: () => setShowPaywall(false),
  };
}
