"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { setMobileOpener, type AppOrigin } from "@/lib/app-launcher";
import { setMobileActiveAppId } from "@/lib/webmcp/workspace";
import { APPS, LAUNCHPAD_ORDER } from "@/lib/apps";
import { MOBILE_APP_EXIT_MS } from "@/lib/layout";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { APP_COMPONENTS } from "@/components/apps/registry";
import { MobileAppFrame } from "./MobileAppFrame";
import { MobileEnvironment } from "./MobileEnvironment";
import { MobileAppLauncher } from "./MobileAppLauncher";
import { MobileDock } from "./MobileDock";
import { MobileMasthead } from "./MobileMasthead";
import { MobileWidgets } from "./MobileWidgets";
import { ViewportDebug, isViewportDebugEnabled } from "./ViewportDebug";

// Deterministic tile accent per app id. Shared by the grid tiles AND the
// bottom dock so the same app reads the same accent in either surface.
// Kept local to the mobile shell — the desktop window system has no concept
// of per-app accent so this isn't worth promoting into apps.ts.
const TILE_ACCENT: Record<string, "pink" | "blue" | "gold" | "violet"> = {
  about: "violet",
  projects: "blue",
  case: "pink",
  resume: "gold",
  contact: "blue",
  ask: "pink",
  calculator: "gold",
  clock: "violet",
  snake: "blue",
  zsh: "pink",
  changelog: "gold",
};

// Must match the .mobile-launcher.is-closing fade-out duration in mobile.css.
const DRAWER_EXIT_MS = 180;

function getInitialMobileAppId(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("app");
  if (!id) return null;
  const app = APPS[id];
  if (!app || id === "root" || app.desktopOnly || !APP_COMPONENTS[id]) {
    return null;
  }
  return id;
}

