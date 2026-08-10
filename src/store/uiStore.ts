import { create } from 'zustand';
interface UIState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}
export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));
