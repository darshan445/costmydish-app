import { UNIT_LABELS } from '../constants/units';
import { calculateIngredientCost } from '../lib/calculations';
import { areUnitsCompatible, convertQuantityBetweenUnits } from '../lib/units';
import { formatCurrency, formatQuantity } from './format';

/**
 * Summary for recipe ingredient usage.
 * usageLine: "500 ml — $1.20"
 * convertedLine: "0.5 L" (only when recipe unit differs from purchase unit)
 */
export function getIngredientUsageSummary(ingredient, recipeQty, recipeUnit, currencySymbol = '$') {
  if (!ingredient || recipeQty == null || recipeQty === '' || !recipeUnit) return null;

  const qty = parseFloat(recipeQty);
  if (isNaN(qty) || qty <= 0) return null;

  const recipeLabel = UNIT_LABELS[recipeUnit] ?? recipeUnit;
  const { cost } = calculateIngredientCost({
    recipeQuantity: qty,
    recipeUnit,
    purchasePrice: ingredient.purchase_price ?? 0,
    purchaseQuantity: ingredient.purchase_quantity ?? 1,
    purchaseUnit: ingredient.purchase_unit ?? recipeUnit,
    wastePercent: ingredient.waste_percent ?? 0,
  });

  const usageLine = `${formatQuantity(qty)} ${recipeLabel} — ${formatCurrency(cost, currencySymbol)}`;

  const purchaseUnit = ingredient.purchase_unit;
  if (!purchaseUnit || recipeUnit === purchaseUnit) {
    return { usageLine, convertedLine: null };
  }
  if (!areUnitsCompatible(recipeUnit, purchaseUnit)) {
    return { usageLine, convertedLine: null };
  }

  const converted = convertQuantityBetweenUnits(qty, recipeUnit, purchaseUnit);
  if (converted === null) return { usageLine, convertedLine: null };

  const purchaseLabel = UNIT_LABELS[purchaseUnit] ?? purchaseUnit;
  return {
    usageLine,
    convertedLine: `${formatQuantity(converted)} ${purchaseLabel}`,
  };
}
