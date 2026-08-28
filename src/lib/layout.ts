// Shared layout constants for the desktop chrome and window system.
//
// These numbers couple JS clamping logic to CSS chrome geometry (the topbar's
// physical height, the dock's footprint, etc.). Keep them in sync with the
// matching CSS custom properties in `src/app/globals.css` (`--topbar-h`,
// `--topbar-offset`). If you change a number here, change the CSS too.

// Topbar (the floating header at the top of the desktop)
export const TOPBAR_OFFSET = 12;     // matches `.topbar { top: 12px }`
export const TOPBAR_HEIGHT = 42;     // matches `--topbar-h` in globals.css
export const TOPBAR_BOTTOM = TOPBAR_OFFSET + TOPBAR_HEIGHT; // 54

// Minimum y a window's titlebar may occupy. 10px buffer below the topbar so
// the rounded chrome doesn't visually kiss the bar when dragged to the top.
export const TOPBAR_SAFE_Y = TOPBAR_BOTTOM + 10; // 64

// When dragging a window, how much of its titlebar / bottom must remain
// on-screen so the user can always grab it back.
export const EDGE_KEEP_VISIBLE = 80;
export const BOTTOM_KEEP_VISIBLE = 60;

// Resize floor — windows can't shrink below this.
export const MIN_WINDOW_W = 320;
export const MIN_WINDOW_H = 220;

// Padding kept between a window's outer edge and the viewport bounds.
export const VIEWPORT_PADDING = 8;

// Base z-index for windows. Per-window z is added on top:
//   zIndex = WINDOW_Z_BASE + win.z
// Topbar / dock sit at z=50 in CSS, so this base intentionally sits below
// them — windows pass under chrome, not over it.
export const WINDOW_Z_BASE = 10;

// Insets for a maximized window. Tuned so the window keeps tasteful breathing
// room from the topbar (top) and the dock (bottom) when expanded full-screen
// — never edge-to-edge with chrome.
//   top:    TOPBAR_SAFE_Y (64) + a small visual gap
//   bottom: dock height (~56) + dock offset (14) + visual gap
export const MAX_INSETS = {
  top: 62,
  right: 12,
  bottom: 86,
  left: 12,
};

// Right-side widget panel (toggle from Topbar → slides in from edge).
// Width matches the design spec. Z sits at the desktop surface layer:
// BELOW windows so dragging a window over the panel correctly obscures it,
// but above particle background. Slide animation duration is shared by
// JS (waiting for transition end in some flows) and CSS (the transform).
export const WIDGET_PANEL_WIDTH = 260;
export const WIDGET_PANEL_Z = 8;
export const WIDGET_PANEL_TRANSITION_MS = 220;

// Hard ceiling for window z so windows can't overtake the topbar/dock
// (which sit at z=50). Windows still stack relative to each other below
// this value. The renormalize step in desktop-store keeps long sessions
// from running into this ceiling.
export const WINDOW_Z_MAX = 49;

// Mobile shell ↔ desktop chrome switch point. Anything <= this CSS-px width
// renders the MobileShell (phone-style home + full-screen apps) instead of
// the windowed desktop. Mirrors the `@media (max-width: 767px)` queries in
// styles/mobile.css — edit both files together.
export const MOBILE_BREAKPOINT = 767;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

// Extra right inset applied to maximized windows when the panel is open.
// Panel sits at `right: TOPBAR_OFFSET` and is WIDGET_PANEL_WIDTH wide, so its
// left edge is at viewportW - (TOPBAR_OFFSET + WIDGET_PANEL_WIDTH). Add
// MAX_INSETS.right on top so the window keeps a matching breathing gap from
// the panel — same visual rhythm as the gap on the window's left edge.
export const MAX_INSETS_RIGHT_PANEL_OPEN =
  TOPBAR_OFFSET + WIDGET_PANEL_WIDTH + MAX_INSETS.right;

// ── Aero-style edge snapping ─────────────────────────────────────────────
// While dragging a window, the pointer entering a viewport edge band arms a
// snap target (Windows/macOS feel): top → maximize, left/right → that half.
//   - SNAP_EDGE_TRIGGER: pointer distance from the left/right viewport edge.
//   - The top band reuses TOPBAR_BOTTOM — reaching the topbar arms maximize.
//   - SNAP_HALF_GAP: gutter between two side-by-side halves; same visual
//     rhythm as the grid gap in `arrangedRectsFor`.
export const SNAP_EDGE_TRIGGER = 20;
export const SNAP_HALF_GAP = 12;

export type SnapKind = "left" | "right" | "max";

export function maximizedRightInset(panelOpen: boolean): number {
  return panelOpen ? MAX_INSETS_RIGHT_PANEL_OPEN : MAX_INSETS.right;
}

// The rect a window lands on for a given snap target. Shares the maximize
// insets so a snapped half lines up flush with a maximized window's edges
// and keeps the same breathing room from the topbar / dock / panel.
export function snapRectFor(
  kind: SnapKind,
  viewportW: number,
  viewportH: number,
  panelOpen: boolean,
): { x: number; y: number; w: number; h: number } {
  const left = MAX_INSETS.left;
  const top = MAX_INSETS.top;
  const right = maximizedRightInset(panelOpen);
  const fullW = Math.max(MIN_WINDOW_W, viewportW - left - right);
  const fullH = Math.max(MIN_WINDOW_H, viewportH - top - MAX_INSETS.bottom);
  if (kind === "max") return { x: left, y: top, w: fullW, h: fullH };
  const halfW = Math.max(MIN_WINDOW_W, (fullW - SNAP_HALF_GAP) / 2);
  if (kind === "left") return { x: left, y: top, w: halfW, h: fullH };
  return { x: left + fullW - halfW, y: top, w: halfW, h: fullH };
}

// ── Mobile app-frame morph timing ────────────────────────────────────────
// The mobile shell keeps a closing app frame mounted for MOBILE_APP_EXIT_MS
// while MobileAppFrame's exit animation plays; the two must agree or frames
// unmount mid-animation. Open: the surface morphs out of the tapped icon's
// rect while the app bar/body content fades in behind it. Close: content
// fades first, then the surface morphs back into the icon.
export const MOBILE_MORPH_OPEN_MS = 340;
export const MOBILE_CONTENT_STAGGER_MS = 70;
export const MOBILE_CONTENT_FADE_OUT_MS = 90;
export const MOBILE_MORPH_CLOSE_MS = 240;
export const MOBILE_MORPH_CLOSE_DELAY_MS = 60;
export const MOBILE_APP_EXIT_MS =
  MOBILE_MORPH_CLOSE_MS + MOBILE_MORPH_CLOSE_DELAY_MS; // 300

// Detect which snap target (if any) the pointer is over during a drag.
// Side edges win over the top band so the top corners snap to a half rather
// than maximizing — matching the request (top → full, left/right → half).
export function detectSnapKind(
  clientX: number,
  clientY: number,
  viewportW: number,
): SnapKind | null {
  if (clientX <= SNAP_EDGE_TRIGGER) return "left";
  if (clientX >= viewportW - SNAP_EDGE_TRIGGER) return "right";
  if (clientY <= TOPBAR_BOTTOM) return "max";
  return null;
}
