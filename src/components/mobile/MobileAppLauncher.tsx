"use client";

import { useEffect, type CSSProperties } from "react";
import { APPS } from "@/lib/apps";
import { originFromTrigger, type AppOrigin } from "@/lib/app-launcher";
import { UI_COPY } from "@/lib/ui-copy";

type Props = {
  // Every app reachable on mobile, in display order. Includes the apps pinned
  // to the bottom dock — the drawer is the "all apps" surface, so unlike the
  // home grid it deliberately does NOT apply the dock-exclusivity filter.
  ids: string[];
  // Shared accent lookup (owned by MobileShell) so a tile reads the same accent
  // here, on the home grid, and in the dock.
  accents: Record<string, "pink" | "blue" | "gold" | "violet">;
  onOpen: (id: string, origin?: AppOrigin) => void;
  onClose: () => void;
  // True while the close animation plays; the frame stays mounted for the
  // duration (see DRAWER_EXIT_MS in MobileShell) so it can collapse out.
  closing: boolean;
};

// Full-screen "all apps" drawer — the mobile twin of the desktop launcher.
// Opened from the bottom dock's Apps button; a single vertically-scrolling
// grid of every app, dismissed via the back pill or Escape. Tiles reuse the
// home-screen `.mobile-tile` language so the two surfaces read as one OS.
export function MobileAppLauncher({ ids, accents, onOpen, onClose, closing }: Props) {
  // Escape closes — covers desktop browsers narrowed below the mobile
  // breakpoint where there's a hardware keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`mobile-launcher${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={UI_COPY.chrome.launchpad.title}
    >
      <div className="mobile-appbar">
        <button
          type="button"
          className="mobile-appbar-back"
          onClick={onClose}
          aria-label={UI_COPY.chrome.mobile.backToHome}
        >
          <span className="mobile-appbar-back-glyph" aria-hidden="true">
            ‹
          </span>
          {UI_COPY.chrome.mobile.home}
        </button>
        <span className="mobile-appbar-title">
          {UI_COPY.chrome.launchpad.caption}
        </span>
      </div>

      <div className="mobile-launcher-body">
        <div className="mobile-launcher-grid">
          {ids.map((id, i) => {
            const app = APPS[id];
            if (!app) return null;
            return (
              <button
                key={id}
                type="button"
                className="mobile-tile"
                data-accent={accents[id] ?? "violet"}
                // Index feeds the entrance cascade's animation-delay.
                style={{ "--i": i } as CSSProperties}
                onClick={(e) => onOpen(id, originFromTrigger(e.currentTarget))}
                aria-label={UI_COPY.chrome.mobile.openApp(app.title)}
              >
                <span className="mobile-tile-icon" aria-hidden="true">
                  {app.icon}
                </span>
                <span className="mobile-tile-label">
                  {app.mobileLabel ?? app.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
