import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ELIJAH } from "./elijah";

describe("public professional identity", () => {
  it("uses the current title without publishing the current employer", () => {
    assert.equal(ELIJAH.role, "AI Transformation Engineer");
    assert.equal(ELIJAH.experience[0]?.role, ELIJAH.role);
    assert.equal(ELIJAH.experience[0]?.co, "Enterprise technology");
  });

  it("keeps the finance-to-AI progression explicit", () => {
    // The progression lives in the About bio (the standalone career-path
    // banner was removed) — one block must still tell the analyst → AI story.
    const bio = ELIJAH.longBio.map((b) => b.body).join("\n");
    assert.match(bio, /financial analyst/i);
    assert.match(bio, /AI Transformation Engineer/);
    assert.ok(
      ELIJAH.experience.some((item) => item.role === "Financial Analyst"),
    );
  });

  it("does not reintroduce the stale title", () => {
    const publicCorpus = JSON.stringify(ELIJAH);

    assert.doesNotMatch(publicCorpus, /AI Solutions Architect/i);
  });

  it("keeps Vibe Modeling at concept level", () => {
    const vibeModeling = ELIJAH.projects.find(
      (project) => project.id === "vibe-modeling",
    );

    assert.equal(vibeModeling?.status, "planned");
    assert.match(vibeModeling?.desc ?? "", /concept/i);
    assert.deepEqual(
      vibeModeling?.stack,
      ["Human–AI collaboration", "Workflow design", "Structured review"],
    );
  });
});
