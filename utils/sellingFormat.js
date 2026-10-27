/**
 * Normalize user-entered dish name for display in titles / format labels.
 * Trims, collapses whitespace; returns '' if empty.
 */
export function normalizeDishName(name) {
  if (name == null) return '';
  return String(name).replace(/\s+/g, ' ').trim();
}

const INVARIANT_WORDS = new Set(['dozen', 'each', 'other']);

function pluralWord(word) {
  if (INVARIANT_WORDS.has(word.toLowerCase())) return word;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** "piece" + 24 → "pieces", "whole dish" + 2 → "whole dishes"; 1 stays singular */
export function pluralizeUnitWord(word, qty) {
  const w = String(word ?? '').trim();
  if (!w || parseFloat(qty) === 1) return w;
  return w.replace(/(\S+)$/, pluralWord);
}

/** Lower-case unit word for sentences; "whole" reads as "whole dish" */
function unitWord(unitLabel) {
  const w = String(unitLabel ?? '').trim().toLowerCase();
  if (!w) return 'unit';
  return w === 'whole' ? 'whole dish' : w;
}

/**
 * Selling format display name — quantity + unit, optionally with dish.
 * e.g. "1 plate (Chocolate chip cookies)", "24 pieces"
 */
export function formatSellingFormatName(unitLabel, qty, dishName) {
  const q = parseFloat(qty) || 1;
  const base = `${q} ${pluralizeUnitWord(unitWord(unitLabel), q)}`;
  const dish = normalizeDishName(dishName);
  if (!dish) return base;
  // Soft truncate so long names don't blow up cards
  const short = dish.length > 48 ? `${dish.slice(0, 45).trimEnd()}…` : dish;
  return `${base} (${short})`;
}

/**
 * Lower-case yield unit for sentences ("Cost per slice").
 * "whole" reads as "whole dish" so "Cost per whole dish" makes sense.
 */
export function yieldUnitText(unitName, unitLabel) {
  if (unitName === 'whole') return 'whole dish';
  const label = String(unitLabel ?? unitName ?? '').trim();
  return label ? label.toLowerCase() : 'serving';
}

/** e.g. labelPerSellingUnit('Cost per', 'slice') → "Cost per slice" */
export function labelPerSellingUnit(prefix, unitLabel) {
  return `${prefix} ${unitWord(unitLabel)}`;
}
