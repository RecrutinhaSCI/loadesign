import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface UIState {
  theme: Theme;
  sidebarState: SidebarState;
  isMobileSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  isGlobalLoading: boolean;
  activeModal: string | null;
  activePanel: string | null;
  breadcrumbs: BreadcrumbItem[];
  pageTitle: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setGlobalLoading: (loading: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  openPanel: (panelId: string) => void;
  closePanel: () => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setPageTitle: (title: string) => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  theme: 'dark',
  sidebarState: 'expanded',
  isMobileSidebarOpen: false,
  isCommandPaletteOpen: false,
  isGlobalLoading: false,
  activeModal: null,
  activePanel: null,
  breadcrumbs: [],
  pageTitle: 'Dashboard',
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTheme: (theme) => {
        set({ theme });
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      setSidebarState: (sidebarState) =>
        set({ sidebarState }),

      toggleSidebar: () => {
        const current = get().sidebarState;
        set({
          sidebarState: current === 'expanded' ? 'collapsed' : 'expanded',
        });
      },

      setMobileSidebarOpen: (isMobileSidebarOpen) =>
        set({ isMobileSidebarOpen }),

      toggleMobileSidebar: () =>
        set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

      setCommandPaletteOpen: (isCommandPaletteOpen) =>
        set({ isCommandPaletteOpen }),

      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

      setGlobalLoading: (isGlobalLoading) =>
        set({ isGlobalLoading }),

      openModal: (modalId) =>
        set({ activeModal: modalId }),

      closeModal: () =>
        set({ activeModal: null }),

      openPanel: (panelId) =>
        set({ activePanel: panelId }),

      closePanel: () =>
        set({ activePanel: null }),

      setBreadcrumbs: (breadcrumbs) =>
        set({ breadcrumbs }),

      setPageTitle: (pageTitle) =>
        set({ pageTitle }),
    }),
    {
      name: 'loa-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarState: state.sidebarState,
      }),
    }
  )
);

export type { UIStore, Theme, SidebarState, BreadcrumbItem };
