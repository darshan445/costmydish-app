import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
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

/** True when CustomerInfo has an active Hobbyist entitlement. */
export function customerHasHobbyistAccess(customerInfo) {
  if (!customerInfo?.entitlements?.active) return false;
  const active = customerInfo.entitlements.active;
  if (active[HOBBYIST_ENTITLEMENT_ID]?.isActive) return true;
  // Fallback: any active entitlement (dev / misnamed identifiers)
  return Object.values(active).some((e) => e?.isActive);
}

/** Call once at app startup (before any user login). */
export function initRevenueCat() {
  if (_configured) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn('[RevenueCat] API key not set — purchases disabled');
    return;
  }
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  _configured = true;
}

/** Keep subscription state in sync when RevenueCat pushes CustomerInfo updates. */
export function attachCustomerInfoListener(onEntitlementChange) {
  if (_listenerAttached) return;
  _listenerAttached = true;
  Purchases.addCustomerInfoUpdateListener((info) => {
    onEntitlementChange(customerHasHobbyistAccess(info));
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
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return { appUserId: customerInfo.originalAppUserId, customerInfo };
  } catch (e) {
    console.warn('[RevenueCat] logIn error:', e);
    return null;
  }
}

/** Log out on sign-out so the next user gets a clean anonymous identity. */
export async function resetRevenueCatUser() {
  try {
    await Purchases.logOut();
  } catch (_) {
    // Silently ignore — user was never logged in (anonymous state)
  }
}

/** Fetch current CustomerInfo and check Hobbyist entitlement. */
export async function checkHobbyistEntitlement() {
  try {
    const info = await Purchases.getCustomerInfo();
    return customerHasHobbyistAccess(info);
  } catch (_) {
    return false;
  }
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
