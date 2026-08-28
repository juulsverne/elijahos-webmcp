"use client";

import {
  useEffect,
  useRef,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { AppDef } from "@/lib/apps";
import type { AppOrigin } from "@/lib/app-launcher";
import {
  MOBILE_MORPH_OPEN_MS,
  MOBILE_CONTENT_STAGGER_MS,
  MOBILE_CONTENT_FADE_OUT_MS,
  MOBILE_MORPH_CLOSE_MS,
  MOBILE_MORPH_CLOSE_DELAY_MS,
} from "@/lib/layout";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { UI_COPY } from "@/lib/ui-copy";

type Props = {
  app: AppDef;
  // The app's OS accent (from the shell's TILE_ACCENT map) — drives the
  // frame's "room" chrome: accent hairline, back glyph, inner edge glow.
  accent: string;
  Body: ComponentType;
  // `via` tells the shell which exit animation to play: omitted/"home" for
  // the collapse-into-icon, "swipe" for the slide-out-right.
  onBack: (via?: "home" | "swipe") => void;
  // Viewport point the frame expands from / collapses into (the tapped icon).
  origin?: AppOrigin | null;
  // True while the close animation plays, just before unmount.
  closing?: boolean;
  // How the close was triggered — picks between the two exit animations.
  closingVia?: "home" | "swipe";
};

// Edge-swipe tuning. Horizontal travel before the gesture is claimed (so a
// sloppy vertical scroll near the edge isn't hijacked), the fraction of the
// frame width that commits a dismissal on release, and the flick escape
// hatch (fast rightward release commits even from a short drag).
const SWIPE_CLAIM_PX = 10;
const SWIPE_COMMIT_FRACTION = 1 / 3;
const FLICK_MIN_PX = 48;
const FLICK_VELOCITY = 0.45; // px/ms

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  vx: number;
  claimed: boolean;
};

// Easing for the surface morph — same decel family the shell's CSS uses.
const MORPH_OPEN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const MORPH_CLOSE_EASE = "cubic-bezier(0.4, 0, 0.6, 1)";
// Swipe exit: duration derived from release velocity, clamped to feel like a
// continuation of the finger rather than a canned animation. The max stays
// under MOBILE_APP_EXIT_MS so the frame always outlives its exit animation.
const SWIPE_EXIT_MIN_MS = 120;
const SWIPE_EXIT_MAX_MS = 280;
const SWIPE_EXIT_MIN_VELOCITY = 0.6; // px/ms floor so slow releases stay snappy

