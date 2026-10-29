/**
 * PostHog event names — use these for funnels & dashboards.
 *
 * Every dish_* event carries dish_session_id, entry_source, dish_mode and
 * seconds_in_editor, so one visit to the dish screen can be followed step by step.
 *
 * Suggested PostHog funnels:
 * 1. First dish: auth_signup_completed → dish_start_tapped → dish_editor_opened
 *    → dish_add_ingredient_tapped → dish_ingredient_added → dish_save_tapped → dish_saved
 * 2. Where the ingredient form loses people: dish_new_ingredient_form_opened
 *    → dish_ingredient_field_filled (break down by field) → dish_ingredient_added
 *    (and dish_ingredient_sheet_closed with added = false for the drop-outs)
 * 3. Drop-off on the dish screen: dish_editor_left, break down by last_action / saved
 * 4. Home start card: home_start_name_typed → home_start_submitted → dish_editor_opened
 * 5. Paywall: paywall_triggered → paywall_viewed → paywall_subscribe_tapped
 *    → paywall_purchase_started → paywall_purchase_completed
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

  // Home "What are you making?" card
  HOME_START_NAME_TYPED: 'home_start_name_typed',
  HOME_START_CHIP_TAPPED: 'home_start_chip_tapped',
  HOME_START_YIELD_ENTERED: 'home_start_yield_entered',
  HOME_START_UNIT_CHANGED: 'home_start_unit_changed',
  HOME_START_SUBMITTED: 'home_start_submitted',
  HOME_SAMPLE_OPENED: 'home_sample_opened',

  // Dishes list
  DISHES_SEARCHED: 'dishes_searched',
  DISHES_FILTER_CHANGED: 'dishes_filter_changed',
  DISH_OPENED: 'dish_opened',

  // Starting a dish (any button that opens the dish screen)
  DISH_START_TAPPED: 'dish_start_tapped',
  DISH_START_BLOCKED: 'dish_start_blocked',

  // Dish screen (one-screen editor)
  DISH_EDITOR_OPENED: 'dish_editor_opened',
  DISH_NAME_ENTERED: 'dish_name_entered',
  DISH_YIELD_ENTERED: 'dish_yield_entered',
  DISH_YIELD_UNIT_CHANGED: 'dish_yield_unit_changed',
  DISH_CATEGORY_CHANGED: 'dish_category_changed',
  DISH_TARGET_CHANGED: 'dish_target_changed',
  DISH_ADD_INGREDIENT_TAPPED: 'dish_add_ingredient_tapped',
  DISH_INGREDIENT_SEARCHED: 'dish_ingredient_searched',
  DISH_LIBRARY_INGREDIENT_PICKED: 'dish_library_ingredient_picked',
  DISH_NEW_INGREDIENT_FORM_OPENED: 'dish_new_ingredient_form_opened',
  DISH_INGREDIENT_FIELD_FILLED: 'dish_ingredient_field_filled',
  DISH_INGREDIENT_VALIDATION_FAILED: 'dish_ingredient_validation_failed',
  DISH_INGREDIENT_ADDED: 'dish_ingredient_added',
  DISH_INGREDIENT_SHEET_CLOSED: 'dish_ingredient_sheet_closed',
  DISH_INGREDIENT_EDIT_OPENED: 'dish_ingredient_edit_opened',
  DISH_INGREDIENT_QTY_UPDATED: 'dish_ingredient_qty_updated',
  DISH_INGREDIENT_REMOVED: 'dish_ingredient_removed',
  DISH_PRICE_SHEET_OPENED: 'dish_price_sheet_opened',
  DISH_PRICE_SET: 'dish_price_set',
  DISH_PRICE_REMOVED: 'dish_price_removed',
  DISH_SELLING_FORMAT_SHEET_OPENED: 'dish_selling_format_sheet_opened',
  DISH_SELLING_FORMAT_ADDED: 'dish_selling_format_added',
  DISH_SELLING_FORMAT_REMOVED: 'dish_selling_format_removed',
  /** Autosave created the dish row (first ingredient added) */
  DISH_CREATED: 'dish_created',
  DISH_AUTOSAVE_FAILED: 'dish_autosave_failed',
  DISH_SAVE_TAPPED: 'dish_save_tapped',
  /** Owner tapped Save dish and it went through */
  DISH_SAVED: 'dish_saved',
  DISH_SAVE_FAILED: 'dish_save_failed',
  /** App went to the background while on the dish screen (may never come back) */
  DISH_APP_BACKGROUNDED: 'dish_app_backgrounded',
  /** Left the dish screen by any route — the drop-off event */
  DISH_EDITOR_LEFT: 'dish_editor_left',
  DISH_RETURNED_FROM_LIBRARY: 'dish_returned_from_library',

  // Dish detail
  DISH_DETAIL_VIEWED: 'dish_detail_viewed',
  DISH_EDIT_TAPPED: 'dish_edit_tapped',
  DISH_DELETED: 'dish_deleted',

  // Library (ingredients)
  LIBRARY_SEARCHED: 'library_searched',
  INGREDIENT_ADD_TAPPED: 'ingredient_add_tapped',
  INGREDIENT_CREATE_OPENED: 'ingredient_create_opened',
  INGREDIENT_CARD_ADDED: 'ingredient_card_added',
  INGREDIENT_CREATE_VALIDATION_FAILED: 'ingredient_create_validation_failed',
  INGREDIENT_CREATED: 'ingredient_created',
  INGREDIENT_CREATE_FAILED: 'ingredient_create_failed',
  INGREDIENT_CREATE_LEFT: 'ingredient_create_left',
  INGREDIENT_EDIT_OPENED: 'ingredient_edit_opened',
  INGREDIENT_UPDATED: 'ingredient_updated',
  INGREDIENT_DELETE_TAPPED: 'ingredient_delete_tapped',
  INGREDIENT_DELETED: 'ingredient_deleted',

  // Settings
  SETTINGS_FOOD_COST_TARGET_CHANGED: 'settings_food_cost_target_changed',
  SETTINGS_CURRENCY_CHANGED: 'settings_currency_changed',
  SETTINGS_UNIT_SYSTEM_CHANGED: 'settings_unit_system_changed',
  SETTINGS_SUBSCRIPTION_TAPPED: 'settings_subscription_tapped',
  SETTINGS_UPGRADE_TAPPED: 'settings_upgrade_tapped',
  SETTINGS_RESTORE_PURCHASES_TAPPED: 'settings_restore_purchases_tapped',
  SETTINGS_RATE_TAPPED: 'settings_rate_tapped',
  SETTINGS_FEEDBACK_TAPPED: 'settings_feedback_tapped',
  SETTINGS_UPDATE_TAPPED: 'settings_update_tapped',

  // Soft review prompt + native store review
  REVIEW_SOFT_SHOWN: 'review_soft_shown',
  REVIEW_SOFT_YES: 'review_soft_yes',
  REVIEW_SOFT_DECLINED: 'review_soft_declined',
  REVIEW_SOFT_LATER: 'review_soft_later',
  REVIEW_FEEDBACK_SUBMITTED: 'review_feedback_submitted',
  REVIEW_FEEDBACK_SKIPPED: 'review_feedback_skipped',
  REVIEW_NATIVE_REQUESTED: 'review_native_requested',

  // Paywall & subscription
  /** A limit or locked feature asked for the paywall (sent by the screen, with source) */
  PAYWALL_TRIGGERED: 'paywall_triggered',
  /** The paywall actually appeared (sent once by PaywallModal) */
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  PAYWALL_BILLING_TOGGLED: 'paywall_billing_toggled',
  /** Tapped Subscribe, before any store / sign-in checks */
  PAYWALL_SUBSCRIBE_TAPPED: 'paywall_subscribe_tapped',
  PAYWALL_PURCHASE_STARTED: 'paywall_purchase_started',
  PAYWALL_PURCHASE_COMPLETED: 'paywall_purchase_completed',
  PAYWALL_PURCHASE_CANCELLED: 'paywall_purchase_cancelled',
  PAYWALL_PURCHASE_FAILED: 'paywall_purchase_failed',
  PAYWALL_RESTORE_STARTED: 'paywall_restore_started',
  PAYWALL_RESTORE_COMPLETED: 'paywall_restore_completed',
  PAYWALL_RESTORE_FAILED: 'paywall_restore_failed',
  PAYWALL_RESTORE_EMPTY: 'paywall_restore_empty',
};
