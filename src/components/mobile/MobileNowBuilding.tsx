"use client";

import { APPS } from "@/lib/apps";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { originFromTrigger, type AppOrigin } from "@/lib/app-launcher";

type Props = {
  // Same opener the dock and drawer use, so the card expands into the app
  // frame from its own glyph tile rather than jump-cutting.
  onOpen: (id: string, origin?: AppOrigin) => void;
};

// "Now building" card — the one featured project, pinned under the glance
// widgets. Everything but the kicker comes from ELIJAH.nowBuilding, and the
// glyph comes from the app registry via its `appId`, so featuring a different
// project is a one-line data edit.
//
// Renders nothing if the referenced app isn't available on mobile (unknown id,
// desktop-only). A card that looks tappable but opens nothing is worse than an
// absent one, and the grid simply closes up.
export function MobileNowBuilding({ onOpen }: Props) {
  const { appId, name, blurb } = ELIJAH.nowBuilding;
  const app = APPS[appId];
  if (!app || app.desktopOnly) return null;

  return (
    <button
      type="button"
      className="mobile-widget mobile-now-building"
      data-accent="blue"
      onClick={(e) => onOpen(appId, originFromTrigger(e.currentTarget))}
      aria-label={UI_COPY.chrome.mobile.nowBuilding.open(name)}
    >
      <span className="mobile-now-building-icon" aria-hidden="true">
        {app.icon}
      </span>
      <span className="mobile-now-building-text">
        <span className="mobile-now-building-kicker">
          {/* Live dot: this card is the one thing actively in progress. */}
          <span className="mobile-now-building-dot" aria-hidden="true" />
          {UI_COPY.chrome.mobile.nowBuilding.kicker}
        </span>
        <span className="mobile-now-building-name">{name}</span>
        <span className="mobile-now-building-blurb">{blurb}</span>
      </span>
      <span className="mobile-now-building-go" aria-hidden="true">
        →
      </span>
    </button>
  );
}
