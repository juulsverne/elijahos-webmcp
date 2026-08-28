"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Boot } from "@/components/Boot";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDesktopStore } from "@/lib/desktop-store";
import { APPS, INITIAL_OPEN } from "@/lib/apps";
import { ELIJAH } from "@/lib/elijah";
import { emit } from "@/lib/system-events";
import { useIsMobile } from "@/lib/use-is-mobile";
import { preloadAppComponent } from "@/components/apps/registry";

type Phase = "boot" | "desktop";

const loadDesktopContextMenu = () =>
  import("@/components/DesktopContextMenu").then((m) => m.DesktopContextMenu);
const loadDock = () => import("@/components/Dock").then((m) => m.Dock);
const loadParticleField = () =>
  import("@/components/ParticleField").then((m) => m.ParticleField);
const loadTopbar = () => import("@/components/Topbar").then((m) => m.Topbar);
const loadWidgetPanel = () =>
  import("@/components/widgets/WidgetPanel").then((m) => m.WidgetPanel);
const loadWindowHost = () =>
  import("@/components/WindowHost").then((m) => m.WindowHost);
const loadLaunchpad = () =>
  import("@/components/Launchpad").then((m) => m.Launchpad);
const loadMobileShell = () =>
  import("@/components/mobile/MobileShell").then((m) => m.MobileShell);

const DesktopContextMenu = dynamic(
  loadDesktopContextMenu,
  { ssr: false },
);
const Dock = dynamic(loadDock, {
  ssr: false,
});
const ParticleField = dynamic(loadParticleField, { ssr: false });
const Topbar = dynamic(loadTopbar, {
  ssr: false,
});
const WidgetPanel = dynamic(loadWidgetPanel, { ssr: false });
const WindowHost = dynamic(loadWindowHost, { ssr: false });
const Launchpad = dynamic(loadLaunchpad, { ssr: false });
const MobileShell = dynamic(loadMobileShell, { ssr: false });

function getDeepLinkedAppId(): string | null {
  const requested = new URLSearchParams(window.location.search).get("app");
  if (!requested || requested === "root" || !APPS[requested]) return null;
  return requested;
}

async function preloadDesktopShell(ids: string[]) {
  void loadParticleField();
  void loadWidgetPanel();
  await Promise.all([
    loadDesktopContextMenu(),
    loadDock(),
    loadTopbar(),
    loadWindowHost(),
    loadLaunchpad(),
    ...ids.map((id) => preloadAppComponent(id)),
  ]);
}

async function preloadMobileShell(id: string | null) {
  await Promise.all([
    loadMobileShell(),
    ...(id ? [preloadAppComponent(id)] : []),
  ]);
}

export function ElijahOS() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [preparedShell, setPreparedShell] = useState<boolean | null>(null);
  const openMany = useDesktopStore((s) => s.openMany);
  const desktopBootedRef = useRef(false);
  // `null` until the first client paint so we render the desktop tree as the
  // SSR/hydrate baseline. The boot animation covers the brief moment between
  // hydrate and the media query resolving, so the user never sees the desktop
  // tree flash on a phone.
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile == null) return;
    let cancelled = false;
    const deepLink = getDeepLinkedAppId();
    const preload = isMobile
      ? preloadMobileShell(deepLink)
      : preloadDesktopShell([...INITIAL_OPEN, ...(deepLink ? [deepLink] : [])]);

    preload
      .catch((err) => {
        emit("WARN", `startup preload: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => {
        if (!cancelled) setPreparedShell(isMobile);
      });

    return () => {
      cancelled = true;
    };
  }, [isMobile]);

  const shellReady = isMobile !== null && preparedShell === isMobile;

  // Spawn the initial window set every time we enter the desktop with none
  // open once the desktop shell is prepared. The boot overlay may still be
  // visible at this point; that is deliberate so first windows can settle
  // before the handoff.
  useEffect(() => {
    if (!shellReady || isMobile !== false) return;
    if (!desktopBootedRef.current) {
      emit("BOOT", ELIJAH.bootReadyMessage);
      desktopBootedRef.current = true;
    }
    if (useDesktopStore.getState().wins.length === 0) {
      // Deep link: `?app=<id>` boots straight into that app's window (focused
      // last) on top of the default set — used to link a LinkedIn post at a
      // specific app drop. `root` stays gated behind the /zsh puzzle.
      const requested = getDeepLinkedAppId();
      const deepLink = requested ? [requested] : [];
      openMany([...INITIAL_OPEN, ...deepLink]);
    }
  }, [shellReady, isMobile, openMany]);

  // Reboot easter egg — Cmd+Alt+R (Mac) / Ctrl+Alt+R (Win/Linux).
  // Also triggered by typing `reboot` in the terminal app (step 8).
  // We don't bind plain Cmd/Ctrl+R because that's the browser's reload.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setPhase("boot");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canMountPreparedShell = phase === "desktop" || shellReady;
  const showDesktopChrome = canMountPreparedShell && isMobile === false;
  const showMobileShell = canMountPreparedShell && isMobile === true;

  return (
    <main className="lc-root" data-phase={phase}>
      <div className="lc-bg" />
      <div className="lc-iridescent" />
      {/* ParticleField uses pointer/drag interactions that aren't designed
          for touch; mounting it on mobile would also burn battery for no
          payoff. Background gradient + iridescence + grain are enough.
          Wrapped in an ErrorBoundary so a WebGL failure on an unsupported GPU
          degrades to the static background instead of crashing the desktop. */}
      {showDesktopChrome && (
        <ErrorBoundary fallback={null}>
          <ParticleField />
        </ErrorBoundary>
      )}
      <div className="lc-grain" />

      {showDesktopChrome && (
        <>
          <WindowHost />
          <WidgetPanel />
          <Topbar />
          <Dock />
          <Launchpad />
          <DesktopContextMenu />
        </>
      )}

      {showMobileShell && <MobileShell />}

      {phase === "boot" && (
        <Boot ready={shellReady} onDone={() => setPhase("desktop")} />
      )}
    </main>
  );
}
