import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRetryableSetup } from "./retryable-setup";

describe("createRetryableSetup", () => {
  it("shares in-flight setup and caches success", async () => {
    let calls = 0;
    const setup = createRetryableSetup(async () => {
      calls += 1;
      await Promise.resolve();
    });

    await Promise.all([setup(), setup()]);
    await setup();

    assert.equal(calls, 1);
  });

  it("retries after a failed setup attempt", async () => {
    let calls = 0;
    const setup = createRetryableSetup(async () => {
      calls += 1;
      if (calls === 1) throw new Error("transient");
    });

    await assert.rejects(setup(), /transient/);
    await setup();

    assert.equal(calls, 2);
  });
});
