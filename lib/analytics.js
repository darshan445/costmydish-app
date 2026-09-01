import { bootLog } from './debugBoot';
import { AnalyticsEvents } from '../constants/analyticsEvents';
import { isPostHogConfigured, POSTHOG_CAPTURE_ENABLED } from './posthog';
import Constants from 'expo-constants';

export { AnalyticsEvents };

/** Sent with every event — filter dashboards by app_name when sharing one PostHog project. */
export const POSTHOG_APP_SUPER_PROPERTIES = {
  app_name: 'costmydish',
  app_version: Constants.expoConfig?.version ?? null,
};

let posthogClient = null;
const pendingEvents = [];
const pendingIdentify = [];
let pendingReset = false;

function isAnalyticsActive() {
  return POSTHOG_CAPTURE_ENABLED && !__DEV__ && isPostHogConfigured();
}

function applySuperProperties(client) {
  client?.register?.(POSTHOG_APP_SUPER_PROPERTIES);
}

/** Called from AnalyticsBridge once PostHogProvider is ready. */
export function registerPostHogClient(client) {
  posthogClient = client;
  applySuperProperties(client);
  if (pendingReset) {
    client.reset();
    pendingReset = false;
  }
  while (pendingIdentify.length) {
    const { userId, traits } = pendingIdentify.shift();
    client.identify(userId, traits);
  }
  while (pendingEvents.length) {
    const { event, properties } = pendingEvents.shift();
    client.capture(event, properties);
  }
}

export function unregisterPostHogClient() {
  posthogClient = null;
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [properties]
 */
export function track(event, properties = {}) {
  bootLog(`analytics:${event}`, properties);

  if (!isAnalyticsActive()) return;

  if (posthogClient) {
    posthogClient.capture(event, properties);
    return;
  }

  pendingEvents.push({ event, properties });
}

export function trackScreen(screenName, properties = {}) {
  bootLog(`analytics:screen:${screenName}`, properties);

  if (!isAnalyticsActive()) return;

  const props = {
    screen: screenName,
    $screen_name: screenName,
    ...properties,
  };

  if (posthogClient) {
    if (typeof posthogClient.screen === 'function') {
      posthogClient.screen(screenName, props);
    } else {
      posthogClient.capture('$screen', props);
    }
    return;
  }

  pendingEvents.push({ event: '$screen', properties: props });
}

/**
 * @param {string} userId
 * @param {Record<string, unknown>} [traits]
 */
export function identifyUser(userId, traits = {}) {
  if (!userId || !isAnalyticsActive()) return;

  if (posthogClient) {
    posthogClient.identify(userId, traits);
    return;
  }

  pendingIdentify.push({ userId, traits });
}

/** Merge traits onto the identified user (counts, tier, etc.). */
export function setUserTraits(userId, traits = {}) {
  if (!userId || !isAnalyticsActive()) return;
  if (posthogClient) {
    posthogClient.identify(userId, traits);
    return;
  }
  pendingIdentify.push({ userId, traits });
}

export function resetAnalytics() {
  if (!isAnalyticsActive()) return;

  if (posthogClient) {
    posthogClient.reset();
    applySuperProperties(posthogClient);
    pendingReset = false;
    return;
  }

  pendingReset = true;
  pendingIdentify.length = 0;
}
