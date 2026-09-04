// One-tap starting points for the visit intent. Most visitors' agents won't
// call set_visit_intent, and a blank textarea is a cold start — these presets
// let a human fill the intent in one click and then edit it like any other
// intent. Content lives here (not ui-copy.ts) the same way changelog.ts
// keeps curated content out of the chrome copy file.
//
// Presets are plain VisitIntentInput values: applying one goes through the
// exact same normalizeIntent path as typed or agent-supplied intents, and is
// recorded as suppliedBy "human" — a human clicked it.

import type { VisitIntentInput } from "@/lib/webmcp/visit-intent";

export type IntentPreset = {
  id: string;
  // Short chip label shown in the workspace.
  label: string;
  intent: VisitIntentInput;
};

export const INTENT_PRESETS: readonly IntentPreset[] = [
  {
    id: "hiring",
    label: "Hiring screen",
    intent: {
      objective: "Evaluate Elijah for an AI engineering role",
      contextLabel: "Hiring screen",
      visitType: "hiring",
      priorities: [
        "AI agent systems and evals",
        "TypeScript and React product work",
        "Ships end to end with tests",
      ],
      evidenceStandard:
        "Candidate-authored evidence with explicit limitations",
    },
  },
  {
    id: "client",
    label: "Scoping a project",
    intent: {
      objective: "Assess Elijah for an enterprise AI project engagement",
      contextLabel: "Project scoping",
      visitType: "client-project",
      priorities: [
        "Enterprise AI delivery",
        "Operating models and ROI",
        "Finance and operations depth",
      ],
    },
  },
  {
    id: "technical",
    label: "Technical deep-dive",
    intent: {
      objective: "Review the engineering behind ElijahOS",
      contextLabel: "Technical review",
      visitType: "technical-review",
      priorities: [
        "Architecture decisions",
        "Testing and evals",
        "WebMCP tool design",
      ],
    },
  },
  {
    id: "inspiration",
    label: "Building something similar",
    intent: {
      objective: "Learn how ElijahOS is built to inform my own project",
      contextLabel: "Inspiration",
      visitType: "inspiration",
      priorities: [
        "WebMCP tool design",
        "OS-style interface build",
        "Evals and testing patterns",
      ],
    },
  },
  {
    id: "exploring",
    label: "Just exploring",
    intent: {
      objective: "See what ElijahOS can do",
      contextLabel: "Curious visit",
      visitType: "just-exploring",
      priorities: [
        "The agent tool surface",
        "Fun apps and easter eggs",
        "Music",
      ],
    },
  },
];
