// Must match RevenueCat Dashboard → Entitlements → Identifier
export const HOBBYIST_ENTITLEMENT_ID = 'hobbyist';

// RevenueCat offering — Dashboard → Offerings → identifier
export const HOBBYIST_OFFERING_ID = 'costmydish_offering';

// Subscription IDs — shared base; App Store product ID matches this exactly
export const HOBBYIST_MONTHLY_SUBSCRIPTION_ID = 'costmydish_hobbyist_monthly';
export const HOBBYIST_ANNUAL_SUBSCRIPTION_ID = 'costmydish_hobbyist_annual';

// App Store product IDs (RevenueCat → Products → App Store)
export const HOBBYIST_MONTHLY_APP_STORE_PRODUCT_ID = HOBBYIST_MONTHLY_SUBSCRIPTION_ID;
export const HOBBYIST_ANNUAL_APP_STORE_PRODUCT_ID = HOBBYIST_ANNUAL_SUBSCRIPTION_ID;

// Play Store product IDs (subscription_id:base_plan_id)
export const HOBBYIST_MONTHLY_PLAY_PRODUCT_ID = `${HOBBYIST_MONTHLY_SUBSCRIPTION_ID}:monthly`;
export const HOBBYIST_ANNUAL_PLAY_PRODUCT_ID = `${HOBBYIST_ANNUAL_SUBSCRIPTION_ID}:annual`;

// All store variants — used when resolving packages from offerings
export const HOBBYIST_MONTHLY_PRODUCT_IDS = [
  HOBBYIST_MONTHLY_APP_STORE_PRODUCT_ID,
  HOBBYIST_MONTHLY_PLAY_PRODUCT_ID,
];
export const HOBBYIST_ANNUAL_PRODUCT_IDS = [
  HOBBYIST_ANNUAL_APP_STORE_PRODUCT_ID,
  HOBBYIST_ANNUAL_PLAY_PRODUCT_ID,
];

// RevenueCat package identifiers on costmydish_offering
export const HOBBYIST_MONTHLY_PACKAGE_ID = '$rc_monthly';
export const HOBBYIST_ANNUAL_PACKAGE_ID = '$rc_annual';

// Plan prices are always shown in USD (App Store may charge in local currency).
export const HOBBYIST_MONTHLY_USD = 4.99;
export const HOBBYIST_ANNUAL_USD = 39.99;
export const HOBBYIST_ANNUAL_PER_MONTH_USD = HOBBYIST_ANNUAL_USD / 12;
