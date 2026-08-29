import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ManageAccessState {
  manageToken: string | null;
  setManageToken: (token: string | null) => void;
  clearManageToken: () => void;
}

// Deliberately sessionStorage, not localStorage like the login tokens: the whole point of
// the management PIN is that it has to be re-entered on a device the kids also use, so it
// must not survive closing the tab. The backend token it holds expires after 30 minutes
// anyway (see backend/src/middlewares/manageAccess.ts).
export const useManageAccessStore = create<ManageAccessState>()(
  persist(
    (set) => ({
      manageToken: null,
      setManageToken: (manageToken) => set({ manageToken }),
      clearManageToken: () => set({ manageToken: null }),
    }),
    {
      name: 'manage-access',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
