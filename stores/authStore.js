import { create } from 'zustand';
import { bootLog, BOOT_TIMEOUT_MS, withBootTimeout } from '../lib/debugBoot';
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
    bootLog('auth:initialize:start');
    try {
      bootLog('auth:getSession:start');
      const { data: { session } } = await withBootTimeout(
        supabase.auth.getSession(),
        BOOT_TIMEOUT_MS,
        'getSession',
      );
      bootLog('auth:getSession:done', { hasUser: !!session?.user });
      if (session?.user) {
        set({ user: session.user });
      }
    } catch (error) {
      bootLog('auth:initialize:error', { message: error?.message });
      console.error('Auth init error:', error);
    } finally {
      set({ loading: false, initialized: true });
      bootLog('auth:initialize:done');
    }
  },

  fetchProfile: async (userId) => {
    bootLog('auth:fetchProfile:start', { userId });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      bootLog('auth:fetchProfile:done', { ok: !error && !!data, error: error?.message ?? null });
      if (!error && data) set({ profile: data });
    } catch (error) {
      bootLog('auth:fetchProfile:error', { message: error?.message });
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
      await useSettingsStore.getState().applyDeviceLocaleSettings(user.id);
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
