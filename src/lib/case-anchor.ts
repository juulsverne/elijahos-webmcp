// Pending scroll target for the case-study window.
//
// compose_workspace resolves evidence records whose artifacts name a
// case-study section (anchorId); the case app consumes the request on
// mount or change and scrolls that section into view. One-shot: consumed
// then cleared, so later human scrolling is never fought by stale state.

import { create } from "zustand";

type CaseAnchorState = {
  anchorId: string | null;
  request: (anchorId: string) => void;
  clear: () => void;
};

export const useCaseAnchorStore = create<CaseAnchorState>()((set) => ({
  anchorId: null,
  request: (anchorId) => set({ anchorId }),
  clear: () => set({ anchorId: null }),
}));
