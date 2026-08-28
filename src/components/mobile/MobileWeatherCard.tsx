"use client";

import { useEffect, useState } from "react";
import { fetchWeatherPayload } from "@/lib/weather-client";
import type { WeatherPayload } from "@/lib/weather-payload";
import { codeToWeatherIconKind, WeatherIcon } from "@/components/icons";
import { UI_COPY } from "@/lib/ui-copy";
import { WIDGETS } from "@/lib/widgets";

function toF(c: number): number {
  return (c * 9) / 5 + 32;
}

// Phone-sized weather card. Single glance: condition glyph + temperature +
// today's low→high range + city and UV. Tap toggles °C / °F like the desktop
// widget. Hits the same /api/weather endpoint — the range and UV ride along
// in the same payload.
export function MobileWeatherCard() {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("F");

  useEffect(() => {
    let cancelled = false;
    fetchWeatherPayload().then((payload) => {
      if (!cancelled) setData(payload);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ok = data?.ok === true;
  const iconKind = codeToWeatherIconKind(data?.code, data?.isDay ?? true);

  // One converter for every temperature on the card so the unit toggle can
  // never leave the range in °C while the hero reads °F.
  const deg = (c: number): string =>
    `${Math.round(unit === "C" ? c : toF(c))}°`;

  const temp = data?.tempC == null ? "—" : deg(data.tempC);
  // The parser only publishes a range when both bounds are present and
  // ordered, so this is all-or-nothing by construction.
  const hasRange = data?.highC != null && data?.lowC != null;

  const foot = [
    ok ? data?.city : null,
    data?.uvIndex != null ? UI_COPY.widgets.weather.uv(data.uvIndex) : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      className="mobile-widget mobile-widget--glance mobile-weather"
      onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
      aria-label={UI_COPY.widgets.weather.toggleUnit}
    >
      <div className="mobile-glance-head">
        <span className="mobile-glance-kicker">{WIDGETS.weather.title}</span>
        <span className="mobile-weather-glyph" aria-hidden="true">
          <WeatherIcon kind={iconKind} className="mobile-weather-svg" />
        </span>
      </div>

      <div className="mobile-glance-hero">
        <span className="mobile-glance-value">{temp}</span>
        <span className="mobile-glance-unit">
          {!data
            ? UI_COPY.widgets.weather.fetching
            : ok
              ? (data.condition ?? "—")
              : UI_COPY.widgets.weather.unavailable}
        </span>
      </div>

      {/* Today's range. Rendered only when the provider gave both bounds —
          the row collapses rather than showing a bar with no meaning. */}
      {hasRange && (
        <div className="mobile-weather-range" aria-hidden="true">
          <span>{UI_COPY.widgets.weather.low(deg(data.lowC!))}</span>
          <span className="mobile-weather-range-bar" />
          <span>{UI_COPY.widgets.weather.high(deg(data.highC!))}</span>
        </div>
      )}

      <div className="mobile-glance-foot">
        {foot.join(UI_COPY.chrome.mobile.statusSeparator)}
      </div>
    </button>
  );
}
