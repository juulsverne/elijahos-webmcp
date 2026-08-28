"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useDesktopStore, type WinState } from "@/lib/desktop-store";
import {
  TOPBAR_SAFE_Y,
  EDGE_KEEP_VISIBLE,
  BOTTOM_KEEP_VISIBLE,
  VIEWPORT_PADDING,
  MIN_WINDOW_W,
  MIN_WINDOW_H,
  WINDOW_Z_BASE,
  snapRectFor,
  detectSnapKind,
  type SnapKind,
} from "@/lib/layout";
import { useWidgetStore } from "@/lib/widget-store";
import { applyMinimizeTarget } from "@/lib/minimize-anim";
import { takeLaunchOrigin } from "@/lib/launch-origin";
import { closeWithAnimation } from "@/lib/window-anim";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { AppDef } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";

type WindowProps = {
  win: WinState;
  app: AppDef;
  children: ReactNode;
};

const ENTER_DURATION_MS = 320;   // matches winIn keyframe + a small buffer
const OPEN_MORPH_MS = 380;       // dock/launchpad icon → window morph (WAAPI)
// Mirror of --spring-settle in tokens.css — WAAPI can't read CSS custom
// properties, so edit both together.
const SPRING_SETTLE = "cubic-bezier(0.3, 1.25, 0.4, 1)";
// Pointer travel before a drag on a managed (maximized / snapped) window pops
// it back to its free size — so a plain click on the titlebar doesn't restore.
const DRAG_RESTORE_THRESHOLD = 6;

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const RESIZE_DIRS: ResizeDir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

