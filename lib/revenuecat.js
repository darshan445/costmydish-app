import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { bootLog, isBootDebug } from './debugBoot';
import {
  HOBBYIST_ANNUAL_PACKAGE_ID,
  HOBBYIST_ANNUAL_PRODUCT_IDS,
  HOBBYIST_ENTITLEMENT_ID,
  HOBBYIST_MONTHLY_PACKAGE_ID,
  HOBBYIST_MONTHLY_PRODUCT_IDS,
  HOBBYIST_OFFERING_ID,
} from '../constants/subscription';

const ANDROID_PACKAGE = 'com.costmydish.app';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let _configured = false;
let _listenerAttached = false;

function getActiveHobbyistEntitlement(customerInfo) {
  const active = customerInfo?.entitlements?.active;
  if (!active) return null;
  if (active[HOBBYIST_ENTITLEMENT_ID]?.isActive) {
    return active[HOBBYIST_ENTITLEMENT_ID];
  }
  return Object.values(active).find((e) => e?.isActive) ?? null;
}

/** True when CustomerInfo has an active Hobbyist entitlement. */
export function customerHasHobbyistAccess(customerInfo) {
  return !!getActiveHobbyistEntitlement(customerInfo);
}

/**
 * Parse live Hobbyist status from RevenueCat CustomerInfo.
 * @returns {{ entitled: boolean, expirationDate: string|null, willRenew: boolean, isCancelled: boolean, billingPeriod: 'monthly'|'annual'|null }}
 */
export function parseHobbyistEntitlement(customerInfo) {
  const entitlement = getActiveHobbyistEntitlement(customerInfo);
  const entitled = !!entitlement;
  if (!entitlement) {
    return {
      entitled: false,
      expirationDate: null,
      willRenew: true,
      isCancelled: false,
      billingPeriod: null,
    };
  }

  const willRenew = entitlement.willRenew ?? true;
  return {
    entitled: true,
    expirationDate: entitlement.expirationDate ?? null,
    willRenew,
    isCancelled: !willRenew,
    billingPeriod: billingPeriodFromProductId(entitlement.productIdentifier),
  };
}

function billingPeriodFromProductId(productId) {
  if (!productId) return null;
  const id = String(productId).toLowerCase();
  if (id.includes('annual')) return 'annual';
  if (id.includes('monthly')) return 'monthly';
  return null;
}

/** Call once at app startup (before any user login). */
export function initRevenueCat() {
  if (_configured) {
    bootLog('revenuecat:init:skipped', { reason: 'already configured' });
    return;
  }
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    bootLog('revenuecat:init:skipped', { reason: 'no api key' });
    console.warn('[RevenueCat] API key not set — purchases disabled');
    return;
  }
  Purchases.setLogLevel(isBootDebug() ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  bootLog('revenuecat:configure:start', { platform: Platform.OS });
  Purchases.configure({ apiKey });
  _configured = true;
  bootLog('revenuecat:configure:done');
}

/** Keep subscription state in sync when RevenueCat pushes CustomerInfo updates. */
export function attachCustomerInfoListener(onCustomerInfoUpdate) {
  if (_listenerAttached) return;
  _listenerAttached = true;
  Purchases.addCustomerInfoUpdateListener((info) => {
    onCustomerInfoUpdate(info);
  });
}

/** Returns the App User ID RevenueCat uses — search this in the dashboard. */
export async function getRevenueCatUserId() {
  try {
    return await Purchases.getAppUserID();
  } catch (_) {
    return null;
  }
}

/**
 * Log in a user so RevenueCat can associate purchases with their Supabase UUID.
 * Must complete BEFORE purchasePackage() so the customer appears under that ID.
 */
export async function identifyRevenueCatUser(userId) {
  bootLog('revenuecat:logIn:start', { userId });
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    bootLog('revenuecat:logIn:done', { appUserId: customerInfo.originalAppUserId });
    return { appUserId: customerInfo.originalAppUserId, customerInfo };
  } catch (e) {
    bootLog('revenuecat:logIn:error', { message: e?.message });
    console.warn('[RevenueCat] logIn error:', e);
    return null;
  }
}

let _identifiedUserId = null;
let _syncFlight = null;
let _syncFlightUserId = null;

/** Log out on sign-out so the next user gets a clean anonymous identity. */
export async function resetRevenueCatUser() {
  _identifiedUserId = null;
  _syncFlight = null;
  _syncFlightUserId = null;
  try {
    await Purchases.logOut();
  } catch (_) {
    // Silently ignore — user was never logged in (anonymous state)
  }
}

/**
 * Identify user (once) and refresh entitlement — deduped when called in parallel.
 * Returns whether Hobbyist is active.
 */
export async function syncRevenueCatForUser(userId) {
  if (_syncFlight && _syncFlightUserId === userId) {
    bootLog('revenuecat:sync:skipped', { reason: 'in-flight', userId });
    return _syncFlight;
  }

  _syncFlightUserId = userId;
  _syncFlight = (async () => {
    try {
      if (_identifiedUserId !== userId) {
        await identifyRevenueCatUser(userId);
        _identifiedUserId = userId;
      } else {
        bootLog('revenuecat:logIn:skipped', { reason: 'already identified', userId });
      }
      return await fetchHobbyistEntitlementStatus();
    } finally {
      _syncFlight = null;
      _syncFlightUserId = null;
    }
  })();

  return _syncFlight;
}

