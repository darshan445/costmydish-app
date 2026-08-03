import { bootLog } from './debugBoot';

/**
 * Light food-cost funnel events (console via bootLog).
 * Events: wizard_started, step_N, draft_resumed, wizard_completed,
 * draft_discarded, paywall_shown
 */
export function trackFoodCost(event, extra) {
  bootLog(`foodCost:${event}`, extra);
}
