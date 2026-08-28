"use client";

// Gated diagnostic overlay for the iOS keyboard / visual-viewport bug.
//
// Desktop responsive preview and Playwright's device emulation do NOT
// reproduce the real iOS keyboard pan, so the only way to confirm the fix is
// to read live numbers on a physical phone. Enable with `?debugViewport=1`
// (e.g. https://www.elijahos.com/?app=ask&debugViewport=1) and the values update
// live as the keyboard opens/closes. Never rendered without the flag, so it
// can't ship as production-visible UI.

import { useEffect, useState } from "react";
import { computeViewportMetrics } from "@/lib/viewport-metrics";

export function isViewportDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugViewport") === "1";
}

type Snapshot = {
  innerHeight: number;
  clientHeight: number;
  vvHeight: number | null;
  vvOffsetTop: number | null;
  vvPageTop: number | null;
  scrollY: number;
  keyboardInset: number;
  composerTop: number | null;
  composerBottom: number | null;
  activeElement: string;
  documentScrolling: boolean;
};

function describeActiveElement(el: Element | null): string {
  if (!el || el === document.body) return "—";
  const tag = el.tagName.toLowerCase();
  const input = el as HTMLInputElement;
  const detail = input.name || input.type || input.id;
  return detail ? `${tag} (${detail})` : tag;
}

function readSnapshot(): Snapshot {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const innerHeight = window.innerHeight;
  const innerWidth = window.innerWidth;
  const metrics = computeViewportMetrics({
    innerHeight,
    innerWidth,
    vvHeight: vv?.height ?? innerHeight,
    vvWidth: vv?.width ?? innerWidth,
    vvOffsetTop: vv?.offsetTop ?? 0,
    vvScale: vv?.scale ?? 1,
  });

  const composer = document.querySelector<HTMLElement>(".ask-input");
  const rect = composer?.getBoundingClientRect() ?? null;
  const docEl = document.documentElement;

  return {
    innerHeight,
    clientHeight: docEl.clientHeight,
    vvHeight: vv ? Math.round(vv.height) : null,
    vvOffsetTop: vv ? Math.round(vv.offsetTop) : null,
    vvPageTop: vv ? Math.round(vv.pageTop) : null,
    scrollY: Math.round(window.scrollY),
    keyboardInset: Math.round(metrics.inset),
    composerTop: rect ? Math.round(rect.top) : null,
    composerBottom: rect ? Math.round(rect.bottom) : null,
    activeElement: describeActiveElement(document.activeElement),
    documentScrolling:
      window.scrollY !== 0 || docEl.scrollTop !== 0 || document.body.scrollTop !== 0,
  };
}

export function ViewportDebug() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const update = () => setSnap(readSnapshot());
    update();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);
    // Caret/scroll changes during the keyboard animation don't all fire
    // events — a slow poll keeps the readout honest without affecting perf.
    const interval = window.setInterval(update, 200);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
      window.clearInterval(interval);
    };
  }, []);

  if (!snap) return null;

  const rows: Array<[string, string]> = [
    ["innerHeight", `${snap.innerHeight}`],
    ["docEl.clientHeight", `${snap.clientHeight}`],
    ["vv.height", snap.vvHeight === null ? "n/a" : `${snap.vvHeight}`],
    ["vv.offsetTop", snap.vvOffsetTop === null ? "n/a" : `${snap.vvOffsetTop}`],
    ["vv.pageTop", snap.vvPageTop === null ? "n/a" : `${snap.vvPageTop}`],
    ["window.scrollY", `${snap.scrollY}`],
    ["keyboardInset", `${snap.keyboardInset}`],
    [
      "composer top/bottom",
      snap.composerTop === null
        ? "n/a"
        : `${snap.composerTop} / ${snap.composerBottom}`,
    ],
    ["activeElement", snap.activeElement],
    ["doc scrolling", snap.documentScrolling ? "YES ⚠" : "no"],
  ];

  return (
    <div className="viewport-debug" role="status" aria-live="off">
      <span className="viewport-debug-title">viewport debug</span>
      {rows.map(([label, value]) => (
        <span key={label} className="viewport-debug-row">
          <span className="viewport-debug-label">{label}</span>
          <span className="viewport-debug-value">{value}</span>
        </span>
      ))}
    </div>
  );
}
