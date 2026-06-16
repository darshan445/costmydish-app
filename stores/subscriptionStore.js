import { create } from 'zustand';
import { bootLog } from '../lib/debugBoot';
import { fetchHobbyistEntitlementStatus } from '../lib/revenuecat';

const EMPTY_RC_STATUS = {
  rcEntitled: false,
  rcExpirationDate: null,
  rcWillRenew: true,
  rcIsCancelled: false,
  rcBillingPeriod: null,
};

const useSubscriptionStore = create((set) => ({
  ...EMPTY_RC_STATUS,

  applyRcStatus: (status) => set({
    rcEntitled: status.entitled,
    rcExpirationDate: status.expirationDate ?? null,
    rcWillRenew: status.willRenew ?? true,
    rcIsCancelled: status.isCancelled ?? false,
    rcBillingPeriod: status.billingPeriod ?? null,
  }),

  setRcEntitled: (entitled) => set({ rcEntitled: entitled }),

  syncFromRevenueCat: async () => {
    bootLog('subscription:sync:start');
    try {
      const status = await fetchHobbyistEntitlementStatus();
      set({
        rcEntitled: status.entitled,
        rcExpirationDate: status.expirationDate ?? null,
        rcWillRenew: status.willRenew ?? true,
        rcIsCancelled: status.isCancelled ?? false,
        rcBillingPeriod: status.billingPeriod ?? null,
      });
      bootLog('subscription:sync:done', status);
      return status;
    } catch (e) {
      bootLog('subscription:sync:error', { message: e?.message });
      set(EMPTY_RC_STATUS);
      return {
        entitled: false,
        expirationDate: null,
        willRenew: true,
        isCancelled: false,
        billingPeriod: null,
      };
    }
  },

  clearRcEntitlement: () => set(EMPTY_RC_STATUS),
}));

export default useSubscriptionStore;
