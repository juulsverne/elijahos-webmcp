"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { usePageVisible } from "@/lib/use-page-visible";

// Wireframe "blob" wallpaper for the mobile home screen — a 2D-canvas stand-in
// for the desktop shell's WebGL geodesic scene. Two counter-rotating shells of
// fibonacci-sphere points, near neighbors joined by depth-faded strokes.
//
// Why 2D canvas and not WebGL: this runs behind the whole home screen on a
// phone, above it sit five backdrop-filter surfaces. A second GL context plus
// that much blur is the difference between 60fps and jank on mid-range
// hardware. ~340 points and ~900 short strokes per frame is cheap by
// comparison and needs no context loss handling.
//
// Rendering is in the design's 390×844 reference space and the canvas is
// stretched by CSS to whatever the real viewport is — the blob is a soft
// background texture, so the distortion is imperceptible and it saves
// re-deriving geometry on every resize.

const REF_W = 390;
const REF_H = 844;

// Blob geometry, in reference-space units. Outer shell reads as the "skin",
// inner as the core seen through it.
const OUTER_COUNT = 150;
const OUTER_RADIUS = 128;
const OUTER_JITTER = 14;
const OUTER_LINK_DIST = 40;
const INNER_COUNT = 76;
const INNER_RADIUS = 60;
const INNER_JITTER = 8;
const INNER_LINK_DIST = 23;

// Perspective + placement. The blob sits center-ish and slightly high so the
// widget stack overlays its densest band.
const FOCAL = 600;
const CENTER_X = 195;
const CENTER_Y = 258;
const TILT = 0.35;

// Radians per millisecond. The shells counter-rotate at slightly different
// rates so the moiré between them never settles into a loop.
const OUTER_SPIN = 0.00006;
const INNER_SPIN = -0.00004;

type Point = [x: number, y: number, z: number];
type Edge = [i: number, j: number];
// Projected: screen x, screen y, and a 0..1 depth used to fade far strokes.
type Projected = [x: number, y: number, depth: number];

// Deterministic PRNG (mulberry-ish) so the point cloud is identical on every
// mount and across server/client — a Math.random() cloud would shimmer on
// remount and can't be reasoned about.
function makeRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fibonacci sphere — evenly distributed points with no polar clustering,
// jittered so the lattice doesn't read as a manufactured grid.
function shell(
  rand: () => number,
  count: number,
  radius: number,
  jitter: number,
): Point[] {
  const points: Point[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const r = radius + (rand() * 2 - 1) * jitter;
    points.push([Math.cos(theta) * ring * r, y * r, Math.sin(theta) * ring * r]);
  }
  return points;
}

// Join every pair closer than `maxDistance`. O(n²) but runs once at module
// scope for ~150 points, never per frame.
function link(points: Point[], maxDistance: number): Edge[] {
  const edges: Edge[] = [];
  const max2 = maxDistance * maxDistance;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i][0] - points[j][0];
      const dy = points[i][1] - points[j][1];
      const dz = points[i][2] - points[j][2];
      if (dx * dx + dy * dy + dz * dz < max2) edges.push([i, j]);
    }
  }
  return edges;
}

const rand = makeRandom(0x9e3779b9);
const OUTER = shell(rand, OUTER_COUNT, OUTER_RADIUS, OUTER_JITTER);
const OUTER_EDGES = link(OUTER, OUTER_LINK_DIST);
const INNER = shell(rand, INNER_COUNT, INNER_RADIUS, INNER_JITTER);
const INNER_EDGES = link(INNER, INNER_LINK_DIST);

function project(p: Point, spin: number, tilt: number): Projected {
  const cosY = Math.cos(spin);
  const sinY = Math.sin(spin);
  const x = p[0] * cosY - p[2] * sinY;
  let z = p[0] * sinY + p[2] * cosY;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const y = p[1] * cosT - z * sinT;
  z = p[1] * sinT + z * cosT;
  const scale = FOCAL / (FOCAL + z);
  return [
    CENTER_X + x * scale,
    CENTER_Y + y * scale,
    // Normalize depth to 0..1 (near = 1) for the alpha ramps below.
    (OUTER_RADIUS - z) / (OUTER_RADIUS * 2),
  ];
}

