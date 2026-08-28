"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emit } from "@/lib/system-events";
import { fetchWeatherPayload } from "@/lib/weather-client";
import type { WeatherPayload } from "@/lib/weather-payload";
import { codeToWeatherIconKind, WeatherIcon } from "@/components/icons";
import { UI_COPY } from "@/lib/ui-copy";
import { WIDGETS } from "@/lib/widgets";

type Unit = "C" | "F";
const TIP_DELAY_MS = 500;

function toF(c: number): number {
  return c * 9 / 5 + 32;
}

export function WeatherWidget({ active = true }: { active?: boolean }) {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [unit, setUnit] = useState<Unit>("F");
  const [loaded, setLoaded] = useState(false);
  const [tip, setTip] = useState({ visible: false, x: 0, y: 0 });
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipRafRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active || loaded) return;
    let cancelled = false;
    fetchWeatherPayload()
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setLoaded(true);
        if (payload.ok) {
          emit("NET", `weather: ${payload.condition} in ${payload.city ?? "—"}`);
        } else {
          emit("WARN", "weather: lookup failed");
        }
      });
    return () => {
      cancelled = true;
      if (tipTimerRef.current) {
        clearTimeout(tipTimerRef.current);
        tipTimerRef.current = null;
      }
    };
  }, [active, loaded]);

  useEffect(() => {
    if (active) return;
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
    if (tipRafRef.current !== null) {
      cancelAnimationFrame(tipRafRef.current);
      tipRafRef.current = null;
    }
    const hideRaf = requestAnimationFrame(() => {
      setTip((current) => (current.visible ? { ...current, visible: false } : current));
    });
    return () => cancelAnimationFrame(hideRaf);
  }, [active]);

  useEffect(
    () => () => {
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
      if (tipRafRef.current !== null) cancelAnimationFrame(tipRafRef.current);
    },
    [],
  );

  function tempLabel(c?: number): string {
    if (c == null) return "—";
    const v = unit === "C" ? c : toF(c);
    return `${Math.round(v)}°${unit}`;
  }

  const iconKind = codeToWeatherIconKind(data?.code, data?.isDay ?? true);
  const ok = data?.ok === true;

  function clearTipTimer() {
    if (!tipTimerRef.current) return;
    clearTimeout(tipTimerRef.current);
    tipTimerRef.current = null;
  }

  function clearTipFrame() {
    if (tipRafRef.current === null) return;
    cancelAnimationFrame(tipRafRef.current);
    tipRafRef.current = null;
  }

  function syncTipToPointer() {
    if (tipRafRef.current !== null) return;
    tipRafRef.current = requestAnimationFrame(() => {
      tipRafRef.current = null;
      const { x, y } = pointerRef.current;
      setTip({ visible: true, x, y });
    });
  }

  function scheduleTip() {
    if (tip.visible || tipTimerRef.current) return;
    setTip((current) => ({ ...current, visible: false }));
    tipTimerRef.current = setTimeout(() => {
      const { x, y } = pointerRef.current;
      setTip({ visible: true, x, y });
      tipTimerRef.current = null;
    }, TIP_DELAY_MS);
  }

  function showTipAfterDelay(event: React.MouseEvent<HTMLDivElement>) {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    clearTipTimer();
    scheduleTip();
  }

  function moveTip(event: React.MouseEvent<HTMLDivElement>) {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (!tip.visible) {
      scheduleTip();
      return;
    }
    syncTipToPointer();
  }

  function hideTip() {
    clearTipTimer();
    clearTipFrame();
    setTip((current) => ({ ...current, visible: false }));
  }

  return (
    <>
      <div
        ref={cardRef}
        className="widget-card weather-widget"
        data-kind={iconKind}
        onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
        onMouseEnter={showTipAfterDelay}
        onMouseMove={moveTip}
        onMouseLeave={hideTip}
      >
        <div className="widget-card-head">
          <span className="widget-head-label">
            <WeatherIcon kind={iconKind} className="widget-head-icon" />
            <span>{WIDGETS.weather.title}</span>
          </span>
          <span className="weather-country">{ok ? data?.city ?? "" : ""}</span>
        </div>

        <div className="weather-row">
          <div className="weather-icon" aria-hidden>
            <WeatherIcon kind={iconKind} className="weather-icon-svg" />
          </div>
          {/* Re-keyed per unit so the °C/°F toggle replays the pop-in. */}
          <div className="weather-temp" key={unit}>
            {loaded ? tempLabel(data?.tempC) : "…"}
          </div>
          <div className="weather-meta">
            <span className="weather-cond">
              {!loaded
                ? UI_COPY.widgets.weather.fetching
                : ok
                  ? data?.condition ?? "—"
                  : UI_COPY.widgets.weather.unavailable}
            </span>
          </div>
        </div>
      </div>
      {tip.visible && typeof document !== "undefined"
        ? createPortal(
            <span
              className="weather-cursor-tip"
              aria-hidden="true"
              style={{
                left: `${tip.x}px`,
                top: `${tip.y}px`,
              }}
            >
              {UI_COPY.widgets.weather.clickToToggle}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
