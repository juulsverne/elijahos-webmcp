"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";

type BootProps = {
  onDone: () => void;
  ready?: boolean;
};

/**
 * Readiness-aware boot screen — the progress races to a short cinematic floor,
 * then waits for the shell preload signal before its iris-out.
 * Spec: README §"Boot Screen" + design-files/src/main.jsx Boot().
 */
const MIN_BOOT_MS = 900;
const MAX_WAIT_MS = 1_700;
const TICK_MS = 60;
const LEAVE_DELAY_MS = 90;
const DONE_DELAY_MS = 500;
const WAITING_CAP = 94;

export function Boot({ onDone, ready = true }: BootProps) {
  const [pct, setPct] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setForceReady(true), MAX_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    startedAt.current ??= performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - (startedAt.current ?? performance.now());
      const canFinish = (ready || forceReady) && elapsed >= MIN_BOOT_MS;
      const cap = canFinish
        ? 100
        : Math.min(WAITING_CAP, 18 + (elapsed / MAX_WAIT_MS) * 76);

      setPct((p) => {
        if (p >= 100) return 100;
        const step = canFinish ? 18 : 4 + Math.random() * 5;
        return Math.min(100, cap, p + step);
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [forceReady, ready]);

  useEffect(() => {
    if (pct < 100 || finished.current) return;
    finished.current = true;
    const t1 = window.setTimeout(() => setLeaving(true), LEAVE_DELAY_MS);
    const t2 = window.setTimeout(() => onDoneRef.current(), DONE_DELAY_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pct]);

  return (
    <div className={`boot-wrap${leaving ? " is-leaving" : ""}`}>
      <div className="boot-panel">
        <div className="boot-orb">
          <div className="boot-orb-glow" />
          <div className="boot-orb-inner">{ELIJAH.osGlyph}</div>
        </div>

        <h1 className="boot-title serif-i">
          {ELIJAH.osName}
        </h1>

        <p className="boot-subtitle mono dim">
          {ELIJAH.osBootSubtitle}
        </p>

        <div
          className="boot-progress"
          role="progressbar"
          aria-label={UI_COPY.boot.progress(ELIJAH.osName)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor(pct)}
        >
          <div
            className="boot-progress-fill"
            style={{ "--v": String(pct / 100) } as CSSProperties}
          />
        </div>

        <div className="boot-percent mono dim">
          {Math.floor(pct)}%
        </div>
      </div>
    </div>
  );
}
