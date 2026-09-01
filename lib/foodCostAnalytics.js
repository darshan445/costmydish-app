import { track } from './analytics';
import { AnalyticsEvents } from '../constants/analyticsEvents';

/** Human-readable wizard step labels for PostHog funnels. */
export const FOOD_COST_STEP_NAMES = {
  1: 'dish_details',
  2: 'ingredients',
  3: 'pricing',
};

const STEP_EVENT_MAP = {
  wizard_started: AnalyticsEvents.FOOD_COST_WIZARD_STARTED,
  draft_resumed: AnalyticsEvents.FOOD_COST_DRAFT_RESUMED,
  draft_discarded: AnalyticsEvents.FOOD_COST_DRAFT_DISCARDED,
  wizard_completed: AnalyticsEvents.FOOD_COST_WIZARD_COMPLETED,
  paywall_shown: AnalyticsEvents.PAYWALL_VIEWED,
  ingredient_picker_opened: AnalyticsEvents.FOOD_COST_INGREDIENT_PICKER_OPENED,
  add_to_library_tapped: AnalyticsEvents.FOOD_COST_ADD_TO_LIBRARY_TAPPED,
  returned_from_library: AnalyticsEvents.FOOD_COST_RETURNED_FROM_LIBRARY,
  ingredient_added: AnalyticsEvents.FOOD_COST_INGREDIENT_ADDED,
  selling_format_added: AnalyticsEvents.FOOD_COST_SELLING_FORMAT_ADDED,
};

/**
 * Food cost wizard funnel events → PostHog.
 */
export function trackFoodCost(event, extra = {}) {
  if (event === 'step_1' || event === 'step_2' || event === 'step_3') {
    const step = Number(event.replace('step_', ''));
    track(AnalyticsEvents.FOOD_COST_STEP_VIEWED, {
      step,
      step_name: FOOD_COST_STEP_NAMES[step],
      ...extra,
    });
    return;
  }

  const mapped = STEP_EVENT_MAP[event];
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
