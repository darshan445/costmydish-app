'use client';

// Web subscriptions through RevenueCat + Paddle. The RevenueCat app user id is the Supabase
// user id — the same id the mobile app uses — so a purchase here unlocks Hobbyist in the app too,
// and the RevenueCat webhook updates profiles.subscription_tier for both.

import { WEB_BILLING_ENABLED } from '@/lib/plans';
import { getSupabase } from '@/lib/supabase';

export { WEB_BILLING_ENABLED };

const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY;
const TIER_POLL_INTERVAL_MS = 2000;
const TIER_POLL_ATTEMPTS = 15;

export class BillingError extends Error {}

async function getPurchases(userId) {
  const { Purchases } = await import('@revenuecat/purchases-js');
  if (Purchases.isConfigured()) {
    const instance = Purchases.getSharedInstance();
    if (instance.getAppUserId() !== userId) await instance.changeUser(userId);
    return instance;
  }
  return Purchases.configure({ apiKey: API_KEY, appUserId: userId });
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function planFrom(rcPackage) {
  const price = rcPackage?.webBillingProduct?.currentPrice;
  if (!price) return null;
  return { rcPackage, amount: price.amountMicros / 1e6, currency: price.currency, price: price.formattedPrice };
}

/** Hobbyist monthly and yearly plans with their Paddle prices: { monthly, annual, annualPerMonth, savingsPercent }. */
export async function loadWebPlans(userId) {
  let offering;
  try {
    const purchases = await getPurchases(userId);
    offering = (await purchases.getOfferings()).current;
  } catch {
    throw new BillingError('Couldn’t load plans. Check your connection and try again.');
  }
  const monthly = planFrom(offering?.monthly);
  const annual = planFrom(offering?.annual);
  if (!monthly || !annual) throw new BillingError('Plans aren’t available right now. Please try again later.');

  const sameCurrency = monthly.currency === annual.currency;
  const savingsPercent = sameCurrency ? Math.floor((1 - annual.amount / (monthly.amount * 12)) * 100) : 0;
  return {
    monthly,
    annual,
    annualPerMonth: formatMoney(annual.amount / 12, annual.currency),
    savingsPercent: savingsPercent > 0 ? savingsPercent : 0,
  };
}

/** Opens the Paddle checkout. Resolves true when paid, false when the user closes it. */
export async function startCheckout(userId, email, rcPackage) {
  const [{ ErrorCode }, purchases] = await Promise.all([import('@revenuecat/purchases-js'), getPurchases(userId)]);
  try {
    await purchases.purchase({ rcPackage, customerEmail: email || undefined });
    return true;
  } catch (error) {
    if (error?.errorCode === ErrorCode.UserCancelledError) return false;
    if (error?.errorCode === ErrorCode.ProductAlreadyPurchasedError) {
      throw new BillingError('You already have Hobbyist. Refresh the page to see it.');
    }
    throw new BillingError('The payment didn’t go through. You haven’t been charged — please try again.');
  }
}

/**
 * The webhook updates the profile a few seconds after payment. Waits for that so the
 * free limits lift straight away; resolves false if it takes longer than ~30 seconds.
 */
export async function waitForHobbyist(userId) {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < TIER_POLL_ATTEMPTS; attempt += 1) {
    const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).maybeSingle();
    if (data?.subscription_tier && data.subscription_tier !== 'free') return true;
    await new Promise((resolve) => setTimeout(resolve, TIER_POLL_INTERVAL_MS));
  }
  return false;
}

/** Where this user manages their subscription: Paddle, App Store or Google Play. Null if unknown. */
export async function loadManagementUrl(userId) {
  if (!WEB_BILLING_ENABLED) return null;
  try {
    const purchases = await getPurchases(userId);
    return (await purchases.getCustomerInfo()).managementURL;
  } catch {
    return null;
  }
}
