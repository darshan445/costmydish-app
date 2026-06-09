import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { getCurrencyFromDeviceLocale } from '../utils/localeCurrency';

const useSettingsStore = create((set, get) => ({
  settings: {
    currency: DEFAULT_CURRENCY.code,
    currency_symbol: DEFAULT_CURRENCY.symbol,
    default_food_cost_percent: 30,
    default_batch_size: 1,
  },
  loading: false,

  fetchSettings: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      // PGRST116 = no rows found — just keep defaults, don't crash
      if (!error && data) set({ settings: data });
    } catch (error) {
      console.error('Fetch settings error:', error);
    } finally {
      set({ loading: false });
    }
  },

  applyDeviceCurrency: async (userId) => {
    const { code, symbol } = getCurrencyFromDeviceLocale();
    return get().updateSettings(userId, { currency: code, currency_symbol: symbol });
  },

  updateSettings: async (userId, updates) => {
    set({ loading: true });
    try {
      // upsert handles the case where the settings row doesn't exist yet
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: userId, ...updates },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      set({ settings: data });
      return { error: null };
    } catch (error) {
      console.error('Update settings error:', error);
      return { error: 'Failed to save settings. Please try again.' };
    } finally {
      set({ loading: false });
    }
  },

  getCurrencySymbol: () => get().settings.currency_symbol ?? '$',
}));

export default useSettingsStore;
