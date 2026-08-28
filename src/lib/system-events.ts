// Tiny in-memory event bus — the System Pulse log subscribes to this.
// Zero deps, zero magic. Anyone can emit a structured event; the widget
// renders the most recent N.
//
// Events are kept on a fixed-size ring buffer so we don't accumulate
// memory over a long session. The widget pulls from `getRecent()` on
// each subscription tick and renders top→bottom newest-first.

export type SystemEventTag = "INFO" | "BOOT" | "WARN" | "NET" | "ERR";

export type SystemEvent = {
  tag: SystemEventTag;
  msg: string;
  // Wall-clock when emitted. Number (ms) so consumers can format however.
  ts: number;
};

const RING_SIZE = 32;

const ring: SystemEvent[] = [];
const listeners = new Set<() => void>();

export function emit(tag: SystemEventTag, msg: string): void {
  ring.push({ tag, msg, ts: Date.now() });
  if (ring.length > RING_SIZE) ring.shift();
  for (const l of listeners) l();
}

export function getRecent(limit = 6): SystemEvent[] {
  // Newest first.
  return ring.slice(-limit).reverse();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
