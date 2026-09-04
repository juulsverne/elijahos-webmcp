"use client";

// Mount-once side-effect component: registers the WebMCP tool surface after
// the shell is interactive. Renders nothing and never blocks the UI —
// WebMCP is progressive enhancement over the normal interface.

import { useEffect } from "react";
import { registerWebMCPTools } from "@/lib/webmcp/register";

const REPROBE_INTERVAL_MS = 500;
const REPROBE_ATTEMPTS = 10;

export function WebMCPProvider() {
  useEffect(() => {
    if (registerWebMCPTools().supported) return;
    // The workspace reports "unsupported" immediately, but a host injected
    // after hydration (an extension polyfill on a slow load) still gets a
    // brief re-probe window instead of a whole-session miss.
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (registerWebMCPTools().supported || attempts >= REPROBE_ATTEMPTS) {
        clearInterval(timer);
      }
    }, REPROBE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return null;
}