type Rgb = readonly [number, number, number];

function strokeShell(
  ctx: CanvasRenderingContext2D,
  projected: Projected[],
  edges: Edge[],
  width: number,
  base: number,
  range: number,
  // Fixed color, or a left→right gradient between two colors (inner shell).
  color: Rgb | ((x: number) => Rgb),
) {
  ctx.lineWidth = width;
  for (const [i, j] of edges) {
    const a = projected[i];
    const b = projected[j];
    const depth = (a[2] + b[2]) / 2;
    const [r, g, bl] = typeof color === "function" ? color(a[0]) : color;
    ctx.strokeStyle = `rgba(${r},${g},${bl},${(base + depth * range).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

function plotPoints(
  ctx: CanvasRenderingContext2D,
  projected: Projected[],
  fg: Rgb,
  base: number,
  range: number,
) {
  for (const p of projected) {
    ctx.fillStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${(base + p[2] * range).toFixed(3)})`;
    // fillRect beats arc()+fill by a wide margin at this count, and at 1.6px
    // the difference between a square and a dot is invisible.
    ctx.fillRect(p[0] - 0.8, p[1] - 0.8, 1.6, 1.6);
  }
}

export function MobileBlob() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisible();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Colors come from the theme so `theme mono` / `paper` recolor the
    // wallpaper too. Sampled once per effect run, not per frame.
    //
    // Sampling once is safe because the only way to change themes is the zsh
    // `theme` command, and zsh is desktopOnly — so no switch can land while
    // this canvas is mounted. A theme picked on desktop is already applied to
    // <html> before the mobile shell mounts, so the first sample is correct.
    // If a mobile theme switcher ever ships, this needs to re-sample on the
    // data-theme attribute changing.
    const styles = getComputedStyle(canvas);
    const readRgb = (prop: string, fallback: Rgb): Rgb => {
      const raw = styles.getPropertyValue(prop).trim();
      const nums = raw.match(/\d+(\.\d+)?/g);
      if (!nums || nums.length < 3) return fallback;
      return [Number(nums[0]), Number(nums[1]), Number(nums[2])] as const;
    };
    const fg = readRgb("--mh-blob-fg", [240, 232, 255]);
    const warm = readRgb("--mh-blob-warm", [255, 109, 201]);
    const cool = readRgb("--mh-blob-cool", [86, 200, 255]);

    // Inner shell fades warm→cool across the blob's width, giving the core a
    // subtle chromatic split the outer white lattice doesn't have.
    const innerColor = (x: number): Rgb => {
      const t = Math.min(1, Math.max(0, (x - CENTER_X + 100) / 200));
      return [
        Math.round(warm[0] + (cool[0] - warm[0]) * t),
        Math.round(warm[1] + (cool[1] - warm[1]) * t),
        Math.round(warm[2] + (cool[2] - warm[2]) * t),
      ] as const;
    };

    const draw = (elapsed: number) => {
      ctx.clearRect(0, 0, REF_W, REF_H);
      const outer = OUTER.map((p) => project(p, elapsed * OUTER_SPIN, TILT));
      strokeShell(ctx, outer, OUTER_EDGES, 0.6, 0.04, 0.15, fg);
      plotPoints(ctx, outer, fg, 0.25, 0.55);
      const inner = INNER.map((p) =>
        project(p, elapsed * INNER_SPIN, TILT + 0.15),
      );
      strokeShell(ctx, inner, INNER_EDGES, 0.7, 0.05, 0.28, innerColor);
      plotPoints(ctx, inner, fg, 0.3, 0.6);
    };

    // Always paint one frame before deciding whether to animate. A page that
    // mounts in a background tab would otherwise show an empty canvas, and
    // reduced motion would show nothing at all — the blob is texture, so a
    // static frame is the correct floor in both cases.
    draw(reducedMotion ? 0 : performance.now());

    // Reduced motion keeps that static frame and never rotates. A hidden tab
    // keeps it too, and picks the loop back up when it's foregrounded (this
    // effect re-runs on the visibility change).
    if (reducedMotion || !pageVisible) return;

    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, pageVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="mobile-blob"
      width={REF_W}
      height={REF_H}
      aria-hidden="true"
    />
  );
}
