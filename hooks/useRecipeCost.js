import { useMemo } from 'react';
import { calculateTotalRecipeCost } from '../lib/calculations';

export function useRecipeCost({ recipeIngredients }) {
  const result = useMemo(() => {
    if (!recipeIngredients?.length) {
      return {
        totalCost: 0,
        ingredientCosts: [],
        errors: [],
      };
    }

    const { totalCost, ingredientCosts, errors } = calculateTotalRecipeCost(recipeIngredients);
    return { totalCost, ingredientCosts, errors };
  }, [recipeIngredients]);

  return result;
}
