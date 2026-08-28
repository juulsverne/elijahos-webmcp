"use client";

import { useEffect, type RefObject } from "react";
import { computeViewportMetrics } from "./viewport-metrics";

// Keeps visual-viewport CSS custom properties on the given element in sync
// with the phone browser's current visible area. Mounted ONCE, on the mobile
// shell's root — custom properties inherit, so both the home surface
// (.mobile-home) and the app frame's body (.mobile-appbody) consume
// `--kb-inset` from here.
//
// Why: iOS Safari does not resize the layout viewport when the on-screen
// keyboard opens — it shrinks the *visual* viewport and pans it (offsetTop)
// to lift the focused field. Two counters:
//   - `--kb-inset` pads bottom-pinned UI up out of the keyboard's overlap, so
//     composers ride the keyboard the way native chat apps do;
//   - once that padding has lifted the field into the visible band, the pan
//     is pure overshoot that only pushes the top chrome (app bar, tabs)
//     off-screen — so it gets scrolled back out (see the un-pan below).
// `data-keyboard` mirrors metrics.keyboardOpen for CSS state (safe-area
// collapse, dock hiding). `--vv-height` / `--vv-offset-top` / `--vv-width`
// are still published for the debug overlay and future diagnostics.
//
// Falls back to `window.innerHeight` on browsers without `visualViewport`
// (older desktop), and is SSR-safe (the effect only runs in the browser).
export function useKeyboardInset(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const vv = window.visualViewport;
    let raf = 0;

    const apply = () => {
      raf = 0;
      const metrics = computeViewportMetrics(
        vv
          ? {
              innerHeight: window.innerHeight,
              innerWidth: window.innerWidth,
              vvHeight: vv.height,
              vvWidth: vv.width,
              vvOffsetTop: vv.offsetTop,
              vvScale: vv.scale,
            }
          : {
              // No visualViewport: there is no keyboard signal to read, so the
              // visible area is just the layout viewport.
              innerHeight: window.innerHeight,
              innerWidth: window.innerWidth,
              vvHeight: window.innerHeight,
              vvWidth: window.innerWidth,
              vvOffsetTop: 0,
              vvScale: 1,
            },
      );

      el.style.setProperty("--vv-height", `${Math.round(metrics.height)}px`);
      el.style.setProperty("--vv-width", `${Math.round(metrics.width)}px`);
      el.style.setProperty(
        "--vv-offset-top",
        `${Math.round(metrics.offsetTop)}px`,
      );
      el.style.setProperty("--kb-inset", `${Math.round(metrics.inset)}px`);

      if (metrics.keyboardOpen) {
        el.dataset.keyboard = "true";
        // Un-pan. Safari pans the visual viewport to reveal the focused field
        // BEFORE this handler's inset padding has lifted it clear of the
        // keyboard; once the padding applies, the pan only pushes the header
        // off the top of the screen (the bug in the field reports). Scrolling
        // back to origin cancels it — and cannot re-trigger a pan, because
        // the field now sits inside the visible band. Gated on keyboardOpen,
        // which is false during pinch-zoom, so a zoomed-in reader's own pan
        // is never fought.
        if (window.scrollY > 0 || (vv && vv.offsetTop > 0)) {
          window.scrollTo(0, 0);
        }
      } else {
        delete el.dataset.keyboard;
      }
    };

    // Coalesce the burst of resize/scroll events Safari fires as the keyboard
    // animates into a single write per frame, so we never thrash layout.
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(apply);
    };

    // First write is synchronous so the shell paints at the right size on the
    // mount frame (no flash of a `100dvh` fallback).
    apply();

    vv?.addEventListener("resize", schedule);
    // The pan (offsetTop) changes as Safari scrolls the focused field into
    // view; `scroll` on the visual viewport is how that arrives.
    vv?.addEventListener("scroll", schedule);
    // Rotation and desktop window resizes don't always fire a visualViewport
    // event — listen on window too so the shell tracks them.
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      // The shell root unmounts when the viewport crosses back to desktop
      // width — drop the phone-only state so nothing stale survives a
      // rotate-to-desktop → back-to-phone round trip.
      el.style.removeProperty("--vv-height");
      el.style.removeProperty("--vv-width");
      el.style.removeProperty("--vv-offset-top");
      el.style.removeProperty("--kb-inset");
      delete el.dataset.keyboard;
    };
  }, [ref]);
}
