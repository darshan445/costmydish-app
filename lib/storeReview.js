import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const REVIEW_REQUESTED_KEY = '@costmydish/store-review-requested';

let requestInFlight = null;

/**
 * Requests the native App Store / Play Store review sheet at most once per
 * installation. Store APIs do not reveal whether a rating was submitted.
 */
export async function maybeRequestStoreReview() {
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    try {
      const alreadyRequested = await AsyncStorage.getItem(REVIEW_REQUESTED_KEY);
      if (alreadyRequested) return false;

      const [isAvailable, hasAction] = await Promise.all([
        StoreReview.isAvailableAsync(),
        StoreReview.hasAction(),
      ]);
      if (!isAvailable || !hasAction) return false;

      await StoreReview.requestReview();
      await AsyncStorage.setItem(REVIEW_REQUESTED_KEY, new Date().toISOString());
      return true;
    } catch (error) {
      console.warn('Store review request failed:', error?.message);
      return false;
    } finally {
      requestInFlight = null;
    }
  })();

  return requestInFlight;
}
