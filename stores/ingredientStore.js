import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import useAuthStore from './authStore';

const useIngredientStore = create((set, get) => ({
  ingredients: [],
  loading: false,
  error: null,

  fetchIngredients: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('is_archived', false)
        .order('name', { ascending: true });
      if (error) throw error;
      set({ ingredients: data ?? [] });
    } catch (error) {
      console.error('Fetch ingredients error:', error);
      set({ error: 'Failed to load ingredients.' });
    } finally {
      set({ loading: false });
    }
  },

  addIngredient: async (ingredientData) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('ingredients')
        .insert({ ...ingredientData, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ ingredients: [...state.ingredients, data].sort((a, b) => a.name.localeCompare(b.name)) }));
      return { data, error: null };
    } catch (error) {
      console.error('Add ingredient error:', error);
      if (error?.code === '23505') {
        return { data: null, error: `An ingredient named "${ingredientData.name}" already exists. Use a different name.` };
      }
      return { data: null, error: 'Failed to save ingredient. Please try again.' };
    }
  },

  updateIngredient: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        ingredients: state.ingredients.map((i) => (i.id === id ? data : i)),
      }));
      return { data, error: null };
    } catch (error) {
      console.error('Update ingredient error:', error);
      if (error?.code === '23505') {
        return { data: null, error: `An ingredient named "${updates.name}" already exists. Use a different name.` };
      }
      return { data: null, error: 'Failed to update ingredient. Please try again.' };
    }
  },

  deleteIngredient: async (id) => {
    try {
      // Remove from any recipes first to avoid FK constraint violation
      await supabase.from('recipe_ingredients').delete().eq('ingredient_id', id);
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ ingredients: state.ingredients.filter((i) => i.id !== id) }));
      return { error: null };
    } catch (error) {
      console.error('Delete ingredient error:', error);
      return { error: 'Failed to delete ingredient. Please try again.' };
    }
  },

  getIngredientById: (id) => get().ingredients.find((i) => i.id === id) ?? null,
}));

export default useIngredientStore;
