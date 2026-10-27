import { track } from './analytics';
import { AnalyticsEvents } from '../constants/analyticsEvents';

const EVENT_MAP = {
  home_start: AnalyticsEvents.FOOD_COST_HOME_START,
  sample_result_opened: AnalyticsEvents.FOOD_COST_SAMPLE_RESULT_OPENED,
  wizard_started: AnalyticsEvents.FOOD_COST_WIZARD_STARTED,
  editor_opened: AnalyticsEvents.FOOD_COST_EDITOR_OPENED,
  first_ingredient_added: AnalyticsEvents.FOOD_COST_FIRST_INGREDIENT_ADDED,
  price_added: AnalyticsEvents.FOOD_COST_PRICE_ADDED,
  dish_created: AnalyticsEvents.FOOD_COST_DISH_CREATED,
  dish_saved: AnalyticsEvents.FOOD_COST_DISH_SAVED,
  paywall_shown: AnalyticsEvents.PAYWALL_VIEWED,
  ingredient_picker_opened: AnalyticsEvents.FOOD_COST_INGREDIENT_PICKER_OPENED,
  add_to_library_tapped: AnalyticsEvents.FOOD_COST_ADD_TO_LIBRARY_TAPPED,
  returned_from_library: AnalyticsEvents.FOOD_COST_RETURNED_FROM_LIBRARY,
  ingredient_added: AnalyticsEvents.FOOD_COST_INGREDIENT_ADDED,
  selling_format_added: AnalyticsEvents.FOOD_COST_SELLING_FORMAT_ADDED,
};

/**
 * Food cost funnel events → PostHog.
 */
export function trackFoodCost(event, extra = {}) {
  const mapped = EVENT_MAP[event];
  if (mapped === AnalyticsEvents.PAYWALL_VIEWED) {
    track(mapped, { reason: 'dish_limit', source: 'food_cost', ...extra });
    return;
  }

  if (mapped) {
    track(mapped, extra);
    return;
  }

  track(`food_cost_${event}`, extra);
}
