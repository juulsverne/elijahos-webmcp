"use client";

import { useEffect, useState } from "react";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { useWidgetStore } from "@/lib/widget-store";

function formatDateTime(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase(); // "tue"
  const month = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase(); // "feb"
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${weekday} · ${month} ${day} · ${hh}:${mm}`;
}

export function Topbar() {
  const [now, setNow] = useState("");
  const widgetsOpen = useWidgetStore((s) => s.isOpen);
  const toggleWidgets = useWidgetStore((s) => s.toggle);

  useEffect(() => {
    const tick = () => setNow(formatDateTime(new Date()));
    tick();
    // Refresh every 30s — fine for minute-precision time + day-precision date.
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="topbar">
      <span className="topbar-name">{ELIJAH.osName}</span>
      <span className="dim">·</span>
      <span className="topbar-role muted">
        {ELIJAH.role}
      </span>

      <div className="topbar-spacer" />

      <span className="pill topbar-status">
        <span className="status-dot" />
        {ELIJAH.topbarStatus}
      </span>

      <button
        type="button"
        className={`widget-toggle${widgetsOpen ? " is-open" : ""}`}
        onClick={toggleWidgets}
        aria-pressed={widgetsOpen}
        aria-label={
          widgetsOpen
            ? UI_COPY.chrome.topbar.closeWidgets
            : UI_COPY.chrome.topbar.openWidgets
        }
        title={
          widgetsOpen
            ? UI_COPY.chrome.topbar.closeWidgets
            : UI_COPY.chrome.topbar.openWidgets
        }
      >
        <span className="widget-toggle-glyph" aria-hidden>⊞</span>
        <span>{UI_COPY.chrome.topbar.widgets}</span>
      </button>

      <span
        className="topbar-time mono dim"
        suppressHydrationWarning
      >
        {now}
      </span>
    </div>
  );
}
