/**
 * Selling format display name — quantity first, unit second (e.g. "24 Piece", "2 Dozen").
 */
export function formatSellingFormatName(unitLabel, qty) {
  const q = parseFloat(qty) || 1;
  const label = unitLabel
    ? unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)
    : 'Unit';
  return `${q} ${label}`;
}

/** e.g. labelPerSellingUnit('Cost per', 'slice') → "Cost per slice" */
export function labelPerSellingUnit(prefix, unitLabel) {
  const unit = (unitLabel ?? 'unit').toLowerCase();
  return `${prefix} ${unit}`;
}
