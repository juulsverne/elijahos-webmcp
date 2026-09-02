import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CASE_STUDIES } from "./case-studies";
import { ELIJAH } from "./elijah";
import {
  EVIDENCE_DISCLOSURE,
  EVIDENCE_KINDS,
  EVIDENCE_RECORDS,
  getEvidenceRecord,
  searchEvidence,
  tokenize,
} from "./evidence";

describe("evidence records", () => {
  it("derives every project, experience, education, answer, section, and decision", () => {
    const ids = new Set(EVIDENCE_RECORDS.map((r) => r.id));
    for (const p of ELIJAH.projects) assert.ok(ids.has(`project:${p.id}`));
    ELIJAH.experience.forEach((_, i) => assert.ok(ids.has(`experience:${i}`)));
    ELIJAH.education.forEach((_, i) => assert.ok(ids.has(`education:${i}`)));
    for (const a of ELIJAH.publicAnswers) assert.ok(ids.has(`answer:${a.id}`));
    for (const [key, cs] of Object.entries(CASE_STUDIES)) {
      for (const s of cs.sections) assert.ok(ids.has(`section:${key}:${s.id}`));
      cs.decisions.forEach((_, i) => assert.ok(ids.has(`decision:${key}:${i}`)));
    }
  });

  it("stamps every record with the full contract fields", () => {
    for (const r of EVIDENCE_RECORDS) {
      assert.ok(EVIDENCE_KINDS.includes(r.kind), r.id);
      assert.equal(r.provenance.type, "candidate-authored", r.id);
      assert.match(r.provenance.updated, /^\d{4}-\d{2}-\d{2}$/, r.id);
      assert.ok(r.source.canonicalPath.startsWith("/"), r.id);
      assert.ok(r.source.label.startsWith("src/lib/"), r.id);
      assert.ok(r.contributionScope.length > 10, r.id);
      assert.ok(r.limitations.length >= 1, r.id);
      assert.ok(r.artifacts.length >= 1, r.id);
      assert.ok(r.claim.length > 0, r.id);
    }
  });

  it("never infers contribution from a technology list on projects", () => {
    for (const r of EVIDENCE_RECORDS.filter((r) => r.kind === "project")) {
      assert.match(r.contributionScope, /not documented/i, r.id);
    }
  });

  it("stays neutral: no scores or verdict language in derived fields", () => {
    // Question tags may legitimately contain recruiter search words like
    // "hiring"; what must never appear is assessment language.
    const corpus = JSON.stringify(EVIDENCE_RECORDS) + JSON.stringify(EVIDENCE_DISCLOSURE);
    for (const banned of [/fit score/i, /strong match/i, /recommend hiring/i, /\d+\/10/]) {
      assert.doesNotMatch(corpus, banned);
    }
  });

  it("resolves records by id", () => {
    const first = EVIDENCE_RECORDS[0];
    assert.equal(getEvidenceRecord(first.id)?.id, first.id);
    assert.equal(getEvidenceRecord("nope:missing"), undefined);
  });
});

describe("evidence search", () => {
  it("finds stack terms and reports them as matched", () => {
    const result = searchEvidence("react");
    assert.ok(result.matches.length > 0);
    assert.deepEqual(result.unmatchedTerms, []);
  });

  it("reports terms with no documented evidence instead of dropping them", () => {
    const result = searchEvidence("react quantumfrobnication");
    assert.ok(result.unmatchedTerms.includes("quantumfrobnication"));
    assert.ok(result.matchedTerms.includes("react"));
  });

  it("returns nothing (and full gap) for an off-corpus query", () => {
    const result = searchEvidence("zzzunknown xxyyzz");
    assert.equal(result.matches.length, 0);
    assert.equal(result.unmatchedTerms.length, 2);
  });

  it("filters by kind", () => {
    const result = searchEvidence("finance", 8, ["experience"]);
    assert.ok(result.matches.length > 0);
    for (const m of result.matches) assert.equal(m.record.kind, "experience");
  });

  it("caps the limit at 8 and keeps ordering deterministic", () => {
    const a = searchEvidence("ai systems", 50);
    const b = searchEvidence("ai systems", 50);
    assert.ok(a.matches.length <= 8);
    assert.deepEqual(
      a.matches.map((m) => m.record.id),
      b.matches.map((m) => m.record.id),
    );
  });
});

describe("tokenize", () => {
  it("drops requirement boilerplate and keeps technical terms", () => {
    const terms = tokenize("5+ years of experience with TypeScript and React");
    assert.ok(terms.includes("typescript"));
    assert.ok(terms.includes("react"));
    assert.ok(!terms.includes("experience"));
    assert.ok(!terms.includes("of"));
  });
});
