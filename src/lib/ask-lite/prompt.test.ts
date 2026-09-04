import assert from "node:assert/strict";
import test from "node:test";

import { buildAskContext } from "./context";
import { buildAskInstructions } from "./prompt";

test("numbers canonical evidence and treats visitor content as untrusted", () => {
  const instructions = buildAskInstructions(
    buildAskContext("WebMCP evidence architecture"),
  );

  assert.match(instructions, /site-owned guide/i);
  assert.match(instructions, /visitor.*untrusted data/i);
  assert.match(instructions, /\[1\] Profile summary/);
  assert.match(instructions, /candidate-authored/i);
  assert.match(instructions, /canonical path: \/about/i);
  assert.match(instructions, /cite.*\[1\]/i);
});

test("forbids invention, impersonation, and hiring verdicts", () => {
  const instructions = buildAskInstructions(buildAskContext("Elijah AI work"));

  assert.match(instructions, /never invent/i);
  assert.match(instructions, /do not impersonate/i);
  assert.match(instructions, /do not.*hiring/i);
});

