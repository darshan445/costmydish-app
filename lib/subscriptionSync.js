import { showAppAlert } from './appAlert';
import { parseHobbyistEntitlement, syncRevenueCatForUser } from './revenuecat';
import useAuthStore from '../stores/authStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { formatSubscriptionDate } from '../utils/format';

function snapshotRcState() {
  const s = useSubscriptionStore.getState();
  return {
    rcEntitled: s.rcEntitled,
    rcIsCancelled: s.rcIsCancelled,
    rcWillRenew: s.rcWillRenew,
  };
}

/**
 * Show themed alerts when subscription state changes after an explicit refresh.
 */
export function maybeAlertSubscriptionChange(prev, next) {
  const wasEntitled = prev.rcEntitled;
  const isEntitled = next.entitled;

  if (wasEntitled && !isEntitled) {
    showAppAlert({
      title: 'Subscription Ended',
      message: 'Your Hobbyist subscription is no longer active. You\'re on the Free plan (5 recipes, 20 ingredients).',
      variant: 'warning',
    });
    return;
  }

  if (!wasEntitled && isEntitled) {
    showAppAlert({
      title: 'Hobbyist Active',
      message: 'Your subscription is active. Unlimited recipes, ingredients, and price history are unlocked.',
      variant: 'success',
    });
    return;
  }

  if (isEntitled && !prev.rcIsCancelled && next.isCancelled) {
    const until = next.expirationDate
      ? formatSubscriptionDate(next.expirationDate)
      : 'the end of your billing period';
    showAppAlert({
      title: 'Subscription Cancelled',
      message: `You'll keep Hobbyist access until ${until}. Resubscribe anytime via Manage subscription.`,
      variant: 'warning',
    });
    return;
  }

  if (isEntitled && prev.rcIsCancelled && !next.isCancelled && next.willRenew) {
    showAppAlert({
      title: 'Auto-Renew Restored',
      message: 'Your Hobbyist subscription will continue to renew automatically.',
      variant: 'success',
    });
  }
}

/** Apply RevenueCat CustomerInfo to store and refresh Supabase profile. */
export async function applyCustomerInfoUpdate(customerInfo, { showAlerts = false } = {}) {
  const prev = snapshotRcState();
  const status = parseHobbyistEntitlement(customerInfo);
  useSubscriptionStore.getState().applyRcStatus(status);

  const userId = useAuthStore.getState().user?.id;
  if (userId) {
    await useAuthStore.getState().fetchProfile(userId);
  }

  if (showAlerts) {
    maybeAlertSubscriptionChange(prev, status);
  }

  return status;
}

/** Full sync: identify user in RC, refresh entitlement, update profile. */
export async function refreshSubscriptionState(userId, { showAlerts = false } = {}) {
  if (!userId) {
    return {
      entitled: false,
      expirationDate: null,
      willRenew: true,
      isCancelled: false,
      billingPeriod: null,
    };
  }

  const prev = snapshotRcState();
  const status = await syncRevenueCatForUser(userId);
  useSubscriptionStore.getState().applyRcStatus(status);
  await useAuthStore.getState().fetchProfile(userId);

  if (showAlerts) {
    maybeAlertSubscriptionChange(prev, status);
  }

  return status;
}
