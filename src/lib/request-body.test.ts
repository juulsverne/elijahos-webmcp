import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readJsonBody } from "./request-body";

describe("readJsonBody", () => {
  it("rejects payloads larger than the configured byte limit", async () => {
    const result = await readJsonBody(
      new Request("https://example.test/api", {
        method: "POST",
        body: JSON.stringify({ value: "x".repeat(32) }),
      }),
      { maxBytes: 16 },
    );

    assert.deepEqual(result, { ok: false, status: 413, error: "request body too large" });
  });

  it("rejects invalid JSON without leaking parser details", async () => {
    const result = await readJsonBody(
      new Request("https://example.test/api", {
        method: "POST",
        body: "{",
      }),
      { maxBytes: 16 },
    );

    assert.deepEqual(result, { ok: false, status: 400, error: "invalid JSON body" });
  });
});
