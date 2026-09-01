/**
 * PostHog event names — use these for funnels & dashboards.
 *
 * Suggested PostHog funnels:
 * 1. signup_completed → ingredient_created → food_cost_wizard_completed
 * 2. signup_completed → tab_viewed(home) → food_cost_wizard_started → food_cost_wizard_completed
 * 3. paywall_viewed → paywall_purchase_completed
 */

export const AnalyticsEvents = {
  // Auth & onboarding
  SCREEN_VIEWED: 'screen_viewed',
  AUTH_SIGNUP_COMPLETED: 'auth_signup_completed',
  AUTH_SIGNUP_FAILED: 'auth_signup_failed',
  AUTH_LOGIN_COMPLETED: 'auth_login_completed',
  AUTH_LOGIN_FAILED: 'auth_login_failed',
  AUTH_SIGNED_OUT: 'auth_signed_out',
  ONBOARDING_GET_STARTED: 'onboarding_get_started',
  ONBOARDING_SIGN_IN_TAPPED: 'onboarding_sign_in_tapped',

  // Navigation
  TAB_VIEWED: 'tab_viewed',

  // Ingredients
  INGREDIENT_ADD_TAPPED: 'ingredient_add_tapped',
  INGREDIENT_CREATE_OPENED: 'ingredient_create_opened',
  INGREDIENT_CREATED: 'ingredient_created',
  INGREDIENT_CREATE_FAILED: 'ingredient_create_failed',
  INGREDIENT_UPDATED: 'ingredient_updated',

  // Food cost wizard
  FOOD_COST_WIZARD_STARTED: 'food_cost_wizard_started',
  FOOD_COST_STEP_VIEWED: 'food_cost_step_viewed',
  FOOD_COST_INGREDIENT_PICKER_OPENED: 'food_cost_ingredient_picker_opened',
  FOOD_COST_ADD_TO_LIBRARY_TAPPED: 'food_cost_add_to_library_tapped',
  FOOD_COST_RETURNED_FROM_LIBRARY: 'food_cost_returned_from_library',
  FOOD_COST_INGREDIENT_ADDED: 'food_cost_ingredient_added',
  FOOD_COST_SELLING_FORMAT_ADDED: 'food_cost_selling_format_added',
  FOOD_COST_DRAFT_RESUMED: 'food_cost_draft_resumed',
  FOOD_COST_DRAFT_DISCARDED: 'food_cost_draft_discarded',
  FOOD_COST_WIZARD_COMPLETED: 'food_cost_wizard_completed',

  // Settings
  SETTINGS_FOOD_COST_TARGET_CHANGED: 'settings_food_cost_target_changed',
  SETTINGS_CURRENCY_CHANGED: 'settings_currency_changed',
  SETTINGS_UNIT_SYSTEM_CHANGED: 'settings_unit_system_changed',
  SETTINGS_SUBSCRIPTION_TAPPED: 'settings_subscription_tapped',
  SETTINGS_UPGRADE_TAPPED: 'settings_upgrade_tapped',
  SETTINGS_RESTORE_PURCHASES_TAPPED: 'settings_restore_purchases_tapped',

  // Paywall & subscription
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  PAYWALL_BILLING_TOGGLED: 'paywall_billing_toggled',
  PAYWALL_PURCHASE_STARTED: 'paywall_purchase_started',
  PAYWALL_PURCHASE_COMPLETED: 'paywall_purchase_completed',
  PAYWALL_PURCHASE_CANCELLED: 'paywall_purchase_cancelled',
  PAYWALL_PURCHASE_FAILED: 'paywall_purchase_failed',
  PAYWALL_RESTORE_STARTED: 'paywall_restore_started',
  PAYWALL_RESTORE_COMPLETED: 'paywall_restore_completed',
  PAYWALL_RESTORE_FAILED: 'paywall_restore_failed',
  PAYWALL_RESTORE_EMPTY: 'paywall_restore_empty',
};
