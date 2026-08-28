import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRmRfRoot } from "./runtime";

describe("zsh runtime reflex matching", () => {
  it("recognizes destructive root removal attempts with separated flags", () => {
    assert.equal(isRmRfRoot("rm -r -f /"), true);
    assert.equal(isRmRfRoot("sudo rm -f -r /*"), true);
  });

  it("does not treat non-root removal commands as root removal attempts", () => {
    assert.equal(isRmRfRoot("rm -rf /tmp"), false);
    assert.equal(isRmRfRoot("rm -rf notes.txt"), false);
    assert.equal(isRmRfRoot("rm -rf / /tmp"), false);
  });
});
