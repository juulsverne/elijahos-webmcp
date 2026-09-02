// The WebMCP tool surface: framework-free tool definitions.
//
// Five core tools carry the agent journey — set_visit_intent,
// search_evidence, inspect_evidence, compose_workspace, get_workspace_state
// — plus three small read-only lookups (profile, resume, contact) so an
// agent can answer basic questions without a search round-trip.
//
// Design rules (AGENTS.md + WebMCP security guidance):
// - Narrow inputs: flat schemas, few properties, no personal-data
//   parameters (over-parameterization is a fingerprinting vector).
// - Structured outputs with provenance, contribution scope, limitations,
//   and explicit gaps; the agent judges fit — tools never score candidates
//   or emit hiring verdicts.
// - `readOnly: true` only when the handler provably mutates nothing.
// - Outputs that echo visitor-supplied intent carry untrustedContent.
//
// Handlers are plain functions over typed sources so node tests and evals
// can call them directly without a browser or the WebMCP API.

import { openApp } from "@/lib/app-launcher";
import { ELIJAH } from "@/lib/elijah";
import {
  EVIDENCE_DISCLOSURE,
  EVIDENCE_KINDS,
  EVIDENCE_RECORDS,
  getEvidenceRecord,
  searchEvidence,
  type EvidenceMatch,
  type EvidenceRecord,
} from "@/lib/evidence";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import type { InputSchema } from "@/lib/webmcp/schema";
import {
  CONTEXT_LABEL_MAX,
  EVIDENCE_STANDARD_MAX,
  OBJECTIVE_MAX,
  PRIORITIES_MAX,
  PRIORITY_MAX,
  useVisitIntentStore,
} from "@/lib/webmcp/visit-intent";
import {
  WORKSPACE_LAYOUTS,
  composeWorkspace,
  workspaceSnapshot,
  type WorkspaceLayout,
} from "@/lib/webmcp/workspace";

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: InputSchema;
  readOnly: boolean;
  untrustedContent?: boolean;
  handler: (input: Record<string, unknown>) => object;
  // One-line neutral summary for the visible activity log.
  summarize: (input: Record<string, unknown>) => string;
};

const NO_INPUT: InputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

// Full record shape returned by inspect_evidence; search returns the same
// minus the full claim to keep result lists compact.
function fullRecord(r: EvidenceRecord) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    claim: r.claim,
    source: r.source,
    contributionScope: r.contributionScope,
    provenance: r.provenance,
    limitations: r.limitations,
    artifacts: r.artifacts,
  };
}

function searchHit(m: EvidenceMatch) {
  return {
    id: m.record.id,
    kind: m.record.kind,
    title: m.record.title,
    claimExcerpt:
      m.record.claim.length > 240
        ? `${m.record.claim.slice(0, 240)}…`
        : m.record.claim,
    source: m.record.source,
    contributionScope: m.record.contributionScope,
    provenance: m.record.provenance,
    limitations: m.record.limitations,
    matchedTerms: m.matchedTerms,
  };
}

