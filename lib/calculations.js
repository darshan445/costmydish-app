import { areUnitsCompatible, getConversionFactor, getIncompatibleUnitError } from './units';

/**
 * Calculates the cost of a single ingredient used in a recipe.
 */
export function calculateIngredientCost({
  recipeQuantity,
  recipeUnit,
  purchasePrice,
  purchaseQuantity,
  purchaseUnit,
  wastePercent = 0,
}) {
  if (!areUnitsCompatible(purchaseUnit, recipeUnit)) {
    return { cost: 0, error: getIncompatibleUnitError(purchaseUnit, recipeUnit) };
  }

  const conversionFactor = getConversionFactor(purchaseUnit, recipeUnit);
  if (conversionFactor === null) {
    return { cost: 0, error: 'Unable to convert between these units.' };
  }

  const purchaseInRecipeUnits = purchaseQuantity / conversionFactor;

  if (purchaseInRecipeUnits === 0) {
    return { cost: 0, error: 'Purchase quantity cannot be zero.' };
  }

  const wasteFactor = 1 + (wastePercent ?? 0) / 100;
  const cost = (recipeQuantity / purchaseInRecipeUnits) * purchasePrice * wasteFactor;

  return { cost, error: null };
}

/**
 * Calculates the total cost for all ingredients in a recipe.
 */
export function calculateTotalRecipeCost(recipeIngredients) {
  let totalCost = 0;
  const ingredientCosts = [];
  const errors = [];

  for (const ri of recipeIngredients) {
    const { cost, error } = calculateIngredientCost({
      recipeQuantity: ri.quantity,
      recipeUnit: ri.unit,
      purchasePrice: ri.ingredient?.purchase_price ?? 0,
      purchaseQuantity: ri.ingredient?.purchase_quantity ?? 1,
      purchaseUnit: ri.ingredient?.purchase_unit ?? ri.unit,
      wastePercent: ri.ingredient?.waste_percent ?? 0,
    });

    ingredientCosts.push({
      ingredientId: ri.ingredient_id,
      name: ri.ingredient?.name ?? 'Unknown',
      cost,
      error,
    });

    if (error) {
      errors.push({ ingredientId: ri.ingredient_id, name: ri.ingredient?.name, error });
    } else {
      totalCost += cost;
    }
  }

  return { totalCost, ingredientCosts, errors };
}

/**
 * Metrics for a selling format.
 * selling_price is always per sellable unit (one slice, one whole pizza, etc.).
 * costPerUnit = totalRecipeCost / quantityMade
 * foodCostPercent = (costPerUnit / sellingPrice) × 100
 * profit = sellingPrice − costPerUnit
 * recommendedPrice = costPerUnit / (targetFoodCostPercent / 100)
 */
export function calculateSellingFormatMetrics({
  totalRecipeCost,
  unitQuantity,
  sellingPrice,
  targetFoodCostPercent,
}) {
  const quantityMade = Math.max(parseFloat(unitQuantity) || 1, 0.0001);
  const price = parseFloat(sellingPrice) || 0;
  const target = targetFoodCostPercent ?? 30;

  const costPerUnit = totalRecipeCost / quantityMade;

  const recommendedPrice = target > 0
    ? costPerUnit / (target / 100)
    : null;
  const recommendedBundlePrice = recommendedPrice != null
    ? recommendedPrice * quantityMade
    : null;

  let foodCostPercent = null;
  let profit = null;
  let marginStatus = null;

  if (price > 0) {
    foodCostPercent = (costPerUnit / price) * 100;
    profit = price - costPerUnit;

    const diff = foodCostPercent - target;
    if (diff <= 0) {
      marginStatus = 'good';
    } else if (diff <= 5) {
      marginStatus = 'warning';
    } else {
      marginStatus = 'danger';
    }
  }

  return {
    quantityMade,
    costPerUnit,
    foodCostPercent,
    profit,
    marginStatus,
    recommendedPrice,
    recommendedBundlePrice,
  };
}
