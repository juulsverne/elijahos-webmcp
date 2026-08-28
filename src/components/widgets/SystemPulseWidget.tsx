"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import { BoltIcon, PlayIcon } from "@/components/icons";
import { useDesktopStore } from "@/lib/desktop-store";
import { APPS } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";
import { WIDGETS } from "@/lib/widgets";
import { ELIJAH } from "@/lib/elijah";
import {
  formatMemory,
  getAppMemory,
  isHeapApiAvailable,
  subscribeMemory,
} from "@/lib/track-process-memory";
import {
  getRecent,
  subscribe as subscribeEvents,
  type SystemEvent,
} from "@/lib/system-events";

const SAMPLE_INTERVAL_MS = 500;
const FPS_WINDOW = 60;
// Cap the visible process rows so the widget keeps a stable footprint as
// more apps open. Anything beyond shows up as a "+ N more" row.
const MAX_VISIBLE_PROCESSES = 3;

type ChromePerformance = Performance & {
  memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
};
type NetConnection = { effectiveType?: string; rtt?: number };
type NavWithConn = Navigator & {
  connection?: NetConnection;
  mozConnection?: NetConnection;
  webkitConnection?: NetConnection;
};

function getConnection(): NetConnection | null {
  if (typeof navigator === "undefined") return null;
  const n = navigator as NavWithConn;
  return n.connection ?? n.mozConnection ?? n.webkitConnection ?? null;
}

function getHeap(): { used: number; limit: number } | null {
  if (typeof performance === "undefined") return null;
  const p = performance as ChromePerformance;
  if (!p.memory) return null;
  return { used: p.memory.usedJSHeapSize, limit: p.memory.jsHeapSizeLimit };
}

function formatLogTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function SystemPulseWidget({ active = true }: { active?: boolean }) {
  const winIds = useDesktopStore(useShallow((s) => s.wins.map((w) => w.id)));
  const focusId = useDesktopStore((s) => s.focusId);
  const focusWindow = useDesktopStore((s) => s.focus);
  const open = useDesktopStore((s) => s.open);
  const close = useDesktopStore((s) => s.close);

  const [fps, setFps] = useState(60);
  const [heap, setHeap] = useState<{ used: number; limit: number } | null>(null);
  const [conn, setConn] = useState<NetConnection | null>(null);
  const [memTick, setMemTick] = useState(0);
  // Pull the full ring so the log is scrollable back through older entries.
  const [events, setEvents] = useState<SystemEvent[]>(getRecent(32));

  // FPS via rolling rAF deltas.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const samples: number[] = [];
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      if (delta > 0) {
        const inst = 1000 / delta;
        samples.push(inst);
        if (samples.length > FPS_WINDOW) samples.shift();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const id = setInterval(() => {
      if (samples.length === 0) return;
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      setFps(Math.round(avg * 10) / 10);
    }, SAMPLE_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [active]);

  // Heap + connection sampled on the same cadence.
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      setHeap(getHeap());
      setConn(getConnection());
    };
    tick();
    const id = setInterval(tick, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  // Per-process memory updates → re-render.
  useEffect(() => {
    if (!active) return;
    return subscribeMemory(() => setMemTick((t) => t + 1));
  }, [active]);

  // Event-bus → log.
  useEffect(() => {
    if (!active) return;
    return subscribeEvents(() => setEvents(getRecent(32)));
  }, [active]);

  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 0 : 0;
  const heapPct = heap ? (heap.used / heap.limit) * 100 : 0;
  const heapAvail = isHeapApiAvailable();

  // Sort processes by memory desc; ones without samples fall to the bottom.
  // Memoized so unrelated desktop interactions (drag, focus) don't re-sort.
  // Re-runs when the window list changes or the memory subscription ticks —
  // memTick is read transitively via getAppMemory(), which ESLint can't see,
  // so the dep is intentional even though the body never references memTick.
  const processes = useMemo(
    () => {
      void memTick;
      return [...winIds].sort((a, b) => {
        const ma = getAppMemory(a) ?? 0;
        const mb = getAppMemory(b) ?? 0;
        return mb - ma;
      });
    },
    [winIds, memTick],
  );
  const visibleProcesses = processes.slice(0, MAX_VISIBLE_PROCESSES);
  const hiddenCount = Math.max(0, processes.length - MAX_VISIBLE_PROCESSES);

  return (
    <div className="widget-card pulse-widget">
      <div className="widget-card-head">
        <span className="pulse-head-title">
          <BoltIcon className="pulse-head-icon" />
          {WIDGETS.pulse.title}
        </span>
        <span className="live-dot">{UI_COPY.widgets.pulse.live}</span>
      </div>

      <div className="pulse-grid">
        <div className="pulse-cell fps">
          <div className="pulse-cell-label">{UI_COPY.widgets.pulse.fps}</div>
          <div className="pulse-cell-value">{fps.toFixed(1)}</div>
          <div className="pulse-bar">
            <div
              className="pulse-bar-fill pulse-bar-fill--violet"
              style={{ "--v": String(Math.min(1, fps / 60)) } as CSSProperties}
            />
          </div>
        </div>
        <div className="pulse-cell heap">
          <div className="pulse-cell-label">{UI_COPY.widgets.pulse.jsHeap}</div>
          <div className="pulse-cell-value">{heapAvail && heap ? formatMemory(heap.used) : "—"}</div>
          <div className="pulse-bar">
            <div
              className="pulse-bar-fill pulse-bar-fill--blue"
              style={{ "--v": String(Math.min(100, heapPct) / 100) } as CSSProperties}
            />
          </div>
        </div>
        <div className="pulse-cell cores">
          <div className="pulse-cell-label">{UI_COPY.widgets.pulse.cores}</div>
          <div className="pulse-cell-value">{cores || "—"}</div>
          <div className="pulse-cell-label pulse-cell-sublabel">
            {UI_COPY.widgets.pulse.cpu}
          </div>
        </div>
        <div className="pulse-cell net">
          <div className="pulse-cell-label">{UI_COPY.widgets.pulse.net}</div>
          <div className="pulse-cell-value">{conn?.effectiveType ?? "—"}</div>
          <div className="pulse-cell-label pulse-cell-sublabel">
            {conn?.rtt != null ? UI_COPY.widgets.pulse.rtt(conn.rtt) : "—"}
          </div>
        </div>
      </div>

      <div className="pulse-section-label pulse-procs-head">
        <span>{UI_COPY.widgets.pulse.processes(processes.length)}</span>
        {processes.length > 1 && (
          <button
            type="button"
            className="pulse-kill-all"
            onClick={() => {
              for (const id of processes) close(id);
            }}
            title={UI_COPY.widgets.pulse.killAllTitle}
          >
            {UI_COPY.widgets.pulse.killAll}
          </button>
        )}
      </div>
      <div className="pulse-procs">
        {processes.length === 0 && (
          <div className="pulse-proc pulse-proc--empty">
            <span>{UI_COPY.widgets.pulse.idle}</span>
            <span className="pulse-proc-mem">—</span>
          </div>
        )}
        {visibleProcesses.map((id) => {
          const app = APPS[id];
          const mem = getAppMemory(id);
          const label = app?.title ?? id;
          return (
            <div
              key={id}
              className={`pulse-proc${id === focusId ? " is-focused" : ""}`}
            >
              <button
                type="button"
                className="pulse-proc-main"
                onClick={() => {
                  const win = useDesktopStore
                    .getState()
                    .wins
                    .find((item) => item.id === id);
                  if (win?.minimized) open(id);
                  else focusWindow(id);
                }}
                title={UI_COPY.widgets.pulse.focus(label)}
              >
                <span className="pulse-proc-label">
                  <PlayIcon className="pulse-proc-icon" />
                  <span>{label}</span>
                </span>
                <span className="pulse-proc-mem">{formatMemory(mem)}</span>
              </button>
              <button
                type="button"
                className="pulse-proc-kill"
                onClick={(e) => {
                  e.stopPropagation();
                  close(id);
                }}
                aria-label={UI_COPY.widgets.pulse.kill(label)}
                title={UI_COPY.widgets.pulse.kill(label)}
              >
                −
              </button>
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div
            className="pulse-proc pulse-proc-more"
            aria-label={UI_COPY.widgets.pulse.moreProcesses(hiddenCount)}
          >
            <span>{UI_COPY.widgets.pulse.moreRow(hiddenCount)}</span>
          </div>
        )}
      </div>

      <div className="pulse-section-label">{UI_COPY.widgets.pulse.log}</div>
      <div className="pulse-log" aria-live="polite">
        {events.slice(0, 1).map((e, i) => (
          <div key={`${e.ts}-${i}`}>
            <span className={`log-tag-${e.tag.toLowerCase()}`}>[{e.tag}]</span>{" "}
            {formatLogTime(e.ts)} {e.msg}
          </div>
        ))}
        {/* Seeded into the normal feed as a discoverable clue. Lives in
            ELIJAH.puzzle so the literal doesn't drift across files. */}
        <div className="pulse-log-clue">
          <span className={`log-tag-${ELIJAH.puzzle.pinnedLog.tag.toLowerCase()}`}>
            [{ELIJAH.puzzle.pinnedLog.tag}]
          </span>{" "}
          {ELIJAH.puzzle.pinnedLog.time} {ELIJAH.puzzle.pinnedLog.message}
        </div>
        {events.length === 0 && (
          <div className="pulse-log-empty">{UI_COPY.widgets.pulse.waiting}</div>
        )}
        {events.slice(1).map((e, i) => (
          <div key={`${e.ts}-${i + 1}`}>
            <span className={`log-tag-${e.tag.toLowerCase()}`}>[{e.tag}]</span>{" "}
            {formatLogTime(e.ts)} {e.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
