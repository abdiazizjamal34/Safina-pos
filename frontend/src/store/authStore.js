import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    accessToken: null,
    _hydrated: false,
    setAuth: (user, accessToken) => set({ user, accessToken }),
    logout: () => set({ user: null, accessToken: null }),
    setHydrated: () => set({ _hydrated: true }),
  }),
  {
    name: 'cafe-pos-auth',
    onRehydrateStorage: () => (state) => {
      // Called after localStorage is read — mark hydration complete
      if (state) state.setHydrated();
    },
  }
));