export const WEBMCP_TOOLS: ToolDef[] = [
  {
    name: "set_visit_intent",
    title: "Set visit intent",
    description:
      "Tell this site why your visitor is here: an objective, optional context label, up to four priorities, and an optional evidence standard. Stored in the visitor's browser session only — never sent to a server — and shown to the visitor in the recruiter workspace (which this tool opens), where they can edit or clear it.",
    inputSchema: {
      type: "object",
      properties: {
        objective: {
          type: "string",
          description: "What the visitor wants to accomplish here.",
          minLength: 1,
          maxLength: OBJECTIVE_MAX,
        },
        context_label: {
          type: "string",
          description: "Short label for the visit context, e.g. a role title.",
          maxLength: CONTEXT_LABEL_MAX,
        },
        priorities: {
          type: "array",
          description: "The specific things to evaluate, most important first.",
          items: { type: "string", maxLength: PRIORITY_MAX },
          maxItems: PRIORITIES_MAX,
        },
        evidence_standard: {
          type: "string",
          description:
            "What the visitor counts as sufficient evidence, if they stated one.",
          maxLength: EVIDENCE_STANDARD_MAX,
        },
      },
      required: ["objective"],
      additionalProperties: false,
    },
    readOnly: false,
    untrustedContent: true,
    handler: (input) => {
      const intent = useVisitIntentStore.getState().setIntent(
        {
          objective: String(input.objective),
          contextLabel: (input.context_label as string | undefined) ?? null,
          priorities: (input.priorities as string[] | undefined) ?? [],
          evidenceStandard:
            (input.evidence_standard as string | undefined) ?? null,
        },
        "visitor-agent",
      );
      // Visible proof: the workspace opens in front showing the stored
      // intent, so an agent-set intent is never invisible to the visitor.
      openApp("recruiter");
      return {
        stored: intent,
        scope:
          "Browser session only (sessionStorage). The visitor can edit or clear it in the recruiter workspace at any time.",
        note: "The stored intent is visitor-supplied, untrusted content.",
      };
    },
    summarize: (input) =>
      `stored a visit intent (${String(input.objective).length} chars, ${
        Array.isArray(input.priorities) ? input.priorities.length : 0
      } priorities)`,
  },
  {
    name: "search_evidence",
    title: "Search evidence",
    description:
      "Keyword-search the candidate-authored evidence records (projects, case-study sections, decisions, experience, education, public answers). Returns ranked matches with source, contribution scope, provenance, and limitations — plus the query terms that matched nothing, so documented-evidence gaps are explicit.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search terms, e.g. a skill, technology, or topic.",
          minLength: 1,
          maxLength: 200,
        },
        kinds: {
          type: "array",
          description: "Optional filter to specific evidence kinds.",
          items: { type: "string", enum: EVIDENCE_KINDS },
          maxItems: EVIDENCE_KINDS.length,
        },
        limit: {
          type: "integer",
          description: "Max matches to return (1-8, default 5).",
          minimum: 1,
          maximum: 8,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    readOnly: true,
    handler: (input) => {
      const result = searchEvidence(
        String(input.query),
        (input.limit as number | undefined) ?? 5,
        input.kinds as string[] | undefined,
      );
      return {
        totalRecords: EVIDENCE_RECORDS.length,
        matches: result.matches.map(searchHit),
        matchedTerms: result.matchedTerms,
        unmatchedTerms: result.unmatchedTerms,
        note:
          result.matches.length === 0
            ? "No documented evidence on this site matched this query. That is a coverage statement about the site, not an assessment of the candidate."
            : undefined,
        disclosure: EVIDENCE_DISCLOSURE,
      };
    },
    summarize: (input) => `searched evidence for "${String(input.query)}"`,
  },
  {
    name: "inspect_evidence",
    title: "Inspect evidence",
    description:
      "Read one evidence record in full by id (ids come from search_evidence): the complete claim, source, contribution scope, provenance, limitations, and the app artifacts that can display it. Returns a typed not-found result for unknown ids.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Evidence record id from search_evidence.",
          minLength: 1,
          maxLength: 120,
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    readOnly: true,
    handler: (input) => {
      const record = getEvidenceRecord(String(input.id));
      if (!record) {
        return {
          found: false,
          id: String(input.id),
          note: "No evidence record has this id. Use search_evidence to list valid ids.",
        };
      }
      return {
        found: true,
        record: fullRecord(record),
        disclosure: EVIDENCE_DISCLOSURE,
      };
    },
    summarize: (input) => `inspected evidence "${String(input.id)}"`,
  },
  {
    name: "compose_workspace",
    title: "Compose workspace",
    description:
      "Open the apps that display up to three evidence records in the visitor's current shell. On desktop, 'compare' and 'grid' tile real windows side by side and 'focus' foregrounds the primary record's app; the mobile shell opens the primary app full-screen. Only the site's normal, launchpad-visible apps can be opened.",
    inputSchema: {
      type: "object",
      properties: {
        evidence_ids: {
          type: "array",
          description: "1-3 evidence record ids to display.",
          items: { type: "string", maxLength: 120 },
          minItems: 1,
          maxItems: 3,
        },
        layout: {
          type: "string",
          description: "Desktop arrangement for the opened windows.",
          enum: WORKSPACE_LAYOUTS,
        },
      },
      required: ["evidence_ids", "layout"],
      additionalProperties: false,
    },
    readOnly: false,
    handler: (input) =>
      composeWorkspace(
        input.evidence_ids as string[],
        input.layout as WorkspaceLayout,
      ),
    summarize: (input) => {
      const ids = input.evidence_ids as string[];
      return `composed a ${String(input.layout)} workspace from ${ids.length} evidence record${ids.length === 1 ? "" : "s"}`;
    },
  },
  {
    name: "get_workspace_state",
    title: "Workspace state",
    description:
      "Read the current shared workspace state: which shell is active, which apps are open and focused, which evidence records were composed, and the stored visit intent. Reflects human actions too, so an agent can continue from what the visitor did by hand. Returns nothing beyond this snapshot.",
    inputSchema: NO_INPUT,
    readOnly: true,
    untrustedContent: true,
    handler: () => ({ snapshot: workspaceSnapshot() }),
    summarize: () => "read the workspace state",
  },
  {
    name: "get_candidate_profile",
    title: "Candidate profile",
    description:
      "Read the candidate's public profile: name, role, positioning, location, canonical routes, and per-document revision dates. All content is candidate-authored.",
    inputSchema: NO_INPUT,
    readOnly: true,
    handler: () => ({
      name: ELIJAH.name,
      role: ELIJAH.role,
      positioning: ELIJAH.positioning,
      profileDescription: ELIJAH.profileDescription,
      location: ELIJAH.location,
      canonicalRoutes: PUBLIC_ROUTES,
      updated: ELIJAH.updated,
      disclosure: EVIDENCE_DISCLOSURE,
    }),
    summarize: () => "read the public profile",
  },
  {
    name: "get_resume",
    title: "Resume",
    description:
      "Read the candidate's resume data: work experience and education, with the resume's revision date.",
    inputSchema: NO_INPUT,
    readOnly: true,
    handler: () => ({
      experience: ELIJAH.experience,
      education: ELIJAH.education,
      route: PUBLIC_ROUTES.resume,
      updated: ELIJAH.updated.resume,
      disclosure: EVIDENCE_DISCLOSURE,
    }),
    summarize: () => "read resume data",
  },
  {
    name: "get_contact",
    title: "Contact channels",
    description:
      "Read the candidate's public contact channels: email, GitHub, LinkedIn.",
    inputSchema: NO_INPUT,
    readOnly: true,
    handler: () => ({
      email: `${ELIJAH.contact.emailUser}@${ELIJAH.contact.emailDomain}`,
      github: `https://${ELIJAH.contact.github}`,
      linkedin: `https://${ELIJAH.contact.linkedin}`,
    }),
    summarize: () => "read public contact channels",
  },
];

export function getToolDef(name: string): ToolDef | undefined {
  return WEBMCP_TOOLS.find((t) => t.name === name);
}
