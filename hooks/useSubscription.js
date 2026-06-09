import useAuthStore from '../stores/authStore';
import useSubscriptionStore from '../stores/subscriptionStore';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const rcEntitled = useSubscriptionStore((s) => s.rcEntitled);

  const dbTier = profile?.subscription_tier ?? 'free';
  // RevenueCat entitlements unlock immediately; Supabase tier syncs via webhook
  const isHobbyist = dbTier === 'hobbyist' || dbTier === 'pro' || rcEntitled;
  const isFree = !isHobbyist;
  const tier = isHobbyist ? 'hobbyist' : 'free';

  const canCreateRecipe = (currentCount) => {
    if (!isFree) return true;
    return currentCount < 5;
  };

  const canAddIngredient = (currentCount) => {
    if (!isFree) return true;
    return currentCount < 20;
  };

  const canViewPriceHistory = isHobbyist;

  return {
    tier,
    dbTier,
    isFree,
    isHobbyist,
    rcEntitled,
    canCreateRecipe,
    canAddIngredient,
    canViewPriceHistory,
  };
}
