"use client";

// The knowledge-base index drawn as itself: shared scene logic for the
// index widgets (mobile home card + desktop panel widget). Both shells
// render the same 47 particles — first as the real 3-D projection of the
// KB's embeddings (structure), then as a ranked histogram of how much
// knowledge sits in each area (composition). This module owns the data,
// the timeline, and the canvas loop; the shells own only their markup.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { APPS } from "@/lib/apps";
import TOPICS from "@/lib/public-index.generated.json";
import {
  selectIndexView,
  type IndexCluster as Cluster,
  type IndexView,
} from "@/lib/index-view";
import { UI_COPY } from "@/lib/ui-copy";

type Point = { id: string; c: number; x: number; y: number; z: number };
const CORE_CLUSTER_ID = "core";
export const INDEX_DATA = TOPICS as {
  total: number;
  clusters: Cluster[];
  points: Point[];
};

// ── Timeline (ms) ──
// One loop: the constellation drifts, reorganises into a ranked histogram,
// names each area in turn, then dissolves back. Slow on purpose — this sits
// on ambient surfaces, so it has to be watchable, not busy.
const CLOUD_HOLD = 3400;
const MORPH_IN = 1000;
const FOCUS_MS = 1900;
const MORPH_OUT = 900;
const CYCLE =
  CLOUD_HOLD + MORPH_IN + FOCUS_MS * INDEX_DATA.clusters.length + MORPH_OUT;

const FRAME_MS = 1000 / 30;
const SPIN_MS = 4200;
/** Accent token per column, cycled. Order matches the sorted cluster order. */
const ACCENTS = [
  "--accent-violet",
  "--accent-blue",
  "--accent-pink",
  "--accent-gold",
] as const;

