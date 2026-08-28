// Desktop / window-system state.
//
// Mirrors the API in design-files/src/window-system.jsx (useDesktop)
// but lifted into a Zustand singleton so the dock, the window host,
// and the windows themselves can subscribe independently without prop
// drilling or context churn.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APPS } from "./apps";
import { ELIJAH } from "./elijah";
import {
  MAX_INSETS,
  TOPBAR_SAFE_Y,
  VIEWPORT_PADDING,
  WINDOW_Z_BASE,
  WINDOW_Z_MAX,
  snapRectFor,
  type SnapKind,
} from "./layout";
import { emit } from "./system-events";
import { sampleAppMount, clearAppSample } from "./track-process-memory";
import { useWidgetStore } from "./widget-store";

export type WinRect = { x: number; y: number; w: number; h: number };

// A translucent overlay shown at the snap target while a window is dragged
// into an edge band. `null` when no snap is armed.
export type SnapHint = { kind: SnapKind; rect: WinRect };

export type WinState = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  // Half-snapped state (Aero left/right). Mutually exclusive with `maximized`:
  // `maximized` is the full-screen rect, `snap` is a left/right half. Both
  // share `prevRect` for restore. Undefined when the window is freely placed.
  snap?: "left" | "right";
  // Pre-snap rect, captured when we enter a managed layout (maximize or half
  // snap) so we can restore exactly where the user had it. Cleared on restore.
  prevRect?: WinRect;
};

type OpenOptions = { background?: boolean };
type ArrangeOptions = { preserveFocus?: boolean };

type DesktopState = {
  wins: WinState[];
  focusId: string | null;
  zCounter: number;

  // Puzzle unlock state. `unlocks` persists to localStorage; `sessionPassword`
  // is held in memory only so the RootApp can re-decrypt the pitch on demand
  // without re-prompting the user during this page session. Updates to
  // `unlocks` are immutable (new Set every time) so subscribers re-render.
  unlocks: Set<string>;
  sessionPassword: string | null;

  open: (id: string, opts?: OpenOptions) => void;
  openMany: (ids: string[]) => void;
  openManyArranged: (ids: string[], opts?: ArrangeOptions) => void;
  close: (id: string) => void;
  minimize: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  setRect: (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts?: { preserveMaximized?: boolean },
  ) => void;
  toggleMaximize: (id: string, viewportW: number, viewportH: number) => void;
  snap: (id: string, kind: SnapKind, viewportW: number, viewportH: number) => void;
  tileOpen: () => void;

  // Transient drag-time snap preview. Not persisted.
  snapHint: SnapHint | null;
  setSnapHint: (hint: SnapHint | null) => void;

  hasUnlock: (id: string) => boolean;
  unlock: (id: string, password?: string) => void;
  clearUnlocks: () => void;
  setSessionPassword: (pw: string | null) => void;

  launchpadOpen: boolean;
  setLaunchpadOpen: (open: boolean) => void;
  toggleLaunchpad: () => void;
};

// Highest per-window z value allowed. Anything above this risks stacking
// over the widget panel. When zCounter would cross it, we renormalize.
const Z_CEILING = WINDOW_Z_MAX - WINDOW_Z_BASE;
const OPEN_CASCADE_OFFSET = 28;
const OPEN_CASCADE_ATTEMPTS = 16;

// SSR-safe storage factory for the persist middleware. In the browser we
// persist to localStorage (unchanged). On the server / in node tests there is
// no window, so we hand back an in-memory no-op store instead of throwing —
// this lets the module (and anything that imports it, e.g. the client tool
// executor) load cleanly outside the browser. Nothing is actually persisted
// server-side, which is correct: persisted state (`unlocks`) is per-browser.
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function browserStorage(): Storage {
  if (typeof window === "undefined") return memoryStorage();
  return window.localStorage;
}

function fitRectToViewport(rect: WinRect): WinRect {
  if (typeof window === "undefined") return rect;

  const maxW = Math.max(1, window.innerWidth - VIEWPORT_PADDING * 2);
  const maxH = Math.max(1, window.innerHeight - TOPBAR_SAFE_Y - MAX_INSETS.bottom);
  const w = Math.min(rect.w, maxW);
  const h = Math.min(rect.h, maxH);
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - w - VIEWPORT_PADDING);
  const maxY = Math.max(TOPBAR_SAFE_Y, window.innerHeight - h - VIEWPORT_PADDING);

  return {
    x: Math.min(Math.max(rect.x, VIEWPORT_PADDING), maxX),
    y: Math.min(Math.max(rect.y, TOPBAR_SAFE_Y), maxY),
    w,
    h,
  };
}

