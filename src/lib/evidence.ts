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
  // Independently checkable references attached to this specific claim —
  // e.g. a project's public repository. Empty when the canonical source
  // documents none; never invented.
  externalLinks: { label: string; url: string }[];
  tags: string[];
};

// Site-wide disclosure attached to every evidence-bearing tool response.
// Honest limitations, stated once, kept in one place.
export const EVIDENCE_DISCLOSURE: readonly string[] = [
  "All records are candidate-authored self-descriptions; no third-party verification, references, or employment checks are included.",
  "Records reflect the site content as of the per-document revision dates in provenance.",
  "Search is lexical (keyword overlap with light word-form normalization), not semantic ranking; absence of a match means no documented evidence on this site, not a negative claim.",
  "The strongest checks are first-hand: judge the live site you are browsing and the linked public code yourself (see firstHandSources); records carry externalLinks when the claim has a public artifact.",
  "Qualities like analytical or architectural ability are never stored as claims. They are demonstrated: read kind 'decision' records (options considered, tradeoffs, the pick and why), the case studies' structure, and this site's own build — then judge the reasoning yourself.",
];

// Pointers an agent can verify without trusting any self-description: the
// artifact it is standing in, and public code. The site names where to look
// and leaves every judgment — UI, writing, architecture, originality — to
// the agent. No self-grading.
export const FIRST_HAND_SOURCES: readonly {
  label: string;
  url: string | null;
  note: string;
}[] = [
  {
    label: "This site, live",
    url: null,
    note: "You are browsing the candidate's own build — the OS shell, its apps, all copy, and this WebMCP tool surface. Judge the UI, writing, architecture, and originality first-hand.",
  },
  {
    label: "This site's source repository",
    url: "https://github.com/juulsverne/elijahos-webmcp",
    note: "Architecture, tests, and commit history for the site you are browsing; the challenge-baseline tag separates pre-challenge work.",
  },
  {
    label: "GitHub profile",
    url: `https://${ELIJAH.contact.github}`,
    note: "Public repositories and activity beyond this site.",
  },
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
      externalLinks: [
        ...(p.links?.repo
          ? [{ label: "Source repository", url: p.links.repo }]
          : []),
        ...(p.links?.demo ? [{ label: "Live demo", url: p.links.demo }] : []),
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
      externalLinks: [],
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
      externalLinks: [],
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
      externalLinks: [],
      tags: tagsFrom(a.tags, a.topic),
    });
  }

  for (const [key, cs] of Object.entries(CASE_STUDIES)) {
    for (const s of cs.sections) {
      records.push({
        id: `section:${key}:${s.id}`,
        kind: "case-study-section",
        title: `${cs.title}: ${s.heading}`,
        // Points are part of the section's content; leaving them out would
        // silently shrink what agent-side evidence search can match.
        claim: [
          ...s.body,
          ...(s.points ?? []).map((p) => `${p.label} — ${p.text}`),
        ].join(" "),
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
        externalLinks: [],
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
        artifacts: [
          // Decisions render inside the case study's decisions section.
          { appId: "case", label: "Case study window", anchorId: "decisions" },
        ],
        externalLinks: [],
        // "tradeoffs considered" is artifact-type metadata, not a trait
        // claim: a decision record IS a documented tradeoff analysis.
        tags: tagsFrom(
          d.picked,
          d.considered,
          "architecture decision",
          "tradeoffs considered",
          cs.projectId,
        ),
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
        .map((raw) => {
          const stripped = raw.replace(/^[.#+]+|[.#+]+$/g, "").trim();
          if (!/^[a-z]$/.test(stripped)) return stripped;
          // "c#" and "c++" stripped to a bare letter would vanish from both
          // matching and the unmatched-terms gap report; single-letter cores
          // keep their symbols instead. Digit shorts like "5+" stay stripped
          // so requirement boilerplate never becomes a searchable term.
          const symbolic = raw.replace(/^\.+|\.+$/g, "").trim();
          return symbolic.length > 1 ? symbolic : stripped;
        })
        .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
    ),
  ];
}

// Pure spelling variants of terms the content already uses — not synonyms.
// A recruiter's "genai" names the generative-AI work this site simply calls
// "AI" throughout; mapping one to the other invents no claim.
const QUERY_ALIASES: Record<string, string> = {
  genai: "ai",
};

// Matching stays lexical, but a query term is tried in light word-form
// variants so "testing" still finds content that says "tests" or "tested".
// Substring matching means stemming the QUERY side alone is enough; gap
// reporting stays keyed to the recruiter's original word.
function queryVariants(term: string): string[] {
  const variants = new Set([term]);
  const alias = QUERY_ALIASES[term];
  if (alias) variants.add(alias);
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (term.endsWith(suffix) && term.length - suffix.length >= 4) {
      variants.add(term.slice(0, -suffix.length));
      break;
    }
  }
  return [...variants];
}

// Substring matching is too loose for very short terms: "eq" must not hit
// "sequence", nor "ci" hit "decisions". Purely alphanumeric terms of 1-2
// chars match on word boundaries instead; symbol-bearing shorts ("c#")
// keep substring matching, where the symbol already makes them precise.
function textHas(text: string, variant: string): boolean {
  if (variant.length <= 2 && /^[a-z0-9]+$/.test(variant)) {
    return new RegExp(`\\b${variant}\\b`).test(text);
  }
  return text.includes(variant);
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
      const variants = queryVariants(term);
      let s = 0;
      if (variants.some((v) => textHas(tagText, v))) s += 3;
      if (variants.some((v) => textHas(title, v))) s += 2;
      if (variants.some((v) => textHas(claim, v))) s += 1;
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
