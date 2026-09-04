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

  it("answers core recruiter vocabulary without false gaps", () => {
    // Word-form variants: content says "tests"/"tested"; recruiters type
    // "testing". Spelling variants: "genai" is "generative ai".
    for (const term of ["typescript", "testing", "genai", "evals"]) {
      const result = searchEvidence(term, 3);
      assert.ok(result.matches.length > 0, `"${term}" should match`);
      assert.deepEqual(result.unmatchedTerms, [], term);
    }
    // TypeScript evidence anchors on the site's own build.
    const ts = searchEvidence("typescript", 3);
    assert.ok(ts.matches.some((m) => m.record.id === "project:elijahos"));
  });

  it("routes trait-shaped queries to the records that demonstrate them", () => {
    // "tradeoffs" is the recruiter's word for what a decision record is.
    const result = searchEvidence("tradeoffs", 3);
    assert.ok(result.matches.length > 0);
    assert.ok(result.matches.every((m) => m.record.kind === "decision"));
    assert.deepEqual(result.unmatchedTerms, []);
  });

  it("keeps genuinely undocumented terms as explicit gaps", () => {
    for (const term of ["kubernetes", "aws", "mlops"]) {
      const result = searchEvidence(term, 3);
      assert.equal(result.matches.length, 0, term);
      assert.deepEqual(result.unmatchedTerms, [term]);
    }
  });

  it("short terms match whole words only — no substring false positives", () => {
    // "eq" must not hit "sequence"/"request"; "ai" must still match the
    // word the content uses everywhere.
    const eq = searchEvidence("eq", 3);
    assert.equal(eq.matches.length, 0);
    assert.deepEqual(eq.unmatchedTerms, ["eq"]);
    const ai = searchEvidence("ai", 3);
    assert.ok(ai.matches.length > 0);
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
    assert.ok(!terms.includes("5+"));
  });

  it("keeps symbol-bearing shorts so their gaps stay reportable", () => {
    const terms = tokenize("C# and C++ evals");
    assert.ok(terms.includes("c#"));
    assert.ok(terms.includes("c++"));
    assert.ok(!terms.includes("c"));
  });

  it("reports an unsearched symbol term as unmatched, not silently dropped", () => {
    const result = searchEvidence("C# evals");
    assert.ok(result.unmatchedTerms.includes("c#"));
    assert.ok(!result.matchedTerms.includes("c#"));
  });
});
