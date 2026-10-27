import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import useAuthStore from './authStore';

function sortIngredientsNewestFirst(list) {
  return [...list].sort((a, b) => {
    const aTime = new Date(a.created_at ?? 0).getTime();
    const bTime = new Date(b.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}

let fetchFlight = null;
/** Bumped around every write; a reload that overlapped one is re-run instead of applied. */
let writeVersion = 0;
const MAX_FETCH_ATTEMPTS = 3;

const useIngredientStore = create((set, get) => ({
  ingredients: [],
  /** True after at least one successful fetch for the current session/user. */
  hydrated: false,
  loading: false,
  error: null,

  reset: () => {
    fetchFlight = null;
    set({ ingredients: [], hydrated: false, loading: false, error: null });
  },

  fetchIngredients: async () => {
    if (fetchFlight) return fetchFlight;

    fetchFlight = (async () => {
      set({ loading: true, error: null });
      try {
        let rows = [];
        let fresh = false;
        for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS && !fresh; attempt += 1) {
          const startedAt = writeVersion;
          const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .eq('is_archived', false)
            .order('created_at', { ascending: false });
          if (error) throw error;
          rows = data ?? [];
          fresh = startedAt === writeVersion;
        }
        // Still overlapping writes: the list already has them applied locally, keep it
        if (!fresh && get().hydrated) return get().ingredients;
        set({ ingredients: rows, hydrated: true, error: null });
        return rows;
      } catch (error) {
        console.error('Fetch ingredients error:', error);
        set({ error: 'Failed to load ingredients.' });
        return null;
      } finally {
        set({ loading: false });
        fetchFlight = null;
      }
    })();

    return fetchFlight;
  },

  /**
   * Ensures library is loaded, then returns active ingredient count.
   * Prefer in-memory after hydrate; fall back to a cheap DB count if fetch failed.
   */
  ensureIngredientCount: async () => {
    const state = get();
    if (state.hydrated) return state.ingredients.length;

    const fetched = await get().fetchIngredients();
    if (get().hydrated) return get().ingredients.length;

    // Fetch failed — do not treat [] as under-limit
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return fetched?.length ?? 0;
      const { count, error } = await supabase
        .from('ingredients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false);
      if (error) throw error;
      return count ?? 0;
    } catch (e) {
      console.error('ensureIngredientCount fallback:', e);
      // Fail closed for free-tier safety: assume at limit if we cannot count
      return Number.MAX_SAFE_INTEGER;
    }
  },

  addIngredient: async (ingredientData) => {
    writeVersion += 1;
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('ingredients')
        .insert({ ...ingredientData, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        ingredients: sortIngredientsNewestFirst([...state.ingredients, data]),
        hydrated: true,
      }));
      return { data, error: null };
    } catch (error) {
      console.error('Add ingredient error:', error);
      if (error?.code === '23505') {
        return { data: null, error: `An ingredient named "${ingredientData.name}" already exists. Use a different name.` };
      }
      return { data: null, error: 'Failed to save ingredient. Please try again.' };
    } finally {
      writeVersion += 1;
    }
  },

  updateIngredient: async (id, updates) => {
    writeVersion += 1;
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
    } finally {
      writeVersion += 1;
    }
  },

  deleteIngredient: async (id) => {
    writeVersion += 1;
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
    } finally {
      writeVersion += 1;
    }
  },

  getIngredientById: (id) => get().ingredients.find((i) => i.id === id) ?? null,
}));

export default useIngredientStore;
