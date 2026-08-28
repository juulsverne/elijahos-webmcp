"use client";

import { useEffect, useState } from "react";
import { MOBILE_MEDIA_QUERY } from "./layout";

// Subscribes to the mobile-shell media query. Returns `null` during SSR and
// the first client render so consumers can render neutral markup until the
// match is known — flipping the entire shell on hydrate would flash both
// the desktop and the mobile layout. The boot screen covers that gap.
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return isMobile;
}
