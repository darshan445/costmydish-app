/**
 * Bridge between /ingredient/create?fromRecipe=1 and the food-cost wizard.
 * After save, the wizard consumes these IDs and opens the qty/unit sheet
 * for each ingredient in order (Next … Add to dish).
 */

let pendingIds = [];

/** @param {string[]} ids */
export function setPendingAddToDishIngredientIds(ids) {
  pendingIds = (ids ?? []).filter(Boolean);
}

/** @returns {string[]} */
export function consumePendingAddToDishIngredientIds() {
  const ids = pendingIds;
  pendingIds = [];
  return ids;
}
