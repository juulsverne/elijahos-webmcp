// Right-side widget panel state. Tiny, intentionally separate from
// desktop-store so window-system code never has to think about widgets.
//
// Open/closed persists to localStorage so a returning visitor lands in
// whatever state they left. First-load default is closed — the desktop's
// first impression should be the about window + particles, nothing else.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ELIJAH } from "./elijah";

type WidgetPanelState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

function browserStorage() {
  if (typeof window === "undefined") {
    throw new Error("browser storage is unavailable during server render");
  }
  return window.localStorage;
}

export const useWidgetStore = create<WidgetPanelState>()(
  persist(
    (set) => ({
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: `${ELIJAH.osSlug}:widget-panel`,
      storage: createJSONStorage(browserStorage),
      // Re-hydrate is fine to skip — first paint should match initial state
      // and `isOpen: false` is a safe default if storage is unavailable.
    },
  ),
);
