import { useEffect } from 'react';
import useIngredientStore from '../stores/ingredientStore';
import useAuthStore from '../stores/authStore';

export function useIngredients() {
  const user = useAuthStore((s) => s.user);
  const { ingredients, loading, error, fetchIngredients, addIngredient, updateIngredient, deleteIngredient } =
    useIngredientStore();

  useEffect(() => {
    if (user) fetchIngredients();
  }, [user]);

  return { ingredients, loading, error, addIngredient, updateIngredient, deleteIngredient, refetch: fetchIngredients };
}
