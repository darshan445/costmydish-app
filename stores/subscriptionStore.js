import { create } from 'zustand';
import { checkHobbyistEntitlement } from '../lib/revenuecat';

const useSubscriptionStore = create((set) => ({
  rcEntitled: false,

  setRcEntitled: (entitled) => set({ rcEntitled: entitled }),

  syncFromRevenueCat: async () => {
    try {
      const entitled = await checkHobbyistEntitlement();
      set({ rcEntitled: entitled });
      return entitled;
    } catch (_) {
      set({ rcEntitled: false });
      return false;
    }
  },

  clearRcEntitlement: () => set({ rcEntitled: false }),
}));

export default useSubscriptionStore;
