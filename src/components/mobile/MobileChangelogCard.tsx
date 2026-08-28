"use client";

import { APPS } from "@/lib/apps";
import { CHANGELOG } from "@/lib/changelog";
import { UI_COPY } from "@/lib/ui-copy";
import { originFromTrigger, type AppOrigin } from "@/lib/app-launcher";

type Props = {
  // Same opener the dock and drawer use, so the card expands into the app
  // frame from its own glyph tile rather than jump-cutting.
  onOpen: (id: string, origin?: AppOrigin) => void;
};

// Changelog card — pinned under the "now building" card. Surfaces the newest
// release note (title + summary + version pill, all from CHANGELOG[0]) and
// opens the /changelog app on tap. Shares the now-building card's anatomy
// (icon tile · text stack · go arrow) so the two read as one system; the gold
// accent and version pill are what set it apart.
//
// Renders nothing if the changelog app isn't available on mobile or the log
// is empty — a card that opens nothing is worse than an absent one.
export function MobileChangelogCard({ onOpen }: Props) {
  const app = APPS.changelog;
  const latest = CHANGELOG[0];
  if (!app || app.desktopOnly || !latest) return null;

  return (
    <button
      type="button"
      className="mobile-widget mobile-changelog"
      data-accent="gold"
      onClick={(e) => onOpen(app.id, originFromTrigger(e.currentTarget))}
      aria-label={UI_COPY.chrome.mobile.changelog.open(latest.title)}
    >
      <span className="mobile-changelog-icon" aria-hidden="true">
        {app.icon}
      </span>
      <span className="mobile-changelog-text">
        <span className="mobile-changelog-kicker">
          {UI_COPY.chrome.mobile.changelog.kicker}
          {latest.version && (
            <span className="mobile-changelog-version">{latest.version}</span>
          )}
        </span>
        {/* The headline is the whole pitch — the entry summary would only
            ellipsize into noise at phone width, so it stays in the app. */}
        <span className="mobile-changelog-name">{latest.title}</span>
      </span>
      <span className="mobile-changelog-go" aria-hidden="true">
        →
      </span>
    </button>
  );
}
