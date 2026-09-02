"use client";

import { useEffect, useState } from "react";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { WIDGETS } from "@/lib/widgets";

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function parseCalendarDate(iso: string): CalendarDate {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatBirthday(iso: string): string {
  const born = parseCalendarDate(iso);
  const d = new Date(born.year, born.month - 1, born.day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function computeAge(bornISO: string, now: Date): string {
  const born = parseCalendarDate(bornISO);
  let years = now.getFullYear() - born.year;
  let months = now.getMonth() - (born.month - 1);
  if (now.getDate() < born.day) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "--";
  if (years === 0 && months === 0) return "newborn";
  if (years === 0) return `${months}mo`;
  return `${years}y ${months}m`;
}

export function WobblesWidget({ active = true }: { active?: boolean }) {
  const media = ELIJAH.wobbles.media;
  const bio = ELIJAH.wobbles.bio;

  // Pages: media first, vitals last. Index === media.length is the vitals slide.
  const totalPages = media.length + 1;
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => new Date());

  // Recompute age once a minute — cheap, keeps the vitals card honest.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [active]);
  const age = computeAge(bio.born, now);
  const birthday = formatBirthday(bio.born);

  // Spec-sheet cells for the vitals page, laid out two-across in a fixed
  // two-row grid. Two deliberate omissions:
  //   AGE   — the only live value here, so it gets the hero readout instead.
  //   BREED — identity rather than a stat; it rides under the nameplate, which
  //           also keeps this grid at two rows (a third doesn't fit the stage).
  // Order matters: the left column is wider, so the long values go at even
  // indices. Keep this list to four — see the budget note in wobbles.css.
  const stats: { label: string; value: string }[] = [
    { label: UI_COPY.widgets.wobbles.birthday, value: birthday },
    { label: UI_COPY.widgets.wobbles.weight, value: bio.weight },
    { label: UI_COPY.widgets.wobbles.color, value: bio.color },
    { label: UI_COPY.widgets.wobbles.treats, value: bio.treats.join(", ") },
  ];

  function nav(direction: 1 | -1) {
    setPage((p) => (p + direction + totalPages) % totalPages);
  }

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) nav(-1);
    else nav(1);
  }

  return (
    <div
      className={`widget-card wobbles-widget${page === media.length ? " is-vitals" : ""}`}
      onClick={onClick}
    >
      <span className="widget-tip" aria-hidden="true">
        {UI_COPY.widgets.wobbles.tip}
      </span>

      <div className="wobbles-stage">
        <div
          className="wobbles-track"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {media.map((m, i) => {
            const isCurrent = active && i === page;
            return (
              <div className="wobbles-slide" key={m.src}>
                {m.kind === "video" ? (
                  <video
                    className="wobbles-media"
                    src={m.src}
                    // Poster shows instantly; off-screen clips set preload="none"
                    // so only the active slide downloads its video bytes. This
                    // stops the whole carousel from fetching every clip at once
                    // when the panel opens.
                    poster={m.poster}
                    muted
                    loop
                    autoPlay={isCurrent}
                    playsInline
                    preload={isCurrent ? "auto" : "none"}
                    aria-label={m.alt}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- public folder static asset */
                  <img
                    className="wobbles-media"
                    src={m.src}
                    alt={m.alt}
                    decoding="async"
                    draggable={false}
                    fetchPriority={isCurrent ? "high" : "low"}
                    // Only the active photo loads eagerly; the rest defer until
                    // they're scrolled into view.
                    loading={isCurrent ? "eager" : "lazy"}
                  />
                )}
              </div>
            );
          })}

          <div className="wobbles-slide wobbles-vitals-slide">
            <section
              className="wobbles-vitals"
              aria-label={UI_COPY.widgets.wobbles.vitalsAria(bio.name)}
            >
              <div className="wobbles-vitals-head">
                <span className="wobbles-vitals-kicker">{WIDGETS.wobbles.kicker}</span>
                <span className="wobbles-vitals-role">{bio.title}</span>
              </div>

              <div className="wobbles-vitals-hero">
                <div className="wobbles-vitals-nameblock">
                  <h3 className="wobbles-vitals-name serif-i">
                    {bio.name}
                    <span className="gradient-text">.</span>
                  </h3>
                  {bio.breed && (
                    <p className="wobbles-vitals-breed">{bio.breed}</p>
                  )}
                </div>
                <div className="wobbles-vitals-age">
                  <span className="wobbles-vitals-age-value">{age}</span>
                  <span className="wobbles-vitals-age-label">
                    {UI_COPY.widgets.wobbles.age}
                  </span>
                </div>
              </div>

              <dl className="wobbles-vitals-grid">
                {stats.map((s) => (
                  <div className="wobbles-vitals-cell" key={s.label}>
                    <dt>{s.label}</dt>
                    {/* title= surfaces the full string on the off chance a
                        longer value than today's lands here. */}
                    <dd title={s.value}>{s.value}</dd>
                  </div>
                ))}
              </dl>

              {bio.fact && <p className="wobbles-vitals-foot">{bio.fact}</p>}
            </section>
          </div>
        </div>
      </div>

      {/* Edge chevrons — visible on hover */}
      <span className="wobbles-chev wobbles-chev-l" aria-hidden>‹</span>
      <span className="wobbles-chev wobbles-chev-r" aria-hidden>›</span>

      {/* Page indicator dots */}
      <div className="wobbles-dots" aria-hidden>
        {Array.from({ length: totalPages }).map((_, i) => (
          <span key={i} className={`wobbles-dot${i === page ? " is-active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