export function Window({ win, app, children }: WindowProps) {
  const focusId = useDesktopStore((s) => s.focusId);
  const focus = useDesktopStore((s) => s.focus);
  const minimize = useDesktopStore((s) => s.minimize);
  const move = useDesktopStore((s) => s.move);
  const setRect = useDesktopStore((s) => s.setRect);
  const toggleMaximize = useDesktopStore((s) => s.toggleMaximize);
  const snap = useDesktopStore((s) => s.snap);
  const setSnapHint = useDesktopStore((s) => s.setSnapHint);

  const winRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // If the dock button / launchpad tile that launched this window recorded
  // its icon rect, the window morphs out of it (WAAPI) instead of playing
  // the generic win-enter scale-fade. Consumed once, lazily, so the origin
  // is claimed before first paint. Reduced motion skips the morph entirely
  // (the CSS fallback is neutralized by the global killswitch).
  const [origin] = useState(() =>
    reducedMotion ? null : takeLaunchOrigin(win.id),
  );
  const morphedRef = useRef(false);

  const [entering, setEntering] = useState(() => !origin);
  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => setEntering(false), ENTER_DURATION_MS);
    return () => clearTimeout(t);
  }, [entering]);

  useEffect(() => {
    const el = winRef.current;
    if (morphedRef.current || !origin || !el) return;
    if (typeof el.animate !== "function") {
      // No WAAPI: fall back to the CSS enter animation.
      setEntering(true);
      return;
    }
    morphedRef.current = true;
    // Marker for the desktop-motion Playwright suite (mirrors the mobile
    // frame's data-morph attribute) — asserts the morph path was taken
    // without racing the 380ms animation.
    el.dataset.morph = "origin";
    // transform-origin is top-left (see window.css), so translate/scale from
    // the icon rect to the window rect is the exact inverse of the minimize
    // math in minimize-anim.ts.
    const anim = el.animate(
      [
        {
          transform: `translate(${origin.x - win.x}px, ${origin.y - win.y}px) scale(${origin.w / win.w}, ${origin.h / win.h})`,
          opacity: 0.25,
        },
        { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
      ],
      { duration: OPEN_MORPH_MS, easing: SPRING_SETTLE, fill: "backwards" },
    );
    return () => anim.cancel();
  }, [origin, win.x, win.y, win.w, win.h]);

  // True only while a maximize/restore transition is animating. Adds the
  // `is-rect-anim` class which turns on left/top/width/height transitions.
  // We don't keep those transitions on by default because they would lag
  // every drag and resize gesture.
  const [animatingRect, setAnimatingRect] = useState(false);

  const handleMaximize = useCallback(() => {
    setAnimatingRect(true);
    toggleMaximize(win.id, window.innerWidth, window.innerHeight);
    // 320ms matches the transition duration in `.win.is-rect-anim`. Add a
    // small buffer so the class is removed only after the animation lands.
    window.setTimeout(() => setAnimatingRect(false), 360);
  }, [toggleMaximize, win.id]);

  // When the widget panel opens/closes while this window is already maximized,
  // reflow the rect so it stops at the panel's left edge rather than overlapping.
  const panelOpen = useWidgetStore((s) => s.isOpen);
  const prevPanelOpenRef = useRef(panelOpen);
  useEffect(() => {
    const prev = prevPanelOpenRef.current;
    prevPanelOpenRef.current = panelOpen;
    if (panelOpen === prev || !win.maximized) return;
    const rect = snapRectFor("max", window.innerWidth, window.innerHeight, panelOpen);
    setAnimatingRect(true);
    setRect(win.id, rect.x, rect.y, rect.w, rect.h, { preserveMaximized: true });
    const t = window.setTimeout(() => setAnimatingRect(false), 360);
    return () => window.clearTimeout(t);
  }, [panelOpen, win.maximized, win.id, setRect]);


  // Animated minimize: write the dock-icon-relative translate target onto
  // the window element BEFORE flipping the store, so the CSS transition has
  // the correct end values the moment `.is-minimized` is applied.
  const minimizeWithAnimation = useCallback(() => {
    const winEl = winRef.current;
    const dockBtn = document.querySelector<HTMLElement>(
      `[data-dock-id="${win.id}"]`,
    );
    if (winEl && dockBtn) {
      applyMinimizeTarget(winEl, dockBtn, win.x, win.y, win.w, win.h);
    }
    minimize(win.id);
  }, [minimize, win.id, win.x, win.y, win.w, win.h]);

  // Commit a snap target with the same rect-tween the maximize button uses.
  const commitSnap = useCallback(
    (kind: SnapKind) => {
      setAnimatingRect(true);
      snap(win.id, kind, window.innerWidth, window.innerHeight);
      window.setTimeout(() => setAnimatingRect(false), 360);
    },
    [snap, win.id],
  );

  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Deepens the shadow while the titlebar is held (see .win.is-dragging) so
  // picking a window up and setting it down reads physically.
  const [dragging, setDragging] = useState(false);

  const onBarPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Don't initiate drag from the traffic-light buttons.
      if ((e.target as HTMLElement).closest(".traffic")) return;
      e.preventDefault();
      focus(win.id);
      setDragging(true);

      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: win.x, baseY: win.y };
      let armed: SnapKind | null = null;
      // A managed (maximized / half-snapped) window restores to its free size
      // only once the drag actually moves — matching Windows / macOS, where a
      // plain click on the bar doesn't un-maximize. `restorePending` holds the
      // free rect to pop back to; cleared after the first real drag step.
      let restorePending = (win.maximized || win.snap) && win.prevRect ? win.prevRect : null;
      let moveRaf = 0;
      let latestPoint: { x: number; y: number } | null = null;

      const applyMove = (clientX: number, clientY: number) => {
        const d = dragRef.current;
        if (!d) return;

        if (restorePending) {
          const travel = Math.abs(clientX - d.startX) + Math.abs(clientY - d.startY);
          if (travel < DRAG_RESTORE_THRESHOLD) return;
          // Pop back to the free size, re-anchored so the titlebar stays under
          // the cursor, then rebase the drag math to this new origin.
          const restored = restorePending;
          const grabRatio = win.w > 0 ? (d.startX - win.x) / win.w : 0.5;
          const newX = Math.round(
            Math.max(
              VIEWPORT_PADDING,
              Math.min(window.innerWidth - EDGE_KEEP_VISIBLE, clientX - grabRatio * restored.w),
            ),
          );
          setRect(win.id, newX, win.y, restored.w, restored.h);
          d.baseX = newX;
          d.baseY = win.y;
          d.startX = clientX;
          d.startY = clientY;
          restorePending = null;
        }

        const nx = Math.max(
          VIEWPORT_PADDING,
          Math.min(window.innerWidth - EDGE_KEEP_VISIBLE, d.baseX + (clientX - d.startX)),
        );
        const ny = Math.max(
          TOPBAR_SAFE_Y,
          Math.min(window.innerHeight - BOTTOM_KEEP_VISIBLE, d.baseY + (clientY - d.startY)),
        );
        move(win.id, nx, ny);

        // Arm / disarm the snap target as the pointer crosses edge bands.
        const kind = detectSnapKind(clientX, clientY, window.innerWidth);
        if (kind !== armed) {
          armed = kind;
          setSnapHint(
            kind
              ? {
                  kind,
                  rect: snapRectFor(kind, window.innerWidth, window.innerHeight, panelOpen),
                }
              : null,
          );
        }
      };

      const flushMove = () => {
        if (moveRaf) {
          cancelAnimationFrame(moveRaf);
          moveRaf = 0;
        }
        const point = latestPoint;
        latestPoint = null;
        if (point) applyMove(point.x, point.y);
      };

      const onMove = (ev: PointerEvent) => {
        latestPoint = { x: ev.clientX, y: ev.clientY };
        if (moveRaf) return;
        moveRaf = requestAnimationFrame(() => {
          moveRaf = 0;
          const point = latestPoint;
          latestPoint = null;
          if (point) applyMove(point.x, point.y);
        });
      };

      const onUp = () => {
        flushMove();
        dragRef.current = null;
        setDragging(false);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        setSnapHint(null);
        if (armed) commitSnap(armed);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [focus, move, setRect, setSnapHint, commitSnap, panelOpen, win.id, win.x, win.y, win.w, win.maximized, win.snap, win.prevRect],
  );

  // Single resize handler used by all 8 edge/corner handles. The direction
  // string drives which edges shift: chars "n"/"s"/"e"/"w" combine for corners.
  const onResizePointerDown = useCallback(
    (dir: ResizeDir) => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      focus(win.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const baseX = win.x;
      const baseY = win.y;
      const baseW = win.w;
      const baseH = win.h;
      let resizeRaf = 0;
      let latestPoint: { x: number; y: number } | null = null;

      const applyResize = (clientX: number, clientY: number) => {
        const dx = clientX - startX;
        const dy = clientY - startY;
        let nx = baseX;
        let ny = baseY;
        let nw = baseW;
        let nh = baseH;

        if (dir.includes("e")) {
          nw = Math.max(MIN_WINDOW_W, baseW + dx);
        }
        if (dir.includes("s")) {
          nh = Math.max(MIN_WINDOW_H, baseH + dy);
        }
        if (dir.includes("w")) {
          const candW = Math.max(MIN_WINDOW_W, baseW - dx);
          nx = baseX + (baseW - candW);
          nw = candW;
        }
        if (dir.includes("n")) {
          const candH = Math.max(MIN_WINDOW_H, baseH - dy);
          const candY = Math.max(TOPBAR_SAFE_Y, baseY + (baseH - candH));
          nh = baseY + baseH - candY;
          ny = candY;
        }

        // Keep within viewport bounds.
        if (nx < VIEWPORT_PADDING) {
          nw -= VIEWPORT_PADDING - nx;
          nx = VIEWPORT_PADDING;
        }
        if (nx + nw > window.innerWidth - VIEWPORT_PADDING) {
          nw = window.innerWidth - VIEWPORT_PADDING - nx;
        }
        if (ny + nh > window.innerHeight - VIEWPORT_PADDING) {
          nh = window.innerHeight - VIEWPORT_PADDING - ny;
        }

        setRect(win.id, nx, ny, Math.max(MIN_WINDOW_W, nw), Math.max(MIN_WINDOW_H, nh));
      };

      const flushResize = () => {
        if (resizeRaf) {
          cancelAnimationFrame(resizeRaf);
          resizeRaf = 0;
        }
        const point = latestPoint;
        latestPoint = null;
        if (point) applyResize(point.x, point.y);
      };

      const onMove = (ev: PointerEvent) => {
        latestPoint = { x: ev.clientX, y: ev.clientY };
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          const point = latestPoint;
          latestPoint = null;
          if (point) applyResize(point.x, point.y);
        });
      };

      const onUp = () => {
        flushResize();
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [focus, setRect, win.id, win.x, win.y, win.w, win.h],
  );

  const isFocused = focusId === win.id;
  const className = [
    "win",
    isFocused ? "is-focused" : "",
    entering ? "win-enter" : "",
    win.minimized ? "is-minimized" : "",
    win.maximized ? "is-maximized" : "",
    animatingRect ? "is-rect-anim" : "",
    dragging ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={winRef}
      data-window-id={win.id}
      className={className}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: WINDOW_Z_BASE + win.z,
      }}
      onMouseDown={() => !win.minimized && focus(win.id)}
    >
      <div className="win-bar" onPointerDown={onBarPointerDown}>
        <div className="traffic">
          <span
            onClick={(e) => {
              e.stopPropagation();
              closeWithAnimation(win.id);
            }}
            title={UI_COPY.chrome.window.close}
            role="button"
            aria-label={UI_COPY.chrome.window.closeApp(app.title)}
          >
            ×
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              minimizeWithAnimation();
            }}
            title={UI_COPY.chrome.window.minimize}
            role="button"
            aria-label={UI_COPY.chrome.window.minimizeApp(app.title)}
          >
            −
          </span>
          {app.resizable !== false && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              title={win.maximized ? UI_COPY.chrome.window.restore : UI_COPY.chrome.window.maximize}
              role="button"
              aria-label={
                win.maximized
                  ? UI_COPY.chrome.window.restoreApp(app.title)
                  : UI_COPY.chrome.window.maximizeApp(app.title)
              }
            >
              +
            </span>
          )}
        </div>
        <div className="title-text">{app.title}</div>
      </div>
      <div className="win-body">{children}</div>
      {app.resizable !== false && RESIZE_DIRS.map((dir) => (
        <div
          key={dir}
          className={`win-resize win-resize-${dir}`}
          onPointerDown={onResizePointerDown(dir)}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
