import { test } from "node:test";
import assert from "node:assert/strict";
import { computeViewportMetrics } from "./viewport-metrics";

const PHONE = { innerHeight: 844, innerWidth: 390 };

test("computeViewportMetrics: no keyboard mirrors the layout viewport", () => {
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 844,
    vvWidth: 390,
    vvOffsetTop: 0,
    vvScale: 1,
  });
  assert.deepEqual(m, {
    height: 844,
    width: 390,
    offsetTop: 0,
    inset: 0,
    keyboardOpen: false,
  });
});

test("computeViewportMetrics: keyboard open reports the overlap as inset", () => {
  // Keyboard covers the bottom 300px; the visible band shrinks, no pan.
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 544,
    vvWidth: 390,
    vvOffsetTop: 0,
    vvScale: 1,
  });
  assert.equal(m.height, 544);
  assert.equal(m.offsetTop, 0);
  assert.equal(m.inset, 300); // 844 - 544 - 0
  assert.equal(m.keyboardOpen, true);
});

test("computeViewportMetrics: a panned visual viewport drives the top offset", () => {
  // Safari panned the visible band down by 24px to lift the focused field.
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 520,
    vvWidth: 390,
    vvOffsetTop: 24,
    vvScale: 1,
  });
  assert.equal(m.height, 520);
  assert.equal(m.offsetTop, 24);
  assert.equal(m.inset, 300); // 844 - 520 - 24
});

test("computeViewportMetrics: pinch-zoom falls back to the layout viewport", () => {
  // Zoom shrinks vvHeight too — but we must NOT mistake it for a keyboard, or
  // the shell would chase the zoomed viewport and bounce under the fingers.
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 300,
    vvWidth: 180,
    vvOffsetTop: 120,
    vvScale: 2,
  });
  assert.deepEqual(m, {
    height: 844,
    width: 390,
    offsetTop: 0,
    inset: 0,
    keyboardOpen: false,
  });
});

test("computeViewportMetrics: keyboardOpen keys off the raw overlap, not the pan-reduced inset", () => {
  // Keyboard ~340px with a deep 260px pan: the inset shrinks toward the
  // threshold but the keyboard is plainly up — chrome state must hold.
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 504,
    vvWidth: 390,
    vvOffsetTop: 260,
    vvScale: 1,
  });
  assert.equal(m.inset, 80); // 844 - 504 - 260
  assert.equal(m.keyboardOpen, true);
});

test("computeViewportMetrics: URL-bar-sized deltas never read as a keyboard", () => {
  // Browser chrome show/hide transitions produce small vv shortfalls; the
  // dock must not blink out over one.
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 780,
    vvWidth: 390,
    vvOffsetTop: 0,
    vvScale: 1,
  });
  assert.equal(m.inset, 64);
  assert.equal(m.keyboardOpen, false);
});

test("computeViewportMetrics: inset never goes negative", () => {
  // Sub-pixel rounding can make the raw difference slightly negative.
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: 845,
    vvWidth: 390,
    vvOffsetTop: 0,
    vvScale: 1,
  });
  assert.equal(m.inset, 0);
});

test("computeViewportMetrics: visualViewport-less fallback yields no inset", () => {
  // The hook passes innerHeight/innerWidth as the vv values when the API is
  // absent; that must read as "no keyboard".
  const m = computeViewportMetrics({
    ...PHONE,
    vvHeight: PHONE.innerHeight,
    vvWidth: PHONE.innerWidth,
    vvOffsetTop: 0,
    vvScale: 1,
  });
  assert.equal(m.inset, 0);
  assert.equal(m.height, 844);
});
