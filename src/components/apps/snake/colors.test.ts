import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lerpColor } from "./colors";

describe("lerpColor", () => {
  it("interpolates valid colors", () => {
    assert.equal(lerpColor("#000000", "#ffffff", 0.5), "rgb(128, 128, 128)");
    assert.equal(lerpColor("rgb(10, 20, 30)", "rgb(20, 40, 60)", 0.5), "rgb(15, 30, 45)");
  });

  it("clamps interpolation factors to the valid color range", () => {
    assert.equal(lerpColor("#000000", "#ffffff", -1), "rgb(0, 0, 0)");
    assert.equal(lerpColor("#000000", "#ffffff", 2), "rgb(255, 255, 255)");
  });

  it("falls back to the source color for malformed channel values", () => {
    assert.equal(lerpColor("rgb(300, 0, 0)", "#000000", 0.5), "rgb(300, 0, 0)");
    assert.equal(lerpColor("#ff", "#000000", 0.5), "#ff");
  });
});