/** Fetch current CustomerInfo and return parsed Hobbyist status. */
export async function fetchHobbyistEntitlementStatus() {
  bootLog('revenuecat:getCustomerInfo:start');
  try {
    const info = await Purchases.getCustomerInfo();
    const status = parseHobbyistEntitlement(info);
    bootLog('revenuecat:getCustomerInfo:done', status);
    return status;
  } catch (e) {
    bootLog('revenuecat:getCustomerInfo:error', { message: e?.message });
    return { entitled: false, expirationDate: null, willRenew: true, isCancelled: false, billingPeriod: null };
  }
}

/** @deprecated Use fetchHobbyistEntitlementStatus — returns boolean for backward compat */
export async function checkHobbyistEntitlement() {
  const status = await fetchHobbyistEntitlementStatus();
  return status.entitled;
}

function packageProductId(pkg) {
  return pkg?.product?.identifier ?? pkg?.storeProduct?.identifier ?? null;
}

function productIdMatches(actualId, expectedId) {
  if (!actualId || !expectedId) return false;
  if (actualId === expectedId) return true;
  // Play subscriptions: also match subscription_id without ":base_plan" suffix
  const subscriptionId = expectedId.split(':')[0];
  return actualId === subscriptionId || actualId.startsWith(`${subscriptionId}:`);
}

function findPackageByProductIds(packages, productIds) {
  for (const productId of productIds) {
    const match = packages.find((p) => productIdMatches(packageProductId(p), productId));
    if (match) return match;
  }
  return null;
}

function findPackageByIdentifier(packages, packageId) {
  return packages.find((p) => p.identifier === packageId) ?? null;
}

function resolveOffering(offerings) {
  return offerings.current
    ?? offerings.all?.[HOBBYIST_OFFERING_ID]
    ?? null;
}

/**
 * Fetch hobbyist packages from the current (or costmydish_offering) offering.
 * Returns { monthly: Package | null, annual: Package | null }.
 */
export async function getHobbyistPackages() {
  try {
    const offerings = await Purchases.getOfferings();
    const offering = resolveOffering(offerings);
    if (!offering) {
      console.warn('[RevenueCat] No offering found', {
        current: offerings.current?.identifier ?? null,
        expected: HOBBYIST_OFFERING_ID,
        available: Object.keys(offerings.all ?? {}),
      });
      return { monthly: null, annual: null };
    }

    const available = offering.availablePackages ?? [];

    const monthly =
      findPackageByIdentifier(available, HOBBYIST_MONTHLY_PACKAGE_ID)
      ?? findPackageByProductIds(available, HOBBYIST_MONTHLY_PRODUCT_IDS)
      ?? offering.monthly
      ?? available.find((p) => p.packageType === 'MONTHLY')
      ?? null;

    const annual =
      findPackageByIdentifier(available, HOBBYIST_ANNUAL_PACKAGE_ID)
      ?? findPackageByProductIds(available, HOBBYIST_ANNUAL_PRODUCT_IDS)
      ?? offering.annual
      ?? available.find((p) => p.packageType === 'ANNUAL')
      ?? null;

    if (!monthly || !annual) {
      console.warn('[RevenueCat] Missing packages', {
        offering: offering.identifier,
        monthly: monthly ? packageProductId(monthly) : null,
        annual: annual ? packageProductId(annual) : null,
        expected: {
          monthly: HOBBYIST_MONTHLY_PRODUCT_IDS,
          annual: HOBBYIST_ANNUAL_PRODUCT_IDS,
        },
        available: available.map((p) => ({
          package: p.identifier,
          product: packageProductId(p),
          type: p.packageType,
        })),
      });
    }

    return { monthly, annual };
  } catch (e) {
    console.warn('[RevenueCat] getOfferings error:', e);
    return { monthly: null, annual: null };
  }
}

/**
 * Purchase a package.
 * Returns { success, cancelled?, error?, customerInfo? }.
 */
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = customerHasHobbyistAccess(customerInfo);
    return { success: isActive, customerInfo };
  } catch (e) {
    if (e.userCancelled) {
      return { success: false, cancelled: true, error: null };
    }
    return { success: false, cancelled: false, error: e.message ?? 'Purchase failed.' };
  }
}

/** Restore previous purchases. */
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = customerHasHobbyistAccess(customerInfo);
    return { success: isActive, customerInfo };
  } catch (e) {
    return { success: false, error: e.message ?? 'Restore failed.' };
  }
}

function isTestStoreKey() {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  return apiKey?.startsWith('test_') ?? false;
}

/**
 * Open the platform subscription management UI (App Store / Play Store).
 * Uses RevenueCat managementURL when available.
 */
export async function openManageSubscriptions() {
  try {
    const info = await Purchases.getCustomerInfo();

    if (info.managementURL) {
      await Linking.openURL(info.managementURL);
      return { success: true };
    }

    if (isTestStoreKey()) {
      return {
        success: false,
        isTestStore: true,
        error:
          'Test subscriptions are managed in the RevenueCat sandbox, not the App Store or Play Store. Use Restore purchases if your plan status looks wrong.',
      };
    }

    if (Platform.OS === 'ios') {
      await Purchases.showManageSubscriptions();
      return { success: true };
    }

    const activeSub = info.activeSubscriptions?.[0];
    const url = activeSub
      ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(activeSub)}&package=${encodeURIComponent(ANDROID_PACKAGE)}`
      : 'https://play.google.com/store/account/subscriptions';

    await Linking.openURL(url);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message ?? 'Could not open subscription settings.' };
  }
}
