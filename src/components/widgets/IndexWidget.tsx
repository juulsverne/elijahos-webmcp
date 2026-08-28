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
import { WIDGETS } from "@/lib/widgets";

// Desktop panel twin of the mobile home screen's index card: the knowledge
// base drawn as itself — its embeddings as a drifting constellation, then as
// a ranked histogram of what it knows about. All scene logic (data, timeline,
// canvas loop) is shared via src/lib/index-scene.ts; this shell only wears
// the widget-panel chassis.
export function IndexWidget({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageVisible = usePageVisible();
  // The panel unmounts nothing when closed — it slides away with widgets
  // live. Drawing is this card's whole cost, so stop the loop whenever the
  // panel is closed or the tab is backgrounded.
  const running = active && pageVisible;

  const view = useIndexView();
  const focus = useIndexCanvas(canvasRef, running, view);
  const label = useIndexFocusLabel(focus);

  return (
    <div
      className="widget-card index-widget"
      role="region"
      aria-label={WIDGETS.index.title}
    >
      {/* Decorative: the accessible reading of this card is the text. */}
      <canvas className="index-canvas" ref={canvasRef} aria-hidden="true" />

      <div className="widget-card-head">
        <span className="widget-head-label">
          <span>{WIDGETS.index.title}</span>
        </span>
      </div>

      {/* Hero swaps between the index total and whichever area is named. The
          live region is polite so it never interrupts, but a screen-reader
          user still hears the composition rather than a frozen number. */}
      <div className="index-hero" aria-live="polite">
        <span className="index-value">
          {focus >= 0 ? view.values[focus] : view.total}
        </span>
        <span className="index-unit">
          {label ??
            (view.asked
              ? UI_COPY.widgets.index.asked
              : UI_COPY.widgets.index.vectors)}
        </span>
      </div>

      <div className="index-foot">
        {view.asked
          ? UI_COPY.widgets.index.footAsked(view.total, INDEX_DATA.clusters.length)
          : UI_COPY.widgets.index.foot(view.total, INDEX_DATA.clusters.length)}
      </div>
    </div>
  );
}
