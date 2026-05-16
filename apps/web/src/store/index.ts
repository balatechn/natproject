import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        sidebarCollapsed: false,
        commandPaletteOpen: false,
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        toggleCommandPalette: () =>
          set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      }),
      { name: 'nat-ui-store', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
    ),
    { name: 'UIStore' },
  ),
);

interface AuthState {
  user: { id: string; name: string; email: string; role: string } | null;
  accessToken: string | null;
  setAuth: (user: AuthState['user'], token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        setAuth: (user, accessToken) => set({ user, accessToken }),
        clearAuth: () => set({ user: null, accessToken: null }),
      }),
      { name: 'nat-auth-store', partialize: (s) => ({ user: s.user }) },
    ),
    { name: 'AuthStore' },
  ),
);
