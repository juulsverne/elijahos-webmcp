"use client";

import { useMemo } from "react";
import { APPS, MOBILE_DOCK_ORDER, LAUNCHPAD_ICON } from "@/lib/apps";
import { APP_COMPONENTS } from "@/components/apps/registry";
import { originFromTrigger, type AppOrigin } from "@/lib/app-launcher";
import { UI_COPY } from "@/lib/ui-copy";

type Accent = "pink" | "blue" | "gold" | "violet";

type Props = {
  // Same callback the home grid uses — the dock is just a second route to
  // open an app, not a separate state machine. Passes the tapped icon's center
  // so the app expands from the dock icon, same as the home tiles.
  onOpen: (id: string, origin?: AppOrigin) => void;
  // Opens the full-screen "all apps" drawer. The trailing dock button is a
  // launcher control, not an app, so it gets its own callback.
  onOpenDrawer: () => void;
  // Accent lookup is owned by MobileShell so both grid tiles and dock buttons
  // for the same app render the same accent. Passed in instead of duplicating
  // the map here.
  accents: Record<string, Accent>;
};

// iOS-inspired bottom dock. Locks 4 primary apps at the bottom of the home
// screen; sits above the home indicator and never scrolls. Buttons share the
// home tiles' icon + label anatomy so it's always clear what each one opens
// (the same apps also live on the home grid).
export function MobileDock({ onOpen, onOpenDrawer, accents }: Props) {
  const ids = useMemo(
    () =>
      MOBILE_DOCK_ORDER.filter((id) => {
        const app = APPS[id];
        if (!app) return false;
        if (app.desktopOnly) return false;
        return Boolean(APP_COMPONENTS[id]);
      }),
    [],
  );

  return (
    <nav className="mobile-dock" aria-label={UI_COPY.chrome.mobile.primaryApps}>
      {ids.map((id) => {
        const app = APPS[id];
        if (!app) return null;
        return (
          <button
            key={id}
            type="button"
            className="mobile-dock-btn"
            data-accent={accents[id] ?? "violet"}
            onClick={(e) => onOpen(id, originFromTrigger(e.currentTarget))}
            aria-label={UI_COPY.chrome.mobile.openApp(app.title)}
          >
            <span className="mobile-dock-icon" aria-hidden="true">
              {app.icon}
            </span>
            <span className="mobile-dock-label">
              {app.mobileLabel ?? app.id}
            </span>
          </button>
        );
      })}

      {/* Trailing launcher control — opens the full-screen "all apps" drawer.
          Pinned last so it reads as the phone's app-drawer affordance, the grid
          glyph echoing the desktop launcher's icon. */}
      <button
        type="button"
        className="mobile-dock-btn"
        data-apps-btn="true"
        data-accent="violet"
        onClick={onOpenDrawer}
        aria-label={UI_COPY.chrome.launchpad.open}
      >
        <span className="mobile-dock-icon" aria-hidden="true">
          {LAUNCHPAD_ICON}
        </span>
        <span className="mobile-dock-label">{UI_COPY.chrome.mobile.apps}</span>
      </button>
    </nav>
  );
}
