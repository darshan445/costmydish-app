import useAuthStore from '../stores/authStore';
import useSubscriptionStore from '../stores/subscriptionStore';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const rcEntitled = useSubscriptionStore((s) => s.rcEntitled);
  const rcExpirationDate = useSubscriptionStore((s) => s.rcExpirationDate);
  const rcIsCancelled = useSubscriptionStore((s) => s.rcIsCancelled);
  const rcWillRenew = useSubscriptionStore((s) => s.rcWillRenew);
  const billingPeriod = useSubscriptionStore((s) => s.rcBillingPeriod);

  const dbTier = profile?.subscription_tier ?? 'free';
  // RevenueCat entitlements unlock immediately; Supabase tier syncs via webhook
  const isHobbyist = dbTier === 'hobbyist' || dbTier === 'pro' || rcEntitled;
  const isFree = !isHobbyist;
  const tier = isHobbyist ? 'hobbyist' : 'free';

  // Prefer live RC expiry when entitled via RC; fall back to webhook-synced profile field
  const expiresAt = rcExpirationDate ?? profile?.subscription_expires_at ?? null;
  const isCancelled = isHobbyist && (rcIsCancelled || (!rcWillRenew && !!expiresAt));

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
    expiresAt,
    isCancelled,
    billingPeriod,
    canCreateRecipe,
    canAddIngredient,
    canViewPriceHistory,
  };
}
