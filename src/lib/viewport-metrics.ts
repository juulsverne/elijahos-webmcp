// Pure visual-viewport math, split out from the React hook so it can be
// unit-tested under the node test runner (no DOM / no `window.visualViewport`).
//
// iOS Safari and Android Chrome do NOT resize the layout viewport when the
// on-screen keyboard opens — they shrink the *visual* viewport and may pan it
// down (offsetTop grows) to keep the focused field above the keyboard. The
// mobile app frame remains full-screen; consumers use the computed keyboard
// inset to shrink bottom-pinned UI without moving the app chrome down.

export type ViewportInput = {
  /** `window.innerHeight` — the layout viewport height (keyboard-invariant). */
  innerHeight: number;
  /** `window.innerWidth` — the layout viewport width. */
  innerWidth: number;
  /** `visualViewport.height`, or `innerHeight` when unavailable. */
  vvHeight: number;
  /** `visualViewport.width`, or `innerWidth` when unavailable. */
  vvWidth: number;
  /** `visualViewport.offsetTop` — how far the visual viewport is panned down. */
  vvOffsetTop: number;
  /** `visualViewport.scale` — >1 while the user is pinch-zoomed. */
  vvScale: number;
};

export type ViewportMetrics = {
  /** `--vv-height`: visible viewport height, published for diagnostics. */
  height: number;
  /** `--vv-width`: visible viewport width, published for diagnostics. */
  width: number;
  /** `--vv-offset-top`: visual viewport pan, published for diagnostics. */
  offsetTop: number;
  /** `--kb-inset`: on-screen keyboard overlap in CSS px. */
  inset: number;
  /**
   * True when the overlap is unambiguously an on-screen keyboard (not URL-bar
   * jitter). Drives the `data-keyboard` attribute — the shell collapses
   * safe-area padding and hides the dock while this holds.
   */
  keyboardOpen: boolean;
};

// Treat anything above ~1.0 as an intentional pinch-zoom. The 0.01 slack
// absorbs the sub-pixel scale jitter Safari reports at "100%".
const ZOOM_EPSILON = 1.01;

// Minimum overlap before the shell treats it as a keyboard. Real on-screen
// keyboards are ≥ ~220px on every phone; browser-chrome show/hide transitions
// can briefly report deltas of a few dozen px. The gap between those two
// regimes is wide, so anywhere in it works — 100 sits comfortably clear of
// both. Chrome-state toggles (dock hiding) key off this; the pixel-accurate
// `inset` keeps flowing continuously below it.
export const KEYBOARD_OPEN_MIN_PX = 100;

// Map a raw viewport reading to the CSS custom properties the mobile shell
// publishes. Pinch-zoom also shrinks `visualViewport.height`, so while zoomed
// we fall back to the layout viewport: treating zoom as keyboard overlap would
// bounce bottom-pinned UI around under the user's fingers.
export function computeViewportMetrics(v: ViewportInput): ViewportMetrics {
  if (v.vvScale > ZOOM_EPSILON) {
    return {
      height: v.innerHeight,
      width: v.innerWidth,
      offsetTop: 0,
      inset: 0,
      keyboardOpen: false,
    };
  }

  // Overlap = layout height minus the visible band and the pan above it.
  // Clamped at 0 so a closed keyboard (or rounding noise) never goes negative.
  const inset = Math.max(0, v.innerHeight - v.vvHeight - v.vvOffsetTop);

  return {
    height: v.vvHeight,
    width: v.vvWidth,
    offsetTop: v.vvOffsetTop,
    inset,
    // The raw overlap (not the pan-reduced inset) decides "is a keyboard up":
    // a deep pan could shrink `inset` below the threshold while the keyboard
    // is plainly open, and chrome state must not flicker on pan changes.
    keyboardOpen: v.innerHeight - v.vvHeight >= KEYBOARD_OPEN_MIN_PX,
  };
}
