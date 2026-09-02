// In-memory log of WebMCP tool invocations, surfaced in the recruiter
// workspace so a visitor can SEE what an agent asked their browser to do.
// Ephemeral by design: not persisted anywhere, capped, cleared on reload.

import { create } from "zustand";

export type ToolActivityEntry = {
  id: number;
  at: string; // ISO timestamp
  tool: string;
  ok: boolean;
  // One-line neutral summary of what happened (never raw input echo beyond
  // a capped preview — pasted role text is untrusted).
  summary: string;
};

const MAX_ENTRIES = 50;
let nextId = 1;

type ActivityStore = {
  entries: ToolActivityEntry[];
  registered: boolean;
  supported: boolean | null;
  log: (tool: string, ok: boolean, summary: string) => void;
  setRegistration: (supported: boolean, registered: boolean) => void;
  clear: () => void;
};

export const useToolActivityStore = create<ActivityStore>()((set) => ({
  entries: [],
  registered: false,
  supported: null,
  log: (tool, ok, summary) =>
    set((s) => ({
      entries: [
        { id: nextId++, at: new Date().toISOString(), tool, ok, summary },
        ...s.entries,
      ].slice(0, MAX_ENTRIES),
    })),
  setRegistration: (supported, registered) => set({ supported, registered }),
  clear: () => set({ entries: [] }),
}));
