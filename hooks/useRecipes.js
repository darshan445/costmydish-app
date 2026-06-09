import { useEffect } from 'react';
import useRecipeStore from '../stores/recipeStore';
import useAuthStore from '../stores/authStore';

export function useRecipes() {
  const user = useAuthStore((s) => s.user);
  const { recipes, costSummaries, loading, error, fetchRecipes, createRecipe, updateRecipe, deleteRecipe } = useRecipeStore();

  useEffect(() => {
    if (user) fetchRecipes();
  }, [user]);

  return { recipes, costSummaries, loading, error, createRecipe, updateRecipe, deleteRecipe, refetch: fetchRecipes };
}
