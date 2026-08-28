import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRateLimiter } from "./ratelimit";

function namespace(name: string): string {
  return `test-${name}-${Date.now()}-${Math.random()}`;
}

describe("createRateLimiter", () => {
  it("enforces global caps without an extra first request", () => {
    const limiter = createRateLimiter({
      namespace: namespace("global-cap"),
      perIp: { windowMs: 1_000, max: 10 },
      global: { windowMs: 1_000, cap: 2 },
    });

    assert.equal(limiter.consumeGlobal(0), true);
    assert.equal(limiter.consumeGlobal(1), true);
    assert.equal(limiter.consumeGlobal(2), false);
  });

  it("fails closed for disabled or invalid budgets", () => {
    const disabled = createRateLimiter({
      namespace: namespace("disabled"),
      perIp: { windowMs: 1_000, max: 0 },
      global: { windowMs: 1_000, cap: 0 },
    });
    const invalid = createRateLimiter({
      namespace: namespace("invalid"),
      perIp: { windowMs: 1_000, max: Number.NaN },
      global: { windowMs: 1_000, cap: Number.NaN },
    });

    assert.equal(disabled.consumePerIp("a", 0), false);
    assert.equal(disabled.consumeGlobal(0), false);
    assert.equal(invalid.consumePerIp("a", 0), false);
    assert.equal(invalid.consumeGlobal(0), false);
  });

  it("fails closed for disabled or invalid windows", () => {
    const disabledWindow = createRateLimiter({
      namespace: namespace("disabled-window"),
      perIp: { windowMs: 0, max: 1 },
      global: { windowMs: 0, cap: 1 },
    });
    const invalidWindow = createRateLimiter({
      namespace: namespace("invalid-window"),
      perIp: { windowMs: Number.NaN, max: 1 },
      global: { windowMs: Number.NaN, cap: 1 },
    });

    assert.equal(disabledWindow.consumePerIp("a", 0), false);
    assert.equal(disabledWindow.consumeGlobal(0), false);
    assert.equal(invalidWindow.consumePerIp("a", 0), false);
    assert.equal(invalidWindow.consumeGlobal(0), false);
  });
});
