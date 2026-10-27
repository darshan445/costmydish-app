import { formatUnitLabel, formatUnitLabelFor } from '../constants/units';
import {
  areUnitsCompatible,
  convertQuantityBetweenUnits,
  getConversionFactor,
  getUnitFamily,
} from '../lib/units';
import { formatQuantity } from './format';

/**
 * Summary for recipe ingredient usage.
 * usageLine: "500 ml" (the cost is shown separately on the row)
 * convertedLine: "0.5 L" when recipe unit differs from purchase unit and conversion is meaningful
 * (skipped for 1:1 count synonyms such as piece ↔ each)
 */
function shouldShowConvertedLine(recipeUnit, purchaseUnit) {
  if (recipeUnit === purchaseUnit) return false;
  if (getUnitFamily(recipeUnit) !== 'count' || getUnitFamily(purchaseUnit) !== 'count') {
    return true;
  }
  // piece and each are 1:1 — same item, different label only
  return getConversionFactor(purchaseUnit, recipeUnit) !== 1;
}

export function getIngredientUsageSummary(ingredient, recipeQty, recipeUnit) {
  if (!ingredient || recipeQty == null || recipeQty === '' || !recipeUnit) return null;

  const qty = parseFloat(recipeQty);
  if (isNaN(qty) || qty <= 0) return null;

  const usageLine = `${formatQuantity(qty)} ${formatUnitLabelFor(recipeUnit, qty)}`;

  const purchaseUnit = ingredient.purchase_unit;
  if (!purchaseUnit || !shouldShowConvertedLine(recipeUnit, purchaseUnit)) {
    return { usageLine, convertedLine: null };
  }
  if (!areUnitsCompatible(recipeUnit, purchaseUnit)) {
    return { usageLine, convertedLine: null };
  }

  const converted = convertQuantityBetweenUnits(qty, recipeUnit, purchaseUnit);
  if (converted === null) return { usageLine, convertedLine: null };

  const purchaseLabel = formatUnitLabel(purchaseUnit);
  return {
    usageLine,
    convertedLine: `${formatQuantity(converted)} ${purchaseLabel}`,
  };
}
