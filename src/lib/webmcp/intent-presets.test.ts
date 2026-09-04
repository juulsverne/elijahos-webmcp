import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchEvidence } from "@/lib/evidence";
import { INTENT_PRESETS } from "./intent-presets";
import {
  normalizeIntent,
  OBJECTIVE_MAX,
  PRIORITIES_MAX,
  PRIORITY_MAX,
} from "./visit-intent";

describe("intent presets", () => {
  it("has unique ids and non-empty labels", () => {
    const ids = INTENT_PRESETS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const preset of INTENT_PRESETS) {
      assert.ok(preset.label.trim().length > 0, preset.id);
    }
  });

  it("every preset survives normalization without truncation", () => {
    // A preset that gets silently truncated would show the visitor something
    // different from what the chip promised.
    for (const preset of INTENT_PRESETS) {
      assert.ok(preset.intent.objective.length <= OBJECTIVE_MAX, preset.id);
      const priorities = preset.intent.priorities ?? [];
      assert.ok(priorities.length <= PRIORITIES_MAX, preset.id);
      for (const p of priorities) {
        assert.ok(p.length <= PRIORITY_MAX, `${preset.id}: ${p}`);
      }
      const normalized = normalizeIntent(preset.intent, "human");
      assert.equal(normalized.objective, preset.intent.objective, preset.id);
      assert.deepEqual(normalized.priorities, priorities, preset.id);
      assert.equal(normalized.suppliedBy, "human", preset.id);
      assert.equal(
        normalized.visitType,
        preset.intent.visitType ?? null,
        preset.id,
      );
    }
  });

  it("every preset priority matches documented evidence", () => {
    // The workspace auto-matches each priority against the evidence index;
    // a preset whose own priorities render as gaps would promise a view the
    // site cannot deliver.
    for (const preset of INTENT_PRESETS) {
      for (const priority of preset.intent.priorities ?? []) {
        const result = searchEvidence(priority, 3);
        assert.ok(
          result.matches.length > 0,
          `${preset.id}: "${priority}" matches no evidence`,
        );
      }
    }
  });
});