// The transform that maps the full-screen frame onto the tapped icon's rect
// (or a plain center scale when no rect was captured). transform-origin must
// be "0 0" for the rect form.
function morphTransform(
  origin: AppOrigin | null | undefined,
  frameRect: DOMRect,
): { transform: string; fromRect: boolean } {
  if (origin?.w && origin?.h && frameRect.width > 0 && frameRect.height > 0) {
    const sx = origin.w / frameRect.width;
    const sy = origin.h / frameRect.height;
    const tx = origin.x - origin.w / 2 - frameRect.left;
    const ty = origin.y - origin.h / 2 - frameRect.top;
    return {
      transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`,
      fromRect: true,
    };
  }
  return { transform: "scale(0.35)", fromRect: false };
}

// The icon's corner radius, scaled up so it still *reads* as the tile radius
// at the morph's start scale (a raw 18px on a full-screen surface scaled down
// to 60px wide would render as ~3px). Sampled from the token so themes stay
// honest — same pattern as the --canvas-* tokens.
function morphRadius(frame: HTMLElement, origin: AppOrigin): string {
  const raw = getComputedStyle(frame)
    .getPropertyValue("--mobile-tile-r")
    .trim();
  const px = Number.parseFloat(raw) || 0;
  const scale = origin.w ? frame.clientWidth / origin.w : 1;
  return `${px * scale}px`;
}

// Full-screen app view used by the mobile shell. The desktop window chrome
// (traffic-light buttons, drag bar, resize handles) does not apply — instead
// we get a single back button, a centered title, and an iOS-style back swipe
// from the left edge. The body element mirrors `.win-body` semantics
// (container-type, scrolling) so existing app CSS that targets container
// widths Just Works.
//
// Dismissal is the on-screen "home" button or the edge swipe. We intentionally
// do NOT manipulate `window.history` — pushing a marker entry to intercept
// Android hardware-back interacts badly with React's strict-mode
// double-mounting in dev (the cleanup's history.back() round-trips into a
// fresh popstate listener and instantly dismisses the app). Hardware back
// will navigate away from the page, which matches what users expect from a
// web app and is recoverable via browser forward.
export function MobileAppFrame({
  app,
  accent,
  Body,
  onBack,
  origin,
  closing,
  closingVia,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Keyboard/visual-viewport tracking lives on the shell root (MobileShell
  // mounts useKeyboardInset there); this frame inherits --kb-inset from it.

  const reducedMotion = useReducedMotion();

  // Open morph: grow the frame out of the tapped icon's rect. WAAPI (not CSS
  // keyframes) because the start transform is computed per-origin at mount.
  // data-morph records which path ran — tests and debugging key off it.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (reducedMotion) {
      frame.dataset.morph = "none";
      return;
    }
    if (typeof frame.animate !== "function") {
      // No WAAPI: fall back to the CSS point-scale keyframes.
      frame.dataset.morph = "css";
      frame.classList.add("is-css-open");
      return;
    }
    const rect = frame.getBoundingClientRect();
    const { transform, fromRect } = morphTransform(origin, rect);
    frame.dataset.morph = fromRect ? "rect" : "center";
    if (fromRect) frame.style.transformOrigin = "0 0";
    const surface = frame.animate(
      [
        {
          transform,
          opacity: 0.4,
          borderRadius:
            fromRect && origin ? morphRadius(frame, origin) : "0px",
        },
        { transform: "none", opacity: 1, borderRadius: "0px" },
      ],
      {
        duration: MOBILE_MORPH_OPEN_MS,
        easing: MORPH_OPEN_EASE,
        fill: "backwards",
      },
    );
    // Content arrives a beat behind the surface so the morph reads as a
    // material expanding, not a screenshot stretching.
    const content = frame.querySelectorAll(".mobile-appbar, .mobile-appbody");
    const contentAnims = Array.from(content).map((el) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 220,
          delay: MOBILE_CONTENT_STAGGER_MS,
          easing: "ease-out",
          fill: "backwards",
        },
      ),
    );
    return () => {
      surface.cancel();
      contentAnims.forEach((a) => a.cancel());
    };
    // Mount-only: the frame is keyed by app id in MobileShell, so origin is
    // fixed for the life of this element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close morph (home button). Mirror of the open: content fades first, then
  // the surface collapses back into the icon rect. The swipe exit stays in
  // CSS (.is-swipe) — it continues from the finger, a different motion. No
  // cancel-on-cleanup here: `closing` only ever flips once and the frame
  // unmounts right after (MOBILE_APP_EXIT_MS), which drops the animations.
  useEffect(() => {
    if (!closing || closingVia === "swipe") return;
    const frame = frameRef.current;
    if (!frame || reducedMotion || typeof frame.animate !== "function") {
      // Reduced motion (CSS killswitch hides instantly) or no WAAPI
      // (.is-css-open collapse plays) — nothing to drive from JS.
      return;
    }
    const rect = frame.getBoundingClientRect();
    const { transform, fromRect } = morphTransform(origin, rect);
    if (fromRect) frame.style.transformOrigin = "0 0";
    frame.querySelectorAll(".mobile-appbar, .mobile-appbody").forEach((el) => {
      el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: MOBILE_CONTENT_FADE_OUT_MS,
        easing: "ease-in",
        fill: "forwards",
      });
    });
    frame.animate(
      [
        { transform: "none", opacity: 1, borderRadius: "0px" },
        {
          transform,
          opacity: 0,
          borderRadius:
            fromRect && origin ? morphRadius(frame, origin) : "0px",
        },
      ],
      {
        duration: MOBILE_MORPH_CLOSE_MS,
        delay: MOBILE_MORPH_CLOSE_DELAY_MS,
        easing: MORPH_CLOSE_EASE,
        fill: "forwards",
      },
    );
  }, [closing, closingVia, origin, reducedMotion]);

  // The drag writes transform/opacity straight to the DOM node instead of
  // through state — pointermove fires per frame and a re-render per move
  // would thrash the whole app body underneath.
  const handleEdgeDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (closing || dragRef.current || !e.isPrimary) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vx: 0,
      claimed: false,
    };
    // Keep receiving moves once the finger leaves the narrow strip.
    // Synthetic events (tests) can carry a pointerId the browser doesn't
    // recognize; the gesture still works without capture in that case.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture — moves are only seen while over the strip */
    }
  };

  const handleEdgeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.claimed) {
      // Claim only a clearly horizontal rightward drag; vertical movement
      // stays with the browser (the strip is touch-action: pan-y, so native
      // scrolling fires pointercancel and we never claim).
      if (dx < SWIPE_CLAIM_PX || dx < Math.abs(dy)) return;
      drag.claimed = true;
    }
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.vx = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;

    const x = Math.max(0, dx);
    frame.style.transition = "none";
    frame.style.transform = `translateX(${x}px)`;
    frame.style.opacity = String(
      1 - 0.25 * Math.min(1, x / (frame.offsetWidth || 1)),
    );
  };

  // Spring the frame back to rest — used when the drag releases short of the
  // commit threshold or the browser takes the gesture (pointercancel).
  const settleBack = () => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.style.transition =
      "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease";
    frame.style.transform = "";
    frame.style.opacity = "";
  };

  const handleEdgeUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (!drag.claimed || !frame) return;

    const x = Math.max(0, drag.lastX - drag.startX);
    const width = frame.offsetWidth || 1;
    const commit =
      x > width * SWIPE_COMMIT_FRACTION ||
      (x > FLICK_MIN_PX && drag.vx > FLICK_VELOCITY);

    if (commit) {
      // Hand the release position and speed to the slide-out keyframes so the
      // exit continues from under the finger at the finger's velocity. The
      // inline transform/opacity stay put — the .is-swipe animation overrides
      // them for its duration, which avoids a one-frame snap back to x=0
      // before React applies the class.
      const remaining = width - x;
      const ms = Math.round(
        Math.min(
          SWIPE_EXIT_MAX_MS,
          Math.max(
            SWIPE_EXIT_MIN_MS,
            remaining / Math.max(drag.vx, SWIPE_EXIT_MIN_VELOCITY),
          ),
        ),
      );
      frame.style.setProperty("--swipe-x", `${x}px`);
      frame.style.setProperty("--swipe-ms", `${ms}ms`);
      onBack("swipe");
    } else {
      settleBack();
    }
  };

  const handleEdgeCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (drag.claimed) settleBack();
  };

  return (
    <div
      ref={frameRef}
      className={`mobile-appframe${
        closing ? ` is-closing${closingVia === "swipe" ? " is-swipe" : ""}` : ""
      }`}
      data-app-id={app.id}
      data-accent={accent}
      style={
        origin
          ? { transformOrigin: `${origin.x}px ${origin.y}px` }
          : undefined
      }
      role="dialog"
      aria-modal="true"
      aria-label={app.title}
    >
      <div className="mobile-appbar">
        <button
          type="button"
          className="mobile-appbar-back"
          onClick={() => onBack()}
          aria-label={UI_COPY.chrome.mobile.backToHome}
        >
          <span className="mobile-appbar-back-glyph" aria-hidden="true">
            ‹
          </span>
          <span>{UI_COPY.chrome.mobile.home}</span>
        </button>
        <span className="mobile-appbar-title">{app.title}</span>
      </div>
      <div className="mobile-appbody">
        <Body />
      </div>
      {/* iOS-style back-swipe surface: drag right from the left edge to
          dismiss. Pure gesture affordance — the back button above is the
          accessible path, so this stays hidden from the a11y tree. */}
      <div
        className="mobile-appframe-edge"
        aria-hidden="true"
        onPointerDown={handleEdgeDown}
        onPointerMove={handleEdgeMove}
        onPointerUp={handleEdgeUp}
        onPointerCancel={handleEdgeCancel}
      />
    </div>
  );
}
