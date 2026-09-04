// The WebMCP tool surface: framework-free tool definitions.
//
// Five core tools carry the agent journey — set_visit_intent,
// search_evidence, inspect_evidence, compose_workspace, get_workspace_state
// — plus three small read-only lookups (profile, resume, contact) so an
// agent can answer basic questions without a search round-trip, and two
// personality tools (open_app, play_music) because ElijahOS is an OS, not a
// dossier: an agent can open the snake game or put a track on the same way
// a human would.
//
// Design rules (AGENTS.md + WebMCP security guidance):
// - Narrow inputs: flat schemas, few properties, no personal-data
//   parameters (over-parameterization is a fingerprinting vector).
// - Structured outputs with provenance, contribution scope, limitations,
//   and explicit gaps; the agent judges fit — tools never score candidates
//   or emit hiring verdicts.
// - `readOnly: true` only when the handler provably mutates nothing.
// - Outputs that can echo caller- or visitor-supplied content carry untrustedContent.
//
// Handlers are plain functions over typed sources so node tests and evals
// can call them directly without a browser or the WebMCP API.

import { hasMobileOpener, openApp } from "@/lib/app-launcher";
import { APPS, LAUNCHPAD_ORDER } from "@/lib/apps";
import { ELIJAH } from "@/lib/elijah";
import {
  musicSnapshot,
  sendMusicCommand,
  type MusicAction,
} from "@/lib/music-remote";
import { useWidgetStore } from "@/lib/widget-store";
import {
  EVIDENCE_DISCLOSURE,
  EVIDENCE_KINDS,
  EVIDENCE_RECORDS,
  FIRST_HAND_SOURCES,
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
  VISIT_TYPES,
  useVisitIntentStore,
  type VisitType,
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
    externalLinks: r.externalLinks,
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
    externalLinks: m.record.externalLinks,
    matchedTerms: m.matchedTerms,
  };
}

