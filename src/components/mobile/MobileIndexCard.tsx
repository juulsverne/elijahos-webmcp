"use client";

import { useRef } from "react";
import {
  INDEX_DATA,
  useIndexCanvas,
  useIndexFocusLabel,
  useIndexView,
} from "@/lib/index-scene";
import { UI_COPY } from "@/lib/ui-copy";
import { usePageVisible } from "@/lib/use-page-visible";

// Home-screen index card. Draws the knowledge base twice over: as the real
// 3-D projection of its embeddings (structure), then as a ranked histogram of
// how much knowledge sits in each area (composition). Same 47 particles both
// times — the card never swaps visuals, it rearranges one. The scene itself
// (data, timeline, canvas loop) lives in src/lib/index-scene.ts, shared with
// the desktop panel's IndexWidget.
//
// Replaces the old FPS/heap pulse card, which measured the browser rather than
// the site and could never populate its heap line on iOS.
export function MobileIndexCard({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageVisible = usePageVisible();
  // Drawing is the whole cost of this card; don't pay it for a surface nobody
  // is looking at (app open over the home, or tab backgrounded).
  const running = active && pageVisible;

  const view = useIndexView();
  const focus = useIndexCanvas(canvasRef, running, view);
  const label = useIndexFocusLabel(focus);

  return (
    <div
      className="mobile-widget mobile-widget--glance mobile-index"
      role="region"
      aria-label={UI_COPY.widgets.index.title}
    >
      {/* Decorative: the accessible reading of this card is the text below. */}
      <canvas className="mobile-index-canvas" ref={canvasRef} aria-hidden="true" />

      <div className="mobile-glance-head">
        <span className="mobile-glance-kicker">
          {UI_COPY.widgets.index.title}
        </span>
        <span className="mobile-index-dot" aria-hidden="true" />
      </div>

      {/* Hero swaps between the index total and whichever area is named. The
          live region is polite so it never interrupts, but a screen-reader
          user still hears the composition rather than a frozen number. */}
      <div className="mobile-glance-hero" aria-live="polite">
        <span className="mobile-glance-value">
          {focus >= 0 ? view.values[focus] : view.total}
        </span>
        <span className="mobile-glance-unit">
          {label ??
            (view.asked
              ? UI_COPY.widgets.index.asked
              : UI_COPY.widgets.index.vectors)}
        </span>
      </div>

      <div className="mobile-glance-foot">
        {view.asked
          ? UI_COPY.widgets.index.footAsked(view.total, INDEX_DATA.clusters.length)
          : UI_COPY.widgets.index.foot(view.total, INDEX_DATA.clusters.length)}
      </div>
    </div>
  );
}