function launchOriginsOverlap(a: WinRect, b: WinRect): boolean {
  return (
    Math.abs(a.x - b.x) < OPEN_CASCADE_OFFSET &&
    Math.abs(a.y - b.y) < OPEN_CASCADE_OFFSET
  );
}

function openingRectFor(defaultRect: WinRect, wins: WinState[]): WinRect {
  let rect = fitRectToViewport(defaultRect);
  const blockers = wins.filter((win) => !win.minimized);
  if (blockers.length === 0) return rect;

  for (let attempt = 0; attempt < OPEN_CASCADE_ATTEMPTS; attempt += 1) {
    if (!blockers.some((win) => launchOriginsOverlap(rect, win))) return rect;

    const offset = OPEN_CASCADE_OFFSET * (attempt + 1);
    rect = fitRectToViewport({
      ...defaultRect,
      x: defaultRect.x + offset,
      y: defaultRect.y + offset,
    });
  }

  return rect;
}

// Renormalize win.z values to 1..N (preserving stacking order) so the
// counter has headroom again. Used when an action would otherwise push
// the next z above the panel ceiling.
function renormalize(wins: WinState[]): { wins: WinState[]; counter: number } {
  if (wins.length === 0) return { wins, counter: 0 };
  const sorted = [...wins].sort((a, b) => a.z - b.z);
  const rank = new Map<string, number>();
  sorted.forEach((w, i) => rank.set(w.id, i + 1));
  return {
    wins: wins.map((w) => ({ ...w, z: rank.get(w.id) ?? w.z })),
    counter: sorted.length,
  };
}

