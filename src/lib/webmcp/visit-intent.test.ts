import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OBJECTIVE_MAX,
  PRIORITIES_MAX,
  intentFromText,
  intentToText,
  normalizeIntent,
  useVisitIntentStore,
} from "./visit-intent";

describe("intentFromText", () => {
  it("extracts an objective line and bullet priorities", () => {
    const parsed = intentFromText(
      "Screening for a Staff AI Engineer\n\n- Ship agent systems\n- Write evals\n* Own ROI analysis",
    );
    assert.equal(parsed.objective, "Screening for a Staff AI Engineer");
    assert.deepEqual(parsed.priorities, [
      "Ship agent systems",
      "Write evals",
      "Own ROI analysis",
    ]);
  });

  it("falls back to plain lines when there are no bullets", () => {
    const parsed = intentFromText("Platform role\nBuild pipelines\nMentor juniors");
    assert.equal(parsed.objective, "Platform role");
    assert.deepEqual(parsed.priorities, ["Build pipelines", "Mentor juniors"]);
  });

  it("returns an empty objective for empty text", () => {
    assert.equal(intentFromText("   \n  ").objective, "");
  });
});

describe("normalizeIntent", () => {
  it("caps every field and stamps suppliedBy", () => {
    const intent = normalizeIntent(
      {
        objective: "x".repeat(OBJECTIVE_MAX + 50),
        contextLabel: "  Staff AI Engineer  ",
        priorities: Array.from({ length: 10 }, (_, i) => `p${i}`),
        evidenceStandard: "public artifacts only",
      },
      "visitor-agent",
    );
    assert.equal(intent.objective.length, OBJECTIVE_MAX);
    assert.equal(intent.contextLabel, "Staff AI Engineer");
    assert.equal(intent.priorities.length, PRIORITIES_MAX);
    assert.equal(intent.suppliedBy, "visitor-agent");
    assert.match(intent.setAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("treats blank optional fields as null", () => {
    const intent = normalizeIntent({ objective: "hi", contextLabel: "  " }, "human");
    assert.equal(intent.contextLabel, null);
    assert.equal(intent.evidenceStandard, null);
  });
});

describe("intentToText", () => {
  it("round-trips through intentFromText for the edit control", () => {
    const original = normalizeIntent(
      { objective: "Screening", priorities: ["a", "b"] },
      "human",
    );
    const reparsed = intentFromText(intentToText(original));
    assert.equal(reparsed.objective, "Screening");
    assert.deepEqual(reparsed.priorities, ["a", "b"]);
  });
});

describe("normalizeIntent priorities", () => {
  it("deduplicates repeated priorities so list rows render once", () => {
    const intent = normalizeIntent(
      { objective: "Screening", priorities: ["react", "react ", "evals"] },
      "visitor-agent",
    );
    assert.deepEqual(intent.priorities, ["react", "evals"]);
  });
});

describe("visit intent store", () => {
  it("sets and clears session-scoped intent", () => {
    const stored = useVisitIntentStore
      .getState()
      .setIntent({ objective: "Evaluate", priorities: ["x"] }, "human");
    assert.equal(stored.objective, "Evaluate");
    assert.equal(useVisitIntentStore.getState().intent?.priorities.length, 1);
    useVisitIntentStore.getState().clear();
    assert.equal(useVisitIntentStore.getState().intent, null);
  });
});
