"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDesktopStore } from "@/lib/desktop-store";
import { APPS, LAUNCHPAD_ORDER } from "@/lib/apps";
import { setLaunchOrigin } from "@/lib/launch-origin";
import { UI_COPY } from "@/lib/ui-copy";

export function Launchpad() {
  const launchpadOpen = useDesktopStore((s) => s.launchpadOpen);
  const setLaunchpadOpen = useDesktopStore((s) => s.setLaunchpadOpen);
  const open = useDesktopStore((s) => s.open);

  // Two-flag state machine drives the entrance/exit animation:
  //   `mounted` controls whether the DOM node exists at all.
  //   `entered` controls whether the `is-open` class is applied.
  // Sequence on open: mount the node first (no is-open), then on the
  // next frame add is-open so the CSS transition has a starting state.
  // Sequence on close: drop is-open, then unmount after the transition
  // finishes. All state writes are deferred via rAF or setTimeout to
  // satisfy the project's react-hooks/set-state-in-effect rule.
  const [mounted, setMounted] = useState(launchpadOpen);
  const [entered, setEntered] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const firstTileRef = useRef<HTMLButtonElement>(null);
  // Element that had focus before the overlay opened. Restored on close
  // so keyboard users land back on the launchpad dock button.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Drive the mount/entered flags from the store value.
  useEffect(() => {
    if (launchpadOpen) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        setMounted(true);
        // One more frame so the just-mounted node paints without is-open
        // before the class is added. Without this gap the CSS transition
        // has nowhere to animate from and the overlay snaps to final state.
        raf2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    // Closing path: drop is-open immediately so the reverse CSS transition
    // runs, then unmount after it finishes. Matches --launchpad-out (140ms)
    // plus a small buffer.
    const dropClass = requestAnimationFrame(() => setEntered(false));
    const unmount = window.setTimeout(() => {
      setMounted(false);
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    }, 220);
    return () => {
      cancelAnimationFrame(dropClass);
      window.clearTimeout(unmount);
    };
  }, [launchpadOpen]);

  // Reflect open state on body for the dock/topbar pointer-events override.
  // Cleanup always clears the attribute so an unmount mid-animation cannot
  // leave the dock and topbar permanently non-clickable.
  useEffect(() => {
    if (entered) {
      document.body.dataset.launchpadOpen = "true";
    } else {
      delete document.body.dataset.launchpadOpen;
    }
    return () => {
      delete document.body.dataset.launchpadOpen;
    };
  }, [entered]);

  // ESC closes; focus first tile on open; basic focus trap on Tab.
  useEffect(() => {
    if (!entered) return;
    firstTileRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setLaunchpadOpen(false);
        return;
      }
      if (e.key !== "Tab" || !frameRef.current) return;
      const tiles = Array.from(
        frameRef.current.querySelectorAll<HTMLButtonElement>(".launchpad-tile"),
      );
      if (tiles.length <= 1) return;
      const first = tiles[0];
      const last = tiles[tiles.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, setLaunchpadOpen]);

  if (!mounted) return null;

  return (
    <div
      className={`launchpad-root${entered ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={UI_COPY.chrome.launchpad.title}
    >
      <div
        className="launchpad-backdrop"
        onClick={() => setLaunchpadOpen(false)}
      />
      <div
        ref={frameRef}
        className="launchpad-frame"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="launchpad-caption">{UI_COPY.chrome.launchpad.caption}</div>
        <div className="launchpad-grid">
          {LAUNCHPAD_ORDER.map((id, i) => {
            const app = APPS[id];
            if (!app) return null;
            return (
              <button
                key={id}
                ref={i === 0 ? firstTileRef : undefined}
                type="button"
                className="launchpad-tile"
                // Drives the staggered entrance cascade in launchpad.css.
                style={{ "--lp-i": i } as CSSProperties}
                onClick={(e) => {
                  // The window morphs out of the tile's icon (Window.tsx
                  // consumes this via takeLaunchOrigin).
                  const glyph =
                    e.currentTarget.querySelector(".launchpad-tile-glyph") ??
                    e.currentTarget;
                  setLaunchOrigin(id, glyph);
                  open(id);
                }}
                aria-label={UI_COPY.chrome.launchpad.openApp(app.title)}
              >
                <span className="launchpad-tile-glyph">{app.icon}</span>
                <span className="launchpad-tile-label">{app.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
