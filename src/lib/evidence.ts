// Typed evidence records for the WebMCP tool surface.
//
// Everything here is DERIVED from the existing typed sources (ELIJAH,
// CASE_STUDIES) at module load. Nothing is hand-maintained in this file, so
// the public documents, the visible apps, and the agent tool surface can
// never drift apart (see AGENTS.md: derived evidence must not become a
// second biography).
//
// Records are neutral: they carry provenance, contribution scope,
// limitations, and artifacts a workspace can compose, and leave the fit
// judgment to the visitor or their agent. No scores, no verdicts. When the
// canonical content does not document personal contribution, the record
// says that explicitly instead of inferring ownership.

import { CASE_STUDIES } from "@/lib/case-studies";
import { ELIJAH } from "@/lib/elijah";
import { PUBLIC_ROUTES, aboutAnswerRoute, projectRoute } from "@/lib/public-routes";

export type EvidenceKind =
  | "project"
  | "case-study-section"
  | "decision"
  | "experience"
  | "education"
  | "public-answer";

export type EvidenceArtifact = {
  // App that renders this evidence, resolved by compose_workspace. Must be a
  // launchpad-visible app id; the allowlist is enforced at composition time.
  appId: string;
  label: string;
  // Optional in-app anchor (e.g. a case-study section id).
  anchorId?: string;
};

export type EvidenceRecord = {
  id: string;
  kind: EvidenceKind;
  title: string;
  // The candidate's own stated claim, verbatim from the typed source.
  claim: string;
  source: {
    // Which typed source file the record is derived from.
    label: string;
    // Canonical crawlable route where a human reads the same claim.
    canonicalPath: string;
  };
  // What the record actually documents about personal contribution. Never
  // inferred from a technology list.
  contributionScope: string;
  provenance: {
    type: "candidate-authored";
    label: string;
    // ISO revision date of the owning document, from ELIJAH.updated.
    updated: string;
  };
  limitations: string[];
  artifacts: EvidenceArtifact[];
  tags: string[];
};

// Site-wide disclosure attached to every evidence-bearing tool response.
// Honest limitations, stated once, kept in one place.
export const EVIDENCE_DISCLOSURE: readonly string[] = [
  "All records are candidate-authored self-descriptions; no third-party verification, references, or employment checks are included.",
  "Records reflect the site content as of the per-document revision dates in provenance.",
  "Search is lexical (keyword overlap), not semantic ranking; absence of a match means no documented evidence on this site, not a negative claim.",
];

const BASE_LIMITATION =
  "Candidate-authored; not independently verified.";

function tagsFrom(...parts: (string | string[] | undefined)[]): string[] {
  const out = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    for (const v of Array.isArray(p) ? p : [p]) {
      const t = v.trim().toLowerCase();
      if (t) out.add(t);
    }
  }
  return [...out];
}

