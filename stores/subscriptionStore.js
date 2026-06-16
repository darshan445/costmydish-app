import { create } from 'zustand';
import { bootLog } from '../lib/debugBoot';
import { checkHobbyistEntitlement } from '../lib/revenuecat';

const useSubscriptionStore = create((set) => ({
  rcEntitled: false,

  setRcEntitled: (entitled) => set({ rcEntitled: entitled }),

  syncFromRevenueCat: async () => {
    bootLog('subscription:sync:start');
    try {
      const entitled = await checkHobbyistEntitlement();
      set({ rcEntitled: entitled });
      bootLog('subscription:sync:done', { entitled });
      return entitled;
    } catch (e) {
      bootLog('subscription:sync:error', { message: e?.message });
      set({ rcEntitled: false });
      return false;
    }
  },

  clearRcEntitlement: () => set({ rcEntitled: false }),
}));

export default useSubscriptionStore;
