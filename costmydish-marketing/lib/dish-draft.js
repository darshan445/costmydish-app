'use client';

// A dish a signed-out visitor asked to save on a public calculator. It waits in this browser
// while they sign up or sign in, then /dashboard/calculate picks it up and saves it.

const DRAFT_KEY = 'cmd-dish-draft';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function saveDishDraft(dish, currencyCode, fromPath) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ dish, currencyCode, fromPath, savedAt: Date.now() }));
  } catch {
    // Private mode or full storage: the dish just won't be waiting after sign-up
  }
}

/** Returns { dish, currencyCode, fromPath } or null when there is no recent, usable draft. */
export function readDishDraft() {
  try {
    const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!draft?.dish || !Array.isArray(draft.dish.ingredients) || Date.now() - Number(draft.savedAt) > MAX_AGE_MS) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDishDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear
  }
}
