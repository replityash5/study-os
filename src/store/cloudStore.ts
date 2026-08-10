import { create } from 'zustand';

interface CloudState {
  offline: boolean;
  errorMessage: string | null;
  setOffline: (offline: boolean) => void;
  setError: (message: string | null) => void;
}

export const useCloudStore = create<CloudState>((set) => ({
  offline: false,
  errorMessage: null,
  setOffline: (offline) => set({ offline }),
  setError: (errorMessage) => set({ errorMessage }),
}));
