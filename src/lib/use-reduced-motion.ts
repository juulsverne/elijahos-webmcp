"use client";

// Tracks the OS "reduce motion" accessibility preference. Implemented with
// useSyncExternalStore — matchMedia is an external store, so this is the
// idiomatic (and SSR-safe) way to read it without a setState-in-effect. Returns
// false on the server. Used to gate the WebGL particle loop; the global CSS
// killswitch in base.css handles CSS animations/transitions.

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
