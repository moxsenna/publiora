// Workspace + UI stores.
// URL ?step= is the source of truth for workflow navigation (not zustand).

import { create } from "zustand";

interface ProjectState {
  activeProjectId: string | null;
  /** Track the currently selected section ID within SectionsPanel. */
  selectedSectionId: string | null;
  setActiveProject: (id: string | null) => void;
  setSelectedSectionId: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  selectedSectionId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
  setSelectedSectionId: (id) => set({ selectedSectionId: id }),
}));

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: "default" | "success" | "danger";
}

interface UiState {
  /** Desktop sidebar expanded width. */
  sidebarOpen: boolean;
  /** Mobile overlay drawer. */
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  setMobileNav: (open: boolean) => void;
  toggleMobileNav: () => void;
  toasts: ToastItem[];
  pushToast: (t: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  mobileNavOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  setMobileNav: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  toasts: [],
  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 4000);
    return id;
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
