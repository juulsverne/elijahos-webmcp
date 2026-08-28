"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDesktopStore } from "@/lib/desktop-store";
import {
  APPS,
  DOCK_ORDER,
  DOCK_SEP_ID,
  LAUNCHPAD_BTN_ID,
  LAUNCHPAD_ICON,
} from "@/lib/apps";
import { applyMinimizeTarget } from "@/lib/minimize-anim";
import { setLaunchOrigin } from "@/lib/launch-origin";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { UI_COPY } from "@/lib/ui-copy";

// Magnification is one slot deep and lives in dock.css (`:hover` flips
// --dock-mag on the single hovered button — no proximity falloff, neighbors
// never move). What Dock.tsx owns is the dock's *shape*: the pill's glass is
// painted by .dock-glass, clipped to a silhouette path whose top edge grows
// a bell-curve bump above the hovered slot, and .dock-stroke traces the same
// path so the 1px border follows the bulge. A small exponential tween chases
// the bump's target (center x + crest height) and re-feeds both layers each
// animation frame, which is what makes the bump swell out of the flat edge
// and slide liquidly between slots instead of snapping.
const BUMP_HALF_WIDTH_PX = 34; // bell half-width along the pill's top edge
const BUMP_SETTLE_RATE = 18; // 1/s — exponential approach speed of the tween
// Smallest slice of a top corner arc the bump may leave intact (radians) —
// keeps a hint of the pill's corner even when an end slot is magnified.
const BUMP_CORNER_MIN_RAD = 0.25;
const LAUNCH_BOUNCE_CLASS = "is-launching";

// Rounded-pill outline with a raised bell centered on `bx` (crest height
// `bh`; 0 degenerates to the flat resting pill), in the coordinate space of
// the .dock-glass/.dock-stroke layers — which extend `top` (the CSS
// --dock-bump-reach) above the pill so the bump has room to rise. `inset`
// shrinks the whole silhouette: the stroke path passes 0.5 so its 1px line
// hugs the inside of the glass edge, like the old CSS border did.
//
// Near the pill's ends a shoulder would land inside a top corner arc; the
// bell then starts partway down the arc itself (tangent rotated to match),
// so the swell wraps the corner instead of colliding with it in a steep
// wall. How far it reaches down scales with bh/bhMax, so a collapsing bump
// hands the corner back and bh = 0 is the exact resting pill again. The
// command count never changes, so successive frames morph cleanly.
function dockSilhouette(
  w: number,
  h: number,
  top: number,
  radius: number,
  bx: number,
  bh: number,
  bhMax: number,
  inset: number,
): string {
  const L = inset;
  const R = w - inset;
  const T = top + inset;
  const B = h - inset;
  const r = Math.max(radius - inset, 0);
  const crest = T - bh;
  const eat = bhMax > 0 ? Math.min(bh / bhMax, 1) : 0;
  const sL = bx - BUMP_HALF_WIDTH_PX;
  const sR = bx + BUMP_HALF_WIDTH_PX;

  // Left shoulder: on the straight edge (horizontal tangent), or blended
  // onto the top-left corner arc when the bell reaches past it.
  let startL = { x: sL, y: T }; // cubic start
  let uL = { x: 1, y: 0 }; // travel tangent at the cubic start
  let arcEndL = { x: L + r, y: T }; // where the top-left corner arc ends
  if (r > 0 && sL < L + r) {
    const phi = Math.max(
      Math.PI / 2 - (eat * (L + r - sL)) / r,
      BUMP_CORNER_MIN_RAD,
    );
    startL = { x: L + r - r * Math.cos(phi), y: T + r - r * Math.sin(phi) };
    uL = { x: Math.sin(phi), y: -Math.cos(phi) };
    arcEndL = startL; // partial arc: the bell takes over from here
  }
  // Right shoulder, mirrored onto the top-right corner arc.
  let endR = { x: sR, y: T }; // cubic end
  let uR = { x: 1, y: 0 }; // travel tangent at the cubic end
  let edgeR = { x: R - r, y: T }; // where the straight run to the corner ends
  if (r > 0 && sR > R - r) {
    const theta = Math.min(
      (eat * (sR - (R - r))) / r,
      Math.PI / 2 - BUMP_CORNER_MIN_RAD,
    );
    endR = { x: R - r + r * Math.sin(theta), y: T + r - r * Math.cos(theta) };
    uR = { x: Math.cos(theta), y: Math.sin(theta) };
    edgeR = endR; // zero-length run: the arc continues from the cubic's end
  }
  const dL = Math.max(bx - startL.x, 0);
  const dR = Math.max(endR.x - bx, 0);
  const n = (v: number) => v.toFixed(2);
  return (
    `M ${n(L)} ${n(T + r)} ` +
    `A ${n(r)} ${n(r)} 0 0 1 ${n(arcEndL.x)} ${n(arcEndL.y)} ` +
    `L ${n(startL.x)} ${n(startL.y)} ` +
    `C ${n(startL.x + uL.x * dL * 0.42)} ${n(startL.y + uL.y * dL * 0.42)} ` +
    `${n(bx - dL * 0.42)} ${n(crest)} ${n(bx)} ${n(crest)} ` +
    `C ${n(bx + dR * 0.42)} ${n(crest)} ` +
    `${n(endR.x - uR.x * dR * 0.42)} ${n(endR.y - uR.y * dR * 0.42)} ` +
    `${n(endR.x)} ${n(endR.y)} ` +
    `L ${n(edgeR.x)} ${n(edgeR.y)} ` +
    `A ${n(r)} ${n(r)} 0 0 1 ${n(R)} ${n(T + r)} ` +
    `L ${n(R)} ${n(B - r)} ` +
    `A ${n(r)} ${n(r)} 0 0 1 ${n(R - r)} ${n(B)} ` +
    `L ${n(L + r)} ${n(B)} ` +
    `A ${n(r)} ${n(r)} 0 0 1 ${n(L)} ${n(B - r)} Z`
  );
}

