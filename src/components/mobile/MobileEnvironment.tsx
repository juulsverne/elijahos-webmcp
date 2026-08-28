"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MobileBlob } from "./MobileBlob";

// Liquid Depth ambient layers for the mobile shell.
//
// Wash layers: one prebuilt accent wash per accent color; the active wash is
// selected by [data-env-accent] on .mobile-root and only its OPACITY
// transitions — gradients are never rebuilt at runtime. Sits at z 0 inside
// .mobile-root's stacking context, beneath the .mobile-home plane (z 1).
//
// Press glow: pressing an accented tile/dock button blooms a soft radiance
// in this layer under the finger. ONE reusable fixed element — a new press
// retargets it — positioned via transform and faded via WAAPI, so a press
// costs one composite and rest costs nothing. Listeners are delegated on
// the document (capture phase) so the grid, drawer, and dock all feed the
// same glow without per-tile wiring.
//
// Accent names mirror the TILE_ACCENT values in MobileShell.tsx — the four
// OS accents. A fifth accent would need matching .mobile-env-layer and
// .mobile-env-glow rules in mobile.css.
const ENV_ACCENTS = ["pink", "blue", "gold", "violet"] as const;

// Press-glow fade timing (this file only — the CSS side has no matching
// literal, so these stay local per the AGENTS one-off rule). The out-fade
// lingers longer than the in so light "decays" rather than snapping off.
const GLOW_IN_MS = 160;
const GLOW_OUT_MS = 420;

export function MobileEnvironment() {
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow || reducedMotion || typeof glow.animate !== "function") return;
    let anim: Animation | null = null;

    const fadeTo = (to: number, duration: number, easing: string) => {
      // Start from wherever the previous fade left the glow so a quick tap
      // (release before the in-fade finishes) doesn't flash.
      const from = Number(getComputedStyle(glow).opacity) || 0;
      anim?.cancel();
      anim = glow.animate([{ opacity: from }, { opacity: to }], {
        duration,
        easing,
        fill: "forwards",
      });
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const trigger = (e.target as Element | null)?.closest?.(
        ".mobile-tile[data-accent], .mobile-dock-btn[data-accent]",
      );
      const accent = trigger?.getAttribute("data-accent");
      if (!accent) return;
      glow.dataset.accent = accent;
      glow.dataset.active = "true";
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      fadeTo(1, GLOW_IN_MS, "ease-out");
    };

    const onUp = (e: PointerEvent) => {
      // Only the primary pointer starts the glow (onDown gates on
      // isPrimary), so only the primary pointer's lift may end it — a
      // second incidental touch lifting elsewhere must not cut the glow.
      if (!e.isPrimary) return;
      if (glow.dataset.active !== "true") return;
      delete glow.dataset.active;
      fadeTo(0, GLOW_OUT_MS, "ease-in");
    };

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    return () => {
      anim?.cancel();
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
    };
  }, [reducedMotion]);

  return (
    <div className="mobile-env" aria-hidden="true">
      {/* Wallpaper, back to front: drifting color blooms, the wireframe blob,
          then two scrims — the bottom one buys contrast for the ask bar and
          dock, the top one dissolves the blooms into the status-bar band so
          the page reads as continuing into the OS chrome. These are the
          ambient "world"; the accent washes below react to what the user is
          doing and sit on top of them. */}
      <span className="mobile-env-blooms" />
      <MobileBlob />
      <span className="mobile-env-scrim" />
      <span className="mobile-env-scrim-top" />

      {ENV_ACCENTS.map((accent) => (
        <span
          key={accent}
          className="mobile-env-layer"
          data-accent={accent}
        />
      ))}
      <span ref={glowRef} className="mobile-env-glow" />
    </div>
  );
}
