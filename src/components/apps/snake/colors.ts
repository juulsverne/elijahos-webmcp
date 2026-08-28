export type SnakeColors = {
  head: string;
  body: string;
  food: string;
  eye: string;
  gridStroke: string;
};

const TOKEN_MAP: Record<keyof SnakeColors, string> = {
  head: "--accent-pink",
  body: "--accent-violet",
  food: "--accent-gold",
  eye: "--canvas-eye",
  gridStroke: "--canvas-grid-stroke",
};

function readToken(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function readSnakeColors(): SnakeColors | null {
  const out: Partial<SnakeColors> = {};
  for (const key of Object.keys(TOKEN_MAP) as (keyof SnakeColors)[]) {
    const v = readToken(TOKEN_MAP[key]);
    if (!v) return null;
    out[key] = v;
  }
  return out as SnakeColors;
}

function parseRgb(s: string): [number, number, number] | null {
  const trimmed = s.trim();
  if (trimmed.startsWith("#")) {
    const h = trimmed.slice(1);
    if (!/^[\da-f]{6}$/i.test(h)) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r, g, b];
  }
  const m = trimmed.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) {
    const channels = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (
      channels.some(
        (channel) =>
          !Number.isInteger(channel) || channel < 0 || channel > 255,
      )
    ) {
      return null;
    }
    return channels as [number, number, number];
  }
  return null;
}

export function lerpColor(a: string, b: string, t: number): string {
  const ca = parseRgb(a);
  const cb = parseRgb(b);
  if (!ca || !cb) return a;
  const safeT = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * safeT);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * safeT);
  const bch = Math.round(ca[2] + (cb[2] - ca[2]) * safeT);
  return `rgb(${r}, ${g}, ${bch})`;
}