// macOS-style launch feedback: restartable bounce on the glyph while a new
// window is spawning. Class-based so dock.css owns the actual keyframes.
function playLaunchBounce(dockBtn: HTMLElement) {
  dockBtn.classList.remove(LAUNCH_BOUNCE_CLASS);
  // Force a reflow so re-adding the class restarts the keyframe animation
  // even when the previous bounce is still mid-flight.
  void dockBtn.offsetWidth;
  dockBtn.classList.add(LAUNCH_BOUNCE_CLASS);
  dockBtn.addEventListener(
    "animationend",
    () => dockBtn.classList.remove(LAUNCH_BOUNCE_CLASS),
    { once: true },
  );
}

export function Dock() {
  const openIds = useDesktopStore(
    useShallow((s) => s.wins.filter((w) => !w.minimized).map((w) => w.id)),
  );
  const focusId = useDesktopStore((s) => s.focusId);
  const open = useDesktopStore((s) => s.open);
  const minimize = useDesktopStore((s) => s.minimize);
  const launchpadOpen = useDesktopStore((s) => s.launchpadOpen);
  const toggleLaunchpad = useDesktopStore((s) => s.toggleLaunchpad);
  const openIdSet = useMemo(() => new Set(openIds), [openIds]);
  const reducedMotion = useReducedMotion();

  const dockRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLSpanElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  // Live bump state (x/h) chasing its target (tx/th). dims caches the layer
  // box plus the geometry CSS vars (read once on mount) so the rAF loop
  // never touches getComputedStyle.
  const bump = useRef({ x: 0, h: 0, tx: 0, th: 0, raf: 0, last: 0 });
  const dims = useRef({ w: 0, h: 0, reach: 0, rise: 0, radius: 0 });

  const paintBump = useCallback(() => {
    const { w, h, reach, rise, radius } = dims.current;
    if (!w) return;
    const b = bump.current;
    const glass = glassRef.current;
    const stroke = strokeRef.current;
    if (glass) {
      glass.style.clipPath = `path("${dockSilhouette(w, h, reach, radius, b.x, b.h, rise, 0)}")`;
    }
    if (stroke) {
      stroke.setAttribute("d", dockSilhouette(w, h, reach, radius, b.x, b.h, rise, 0.5));
    }
  }, []);

  const setBumpTarget = useCallback(
    (tx: number, th: number) => {
      const b = bump.current;
      if (Math.abs(b.tx - tx) < 0.5 && Math.abs(b.th - th) < 0.1) return;
      b.tx = tx;
      b.th = th;
      if (reducedMotion) {
        // Snap: state changes are fine under reduced motion, gliding isn't.
        b.x = tx;
        b.h = th;
        if (b.raf) {
          cancelAnimationFrame(b.raf);
          b.raf = 0;
        }
        paintBump();
        return;
      }
      if (b.raf) return; // the running loop will chase the new target
      b.last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(Math.max(now - b.last, 0) / 1000, 0.05);
        b.last = now;
        const k = 1 - Math.exp(-BUMP_SETTLE_RATE * dt);
        b.x += (b.tx - b.x) * k;
        b.h += (b.th - b.h) * k;
        const settled = Math.abs(b.tx - b.x) < 0.5 && Math.abs(b.th - b.h) < 0.1;
        if (settled) {
          b.x = b.tx;
          b.h = b.th;
        }
        paintBump();
        b.raf = settled ? 0 : requestAnimationFrame(step);
      };
      b.raf = requestAnimationFrame(step);
    },
    [reducedMotion, paintBump],
  );

  // Read the bump geometry from dock.css and keep the silhouette in sync
  // with the dock's size (buttons come and go with the viewport, so the
  // pill's width is not static).
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const cs = getComputedStyle(dock);
    const px = (name: string, fallback: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    const reach = px("--dock-bump-reach", 30);
    const rise = px("--dock-bump-rise", 16);
    const radius = px("--dock-radius", 18);
    const measure = () => {
      dims.current = {
        w: dock.offsetWidth,
        h: dock.offsetHeight + reach,
        reach,
        rise,
        radius,
      };
      paintBump();
    };
    bump.current.x = bump.current.tx = dock.offsetWidth / 2;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(dock);
    const b = bump.current;
    return () => {
      ro.disconnect();
      if (b.raf) {
        cancelAnimationFrame(b.raf);
        b.raf = 0;
      }
    };
  }, [paintBump]);

  const raiseBump = useCallback(
    (btn: HTMLElement) => {
      const dock = dockRef.current;
      if (!dock) return;
      const dockRect = dock.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setBumpTarget(
        btnRect.left - dockRect.left + btnRect.width / 2,
        dims.current.rise,
      );
    },
    [setBumpTarget],
  );

  const lowerBump = useCallback(() => {
    setBumpTarget(bump.current.tx, 0);
  }, [setBumpTarget]);

  // Mouse only — touch pointers get press physics but no magnification, and
  // reduced-motion visitors get neither (matching the CSS hover gate).
  const onDockPointerOver = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || e.pointerType !== "mouse") return;
      const btn = (e.target as Element).closest?.(".dock-btn");
      if (btn instanceof HTMLElement) raiseBump(btn);
    },
    [reducedMotion, raiseBump],
  );

  const onDockPointerLeave = useCallback(() => {
    // A keyboard-focused button keeps its bump even when the mouse wanders
    // off — CSS keeps that button magnified via :focus-visible too.
    if (dockRef.current?.querySelector(".dock-btn:focus-visible")) return;
    lowerBump();
  }, [lowerBump]);

  const onDockFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.matches(".dock-btn:focus-visible")) {
        raiseBump(t);
      }
    },
    [raiseBump],
  );

  const onDockBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const dock = dockRef.current;
      if (!dock) return;
      if (e.relatedTarget instanceof Node && dock.contains(e.relatedTarget)) {
        return;
      }
      // Focus left the dock, but the pointer may still own the bump.
      if (dock.matches(":hover")) return;
      lowerBump();
    },
    [lowerBump],
  );

  // Windows-style toggle:
  //   not open then open
  //   open but minimized then restore (open also un-minimizes)
  //   open and not focused then bring to front (open also focuses)
  //   open AND focused then minimize (so the second click on the active app
  //                                   collapses it back into the dock)
  const onDockClick = useCallback(
    (id: string, dockBtn: HTMLElement) => {
      const win = useDesktopStore.getState().wins.find((w) => w.id === id);
      if (win && !win.minimized && focusId === id) {
        // Animated minimize. Same path the yellow traffic-light uses.
        const winEl = document.querySelector<HTMLElement>(
          `[data-window-id="${id}"]`,
        );
        if (winEl) {
          applyMinimizeTarget(winEl, dockBtn, win.x, win.y, win.w, win.h);
        }
        minimize(id);
        return;
      }
      // A brand-new window morphs out of this icon (Window.tsx consumes the
      // origin) and the icon bounces while it spawns. Restores/refocuses of
      // an existing window skip both.
      if (!win) {
        setLaunchOrigin(id, dockBtn);
        if (!reducedMotion) playLaunchBounce(dockBtn);
      }
      open(id);
    },
    [focusId, open, minimize, reducedMotion],
  );

  return (
    <div
      ref={dockRef}
      className="dock"
      onPointerOver={onDockPointerOver}
      onPointerLeave={onDockPointerLeave}
      onFocus={onDockFocus}
      onBlur={onDockBlur}
    >
      <span ref={glassRef} className="dock-glass" aria-hidden="true" />
      <svg className="dock-stroke" aria-hidden="true">
        <path ref={strokeRef} />
      </svg>
      {DOCK_ORDER.map((id) => {
        if (id === DOCK_SEP_ID) {
          return <span key="sep" className="dock-sep" aria-hidden="true" />;
        }
        if (id === LAUNCHPAD_BTN_ID) {
          return (
            <button
              key="launchpad"
              type="button"
              data-dock-id={id}
              className={`dock-btn${launchpadOpen ? " is-open" : ""}`}
              onClick={toggleLaunchpad}
              aria-label={
                launchpadOpen
                  ? UI_COPY.chrome.launchpad.close
                  : UI_COPY.chrome.launchpad.open
              }
              aria-pressed={launchpadOpen}
            >
              <span className="dock-btn-glyph">{LAUNCHPAD_ICON}</span>
              <span className="dock-tip" aria-hidden="true">
                {UI_COPY.chrome.launchpad.caption}
              </span>
            </button>
          );
        }
        const app = APPS[id];
        if (!app || !app.dock) return null;
        const isOpen = openIdSet.has(id);
        return (
          <button
            key={id}
            type="button"
            data-dock-id={id}
            data-desktop-only={app.desktopOnly ? "true" : undefined}
            className={`dock-btn${isOpen ? " is-open" : ""}`}
            onClick={(e) => onDockClick(id, e.currentTarget)}
            aria-label={UI_COPY.chrome.launchpad.openApp(app.title)}
          >
            <span className="dock-btn-glyph">{app.icon}</span>
            <span className="dock-tip" aria-hidden="true">{app.title}</span>
          </button>
        );
      })}
    </div>
  );
}
