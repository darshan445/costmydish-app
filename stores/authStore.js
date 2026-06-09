import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { RESET_PASSWORD_REDIRECT_URL } from '../constants/auth';
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

    let user = data.user;
    let session = data.session;

    // No confirmation email flow — sign in immediately when signup doesn't return a session
    if (user && !session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      user = signInData.user;
      session = signInData.session;
    }

    if (user) {
      set({ user });
      await get().fetchProfile(user.id);
      await useSettingsStore.getState().applyDeviceCurrency(user.id);
    }
    return { ...data, user, session };
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

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_REDIRECT_URL,
    });
    if (error) throw error;
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const email = get().user?.email;
    if (!email) throw new Error('You must be signed in to change your password.');

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('Current password is incorrect.');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  deleteAccount: async () => {
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
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
