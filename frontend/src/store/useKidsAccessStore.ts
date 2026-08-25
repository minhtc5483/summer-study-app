import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KidsAccessState {
  pinToken: string | null;
  setPinToken: (token: string) => void;
  clearPinToken: () => void;
}

// Stores the token issued after the family PIN is verified. This gates the
// unauthenticated /public/* endpoints (kids app) now that the server is on the internet.
export const useKidsAccessStore = create<KidsAccessState>()(
  persist(
    (set) => ({
      pinToken: null,
      setPinToken: (pinToken) => set({ pinToken }),
      clearPinToken: () => set({ pinToken: null }),
    }),
    {
      name: 'kids-access-storage',
    }
  )
);
