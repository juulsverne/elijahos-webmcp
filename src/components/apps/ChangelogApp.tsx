"use client";

import { APPS } from "@/lib/apps";
import { openApp } from "@/lib/app-launcher";
import { CHANGELOG, type ChangeItem } from "@/lib/changelog";
import { UI_COPY } from "@/lib/ui-copy";

const COPY = UI_COPY.changelog;

// Render an ISO date as e.g. "May 20, 2026" in a stable, locale-pinned way so
// the label doesn't drift with the visitor's timezone (the dates are calendar
// dates, not instants).
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ChangeRow({ change }: { change: ChangeItem }) {
  // Resolve the deep-link target to a real app, if any. An unknown id (guarded
  // against by changelog.test.ts) simply renders no button.
  const target = change.appId ? APPS[change.appId] : undefined;
  return (
    <li className="changelog-change">
      <span className={`changelog-chip changelog-chip--${change.kind}`}>
        <span className="changelog-chip-dot" aria-hidden="true" />
        {COPY.kinds[change.kind]}
      </span>
      <span className="changelog-change-text">{change.text}</span>
      {target && (
        <button
          type="button"
          className="changelog-open"
          onClick={() => openApp(target.id)}
          aria-label={COPY.openApp(target.title)}
        >
          {COPY.open}
          <span aria-hidden="true"> ↗</span>
        </button>
      )}
      {!target && change.href && (
        <a
          className="changelog-open"
          href={change.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${change.href}`}
        >
          {COPY.open}
          <span aria-hidden="true"> ↗</span>
        </a>
      )}
    </li>
  );
}

export function ChangelogApp() {
  return (
    <div className="changelog-app">
      <header className="changelog-header">
        <span className="app-kicker">{APPS.changelog.title}</span>
        <h1 className="changelog-title">{COPY.title}</h1>
        <p className="changelog-tagline">{COPY.tagline}</p>
      </header>
      <ol className="changelog-feed">
        {CHANGELOG.map((entry) => (
          <li key={entry.id} className="changelog-entry">
            <div className="changelog-entry-head">
              <time className="changelog-entry-date" dateTime={entry.date}>
                {formatDate(entry.date)}
              </time>
              {entry.version && (
                <span className="changelog-version">{entry.version}</span>
              )}
            </div>
            <h2 className="changelog-entry-title">{entry.title}</h2>
            {entry.summary && (
              <p className="changelog-entry-summary">{entry.summary}</p>
            )}
            <ul className="changelog-changes">
              {entry.changes.map((change, i) => (
                <ChangeRow key={i} change={change} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
