// Shared helper for the minimize-to-dock animation.
//
// The animation is driven by CSS — `.win.is-minimized` reads `--mini-x` and
// `--mini-y` custom properties off the window element to know where to fly.
// This util computes the right translate target so the window's visual
// center lands on the dock-icon's center, given the window's current rect.
//
// Both Window.tsx (yellow traffic-light button) and Dock.tsx (Windows-style
// click-to-toggle on the dock) call this before flipping the store flag.

const MINIMIZE_TARGET_SCALE = 0.1; // matches `.win.is-minimized` in globals.css

export function applyMinimizeTarget(
  winEl: HTMLElement,
  dockEl: HTMLElement,
  winX: number,
  winY: number,
  winW: number,
  winH: number,
) {
  const dockRect = dockEl.getBoundingClientRect();
  const dockCx = dockRect.left + dockRect.width / 2;
  // With transform-origin: top left, after `translate(tx, ty) scale(s)`:
  //   visual top-left  = (x + tx, y + ty)
  //   visual size      = (s*w, s*h)
  //   visual bottom-Y  = y + ty + s*h
  //
  // We want the shrunk window's BOTTOM edge to land on the dock icon's TOP
  // edge — so it reads as "dropping into the icon from above" rather than
  // disappearing into the dock surface. Horizontally centered on the icon.
  const tx = dockCx - winX - (MINIMIZE_TARGET_SCALE * winW) / 2;
  const ty = dockRect.top - winY - MINIMIZE_TARGET_SCALE * winH;
  winEl.style.setProperty("--mini-x", `${tx}px`);
  winEl.style.setProperty("--mini-y", `${ty}px`);
}
