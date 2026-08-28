import { useDesktopStore } from "@/lib/desktop-store";

// Shell-agnostic "open another app" indirection.
//
// An app's in-content CTA (About's "See projects", Projects' "Open case
// study") shouldn't care which shell is mounted. The desktop renders apps as
// windows driven by `useDesktopStore`; the mobile shell renders one full-screen
// app at a time from its own local state. A button that called the desktop
// store directly was a dead control on mobile — it mutated window state nothing
// on the phone ever renders.
//
// The desktop window system is the default opener. The mobile shell registers
// its own opener on mount (and clears it on unmount), so `openApp` routes to
// whichever surface is live.

// Viewport-space anchor an app should appear to expand FROM on the mobile
// shell. x/y is the center of the tapped icon (kept as the transform-origin
// fallback); w/h is the icon's rendered rect when known, which lets the app
// frame morph from the actual icon rectangle instead of a point. Optional —
// in-app CTAs open without one and the frame falls back to a center scale.
export type AppOrigin = { x: number; y: number; w?: number; h?: number };

let mobileOpener: ((id: string, origin?: AppOrigin) => void) | null = null;

export function setMobileOpener(
  fn: ((id: string, origin?: AppOrigin) => void) | null,
): void {
  mobileOpener = fn;
}

export function openApp(id: string, origin?: AppOrigin): void {
  if (mobileOpener) {
    mobileOpener(id, origin);
    return;
  }
  useDesktopStore.getState().open(id);
}

export function openAppInBackground(id: string): void {
  if (mobileOpener) {
    mobileOpener(id);
    return;
  }
  useDesktopStore.getState().open(id, { background: true });
}

// True when the mobile shell is mounted (it registered an opener). Callers use
// this to branch desktop-vs-mobile behavior without reaching into shell state.
export function hasMobileOpener(): boolean {
  return mobileOpener !== null;
}

// Rect of the icon cell inside a tapped tile/dock button, in viewport coords.
// Drives the app open/close morph so the full-screen frame appears to grow
// out of (and collapse back into) the icon.
export function originFromTrigger(el: HTMLElement): AppOrigin {
  const icon = el.querySelector(".mobile-tile-icon, .mobile-dock-icon") ?? el;
  const r = icon.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    w: r.width,
    h: r.height,
  };
}
