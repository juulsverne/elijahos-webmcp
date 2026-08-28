"use client";

import { useEffect, useState } from "react";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";

// Re-derive on the minute so the clock stays honest on a phone left open.
// Aligning to the next :00 second (rather than a naive 60s interval from
// mount) keeps the displayed minute in step with the wall clock instead of
// drifting by up to a minute.
const MINUTE_MS = 60_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// "wed, jul 9" — lowercase to match the OS's mono voice.
function dateLine(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${d.getDate()}`.toLowerCase();
}

// Home-screen masthead: the OS brand in display serif over a single mono
// metadata row — live clock on the left, role on the right. Two register
// levels only, so the brand is the one dominant element and everything under
// it reads as system chrome. The row stacks (role above clock) on phones too
// narrow to seat both halves; see .mobile-masthead-meta.
//
// Time is client-only on purpose. Rendering the server's clock would both
// hydration-mismatch and show the wrong timezone, so the first paint omits
// the clock and fills it in on mount — the serif line, which is what carries
// the layout, is present from the start either way.
export function MobileMasthead() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const sync = () => setNow(new Date());
    sync();
    let interval: ReturnType<typeof setInterval> | null = null;
    // Wait out the remainder of the current minute, then tick on the minute.
    const align = setTimeout(
      () => {
        sync();
        interval = setInterval(sync, MINUTE_MS);
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);

  const clock = now
    ? [dateLine(now), `${pad(now.getHours())}:${pad(now.getMinutes())}`].join(
        UI_COPY.chrome.mobile.statusSeparator,
      )
    : null;

  return (
    <div className="mobile-masthead">
      {/* The brand line is the page's real heading now that it says what the
          site is. The visible text stays brand-only — name and role ride
          along hidden so assistive tech and search still get the full
          identity without crowding the header. */}
      <h1 className="mobile-masthead-brand">
        {ELIJAH.osName}
        <span className="mobile-masthead-dot gradient-text" aria-hidden="true">
          .
        </span>
        <span className="sr-only">
          {UI_COPY.chrome.mobile.headingSuffix(ELIJAH.osBootSubtitle)}
        </span>
      </h1>
      <p className="mobile-masthead-meta">
        {/* Reserved even while empty so the widget stack below doesn't shift
            when the clock resolves on mount. */}
        <span className="mobile-masthead-clock">{clock ?? " "}</span>
        {/* Cased in CSS so ELIJAH.role stays the one canonical spelling. */}
        <span className="mobile-masthead-role">{ELIJAH.role}</span>
      </p>
    </div>
  );
}
