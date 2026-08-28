"use client";

// Tracks document visibility (tab shown/hidden) with useSyncExternalStore —
// same idiom as use-reduced-motion.ts: visibilitychange is an external store,
// so this reads it without a setState-in-effect. Returns true on the server.
// Used to pause sampling/polling loops (e.g. the mobile Pulse card's FPS
// meter) while the tab is backgrounded — a rAF loop that only ticks when the
// tab is foregrounded anyway shouldn't keep its interval alive in the dark.

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

function getServerSnapshot(): boolean {
  return true;
}

export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
