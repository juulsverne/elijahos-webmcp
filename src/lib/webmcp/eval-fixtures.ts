// Deterministic acceptance fixtures for the public WebMCP tool surface.
// These are human-authored plans, not records of model tool selection.

export type WebMCPEvalFixture = {
  id: string;
  prompt: string;
  audience: string;
  kind: "planned-tool-sequence";
  modelEvaluated: false;
  steps: readonly {
    tool: string;
    input: Readonly<Record<string, unknown>>;
  }[];
};

export const WEBMCP_EVAL_FIXTURES: readonly WebMCPEvalFixture[] = [
  {
    id: "hiring-manager-evidence-loop",
    prompt: "Review the public evidence for finance workflow and AI enablement experience.",
    audience: "Hiring manager",
    kind: "planned-tool-sequence",
    modelEvaluated: false,
    steps: [
      {
        tool: "set_visit_intent",
        input: {
          objective: "Review relevant public work evidence",
          context_label: "AI transformation role",
          priorities: ["finance workflows", "AI enablement"],
          evidence_standard: "Candidate-authored evidence with explicit limitations",
        },
      },
      {
        tool: "search_evidence",
        input: { query: "finance workflows AI enablement", limit: 5 },
      },
      {
        tool: "inspect_evidence",
        input: { id: "project:finance-ai-workshop" },
      },
      {
        tool: "compose_workspace",
        input: {
          evidence_ids: ["project:finance-ai-workshop", "experience:0"],
          layout: "compare",
        },
      },
      { tool: "get_workspace_state", input: {} },
    ],
  },
  {
    id: "technical-reviewer-architecture",
    prompt: "Review a public architecture decision and open its supporting workspace.",
    audience: "Technical reviewer",
    kind: "planned-tool-sequence",
    modelEvaluated: false,
    steps: [
      {
        tool: "set_visit_intent",
        input: {
          objective: "Inspect documented architecture judgment",
          context_label: "Architecture review",
          priorities: ["typed content", "single source of truth"],
        },
      },
      {
        tool: "search_evidence",
        input: {
          query: "typed content architecture",
          kinds: ["decision"],
          limit: 5,
        },
      },
      {
        tool: "inspect_evidence",
        input: { id: "decision:elijahos:5" },
      },
      {
        tool: "compose_workspace",
        input: {
          evidence_ids: ["decision:elijahos:5"],
          layout: "focus",
        },
      },
    ],
  },
  {
    id: "curious-peer-exploration",
    prompt: "Explore why this public portfolio uses a desktop metaphor.",
    audience: "Curious peer",
    kind: "planned-tool-sequence",
    modelEvaluated: false,
    steps: [
      {
        tool: "search_evidence",
        input: {
          query: "desktop metaphor",
          kinds: ["decision"],
          limit: 3,
        },
      },
      {
        tool: "inspect_evidence",
        input: { id: "decision:elijahos:0" },
      },
    ],
  },
];