function arrangedRectsFor(ids: string[]): Record<string, WinRect> {
  const rects: Record<string, WinRect> = {};
  if (typeof window === "undefined") {
    ids.forEach((id) => {
      const app = APPS[id];
      if (app) rects[id] = app.defaultRect;
    });
    return rects;
  }

  const validIds = ids.filter((id) => APPS[id]);
  const count = validIds.length;
  if (count === 0) return rects;

  const gap = 14;
  const left = MAX_INSETS.left;
  const top = MAX_INSETS.top;
  const usableW = Math.max(320, window.innerWidth - MAX_INSETS.left - MAX_INSETS.right);
  const usableH = Math.max(220, window.innerHeight - MAX_INSETS.top - MAX_INSETS.bottom);
  const cols = usableW >= 1120 ? Math.min(3, count) : usableW >= 760 ? Math.min(2, count) : 1;
  const rows = Math.ceil(count / cols);
  const cellW = (usableW - gap * (cols - 1)) / cols;
  const cellH = (usableH - gap * (rows - 1)) / rows;

  validIds.forEach((id, index) => {
    const app = APPS[id];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const maxW = Math.max(1, cellW);
    const maxH = Math.max(1, cellH);
    const w = Math.round(Math.min(app.defaultRect.w, maxW));
    const h = Math.round(Math.min(app.defaultRect.h, maxH));
    const x = Math.round(left + col * (cellW + gap) + Math.max(0, (cellW - w) / 2));
    const y = Math.round(top + row * (cellH + gap) + Math.max(0, (cellH - h) / 2));

    rects[id] = fitRectToViewport({ x, y, w, h });
  });

  return rects;
}

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      wins: [],
      focusId: null,
      zCounter: 0,
      unlocks: new Set<string>(),
      sessionPassword: null,
      launchpadOpen: false,
      snapHint: null,

  // Closing the launchpad on app launch is handled here once, rather than at
  // every callsite. Both branches (restore existing, open new) clear it.
  open: (id, opts) =>
    set((s) => {
      const app = APPS[id];
      if (!app) return s;
      const preserveFocusId = opts?.background ? s.focusId : null;
      const zBudget = preserveFocusId && preserveFocusId !== id ? 2 : 1;
      const base = s.zCounter + zBudget > Z_CEILING ? renormalize(s.wins) : { wins: s.wins, counter: s.zCounter };
      const nextZ = base.counter + 1;
      const existing = base.wins.find((w) => w.id === id);
      if (existing) {
        emit("INFO", `${app.title} restored`);
        let wins = base.wins.map((w) =>
          w.id === id ? { ...w, z: nextZ, minimized: false } : w,
        );
        let focusId = id;
        let zCounter = nextZ;

        if (preserveFocusId && preserveFocusId !== id && wins.some((w) => w.id === preserveFocusId)) {
          zCounter += 1;
          focusId = preserveFocusId;
          wins = wins.map((w) =>
            w.id === preserveFocusId ? { ...w, z: zCounter, minimized: false } : w,
          );
        }

        return {
          wins,
          focusId,
          zCounter,
          launchpadOpen: false,
        };
      }
      emit("INFO", `${app.title} opened`);
      // Sample heap delta for this new mount (fire-and-forget).
      void sampleAppMount(id);
      const nextWin: WinState = {
        id,
        ...openingRectFor(app.defaultRect, base.wins),
        z: nextZ,
        minimized: false,
        maximized: false,
      };
      let wins = [...base.wins, nextWin];
      let focusId = id;
      let zCounter = nextZ;

      if (preserveFocusId && wins.some((w) => w.id === preserveFocusId)) {
        zCounter += 1;
        focusId = preserveFocusId;
        wins = wins.map((w) =>
          w.id === preserveFocusId ? { ...w, z: zCounter, minimized: false } : w,
        );
      }

      return {
        wins,
        focusId,
        zCounter,
        launchpadOpen: false,
      };
    }),

  // Bulk-open without re-focusing each one — focus lands on the last id.
  openMany: (ids) =>
    set((s) => {
      const base = s.zCounter + ids.length > Z_CEILING ? renormalize(s.wins) : { wins: s.wins, counter: s.zCounter };
      let z = base.counter;
      const wins = [...base.wins];
      const openedIds: string[] = [];
      for (const id of ids) {
        const app = APPS[id];
        if (!app) continue;
        z += 1;
        openedIds.push(id);
        const idx = wins.findIndex((w) => w.id === id);
        if (idx >= 0) {
          wins[idx] = { ...wins[idx], z, minimized: false };
        } else {
          wins.push({
            id,
            ...openingRectFor(app.defaultRect, wins),
            z,
            minimized: false,
            maximized: false,
          });
          emit("INFO", `${app.title} opened`);
          void sampleAppMount(id);
        }
      }
      return {
        wins,
        focusId: openedIds.length ? openedIds[openedIds.length - 1] : s.focusId,
        zCounter: z,
      };
    }),

  openManyArranged: (ids, opts) =>
    set((s) => {
      const rects = arrangedRectsFor(ids);
      const preserveFocusId = opts?.preserveFocus ? s.focusId : null;
      const zBudget = ids.length + (preserveFocusId ? 1 : 0);
      const base = s.zCounter + zBudget > Z_CEILING ? renormalize(s.wins) : { wins: s.wins, counter: s.zCounter };
      let z = base.counter;
      const wins = [...base.wins];
      const openedIds: string[] = [];

      for (const id of ids) {
        const app = APPS[id];
        const rect = rects[id];
        if (!app || !rect) continue;

        z += 1;
        openedIds.push(id);
        const idx = wins.findIndex((w) => w.id === id);
        const nextWin = {
          id,
          ...rect,
          z,
          minimized: false,
          maximized: false,
          snap: undefined,
          prevRect: undefined,
        };

        if (idx >= 0) {
          wins[idx] = { ...wins[idx], ...nextWin };
        } else {
          wins.push(nextWin);
          emit("INFO", `${app.title} opened`);
          void sampleAppMount(id);
        }
      }

      if (preserveFocusId && wins.some((w) => w.id === preserveFocusId)) {
        z += 1;
        return {
          wins: wins.map((w) =>
            w.id === preserveFocusId ? { ...w, z, minimized: false } : w,
          ),
          focusId: preserveFocusId,
          zCounter: z,
        };
      }

      return {
        wins,
        focusId: openedIds.length ? openedIds[openedIds.length - 1] : s.focusId,
        zCounter: z,
      };
    }),

  // Re-tile the currently open (non-minimized) windows into the same grid
  // `openManyArranged` uses — without opening anything new or disturbing
  // minimized windows. Sorting by z before layout preserves stacking order,
  // so the frontmost window keeps reading as frontmost after the tidy.
  tileOpen: () =>
    set((s) => {
      const visible = s.wins.filter((w) => !w.minimized);
      if (visible.length === 0) return s;
      const ids = [...visible].sort((a, b) => a.z - b.z).map((w) => w.id);
      const rects = arrangedRectsFor(ids);
      return {
        wins: s.wins.map((w) => {
          const rect = rects[w.id];
          return rect
            ? { ...w, ...rect, maximized: false, snap: undefined, prevRect: undefined }
            : w;
        }),
      };
    }),

  close: (id) =>
    set((s) => {
      const app = APPS[id];
      if (app) emit("INFO", `${app.title} closed`);
      clearAppSample(id);
      const wins = s.wins.filter((w) => w.id !== id);
      const nextFocus =
        s.focusId === id
          ? wins.reduce<WinState | null>(
              (top, win) => (!top || win.z > top.z ? win : top),
              null,
            )?.id ?? null
          : s.focusId;
      return {
        wins,
        focusId: nextFocus,
      };
    }),

  minimize: (id) =>
    set((s) => {
      const wins = s.wins.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      );
      const nextFocus =
        s.focusId === id
          ? wins
              .filter((w) => !w.minimized)
              .reduce<WinState | null>(
                (top, win) => (!top || win.z > top.z ? win : top),
                null,
              )?.id ?? null
          : s.focusId;
      return { wins, focusId: nextFocus };
    }),

  focus: (id) =>
    set((s) => {
      if (!s.wins.some((w) => w.id === id)) return s;
      const base = s.zCounter + 1 > Z_CEILING ? renormalize(s.wins) : { wins: s.wins, counter: s.zCounter };
      const nextZ = base.counter + 1;
      return {
        wins: base.wins.map((w) =>
          w.id === id ? { ...w, z: nextZ, minimized: false } : w,
        ),
        focusId: id,
        zCounter: nextZ,
      };
    }),

  move: (id, x, y) =>
    set((s) => ({
      wins: s.wins.map((w) =>
        w.id === id
          ? { ...w, x, y, maximized: false, snap: undefined, prevRect: undefined }
          : w,
      ),
    })),

  setRect: (id, x, y, w, h, opts) =>
    set((s) => ({
      wins: s.wins.map((win) =>
        win.id === id
          ? {
              ...win,
              x,
              y,
              w,
              h,
              ...(opts?.preserveMaximized
                ? {}
                : { maximized: false, snap: undefined, prevRect: undefined }),
            }
          : win,
      ),
    })),

  toggleMaximize: (id, viewportW, viewportH) =>
    set((s) => ({
      wins: s.wins.map((win) => {
        if (win.id !== id) return win;
        // Toggle: any managed layout (maximized or half-snapped) restores to
        // the captured free rect; an unmanaged window maximizes.
        if ((win.maximized || win.snap) && win.prevRect) {
          return {
            ...win,
            x: win.prevRect.x,
            y: win.prevRect.y,
            w: win.prevRect.w,
            h: win.prevRect.h,
            maximized: false,
            snap: undefined,
            prevRect: undefined,
          };
        }
        // Maximize: stash current rect, expand to the maximize rect (which
        // accounts for the widget panel when it's open).
        const panelOpen = useWidgetStore.getState().isOpen;
        const rect = snapRectFor("max", viewportW, viewportH, panelOpen);
        return {
          ...win,
          prevRect: { x: win.x, y: win.y, w: win.w, h: win.h },
          ...rect,
          maximized: true,
          snap: undefined,
        };
      }),
    })),

  // Aero edge snap: drop the window onto a left/right half or the full
  // maximize rect. Shares `prevRect` with maximize so the green button and
  // a drag-away both restore the pre-snap geometry. When re-snapping an
  // already-managed window, keep the original `prevRect` (the free rect),
  // not the intermediate snapped one.
  snap: (id, kind, viewportW, viewportH) =>
    set((s) => ({
      wins: s.wins.map((win) => {
        if (win.id !== id) return win;
        const panelOpen = useWidgetStore.getState().isOpen;
        const rect = snapRectFor(kind, viewportW, viewportH, panelOpen);
        const prevRect =
          (win.maximized || win.snap) && win.prevRect
            ? win.prevRect
            : { x: win.x, y: win.y, w: win.w, h: win.h };
        return {
          ...win,
          ...rect,
          maximized: kind === "max",
          snap: kind === "max" ? undefined : kind,
          prevRect,
        };
      }),
    })),

  setSnapHint: (hint) => set({ snapHint: hint }),

      hasUnlock: (id) => get().unlocks.has(id),

      unlock: (id, password) =>
        // Immutable Set update: brand-new Set instance every time, so any
        // component that selects `unlocks` (or derives from it) re-renders.
        // The previous `s.unlocks.add(id)` pattern would mutate the existing
        // reference and skip re-renders — the `window.__elijah.unlock()`
        // DevTools path depends on this propagating instantly.
        set((s) => ({
          unlocks: new Set([...s.unlocks, id]),
          sessionPassword: password ?? s.sessionPassword,
        })),

      clearUnlocks: () =>
        set({ unlocks: new Set<string>(), sessionPassword: null }),

      setSessionPassword: (pw) => set({ sessionPassword: pw }),

      setLaunchpadOpen: (open) => set({ launchpadOpen: open }),
      toggleLaunchpad: () => set((s) => ({ launchpadOpen: !s.launchpadOpen })),
    }),
    {
      name: `${ELIJAH.osSlug}:desktop`,
      storage: createJSONStorage(browserStorage),
      // Only persist unlocks. Window positions, focus, z-index, and the
      // session password are intentionally session-scoped.
      partialize: (s) => ({ unlocks: [...s.unlocks] }),
      // Round-trip the Set: persisted as Array, rehydrated as Set.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { unlocks?: string[] } | undefined;
        const unlocksArr = Array.isArray(persisted?.unlocks) ? persisted.unlocks : [];
        return {
          ...currentState,
          unlocks: new Set<string>(unlocksArr),
        };
      },
    },
  ),
);
