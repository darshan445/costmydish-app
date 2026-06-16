import { create } from 'zustand';

const useAppAlertStore = create((set) => ({
  alert: null,

  show: (alert) => set({ alert }),

  dismiss: () => set({ alert: null }),
}));

export default useAppAlertStore;
