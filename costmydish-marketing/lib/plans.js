// Free plan limits and Hobbyist prices — keep in sync with the app's constants/subscription.js.

export const FREE_DISH_LIMIT = 3;
export const FREE_INGREDIENT_LIMIT = 20;

export const HOBBYIST_MONTHLY_USD = 6.99;
export const HOBBYIST_ANNUAL_USD = 59.99;

const usd = (amount) => `$${amount.toFixed(2)}`;

export const HOBBYIST_MONTHLY_PRICE = usd(HOBBYIST_MONTHLY_USD);
export const HOBBYIST_ANNUAL_PRICE = usd(HOBBYIST_ANNUAL_USD);
export const HOBBYIST_ANNUAL_PER_MONTH_PRICE = usd(HOBBYIST_ANNUAL_USD / 12);

/** "3 dishes and 20 ingredients" */
export const WEB_BILLING_ENABLED = Boolean(process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY);
export const UPGRADE_PATH = '/dashboard/settings?upgrade=1';
export const UPGRADE_HINT = WEB_BILLING_ENABLED
  ? 'Upgrade to Hobbyist for unlimited dishes and ingredients — here or in the app.'
  : 'Upgrade in the app for unlimited dishes and ingredients.';
export const FREE_PLAN_LIMITS = `${FREE_DISH_LIMIT} dishes and ${FREE_INGREDIENT_LIMIT} ingredients`;
