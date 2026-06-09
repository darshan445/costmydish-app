import { UNIT_FAMILIES } from '../constants/units';

// Conversion factors to base units: grams for weight, ml for volume
const TO_BASE = {
  // weight → grams
  kg: 1000,
  g: 1,
  lb: 453.592,
  oz: 28.3495,
  // volume → ml
  l: 1000,
  ml: 1,
  fl_oz: 29.5735,
  cup: 240,
  tbsp: 14.7868,
  tsp: 4.92892,
  gallon: 3785.41,
};

export function getUnitFamily(unit) {
  for (const [family, units] of Object.entries(UNIT_FAMILIES)) {
    if (units.includes(unit)) return family;
  }
  return null;
}

export function areUnitsCompatible(purchaseUnit, recipeUnit) {
  if (purchaseUnit === recipeUnit) return true;
  const purchaseFamily = getUnitFamily(purchaseUnit);
  const recipeFamily = getUnitFamily(recipeUnit);
  if (!purchaseFamily || !recipeFamily) return false;
  if (purchaseFamily === 'count' || recipeFamily === 'count') {
    return purchaseUnit === recipeUnit;
  }
  return purchaseFamily === recipeFamily;
}

export function getIncompatibleUnitError(purchaseUnit, recipeUnit) {
  const purchaseFamily = getUnitFamily(purchaseUnit);
  const recipeFamily = getUnitFamily(recipeUnit);
  if (purchaseFamily === 'count' || recipeFamily === 'count') {
    return `Count units (${purchaseUnit}, ${recipeUnit}) must match exactly — no conversion possible.`;
  }
  return `Cannot convert between weight (${purchaseUnit}) and volume (${recipeUnit}). Use compatible units.`;
}

/**
 * Converts a quantity from one unit to another.
 * Returns null if units are incompatible.
 */
export function convertToBase(quantity, unit) {
  if (UNIT_FAMILIES.count.includes(unit)) {
    return quantity;
  }
  const factor = TO_BASE[unit];
  if (!factor) return null;
  return quantity * factor;
}

/**
 * Returns the conversion factor to go from recipeUnit to purchaseUnit base.
 * e.g. recipe uses 'g', purchase uses 'kg' → factor = 1 (both in grams base)
 */
export function getConversionFactor(purchaseUnit, recipeUnit) {
  if (!areUnitsCompatible(purchaseUnit, recipeUnit)) return null;
  if (UNIT_FAMILIES.count.includes(purchaseUnit)) {
    return purchaseUnit === recipeUnit ? 1 : null;
  }
  const purchaseBase = TO_BASE[purchaseUnit];
  const recipeBase = TO_BASE[recipeUnit];
  if (!purchaseBase || !recipeBase) return null;
  return recipeBase / purchaseBase;
}

/**
 * Converts a quantity from one compatible unit to another.
 * e.g. 500 ml → 0.5 l
 */
export function convertQuantityBetweenUnits(quantity, fromUnit, toUnit) {
  const qty = parseFloat(quantity);
  if (isNaN(qty)) return null;
  if (fromUnit === toUnit) return qty;
  if (!areUnitsCompatible(fromUnit, toUnit)) return null;
  if (UNIT_FAMILIES.count.includes(fromUnit)) {
    return fromUnit === toUnit ? qty : null;
  }
  const base = convertToBase(qty, fromUnit);
  if (base === null) return null;
  if (UNIT_FAMILIES.count.includes(toUnit)) return null;
  const toFactor = TO_BASE[toUnit];
  if (!toFactor) return null;
  return base / toFactor;
}
