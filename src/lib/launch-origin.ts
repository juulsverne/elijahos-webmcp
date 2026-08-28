// Consume-once launch origins for the window open morph.
//
// The dock button / launchpad tile that launches an app records its icon's
// rect here just before calling the store's open(). Window.tsx consumes the
// rect on first mount and grows the window out of it — the mirror image of
// minimize-anim.ts's fly-to-dock. Entries expire quickly so a rect captured
// by a click that never produced a mount (app was already open, restore
// path) cannot distort a later, unrelated open such as a deep link.

export type LaunchOrigin = { x: number; y: number; w: number; h: number };

const STALE_MS = 1000;

const origins = new Map<string, LaunchOrigin & { at: number }>();

export function setLaunchOrigin(id: string, el: Element): void {
  const r = el.getBoundingClientRect();
  origins.set(id, {
    x: r.left,
    y: r.top,
    w: r.width,
    h: r.height,
    at: performance.now(),
  });
}

export function takeLaunchOrigin(id: string): LaunchOrigin | null {
  const entry = origins.get(id);
  if (!entry) return null;
  origins.delete(id);
  if (performance.now() - entry.at > STALE_MS) return null;
  return { x: entry.x, y: entry.y, w: entry.w, h: entry.h };
}
