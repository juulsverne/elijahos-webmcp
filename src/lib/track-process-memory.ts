// Per-app heap-delta sampling. Used by SystemPulse to show a real
// "memory cost" next to each open window.
//
// The math is honest-ish: when a window mounts we sample heap, do a
// double-rAF (so React + the app tree have settled) and sample again.
// The delta is what we attribute to that app. Heap is volatile (GC
// can run any time), so we treat the value as a baseline and decay
// reads via a small EMA when callers re-sample. Not perfect — but
// it's REAL, and bounded.

type ChromePerformance = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
};

const samples = new Map<string, number>(); // bytes per app id
const listeners = new Set<() => void>();

function getHeap(): number | null {
  if (typeof performance === "undefined") return null;
  const p = performance as ChromePerformance;
  if (!p.memory) return null;
  return p.memory.usedJSHeapSize;
}

export function isHeapApiAvailable(): boolean {
  return getHeap() !== null;
}

/**
 * Sample heap delta for an app right after it mounts. Resolves with
 * bytes the mount appeared to cost (or null on browsers without the
 * memory API).
 */
export async function sampleAppMount(id: string): Promise<number | null> {
  const before = getHeap();
  if (before == null) return null;

  // Wait two animation frames so render + commit have flushed.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  const after = getHeap();
  if (after == null) return null;

  const delta = Math.max(0, after - before);
  // EMA against any previous value so a single GC dip doesn't zero us out.
  const prev = samples.get(id) ?? 0;
  const next = prev === 0 ? delta : Math.round(prev * 0.6 + delta * 0.4);
  samples.set(id, next);
  for (const l of listeners) l();
  return next;
}

export function clearAppSample(id: string): void {
  if (samples.delete(id)) {
    for (const l of listeners) l();
  }
}

export function getAppMemory(id: string): number | null {
  return samples.has(id) ? samples.get(id)! : null;
}

export function subscribeMemory(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function formatMemory(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${mb.toFixed(0)} MB`;
  if (mb >= 10) return `${mb.toFixed(1)} MB`;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
