"use client";

import { useEffect, useRef, useState } from "react";
import { APPS } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";

type Mode = "clock" | "stopwatch" | "timer";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatStopwatch(ms: number): string {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSeconds = Math.floor(totalCs / 100);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60);
  return `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function playBlip() {
  if (typeof window === "undefined") return;
  type W = Window & { webkitAudioContext?: typeof AudioContext };
  const w = window as W;
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
  osc.onended = () => ctx.close();
}

function ClockMode() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="clock-mode-clock">
      <div className="clock-face">
        <div className="clock-time clock-time--serif">{time}</div>
        <div className="clock-date">
          <span className="clock-weekday">{weekday}</span>
          <span className="clock-day">{date}</span>
        </div>
      </div>
    </div>
  );
}

function StopwatchMode() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now();
    const tick = (t: number) => {
      setMs(baseRef.current + (t - startRef.current));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      baseRef.current = baseRef.current + (performance.now() - startRef.current);
    };
  }, [running]);

  const reset = () => {
    // Cancel the live rAF first so the cleanup doesn't write a stale
    // elapsed value into baseRef after we zero it.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    baseRef.current = 0;
    setRunning(false);
    setMs(0);
    setLaps([]);
  };

  const lap = () => setLaps((l) => [ms, ...l]);

  return (
    <div className="clock-mode-stopwatch">
      <div className={`clock-face${running ? " is-running" : ""}`}>
        <span className="clock-face-status">
          <span className="clock-face-dot" aria-hidden="true" />
          {running
            ? UI_COPY.clock.status.running
            : ms > 0
              ? UI_COPY.clock.status.paused
              : UI_COPY.clock.status.ready}
        </span>
        <div className="clock-time clock-time--mono">{formatStopwatch(ms)}</div>
      </div>
      <div className="clock-controls">
        <button
          type="button"
          className={`btn ${running ? "btn-ghost" : "btn-primary"}`}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? UI_COPY.clock.actions.stop : UI_COPY.clock.actions.start}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={lap}
          disabled={!running}
        >
          {UI_COPY.clock.actions.lap}
        </button>
        <button type="button" className="btn btn-ghost" onClick={reset}>
          {UI_COPY.clock.actions.reset}
        </button>
      </div>
      {laps.length > 0 && (
        <ul className="clock-laps">
          {laps.map((t, i) => (
            <li key={laps.length - i}>
              <span className="clock-lap-label">
                {UI_COPY.clock.lapLabel(laps.length - i)}
              </span>
              <span className="clock-lap-time">{formatStopwatch(t)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
};

// Themed numeric stepper used by TimerMode. Replaces the native number
// input's spinner buttons with on-brand circular controls and keeps the
// value typeable in the middle. Clamps within [min, max] on every path.
function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="clock-stepper">
      <span className="clock-stepper-label">{label}</span>
      <div className="clock-stepper-control">
        <button
          type="button"
          className="clock-stepper-btn"
          onClick={() => onChange(clamp(value - 1))}
          aria-label={UI_COPY.clock.stepper.decrease(label)}
        >
          −
        </button>
        <input
          type="number"
          className="clock-stepper-input"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            if (!Number.isNaN(parsed)) onChange(clamp(parsed));
          }}
        />
        <button
          type="button"
          className="clock-stepper-btn"
          onClick={() => onChange(clamp(value + 1))}
          aria-label={UI_COPY.clock.stepper.increase(label)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TimerMode() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const endRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const startRemainingRef = useRef<number | null>(null);

  useEffect(() => {
    const startRemaining = startRemainingRef.current;
    if (!running || startRemaining === null) return;
    endRef.current = performance.now() + startRemaining;
    const tick = (t: number) => {
      const left = endRef.current - t;
      if (left <= 0) {
        setRemainingMs(0);
        setRunning(false);
        setFlashing(true);
        playBlip();
        window.setTimeout(() => setFlashing(false), 1500);
        return;
      }
      setRemainingMs(left);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [running]);

  const totalConfigMs = (minutes * 60 + seconds) * 1000;
  const display = remainingMs !== null ? formatTimer(remainingMs) : formatTimer(totalConfigMs);

  const start = () => {
    // Treat both "never started" (null) and "just expired" (0) as needing
    // a fresh count from totalConfigMs. Without this guard, Start after
    // expiry instantly re-fires the completion blip.
    const nextRemaining =
      remainingMs === null || remainingMs === 0 ? totalConfigMs : remainingMs;
    startRemainingRef.current = nextRemaining;
    setRemainingMs(nextRemaining);
    setRunning(true);
  };

  const pause = () => {
    if (endRef.current > 0) {
      setRemainingMs(Math.max(0, endRef.current - performance.now()));
    }
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setRemainingMs(null);
    setFlashing(false);
  };

  const status = flashing
    ? UI_COPY.clock.status.done
    : running
      ? UI_COPY.clock.status.running
      : remainingMs !== null
        ? UI_COPY.clock.status.paused
        : UI_COPY.clock.status.ready;

  return (
    <div className="clock-mode-timer">
      <div
        className={`clock-face${running ? " is-running" : ""}${flashing ? " is-done" : ""}`}
      >
        <span className="clock-face-status">
          <span className="clock-face-dot" aria-hidden="true" />
          {status}
        </span>
        <div
          className={`clock-time clock-time--mono${flashing ? " is-flashing" : ""}`}
        >
          {display}
        </div>
      </div>
      {remainingMs === null && (
        <div className="clock-timer-config">
          <Stepper
            label={UI_COPY.clock.timer.minutes}
            value={minutes}
            min={0}
            max={99}
            onChange={setMinutes}
          />
          <Stepper
            label={UI_COPY.clock.timer.seconds}
            value={seconds}
            min={0}
            max={59}
            onChange={setSeconds}
          />
        </div>
      )}
      <div className="clock-controls">
        {!running ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={start}
            disabled={totalConfigMs === 0 && (remainingMs === null || remainingMs === 0)}
          >
            {UI_COPY.clock.actions.start}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={pause}>
            {UI_COPY.clock.actions.pause}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={reset}>
          {UI_COPY.clock.actions.reset}
        </button>
      </div>
    </div>
  );
}

export function ClockApp() {
  const [mode, setMode] = useState<Mode>("clock");

  return (
    <div className="clock-app">
      <header className="clock-header">
        <span className="app-kicker">{APPS.clock.title}</span>
        {/* Segmented control. data-active drives the sliding thumb in CSS;
            keeping the index in the DOM (not JS) keeps the animation
            framework-agnostic and lets the browser handle the transition. */}
        <div className="clock-tabs" role="tablist" data-active={mode}>
          {(["clock", "stopwatch", "timer"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`clock-tab${mode === m ? " is-active" : ""}`}
              onClick={() => setMode(m)}
            >
              {UI_COPY.clock.modes[m]}
            </button>
          ))}
        </div>
      </header>
      {mode === "clock" && <ClockMode />}
      {mode === "stopwatch" && <StopwatchMode />}
      {mode === "timer" && <TimerMode />}
    </div>
  );
}