export const WEBMCP_TOOLS: ToolDef[] = [
  {
    name: "set_visit_intent",
    title: "Set visit intent",
    description:
      "Tell this site why your visitor is here: an objective, optional context label, up to four priorities, an optional evidence standard, and an optional visit_type naming the kind of visit from your own conversation context (hiring, client-project, technical-review, inspiration, just-exploring, other). Stored in the visitor's browser session only — never sent to a server — and shown to the visitor in the agent workspace (which this tool opens), where they can edit or clear it.",
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
        visit_type: {
          type: "string",
          description:
            "The kind of visit, inferred from the visitor's own context.",
          enum: VISIT_TYPES,
        },
      },
      required: ["objective"],
      additionalProperties: false,
    },
    readOnly: false,
    untrustedContent: true,
    handler: (input) => {
      // Schema minLength counts raw characters, so a whitespace-only
      // objective passes validation; an intent must still say something.
      const objective = String(input.objective).trim();
      if (!objective) {
        return {
          error: "invalid input",
          details: ['"objective" must contain non-whitespace text'],
        };
      }
      const intent = useVisitIntentStore.getState().setIntent(
        {
          objective,
          contextLabel: (input.context_label as string | undefined) ?? null,
          priorities: (input.priorities as string[] | undefined) ?? [],
          evidenceStandard:
            (input.evidence_standard as string | undefined) ?? null,
          visitType: (input.visit_type as VisitType | undefined) ?? null,
        },
        "visitor-agent",
      );
      // Visible proof: the workspace opens in front showing the stored
      // intent, so an agent-set intent is never invisible to the visitor.
      openApp("agent");
      return {
        stored: intent,
        scope:
          "Browser session only (sessionStorage). The visitor can edit or clear it in the agent workspace at any time.",
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
      "Keyword-search the candidate-authored evidence records (projects, case-study sections, decisions, experience, education, public answers). Returns ranked matches with source, contribution scope, provenance, limitations, and any externalLinks (e.g. a project's public repository) — plus the query terms that matched nothing, so documented-evidence gaps are explicit. Every response also lists firstHandSources you can verify without trusting self-descriptions: the live site you are browsing and its public code.",
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
    untrustedContent: true,
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
        firstHandSources: FIRST_HAND_SOURCES,
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
    untrustedContent: true,
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
        firstHandSources: FIRST_HAND_SOURCES,
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
    untrustedContent: true,
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
      "Read the candidate's public profile: name, role, positioning, work pillars, creative work (original music and the playful software of this site), location, canonical routes, per-document revision dates, and first-hand sources to verify independently. All content is candidate-authored.",
    inputSchema: NO_INPUT,
    readOnly: true,
    handler: () => ({
      name: ELIJAH.name,
      role: ELIJAH.role,
      positioning: ELIJAH.positioning,
      profileDescription: ELIJAH.profileDescription,
      location: ELIJAH.location,
      // Factual work areas — named scopes, not self-assessments.
      pillars: ELIJAH.pillars,
      // The creative dimension as facts and artifacts, never adjectives:
      // the music is playable here, the playful builds are this site.
      creative: {
        music: {
          tracks: ELIJAH.music.tracks.map((t, i) => ({
            track: i + 1,
            title: t.title,
            unreleased: t.unreleased === true,
          })),
          spotifyArtist: ELIJAH.music.spotifyArtistUrl,
          note: "Original music by the candidate — playable on this site via play_music.",
        },
        note: "The playful side is the site itself: a browser OS with games, widgets, and easter eggs the candidate built. Open them with open_app and judge first-hand.",
      },
      canonicalRoutes: PUBLIC_ROUTES,
      updated: ELIJAH.updated,
      firstHandSources: FIRST_HAND_SOURCES,
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
  {
    name: "open_app",
    title: "Open an app",
    description:
      "Open one of the OS's launchpad apps in the visitor's shell — the same windows a human opens from the dock. Not just the portfolio apps: /snake, /calculator, /clock, and the /zsh terminal are fair game. Opens UI only and returns nothing beyond what it opened.",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "Launchpad app id, e.g. \"snake\" or \"projects\".",
          enum: LAUNCHPAD_ORDER,
        },
      },
      required: ["app"],
      additionalProperties: false,
    },
    readOnly: false,
    handler: (input) => {
      const id = String(input.app);
      const app = APPS[id];
      if (!app?.launchpad) {
        return {
          error: "unknown app",
          details: [`no launchpad app is named "${id}"`],
        };
      }
      const shell = hasMobileOpener() ? "mobile" : "desktop";
      if (shell === "mobile" && app.desktopOnly) {
        return {
          opened: null,
          shell,
          note: `${app.title} is desktop-only; the mobile shell doesn't offer it.`,
        };
      }
      openApp(id);
      return { opened: id, title: app.title, shell };
    },
    summarize: (input) => `opened ${String(input.app)}`,
  },
  {
    name: "play_music",
    title: "Play music",
    description:
      "Drive the site's music player — the candidate's own tracks — through the same controls a human clicks: play, pause, next, previous, or jump to a track number. Opens the desktop widget panel so playback is visible. Best-effort by design: browsers may hold audio until the visitor has interacted with the page.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Playback action. Defaults to \"play\".",
          enum: ["play", "pause", "next", "previous"],
        },
        track: {
          type: "integer",
          description: "Optional 1-based track number to jump to first.",
          minimum: 1,
          maximum: ELIJAH.music.tracks.length,
        },
      },
      additionalProperties: false,
    },
    readOnly: false,
    handler: (input) => {
      const tracks = ELIJAH.music.tracks.map((t, i) => ({
        track: i + 1,
        title: t.title,
        unreleased: t.unreleased === true,
      }));
      if (hasMobileOpener()) {
        return {
          delivered: false,
          tracks,
          note: "The music player lives in the desktop shell's widget panel; this mobile shell has no player to drive.",
          spotify: ELIJAH.music.spotifyArtistUrl,
        };
      }
      const action = ((input.action as string | undefined) ??
        "play") as MusicAction;
      const trackNumber = input.track as number | undefined;
      // Make playback visible: the widget panel is where the player lives.
      useWidgetStore.getState().open();
      const sent = sendMusicCommand({
        action,
        trackIndex: trackNumber === undefined ? undefined : trackNumber - 1,
      });
      return {
        delivered: sent.delivered,
        nowPlaying: musicSnapshot(),
        tracks,
        note: sent.delivered
          ? "Command handled by the on-page player. Browsers may still hold audio until the visitor has interacted with the page."
          : "The widget panel is opening; the player picks this command up as soon as it mounts.",
      };
    },
    summarize: (input) => {
      const action = (input.action as string | undefined) ?? "play";
      const track = input.track as number | undefined;
      return track === undefined
        ? `music: ${action}`
        : `music: ${action} track ${track}`;
    },
  },
];

export function getToolDef(name: string): ToolDef | undefined {
  return WEBMCP_TOOLS.find((t) => t.name === name);
}
