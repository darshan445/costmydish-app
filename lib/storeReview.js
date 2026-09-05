import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { APP_STORE_URL, PLAY_STORE_URL } from '../constants/legal';
import { supabase } from './supabase';

export const SOFT_ASK_MIN_DISHES = 3;
export const SOFT_ASK_LATER_MIN_DISHES = 5;

const MS_DAY = 24 * 60 * 60 * 1000;
export const COOLDOWN_YES_MS = 90 * MS_DAY;
export const COOLDOWN_DECLINED_MS = 120 * MS_DAY;
export const COOLDOWN_LATER_MS = 37 * MS_DAY;

/** @typedef {'yes' | 'declined' | 'later'} SoftOutcome */

/**
 * @typedef {object} ReviewPromptState
 * @property {boolean} neverAsk
 * @property {SoftOutcome | null} lastOutcome
 * @property {string | null} lastSoftAt ISO
 * @property {string | null} lastNativeAt ISO
 * @property {number} softAskCount
 */

/** @type {ReviewPromptState} */
const EMPTY_STATE = {
  neverAsk: false,
  lastOutcome: null,
  lastSoftAt: null,
  lastNativeAt: null,
  softAskCount: 0,
};

/** In-memory only — prevents double-show in the same app session. Not persisted. */
let sessionSoftShown = false;
let sessionUserId = null;
let nativeInFlight = null;

function daysBetween(iso, now = Date.now()) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (now - t) / MS_DAY;
}

function rowToState(row) {
  if (!row) return { ...EMPTY_STATE };
  return {
    neverAsk: !!row.never_ask,
    lastOutcome: row.last_outcome ?? null,
    lastSoftAt: row.last_soft_at ?? null,
    lastNativeAt: row.last_native_at ?? null,
    softAskCount: row.soft_ask_count ?? 0,
  };
}

/**
 * Call when auth user changes. Soft ask is once per app session per user.
 * @param {string | null | undefined} userId
 */
export function resetReviewSessionForUser(userId) {
  const next = userId ?? null;
  if (sessionUserId !== next) {
    sessionSoftShown = false;
    sessionUserId = next;
  }
}

/** @returns {Promise<ReviewPromptState>} */
export async function getReviewPromptState(userId) {
  if (!userId) return { ...EMPTY_STATE };

  try {
    const { data, error } = await supabase
      .from('review_prompt_state')
      .select('never_ask, last_outcome, last_soft_at, last_native_at, soft_ask_count')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('getReviewPromptState:', error.message);
      return { ...EMPTY_STATE };
    }

    return rowToState(data);
  } catch (e) {
    console.warn('getReviewPromptState exception:', e?.message);
    return { ...EMPTY_STATE };
  }
}

/**
 * Upsert patch into Supabase (source of truth for outcomes / cooldowns).
 * @param {string | null | undefined} userId
 * @param {Partial<ReviewPromptState>} patch
 */
export async function patchReviewPromptState(userId, patch) {
  if (!userId) return { ...EMPTY_STATE };

  const current = await getReviewPromptState(userId);
  const next = { ...current, ...patch };

  const row = {
    user_id: userId,
    never_ask: next.neverAsk,
    last_outcome: next.lastOutcome,
    last_soft_at: next.lastSoftAt,
    last_native_at: next.lastNativeAt,
    soft_ask_count: next.softAskCount ?? 0,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('review_prompt_state')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.warn('patchReviewPromptState:', error.message);
    }
  } catch (e) {
    console.warn('patchReviewPromptState exception:', e?.message);
  }

  return next;
}

/** Accurate dish count from Supabase. */
export async function countNonSampleRecipes(userId) {
  if (!userId) return 0;
  try {
    const { count, error } = await supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_archived', false)
      .or('is_sample.eq.false,is_sample.is.null');
    if (error) {
      console.warn('countNonSampleRecipes:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.warn('countNonSampleRecipes exception:', e?.message);
    return 0;
  }
}

/**
 * Soft “Enjoying…?” eligibility after a dish save win.
 * @param {{
 *   userId?: string | null,
 *   justSaved: boolean,
 *   nonSampleCount: number,
 *   hasOnTargetMargin?: boolean,
 * }} opts
 */
export async function shouldShowSoftAsk({
  userId,
  justSaved,
  nonSampleCount,
  hasOnTargetMargin = false,
}) {
  resetReviewSessionForUser(userId);

  if (!userId) return false;
  if (!justSaved) return false;
  if (sessionSoftShown) return false;
  if (nonSampleCount < SOFT_ASK_MIN_DISHES) return false;

  const state = await getReviewPromptState(userId);
  if (state.neverAsk) return false;

  if (!state.lastSoftAt) return true;

  const elapsedMs = Date.now() - Date.parse(state.lastSoftAt);
  if (Number.isNaN(elapsedMs)) return true;

  if (state.lastOutcome === 'yes') {
    return elapsedMs >= COOLDOWN_YES_MS;
  }
  if (state.lastOutcome === 'declined') {
    return elapsedMs >= COOLDOWN_DECLINED_MS;
  }
  if (state.lastOutcome === 'later') {
    if (elapsedMs < COOLDOWN_LATER_MS) return false;
    return nonSampleCount >= SOFT_ASK_LATER_MIN_DISHES || hasOnTargetMargin;
  }

  return elapsedMs >= COOLDOWN_YES_MS;
}

export function markSoftAskShownThisSession() {
  sessionSoftShown = true;
}

/**
 * @param {string | null | undefined} userId
 * @param {SoftOutcome} outcome
 * @param {{ neverAsk?: boolean }} [extra]
 */
export async function recordSoftOutcome(userId, outcome, extra = {}) {
  markSoftAskShownThisSession();
  const state = await getReviewPromptState(userId);
  return patchReviewPromptState(userId, {
    lastOutcome: outcome,
    lastSoftAt: new Date().toISOString(),
    softAskCount: (state.softAskCount ?? 0) + 1,
    ...(extra.neverAsk ? { neverAsk: true } : {}),
  });
}

export async function setNeverAskAgain(userId) {
  return patchReviewPromptState(userId, { neverAsk: true });
}

/**
 * Call native Play / App Store in-app review API (OS may show nothing).
 * @param {string | null | undefined} [userId]
 * @returns {Promise<boolean>}
 */
export async function requestNativeStoreReview(userId) {
  if (nativeInFlight) return nativeInFlight;

  nativeInFlight = (async () => {
    try {
      const [isAvailable, hasAction] = await Promise.all([
        StoreReview.isAvailableAsync(),
        StoreReview.hasAction(),
      ]);
      if (!isAvailable && !hasAction) {
        await patchReviewPromptState(userId, { lastNativeAt: new Date().toISOString() });
        return false;
      }

      await StoreReview.requestReview();
      await patchReviewPromptState(userId, { lastNativeAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.warn('Store review request failed:', error?.message);
      return false;
    } finally {
      nativeInFlight = null;
    }
  })();

  return nativeInFlight;
}

/** Settings → Rate — opens store listing (not requestReview). */
export async function openStoreListing() {
  const fromExpo = typeof StoreReview.storeUrl === 'function' ? StoreReview.storeUrl() : null;
  const url = fromExpo
    || (Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL);
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn('Open store listing failed:', error?.message);
    return false;
  }
}

/** @deprecated */
export async function maybeRequestStoreReview() {
  return requestNativeStoreReview();
}

export function getReviewDebugSummary(state) {
  return {
    ...state,
    daysSinceSoft: daysBetween(state?.lastSoftAt),
    daysSinceNative: daysBetween(state?.lastNativeAt),
    sessionSoftShown,
  };
}
