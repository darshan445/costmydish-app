import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import useSettingsStore from './settingsStore';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user });
        await get().fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Auth init error:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) set({ profile: data });
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  },

  signUp: async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    if (data.user) {
      set({ user: data.user });
      await get().fetchProfile(data.user.id);
      await useSettingsStore.getState().applyDeviceCurrency(data.user.id);
    }
    return data;
  },

  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      set({ user: data.user });
      await get().fetchProfile(data.user.id);
    }
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  deleteAccount: async () => {
    try {
      // RPC deletes all user data + auth.users row
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      // Clear local auth state immediately (signOut may fail since user no longer exists in auth.users)
      try { await supabase.auth.signOut(); } catch (_) { /* already deleted */ }
      set({ user: null, profile: null });
      return { error: null };
    } catch (error) {
      console.error('Delete account error:', error);
      return { error: 'Failed to delete account. Please try again.' };
    }
  },
}));

export default useAuthStore;