function buildRecords(): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const caseStudyByProject = new Map(
    Object.entries(CASE_STUDIES).map(([key, cs]) => [cs.projectId, key]),
  );

  for (const p of ELIJAH.projects) {
    const caseKey = caseStudyByProject.get(p.id);
    records.push({
      id: `project:${p.id}`,
      kind: "project",
      title: `${p.name} (${p.year})`,
      claim: `${p.kind}. ${p.desc} Self-reported result: ${p.result}`,
      source: {
        label: "src/lib/elijah.ts — projects",
        canonicalPath: projectRoute(p.id),
      },
      contributionScope:
        "Personal portfolio project. Per-item contribution beyond this description is not documented on this site.",
      provenance: {
        type: "candidate-authored",
        label: "Candidate-written project description",
        updated: ELIJAH.updated.projects,
      },
      limitations: [
        BASE_LIMITATION,
        "The stated result is self-reported and has no external measurement attached.",
      ],
      artifacts: [
        { appId: "projects", label: "Projects app" },
        ...(caseKey
          ? [{ appId: "case", label: "Case study window" }]
          : []),
      ],
      tags: tagsFrom(p.stack, p.status, p.name, "project"),
    });
  }

  ELIJAH.experience.forEach((e, i) => {
    records.push({
      id: `experience:${i}`,
      kind: "experience",
      title: `${e.role} — ${e.co} (${e.when})`,
      claim: e.what,
      source: {
        label: "src/lib/elijah.ts — experience",
        canonicalPath: PUBLIC_ROUTES.resume,
      },
      contributionScope: `Role held personally: ${e.role} at ${e.co}. The description is the candidate's own summary of that role.`,
      provenance: {
        type: "candidate-authored",
        label: "Candidate-written resume entry",
        updated: ELIJAH.updated.resume,
      },
      limitations: [
        BASE_LIMITATION,
        "No employer confirmation or reference is attached to this entry.",
      ],
      artifacts: [{ appId: "resume", label: "Resume app" }],
      tags: tagsFrom(e.co, e.role, "experience"),
    });
  });

  ELIJAH.education.forEach((e, i) => {
    records.push({
      id: `education:${i}`,
      kind: "education",
      title: `${e.degree} — ${e.school} (${e.when})`,
      claim: `${e.degree} at ${e.school}, ${e.when}.`,
      source: {
        label: "src/lib/elijah.ts — education",
        canonicalPath: PUBLIC_ROUTES.resume,
      },
      contributionScope: "Degree the candidate reports holding.",
      provenance: {
        type: "candidate-authored",
        label: "Candidate-written resume entry",
        updated: ELIJAH.updated.resume,
      },
      limitations: [BASE_LIMITATION, "No transcript or registrar verification is attached."],
      artifacts: [{ appId: "resume", label: "Resume app" }],
      tags: tagsFrom(e.school, e.degree, "education"),
    });
  });

  for (const a of ELIJAH.publicAnswers) {
    records.push({
      id: `answer:${a.id}`,
      kind: "public-answer",
      title: a.question,
      claim: a.answer,
      source: {
        label: "src/lib/elijah.ts — publicAnswers",
        canonicalPath: aboutAnswerRoute(a.id),
      },
      contributionScope:
        "Candidate-authored answer about their own work and preferences.",
      provenance: {
        type: "candidate-authored",
        label: "Published answer on /about",
        updated: ELIJAH.updated.about,
      },
      limitations: [BASE_LIMITATION],
      artifacts: [{ appId: "about", label: "About app" }],
      tags: tagsFrom(a.tags, a.topic),
    });
  }

  for (const [key, cs] of Object.entries(CASE_STUDIES)) {
    for (const s of cs.sections) {
      records.push({
        id: `section:${key}:${s.id}`,
        kind: "case-study-section",
        title: `${cs.title}: ${s.heading}`,
        claim: s.body.join(" "),
        source: {
          label: "src/lib/case-studies.ts — sections",
          canonicalPath: projectRoute(cs.projectId),
        },
        contributionScope:
          "Case study written by the candidate about a project they report building personally.",
        provenance: {
          type: "candidate-authored",
          label: "Candidate-written case study section",
          updated: ELIJAH.updated.projects,
        },
        limitations: [BASE_LIMITATION],
        artifacts: [
          { appId: "case", label: "Case study window", anchorId: s.id },
        ],
        tags: tagsFrom(s.heading, cs.projectId, "case study"),
      });
    }
    cs.decisions.forEach((d, i) => {
      records.push({
        id: `decision:${key}:${i}`,
        kind: "decision",
        title: `${cs.title}: picked ${d.picked}`,
        claim: `Considered ${d.considered.join(", ")}. Picked ${d.picked}. ${d.reason}`,
        source: {
          label: "src/lib/case-studies.ts — decisions",
          canonicalPath: projectRoute(cs.projectId),
        },
        contributionScope:
          "Architecture decision the candidate reports making on their own project.",
        provenance: {
          type: "candidate-authored",
          label: "Candidate-written trade-off record",
          updated: ELIJAH.updated.projects,
        },
        limitations: [BASE_LIMITATION],
        artifacts: [{ appId: "case", label: "Case study window" }],
        tags: tagsFrom(d.picked, d.considered, "architecture decision", cs.projectId),
      });
    });
  }

  return records;
}

export const EVIDENCE_RECORDS: readonly EvidenceRecord[] = buildRecords();

export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "project",
  "case-study-section",
  "decision",
  "experience",
  "education",
  "public-answer",
];

export function getEvidenceRecord(id: string): EvidenceRecord | undefined {
  return EVIDENCE_RECORDS.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// Lexical search with explicit gap reporting.

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "have", "in", "is", "it", "of", "on", "or", "our", "the", "their", "to",
  "we", "with", "you", "your", "who", "what", "how", "years", "year",
  "experience", "strong", "ability", "excellent", "must", "should", "will",
  "plus", "preferred", "required", "requirements", "knowledge", "skills",
  "working", "work",
]);

export function tokenize(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((t) => t.replace(/^[.#+]+|[.#+]+$/g, "").trim())
        .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
    ),
  ];
}

export type EvidenceMatch = {
  record: EvidenceRecord;
  score: number;
  matchedTerms: string[];
};

export type EvidenceSearchResult = {
  matches: EvidenceMatch[];
  matchedTerms: string[];
  // Query terms with zero hits anywhere — surfaced so an agent can say
  // "no documented evidence for X" instead of silently dropping it.
  unmatchedTerms: string[];
};

export function searchEvidence(
  query: string,
  limit = 5,
  kinds?: readonly string[],
): EvidenceSearchResult {
  const terms = tokenize(query);
  const matches: EvidenceMatch[] = [];
  const matchedAnywhere = new Set<string>();
  const kindFilter =
    kinds && kinds.length ? new Set(kinds) : null;

  for (const record of EVIDENCE_RECORDS) {
    if (kindFilter && !kindFilter.has(record.kind)) continue;
    const title = record.title.toLowerCase();
    const claim = record.claim.toLowerCase();
    const tagText = record.tags.join(" ");
    let score = 0;
    const matchedTerms: string[] = [];
    for (const term of terms) {
      let s = 0;
      if (tagText.includes(term)) s += 3;
      if (title.includes(term)) s += 2;
      if (claim.includes(term)) s += 1;
      if (s > 0) {
        score += s;
        matchedTerms.push(term);
        matchedAnywhere.add(term);
      }
    }
    if (score > 0) matches.push({ record, score, matchedTerms });
  }

  matches.sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  return {
    matches: matches.slice(0, Math.max(1, Math.min(limit, 8))),
    matchedTerms: [...matchedAnywhere],
    unmatchedTerms: terms.filter((t) => !matchedAnywhere.has(t)),
  };
}