function easeInOut(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Points carry their slot within their own column so the histogram stacks
// deterministically. Computed once — the data never changes at runtime.
const PLOT = (() => {
  const seen = new Map<number, number>();
  return INDEX_DATA.points.map((p) => {
    const slot = seen.get(p.c) ?? 0;
    seen.set(p.c, slot + 1);
    return { ...p, slot };
  });
})();
const SLOTS = INDEX_DATA.clusters.map(
  (_, i) => PLOT.filter((p) => p.c === i).length || 1,
);
// Two nearest neighbours per point, in the original 3-D space. Cheap enough at
// 47 points to derive on load rather than ship.
const LINKS = (() => {
  const out: [number, number][] = [];
  PLOT.forEach((p, i) => {
    const near = PLOT.map((q, j) => ({
      j,
      d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2,
    }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const o of near) if (i < o.j) out.push([i, o.j]);
  });
  return out;
})();

/** Where we are in the loop: how morphed, and which column is named. */
function phaseAt(t: number): { m: number; focus: number } {
  const p = t % CYCLE;
  if (p < CLOUD_HOLD) return { m: 0, focus: -1 };
  if (p < CLOUD_HOLD + MORPH_IN) {
    return { m: easeInOut((p - CLOUD_HOLD) / MORPH_IN), focus: -1 };
  }
  const inFocus = p - CLOUD_HOLD - MORPH_IN;
  const held = FOCUS_MS * INDEX_DATA.clusters.length;
  if (inFocus < held) {
    return { m: 1, focus: Math.floor(inFocus / FOCUS_MS) };
  }
  return { m: 1 - easeInOut((inFocus - held) / MORPH_OUT), focus: -1 };
}

export type { IndexView };

/**
 * What the columns measure: real demand once there is enough of it to be a
 * distribution, the KB's own composition until then. The thresholds and the
 * choice itself live in src/lib/index-view.ts — pure, so they can be tested
 * without a renderer.
 */
export function useIndexView(): IndexView {
  return useMemo(
    () => selectIndexView(INDEX_DATA.clusters, INDEX_DATA.total, null),
    [],
  );
}

/** Display name for the focused cluster, or null when nothing is focused. */
export function useIndexFocusLabel(focus: number): string | null {
  const cluster = focus >= 0 ? INDEX_DATA.clusters[focus] : null;
  return useMemo(() => {
    if (!cluster) return null;
    if (cluster.id === CORE_CLUSTER_ID) return UI_COPY.widgets.index.core;
    const app = APPS[cluster.id];
    return app?.mobileLabel ?? app?.id ?? cluster.id;
  }, [cluster]);
}

/**
 * Runs the constellation↔histogram loop on the given canvas and reports the
 * currently-named column. Drawing is the whole cost of the widget, so pass
 * `running: false` for a surface nobody is looking at and the loop stops.
 */
export function useIndexCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  running: boolean,
  view: IndexView,
): number {
  const [focus, setFocus] = useState(-1);

  // Read inside the render loop so demand data arriving mid-cycle changes the
  // column heights on the next frame instead of restarting the animation.
  // Seeded with the first render's value and updated in an effect, never
  // during render.
  const viewRef = useRef(view);
  // Lets the effect below repaint a still frame when the weights change, which
  // is the only way the reduced-motion path would ever see the new data.
  const repaintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    // Last drawn timeline position, so a resize can repaint the same moment.
    let lastT = 0;
    const sync = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      // Assigning width/height clears the canvas, so every sync must be
      // followed by a repaint — see the observer below. Without that the card
      // goes blank under reduced motion, where no loop comes along to redraw.
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sync();

    // Colours come from the live tokens so all four themes recolour the card
    // for free. Re-read when the theme attribute flips.
    let palette: string[] = [];
    const readPalette = () => {
      const cs = getComputedStyle(document.documentElement);
      palette = ACCENTS.map((v) => cs.getPropertyValue(v).trim() || "#b870ff");
    };
    readPalette();
    const themeWatch = new MutationObserver(readPalette);
    themeWatch.observe(document.documentElement, { attributes: true });

    const colorOf = (c: number) => palette[c % palette.length]!;

    const draw = (t: number) => {
      lastT = t;
      const { m, focus: f } = phaseAt(t);
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.62;
      const cy = h * 0.44;
      const R = Math.min(w, h) * 0.33;
      const a = t / SPIN_MS;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const tl = Math.cos(0.42);
      const ts = Math.sin(0.42);

      // Columns live entirely in the card's clear zone. Starting them further
      // left would push the tallest bar under the scrim behind the hero
      // number — burying the single most meaningful column.
      const x0 = w * 0.46;
      const x1 = w * 0.95;
      // Columns stand ON the footer line rather than over it. The clearance is
      // in pixels, not a fraction of the card: the footer's type size and the
      // card's padding are fixed, so a ratio that clears the text at 160px
      // tall drops straight onto it at the shorter breakpoints.
      // 16px card padding + ~13px footer line + 8px breathing room.
      const base = Math.max(h * 0.55, h - 37);
      // Likewise keep the tallest column clear of the kicker row above.
      const maxH = Math.min(h * 0.52, base - 38);
      const colW = (x1 - x0) / INDEX_DATA.clusters.length;
      const dotScale = w > 240 ? 1.8 : 1;

      // Whatever the columns currently measure — real demand once anyone has
      // asked, the KB's own composition until then.
      const { weights } = viewRef.current;
      // Tallest on the left regardless of which measure is in play, so the
      // histogram always reads as a ranking. Ties break on cluster index to
      // keep the arrangement stable frame to frame.
      const colPos = new Array<number>(weights.length);
      weights
        .map((weight, i) => ({ weight, i }))
        .sort((p, q) => q.weight - p.weight || p.i - q.i)
        .forEach((o, pos) => {
          colPos[o.i] = pos;
        });

      const screen = PLOT.map((p) => {
        // Cloud: rotate about Y, tilt, then a light perspective divide.
        const rx = p.x * ca - p.z * sa;
        const rz = p.x * sa + p.z * ca;
        const ry = p.y * tl - rz * ts;
        const zz = p.y * ts + rz * tl;
        const k = 1.9 / (1.9 + zz * 0.85);
        const cxp = cx + rx * R * k * 1.45;
        const cyp = cy + ry * R * k;

        // Histogram: one column per cluster, height by weight, points stacked.
        // A zero-weight area (real: nobody has asked about it) still shows a
        // stub rather than vanishing — absent and empty must look different.
        const stackH = Math.max(maxH * 0.06, maxH * weights[p.c]!);
        const per = stackH / SLOTS[p.c]!;
        const hx = x0 + colW * (colPos[p.c]! + 0.5);
        const hy = base - per * (p.slot + 0.5);

        return {
          p,
          sx: cxp + (hx - cxp) * m,
          sy: cyp + (hy - cyp) * m,
          depth: (zz + 1) / 2,
          k,
        };
      });

      // Links belong to the constellation; fade them out as it reorganises.
      if (m < 0.98) {
        ctx.globalAlpha = (1 - m) * 0.18;
        ctx.lineWidth = 0.6;
        for (const [i, j] of LINKS) {
          ctx.strokeStyle = colorOf(PLOT[i]!.c);
          ctx.beginPath();
          ctx.moveTo(screen[i]!.sx, screen[i]!.sy);
          ctx.lineTo(screen[j]!.sx, screen[j]!.sy);
          ctx.stroke();
        }
      }

      // Far points first so near ones overlap them.
      for (const s of [...screen].sort((p, q) => q.depth - p.depth)) {
        const near = 1 - s.depth;
        const lit = f >= 0 && s.p.c === f;
        const rad =
          ((0.85 + near * 0.9) * s.k * (1 - m) + 1.5 * m) * dotScale +
          (lit ? 1.1 : 0);
        // Unfocused columns stay clearly legible: dimming them to near-nothing
        // would hide the ranking, which is the information the histogram is
        // for. The focused column separates on glow and size too, not alpha
        // alone, so it still reads as picked out.
        ctx.globalAlpha = clamp01(
          (0.22 + near * 0.55) * (1 - m) + m * (f < 0 ? 0.62 : lit ? 0.98 : 0.44),
        );
        ctx.fillStyle = colorOf(s.p.c);
        ctx.shadowColor = lit ? colorOf(s.p.c) : "transparent";
        ctx.shadowBlur = lit ? 10 : 0;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, Math.max(0.7, rad), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Baseline grounds the columns; it has no meaning without them.
      if (m > 0.3) {
        ctx.globalAlpha = (m - 0.3) * 0.24;
        ctx.strokeStyle = colorOf(0);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, base + 3);
        ctx.lineTo(x1, base + 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // Resizing rebuilds the backing store and wipes it, so repaint the frame
    // we were already showing. Observing only now — after `draw` exists —
    // because ResizeObserver fires an initial callback the moment it observes.
    const ro = new ResizeObserver(() => {
      sync();
      draw(lastT);
    });
    ro.observe(canvas);
    repaintRef.current = () => draw(lastT);

    // Reduced motion gets one still frame — the histogram mid-cycle, which is
    // the informative half — and no loop at all. `focus` stays at its initial
    // -1, so the hero keeps reading the index total.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(CLOUD_HOLD + MORPH_IN);
      return () => {
        repaintRef.current = null;
        ro.disconnect();
        themeWatch.disconnect();
      };
    }

    let raf = 0;
    let last = 0;
    let shownFocus = -1;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      const t = now - start;
      draw(t);
      const next = phaseAt(t).focus;
      if (next !== shownFocus) {
        shownFocus = next;
        setFocus(next);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      repaintRef.current = null;
      ro.disconnect();
      themeWatch.disconnect();
    };
  }, [canvasRef, running]);

  // Demand data arriving changes the column heights. The running loop picks
  // that up on its next frame; a reduced-motion still frame would not, so
  // repaint it explicitly.
  useEffect(() => {
    viewRef.current = view;
    repaintRef.current?.();
  }, [view]);

  return focus;
}
