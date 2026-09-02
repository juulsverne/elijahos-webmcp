import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateInput, type InputSchema } from "./schema";

const schema: InputSchema = {
  type: "object",
  properties: {
    id: { type: "string", enum: ["a", "b"] },
    query: { type: "string", maxLength: 10 },
    limit: { type: "integer", minimum: 1, maximum: 20 },
    tags: {
      type: "array",
      items: { type: "string", maxLength: 5 },
      minItems: 1,
      maxItems: 3,
    },
  },
  required: ["id"],
  additionalProperties: false,
};

describe("validateInput", () => {
  it("accepts a valid input and strips nothing", () => {
    const r = validateInput(schema, { id: "a", limit: 5 });
    assert.ok(r.ok);
    assert.deepEqual(r.value, { id: "a", limit: 5 });
  });

  it("treats undefined input as an empty object", () => {
    const r = validateInput(
      { type: "object", properties: {}, additionalProperties: false },
      undefined,
    );
    assert.ok(r.ok);
  });

  it("rejects unknown properties (narrow-input contract)", () => {
    const r = validateInput(schema, { id: "a", location: "x" });
    assert.ok(!r.ok);
    assert.match(r.errors.join(" "), /unexpected property "location"/);
  });

  it("rejects missing required, bad enum, over-length, and non-integers", () => {
    for (const input of [
      {},
      { id: "z" },
      { id: "a", query: "01234567890" },
      { id: "a", limit: 2.5 },
      { id: "a", limit: 99 },
      "not an object",
    ]) {
      const r = validateInput(schema, input);
      assert.ok(!r.ok, JSON.stringify(input));
    }
  });

  it("validates string arrays: item type, item length, and item count", () => {
    const ok = validateInput(schema, { id: "a", tags: ["x", "y"] });
    assert.ok(ok.ok);
    assert.deepEqual(ok.value.tags, ["x", "y"]);
    for (const tags of [
      "not-an-array",
      [],
      ["a", "b", "c", "d"],
      [1, 2],
      ["toolongvalue"],
    ]) {
      const r = validateInput(schema, { id: "a", tags });
      assert.ok(!r.ok, JSON.stringify(tags));
    }
  });
});
