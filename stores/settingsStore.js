import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { getCurrencyFromDeviceLocale, getUnitSystemFromDeviceLocale } from '../utils/localeCurrency';

const useSettingsStore = create((set, get) => ({
  settings: {
    currency: DEFAULT_CURRENCY.code,
    currency_symbol: DEFAULT_CURRENCY.symbol,
    default_food_cost_percent: 30,
    default_batch_size: 1,
    unit_system: 'metric',
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
      if (!error && data) {
        set({
          settings: {
            ...get().settings,
            ...data,
            unit_system: data.unit_system ?? 'metric',
          },
        });
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
    } finally {
      set({ loading: false });
    }
  },

  applyDeviceLocaleSettings: async (userId) => {
    const { code, symbol } = getCurrencyFromDeviceLocale();
    const unit_system = getUnitSystemFromDeviceLocale();
    return get().updateSettings(userId, {
      currency: code,
      currency_symbol: symbol,
      unit_system,
    });
  },

  /** @deprecated use applyDeviceLocaleSettings */
  applyDeviceCurrency: async (userId) => get().applyDeviceLocaleSettings(userId),

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
