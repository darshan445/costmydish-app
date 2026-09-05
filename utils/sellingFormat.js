/**
 * Normalize user-entered dish name for display in titles / format labels.
 * Trims, collapses whitespace; returns '' if empty.
 */
export function normalizeDishName(name) {
  if (name == null) return '';
  return String(name).replace(/\s+/g, ' ').trim();
}

/**
 * Selling format display name — quantity + unit, optionally with dish.
 * e.g. "1 Plate (Chocolate Chip Cookies)", "24 Piece"
 */
export function formatSellingFormatName(unitLabel, qty, dishName) {
  const q = parseFloat(qty) || 1;
  const label = unitLabel
    ? unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)
    : 'Unit';
  const base = `${q} ${label}`;
  const dish = normalizeDishName(dishName);
  if (!dish) return base;
  // Soft truncate so long names don't blow up cards
  const short = dish.length > 48 ? `${dish.slice(0, 45).trimEnd()}…` : dish;
  return `${base} (${short})`;
}

/** e.g. labelPerSellingUnit('Cost per', 'slice') → "Cost per slice" */
export function labelPerSellingUnit(prefix, unitLabel) {
  const unit = (unitLabel ?? 'unit').toLowerCase();
  return `${prefix} ${unit}`;
}