export function MobileShell() {
  // Publishes --kb-inset / data-keyboard on the shell root while the phone's
  // on-screen keyboard is up. One publisher for every surface: the home
  // column and the app frame both inherit the custom property from here.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useKeyboardInset(rootRef);

  const [activeId, setActiveId] = useState<string | null>(
    () => getInitialMobileAppId(),
  );
  // Mirror the active app into the WebMCP workspace seam so
  // get_workspace_state can report it without reaching into shell state.
  useEffect(() => {
    setMobileActiveAppId(activeId);
    return () => setMobileActiveAppId(null);
  }, [activeId]);
  // Point the app expands from / collapses back into (the tapped icon).
  const [origin, setOrigin] = useState<AppOrigin | null>(null);
  const [closing, setClosing] = useState(false);
  // How the close was triggered — the home button collapses the frame back
  // into its icon, the edge swipe slides it out to the right instead.
  const [closeVia, setCloseVia] = useState<"home" | "swipe">("home");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "All apps" drawer — opened from the dock. Mounted while open or animating
  // closed; `drawerClosing` drives the exit fade before unmount.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const drawerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Opt-in viewport diagnostics (`?debugViewport=1`) — read once at mount so
  // it can't toggle mid-session. Off (and not rendered) for every normal load.
  const [debugViewport] = useState(isViewportDebugEnabled);

  const openApp = useCallback((id: string, from?: AppOrigin) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOrigin(from ?? null);
    setClosing(false);
    setActiveId(id);
  }, []);

  // Play the exit animation (collapse for the home button, slide-out for the
  // edge swipe — both APP_EXIT_MS long), then unmount the frame.
  const closeApp = useCallback((via: "home" | "swipe" = "home") => {
    setCloseVia(via);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setActiveId(null);
      setClosing(false);
      closeTimer.current = null;
    }, MOBILE_APP_EXIT_MS);
  }, []);

  const openDrawer = useCallback(() => {
    if (drawerTimer.current) {
      clearTimeout(drawerTimer.current);
      drawerTimer.current = null;
    }
    setDrawerClosing(false);
    setDrawerOpen(true);
  }, []);

  // Animated dismiss (back pill / Escape). Keeps the drawer mounted for the
  // fade-out, then unmounts.
  const closeDrawer = useCallback(() => {
    setDrawerClosing(true);
    drawerTimer.current = setTimeout(() => {
      setDrawerOpen(false);
      setDrawerClosing(false);
      drawerTimer.current = null;
    }, DRAWER_EXIT_MS);
  }, []);

  // Opening an app from the drawer: launch the app frame (which expands over
  // everything) and drop the drawer instantly — no exit fade, since the frame
  // already covers it and a double animation would read as jank.
  const openFromDrawer = useCallback(
    (id: string, from?: AppOrigin) => {
      openApp(id, from);
      if (drawerTimer.current) {
        clearTimeout(drawerTimer.current);
        drawerTimer.current = null;
      }
      setDrawerOpen(false);
      setDrawerClosing(false);
    },
    [openApp],
  );

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (drawerTimer.current) clearTimeout(drawerTimer.current);
    },
    [],
  );

  // Route in-app navigation CTAs (About's "See projects", Projects' "Open case
  // study") to the mobile full-screen frame instead of the desktop window
  // store, which the phone never renders. Cleared on unmount so the desktop
  // shell falls back to its window system. Only apps that exist on mobile (have
  // a component, not desktop-only) are reachable this way — same set the home
  // grid and dock already expose.
  useEffect(() => {
    setMobileOpener(openApp);
    return () => setMobileOpener(null);
  }, [openApp]);

  // Every app reachable on the phone, in launchpad order, filtered to apps that:
  //   - have a registered component (no blank frames),
  //   - aren't desktop-only (terminal puzzle, root easter-egg).
  // The home screen no longer shows a grid, so this is now the drawer's list
  // alone — the ▦ dock button is the only way to the full set, which is why it
  // stays exhaustive (dock apps included).
  const tileIds = LAUNCHPAD_ORDER.filter((id) => {
    const app = APPS[id];
    if (!app) return false;
    if (app.desktopOnly) return false;
    return Boolean(APP_COMPONENTS[id]);
  });

  const activeApp = activeId ? APPS[activeId] : null;
  const ActiveBody = activeId ? APP_COMPONENTS[activeId] : null;

  // Liquid Depth: the home plane recedes while an app or the drawer sits
  // above it, and comes forward again the moment either starts closing.
  const recessed =
    (activeId !== null && !closing) || (drawerOpen && !drawerClosing);

  // The environment's accent = the opening/open app's accent; null while
  // closing so the wash fades out in step with the collapse. Unknown app
  // ids fall back to neutral (no attribute → no wash) — never throw.
  const envAccent =
    activeId !== null && !closing ? (TILE_ACCENT[activeId] ?? null) : null;

  return (
    <div
      ref={rootRef}
      className="mobile-root"
      data-env-accent={envAccent ?? undefined}
    >
      <MobileEnvironment />
      <div className={`mobile-home${recessed ? " is-recessed" : ""}`}>
        {/* The home screen is a status console, not an app grid: greeting,
            widgets, and dock. Every app lives behind ▦ in the dock, so
            nothing here competes with the widgets for vertical space. */}
        <div className="mobile-home-scroll">
          <MobileMasthead />
          <MobileWidgets active={!activeId && !drawerOpen} onOpen={openApp} />
        </div>

        <MobileDock
          onOpen={openApp}
          onOpenDrawer={openDrawer}
          accents={TILE_ACCENT}
        />

        {/* Dims the receded plane — a separate overlay (not filter:
            brightness) so only opacity composites. */}
        <span className="mobile-home-dim" aria-hidden="true" />
      </div>

      {drawerOpen && (
        <MobileAppLauncher
          ids={tileIds}
          accents={TILE_ACCENT}
          onOpen={openFromDrawer}
          onClose={closeDrawer}
          closing={drawerClosing}
        />
      )}

      {activeApp && ActiveBody && (
        <MobileAppFrame
          key={activeApp.id}
          app={activeApp}
          Body={ActiveBody}
          accent={TILE_ACCENT[activeApp.id] ?? "violet"}
          onBack={closeApp}
          origin={origin}
          closing={closing}
          closingVia={closeVia}
        />
      )}

      {debugViewport && <ViewportDebug />}
    </div>
  );
}
