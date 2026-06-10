import { UNIT_FAMILIES } from '../constants/units';

// Conversion factors to base units: grams for weight, ml for volume, pieces for count
const TO_BASE = {
  kg: 1000,
  g: 1,
  lb: 453.592,
  oz: 28.3495,
  l: 1000,
  ml: 1,
  fl_oz: 29.5735,
  cup: 240,
  tbsp: 14.7868,
  tsp: 4.92892,
  gallon: 3785.41,
  quart: 946.353,
  pint: 473.176,
  piece: 1,
  each: 1,
  dozen: 12,
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
    return purchaseFamily === recipeFamily;
  }
  return purchaseFamily === recipeFamily;
}

export function getIncompatibleUnitError(purchaseUnit, recipeUnit) {
  const purchaseFamily = getUnitFamily(purchaseUnit);
  const recipeFamily = getUnitFamily(recipeUnit);
  if (purchaseFamily === 'count' || recipeFamily === 'count') {
    return `Count units (${purchaseUnit}, ${recipeUnit}) must use the same count family — piece, each, or dozen.`;
  }
  return `Cannot convert between weight (${purchaseUnit}) and volume (${recipeUnit}). Use compatible units.`;
}

export function convertToBase(quantity, unit) {
  const factor = TO_BASE[unit];
  if (factor == null) return null;
  return quantity * factor;
}

export function getConversionFactor(purchaseUnit, recipeUnit) {
  if (!areUnitsCompatible(purchaseUnit, recipeUnit)) return null;
  const purchaseBase = TO_BASE[purchaseUnit];
  const recipeBase = TO_BASE[recipeUnit];
  if (purchaseBase == null || recipeBase == null) return null;
  return recipeBase / purchaseBase;
}

export function convertQuantityBetweenUnits(quantity, fromUnit, toUnit) {
  const qty = parseFloat(quantity);
  if (isNaN(qty)) return null;
  if (fromUnit === toUnit) return qty;
  if (!areUnitsCompatible(fromUnit, toUnit)) return null;

  const base = convertToBase(qty, fromUnit);
  if (base === null) return null;
  const toFactor = TO_BASE[toUnit];
  if (toFactor == null) return null;
  return base / toFactor;
}
