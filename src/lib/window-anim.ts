// Animated window close. The store's close() removes the window from the
// tree in one frame; this helper plays a short exit (shrink + fade + a small
// downward drift) first, then commits the store change. Shared by the
// traffic-light close button (Window.tsx) and the desktop context menu's
// "close window" / "close all windows" actions.
//
// Exit is deliberately faster than the ~380ms open morph — leaving should
// never feel slower than arriving.

import { useDesktopStore } from "@/lib/desktop-store";

const CLOSE_MS = 170;
const CLOSE_SCALE = 0.94;
const CLOSE_DRIFT_PX = 8;

export function closeWithAnimation(id: string, delayMs = 0): void {
  const store = useDesktopStore.getState();
  const win = store.wins.find((w) => w.id === id);
  if (!win) return;

  const el = document.querySelector<HTMLElement>(`[data-window-id="${id}"]`);
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Minimized windows are already scaled into the dock and invisible —
  // animating them back out just to shrink them again would flash.
  if (!el || win.minimized || reduced || typeof el.animate !== "function") {
    store.close(id);
    return;
  }
  if (el.dataset.closing === "true") return;
  el.dataset.closing = "true";
  el.style.pointerEvents = "none";
  // The window keeps transform-origin: top left for the minimize math; the
  // close shrink should collapse toward the window's center instead.
  el.style.transformOrigin = "50% 50%";

  const anim = el.animate(
    [
      { transform: "scale(1) translateY(0)", opacity: 1 },
      {
        transform: `scale(${CLOSE_SCALE}) translateY(${CLOSE_DRIFT_PX}px)`,
        opacity: 0,
      },
    ],
    {
      duration: CLOSE_MS,
      delay: delayMs,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "both",
    },
  );
  const commit = () => useDesktopStore.getState().close(id);
  anim.finished.then(commit, commit);
}
