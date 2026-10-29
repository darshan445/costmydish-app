import { track } from './analytics';

/**
 * Dish screen analytics. One "dish session" = one visit to the dish screen.
 * Every dish event carries the session id, where the owner came from, new vs edit,
 * and seconds since the screen opened. The last action is kept so the
 * dish_editor_left event can say where the owner stopped.
 */

let pendingEntrySource = null;
let session = null;

function newSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Called by the button that opens the dish screen (Home, Dishes, FAB…). */
export function setDishEntrySource(source) {
  pendingEntrySource = source;
}

export function startDishSession({ mode, recipeId = null }) {
  const entrySource = mode === 'edit' ? (pendingEntrySource ?? 'dish_detail') : (pendingEntrySource ?? 'unknown');
  pendingEntrySource = null;
  session = {
    id: newSessionId(),
    entrySource,
    mode,
    recipeId,
    startedAt: Date.now(),
    lastAction: 'opened',
  };
  return session;
}

export function setDishSessionRecipeId(recipeId) {
  if (session) session.recipeId = recipeId;
}

export function getDishSessionLastAction() {
  return session?.lastAction ?? null;
}

export function endDishSession() {
  session = null;
}

/** Sends `event` (a full event name) with the dish session attached. */
export function trackDish(event, extra = {}, { countsAsAction = true } = {}) {
  if (session && countsAsAction) {
    const action = event.replace(/^dish_/, '');
    session.lastAction = extra.field ? `${action}:${extra.field}` : action;
  }
  track(event, {
    ...(session
      ? {
        dish_session_id: session.id,
        entry_source: session.entrySource,
        dish_mode: session.mode,
        recipe_id: session.recipeId ?? undefined,
        seconds_in_editor: Math.round((Date.now() - session.startedAt) / 1000),
      }
      : {}),
    ...extra,
  });
}
