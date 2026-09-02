// Workspace composition and snapshot seam for the WebMCP tools.
//
// compose_workspace resolves evidence records to their allowlisted apps and
// drives the EXISTING shells: the desktop window system arranges real
// windows, the mobile shell opens its normal full-screen app. No parallel
// window system, no DOM manipulation.
//
// get_workspace_state returns only the narrow WorkspaceSnapshot below —
// never browser history, tab info, DOM text, unlock state, or unrelated
// store internals — so a human action (opening, closing, focusing an app)
// is visible to the agent without exposing anything else.

import { create } from "zustand";
import { hasMobileOpener, openApp } from "@/lib/app-launcher";
import { APPS } from "@/lib/apps";
import { useDesktopStore } from "@/lib/desktop-store";
import { getEvidenceRecord } from "@/lib/evidence";
import { getVisitIntent, type VisitIntent } from "@/lib/webmcp/visit-intent";

export type WorkspaceLayout = "compare" | "focus" | "grid";

export const WORKSPACE_LAYOUTS: readonly WorkspaceLayout[] = [
  "compare",
  "focus",
  "grid",
];

export type WorkspaceSnapshot = {
  shell: "desktop" | "mobile";
  openAppIds: string[];
  focusedAppId: string | null;
  focusedEvidenceId: string | null;
  composedEvidenceIds: string[];
  visitIntent: VisitIntent | null;
};

// Composition state the agent set up, reported back by get_workspace_state.
// Browser memory only — cleared on reload.
type CompositionState = {
  composedEvidenceIds: string[];
  focusedEvidenceId: string | null;
  setComposition: (ids: string[]) => void;
};

export const useCompositionStore = create<CompositionState>()((set) => ({
  composedEvidenceIds: [],
  focusedEvidenceId: null,
  setComposition: (ids) =>
    set({ composedEvidenceIds: ids, focusedEvidenceId: ids[0] ?? null }),
}));

// The mobile shell registers its active app here (and clears on unmount) so
// the snapshot works without reaching into shell-local React state.
let mobileActiveAppId: string | null = null;
export function setMobileActiveAppId(id: string | null): void {
  mobileActiveAppId = id;
}

// Only launchpad-visible apps may be composed. `root` (puzzle-gated) and any
// unknown id resolve to nothing.
function allowedApp(appId: string): boolean {
  const app = APPS[appId];
  return Boolean(app && app.launchpad);
}

export type ComposeResult = {
  layout: WorkspaceLayout;
  openedAppIds: string[];
  unresolvedEvidenceIds: string[];
  shell: "desktop" | "mobile";
  note?: string;
};

export function composeWorkspace(
  evidenceIds: string[],
  layout: WorkspaceLayout,
): ComposeResult {
  const appIds: string[] = [];
  const unresolved: string[] = [];
  const resolved: string[] = [];

  for (const id of evidenceIds) {
    const record = getEvidenceRecord(id);
    const apps = record
      ? record.artifacts.map((a) => a.appId).filter(allowedApp)
      : [];
    if (!record || apps.length === 0) {
      unresolved.push(id);
      continue;
    }
    resolved.push(id);
    for (const appId of apps) {
      if (!appIds.includes(appId)) appIds.push(appId);
    }
  }

  useCompositionStore.getState().setComposition(resolved);

  if (appIds.length === 0) {
    return {
      layout,
      openedAppIds: [],
      unresolvedEvidenceIds: unresolved,
      shell: hasMobileOpener() ? "mobile" : "desktop",
    };
  }

  if (hasMobileOpener()) {
    // The mobile shell shows one app at a time by design. Open the primary
    // artifact; the rest stay reachable through the normal shell.
    openApp(appIds[0]);
    return {
      layout,
      openedAppIds: [appIds[0]],
      unresolvedEvidenceIds: unresolved,
      shell: "mobile",
      note: "Mobile shell composes one app at a time; the primary artifact was opened.",
    };
  }

  const store = useDesktopStore.getState();
  if (layout === "focus") {
    // Primary window focused; supporting windows open behind it.
    for (const appId of appIds.slice(1)) store.open(appId, { background: true });
    store.open(appIds[0]);
  } else {
    // compare / grid both tile through the existing arranged-open layout.
    store.openManyArranged(appIds);
  }

  return {
    layout,
    openedAppIds: appIds,
    unresolvedEvidenceIds: unresolved,
    shell: "desktop",
  };
}

export function workspaceSnapshot(): WorkspaceSnapshot {
  const composition = useCompositionStore.getState();
  const base = {
    focusedEvidenceId: composition.focusedEvidenceId,
    composedEvidenceIds: composition.composedEvidenceIds,
    visitIntent: getVisitIntent(),
  };

  if (hasMobileOpener()) {
    return {
      shell: "mobile",
      openAppIds: mobileActiveAppId ? [mobileActiveAppId] : [],
      focusedAppId: mobileActiveAppId,
      ...base,
    };
  }

  const s = useDesktopStore.getState();
  const visible = s.wins.filter((w) => !w.minimized).map((w) => w.id);
  const focused =
    s.focusId && visible.includes(s.focusId) ? s.focusId : null;
  return {
    shell: "desktop",
    openAppIds: visible,
    focusedAppId: focused,
    ...base,
  };
}
