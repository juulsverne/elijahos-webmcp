"use client";

// Mount-once side-effect component: registers the WebMCP tool surface after
// the shell is interactive. Renders nothing and never blocks the UI —
// WebMCP is progressive enhancement over the normal interface.

import { useEffect } from "react";
import { registerWebMCPTools } from "@/lib/webmcp/register";

export function WebMCPProvider() {
  useEffect(() => {
    registerWebMCPTools();
  }, []);
  return null;
}
