"use client";

import { UI_COPY } from "@/lib/ui-copy";
import type { AppOrigin } from "@/lib/app-launcher";
import { MobileNowBuilding } from "./MobileNowBuilding";
import { MobileChangelogCard } from "./MobileChangelogCard";
import { MobileIndexCard } from "./MobileIndexCard";
import { MobileWeatherCard } from "./MobileWeatherCard";

// Home-screen widget console. A 4-column grid where the hero player and the
// "now building" card span the full width and the two glance cards (pulse,
// weather) take half each — the phone home screen's entire content, since
// there is no app grid (every app lives behind ▦ in the dock).
//
// Column spans are set in CSS per card rather than here, so the grid can be
// re-proportioned without touching this file.
export function MobileWidgets({
  active = true,
  onOpen,
}: {
  active?: boolean;
  onOpen: (id: string, origin?: AppOrigin) => void;
}) {
  return (
    <section className="mobile-widgets" aria-label={UI_COPY.widgets.region}>
      <MobileIndexCard active={active} />
      <MobileWeatherCard />
      <MobileNowBuilding onOpen={onOpen} />
      <MobileChangelogCard onOpen={onOpen} />
    </section>
  );
}
