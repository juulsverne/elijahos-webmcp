// Case study content lives here, keyed by project id. Separated from
// elijah.ts so case studies can grow long without bloating that file.
//
// The copy is intentionally honest about what is live today versus what is
// reserved for v2. This page should read as a shipped portfolio case study,
// not an architecture wish list.

import type { ProjectStatus, ProjectAccent } from "./elijah";
import type { AppId } from "./apps";

type CaseStudyKnowledge = {
  /** Stable retrieval id. Copy edits must not change this value. */
  id: string;
  /** Reader-facing citation topic. */
  topic: string;
  /** Realistic search phrases for the visitor question this answers. */
  tags: string[];
  /** Portfolio surface a citation should open. */
  app: AppId;
};

// One labeled highlight in a section's scannable list. Rendered after the
// prose as "Label — text" in both the OS window and the crawlable route.
export type CaseStudyPoint = {
  label: string;
  text: string;
};

// One paragraph-style section in the case study, for example "What & why".
export type CaseStudySection = {
  id: string;
  heading: string;
  body: string[];
  /**
   * Optional scannable highlights rendered as a bulleted list between the
   * first body paragraph (the lede) and any remaining paragraphs. Use these
   * for inventories (apps, pipeline stages, roadmap items) so the prose can
   * stay short. Included in the derived evidence claim.
   */
  points?: CaseStudyPoint[];
  /**
   * Optional retrieval views over the prose above. Paragraph indexes keep the
   * knowledge base attached to the case study's source text instead of
   * duplicating it in a second manual chunk.
   */
  knowledge?: Array<
    CaseStudyKnowledge & {
      paragraphIndexes: number[];
    }
  >;
};

// One trade-off vignette: "considered X, picked Z, because R".
export type CaseStudyDecision = {
  considered: string[];
  picked: string;
  reason: string;
  /** When present, this decision is useful enough to retrieve on its own. */
  knowledge?: CaseStudyKnowledge;
};

// One row in the stack reference table.
export type CaseStudyStackItem = {
  tech: string;
  what: string;
  why: string;
};

// One node inside an architecture diagram layer.
export type ArchNode = {
  id: string;
  label: string;
  // Optional small mono sub-line shown next to the label.
  detail?: string;
  // Drives the small status pill on the node, same vocabulary as projects.
  status?: ProjectStatus;
};

// One vertical layer in the architecture diagram.
export type ArchLayer = {
  id: string;
  // Serif italic header at the top of the layer panel.
  heading: string;
  // Mono kicker line shown above the heading.
  kicker?: string;
  nodes: ArchNode[];
};

export type CaseStudy = {
  // Project this case study belongs to.
  projectId: string;
  // Short mono kicker line in the header.
  kicker: string;
  // Big serif italic title.
  title: string;
  // One-line description shown under the title.
  desc: string;
  // Drives the header status pill.
  status: ProjectStatus;
  // Drives the left-edge accent stripe, same as project cards.
  accent: ProjectAccent;
  // Single character mark shown next to the title.
  glyph?: string;
  // Generic prose sections rendered in order before the architecture block.
  sections: CaseStudySection[];
  // Architecture block: intro paragraphs, then the diagram, then optional outro.
  architecture: {
    intro: string[];
    layers: ArchLayer[];
    outro?: string[];
  };
  decisions: CaseStudyDecision[];
  stack: CaseStudyStackItem[];
};

export const CASE_STUDIES: Record<string, CaseStudy> = {
  elijahos: {
    projectId: "elijahos",
    kicker: "personal site - 2026",
    title: "ElijahOS",
    desc:
      "A portfolio that proves the pitch: a browser OS, an inspectable AI assistant, and a WebMCP tool surface for the agents visitors bring with them — built around evidence instead of slideware.",
    status: "in flight",
    accent: "blue",
    glyph: "*",
    sections: [
      {
        id: "why",
        heading: "Why it exists",
        body: [
          "A normal portfolio asks visitors to believe the claims on the page. ElijahOS makes them use the claims: apps open, windows move, tools run, traces explain themselves, and the assistant cites the same source material the visitor is reading.",
          "Elijah comes from finance and operations, where useful systems expose evidence, reduce ambiguity, and make the next decision easier. ElijahOS applies that standard to a personal site: if the promise is product judgment, AI systems, and shipping discipline, the proof should be interactive.",
          "The result is part portfolio, part operating environment, part systems demo — the shell, content model, AI assistant, observability, and fallback paths shown working together instead of hidden behind a marketing page.",
        ],
        knowledge: [
          {
            id: "project-elijahos-problem",
            topic: "Project · ElijahOS problem",
            tags: [
              "why elijahos",
              "portfolio problem",
              "proof of work",
              "interactive portfolio",
              "show product judgment",
              "why an operating system",
            ],
            app: "projects",
            paragraphIndexes: [0],
          },
          {
            id: "project-elijahos-design-lens",
            topic: "Project · ElijahOS design lens",
            tags: [
              "finance lens",
              "operations background",
              "design philosophy",
              "evidence",
              "reduce ambiguity",
              "decision support",
            ],
            app: "projects",
            paragraphIndexes: [1],
          },
          {
            id: "project-elijahos-outcome",
            topic: "Project · ElijahOS outcome",
            tags: [
              "elijahos outcome",
              "elijahos result",
              "what did elijahos become",
              "portfolio operating environment",
              "systems demo",
              "product surface",
            ],
            app: "projects",
            paragraphIndexes: [2],
          },
        ],
      },
      {
        id: "shipped",
        heading: "What shipped",
        body: [
          "The desktop shell has a topbar, dock, launchpad, widget panel, and draggable windows with focus stacking, snapping, tiling, and deep links — it behaves like a small OS because the interactions are the work sample. The mobile shell is not a squeezed desktop: it gets its own widget console, dock, app drawer, and routing so the same portfolio feels intentional on a phone.",
          "The production layer keeps the demo honest: optimized media, generated icons, manifest, sitemap, Open Graph image, rate limits, prompt-injection guards, optional persistence, and graceful disabled modes. Not glamorous — but they are what let the demo stay usable, and safe, outside a local happy path.",
        ],
        points: [
          {
            label: "Product apps",
            text: "About, Projects, this case study, Resume, Contact, Ask Elijah, and Lab.",
          },
          {
            label: "OS toys",
            text: "a zsh-style terminal, a puzzle-gated root window, calculator, clock, and Snake.",
          },
          {
            label: "Widgets",
            text: "weather, music, Wobbles media, and system pulse.",
          },
          {
            label: "Lab experiments",
            text: "registered from source and surfaced through Lab instead of being one-off pages.",
          },
        ],
        knowledge: [
          {
            id: "project-elijahos-implementation-shells",
            topic: "Project · ElijahOS implementation",
            tags: [
              "how elijahos was built",
              "implementation",
              "desktop shell",
              "mobile shell",
              "responsive architecture",
              "browser operating system",
              "mobile not squeezed desktop",
            ],
            app: "projects",
            paragraphIndexes: [0],
          },
          {
            id: "project-elijahos-production-constraints",
            topic: "Project · ElijahOS production constraints",
            tags: [
              "production constraints",
              "reliability",
              "security",
              "fallbacks",
              "missing secrets",
              "optional persistence",
              "safe public demo",
            ],
            app: "projects",
            paragraphIndexes: [1],
          },
        ],
      },
      {
        id: "ask-elijah",
        heading: "Ask Elijah",
        body: [
          "Ask Elijah is the centerpiece because it turns the site into an AI product rather than a portfolio with a chat box attached. A visitor's turn runs the same path the eval harness exercises: gate, retrieve evidence, compose a grounded prompt, stream the model, resolve tools, grade the answer, and emit a trace. Prompt-injection and 'reveal your system prompt' attempts are refused in code, before a single token is spent.",
          "The trace and eval tabs are part of the product, not developer leftovers. Visitors can inspect used and rejected chunks, tool calls, token counts, latency, model choice, estimated cost, and confidence — and golden eval cases grade recall, answer format, and tool behavior against the same turn runner the live route uses.",
        ],
        points: [
          {
            label: "Hybrid retrieval",
            text: "BM25 is the inspectable sparse baseline; OpenAI embeddings power the dense channel (pgvector in production, an in-process store as the local fallback); Reciprocal Rank Fusion merges the two, and the trace records which channel contributed what.",
          },
          {
            label: "Model-agnostic generation",
            text: "OpenAI's gpt-5.6-luna answers by default at roughly a tenth of a frontier model's token price; a draft that grades poorly is retried once against Anthropic's claude-sonnet-5 through the same provider interface. Every model is chosen by environment, and every trace names the model that actually answered.",
          },
          {
            label: "A deliberate tool boundary",
            text: "server tools search and fetch knowledge, then feed it back into the continuation turn; client tools operate the OS — opening apps, arranging windows, copying contact fields, highlighting citations. The assistant is allowed to act, but the action is visible.",
          },
        ],
      },
      {
        id: "webmcp",
        heading: "The agent door — WebMCP",
        body: [
          "Ask Elijah answers for the site; WebMCP hands the reasoning to the visitor. ElijahOS registers ten typed, page-scoped tools through the browser's ModelContext API — navigator.modelContext first, document.modelContext as the documented fallback. Six are read-only; the four that change anything change only visible, labeled page state.",
          "Underneath is an evidence layer derived from the same typed sources the human interface renders: every record carries a claim, its provenance, Elijah's documented contribution scope, and at least one limitation. 'No documented evidence on this site' is a typed, first-class result, not a blank for the agent to fill in — and nothing returns a suitability score or hiring verdict; that judgment stays with the visitor and the agent they already trust.",
          "Everything an agent does is visible. The visit intent it sets gets a 'set by your agent' badge with edit and clear controls and never leaves the browser session, and every registered tool call lands in an on-page activity log. Tool schemas are closed with additionalProperties: false, outputs carrying visitor-supplied text are marked untrusted, and the whole surface is client-side progressive enhancement — no new server route, no model, no key.",
          "The handoff runs both ways: a person can redirect a composed workspace through normal navigation, and the workspace snapshot reports that change so the agent continues from the person's decision. The surface is covered by unit tests, Playwright against an injected fake ModelContext host, and executable acceptance fixtures — labeled honestly as human-authored plans, not proof of model tool selection.",
        ],
        points: [
          {
            label: "The journey",
            text: "state a visit intent, search the evidence, inspect any record in full, compose real OS windows around what was found, and read the workspace back.",
          },
          {
            label: "The extras",
            text: "read-only lookups for profile, resume, and contact, plus open_app and play_music — an OS should let an agent open the snake game the way a human would.",
          },
        ],
        knowledge: [
          {
            id: "project-elijahos-webmcp-surface",
            topic: "Project · ElijahOS WebMCP tool surface",
            tags: [
              "webmcp",
              "agent tools",
              "modelcontext",
              "tool surface",
              "agents on the site",
              "what can an agent do here",
            ],
            app: "agent",
            paragraphIndexes: [0],
          },
          {
            id: "project-elijahos-webmcp-evidence",
            topic: "Project · ElijahOS evidence layer",
            tags: [
              "evidence records",
              "provenance",
              "contribution scope",
              "limitations",
              "no documented evidence",
              "honest gaps",
            ],
            app: "agent",
            paragraphIndexes: [1],
          },
          {
            id: "project-elijahos-webmcp-safety",
            topic: "Project · ElijahOS agent visibility and safety",
            tags: [
              "agent visibility",
              "session only intent",
              "activity log",
              "progressive enhancement",
              "privacy boundary",
              "human agent handoff",
            ],
            app: "agent",
            paragraphIndexes: [2, 3],
          },
        ],
      },
      {
        id: "roadmap",
        heading: "Where it's heading",
        body: [
          "The next version is not about making the interface busier. It is about making the proof deeper.",
        ],
        points: [
          {
            label: "Deeper observability",
            text: "persistent traces beyond the current in-memory buffer, an optional reranker, an LLM judge beyond deterministic grading, and multimodal chunks.",
          },
          {
            label: "A closed agent loop",
            text: "a reverse channel where client tool results feed back into the agent loop.",
          },
          {
            label: "Native agent proof",
            text: "the WebMCP surface is verified today with unit coverage, an injected fake host, and executable fixtures; the next proof is a native supported-browser agent choosing these tools on its own.",
          },
          {
            label: "More flagships",
            text: "more projects earn this case-study treatment once they have enough real product behavior, decisions, and results to be worth inspecting.",
          },
        ],
      },
    ],
    architecture: {
      intro: [
        "The architecture is built around a simple loop: source-of-truth portfolio data becomes apps, retrieval chunks, embeddings, traces, and eval cases. The visitor sees the polished shell, but the case study exposes the system underneath it.",
      ],
      layers: [
        {
          id: "shell",
          heading: "Browser shell",
          kicker: "what visitors operate",
          nodes: [
            {
              id: "desktop",
              label: "Desktop shell",
              detail: "topbar - dock - launchpad",
              status: "live",
            },
            {
              id: "mobile",
              label: "Mobile shell",
              detail: "widget console - dock - drawer",
              status: "live",
            },
            {
              id: "windows",
              label: "Window system",
              detail: "Zustand - drag - resize - snap",
              status: "live",
            },
            {
              id: "widgets",
              label: "Widgets",
              detail: "weather - music - media - pulse",
              status: "live",
            },
            {
              id: "particles",
              label: "Particle field",
              detail: "R3F - Three.js - GLSL",
              status: "live",
            },
          ],
        },
        {
          id: "apps",
          heading: "Product apps",
          kicker: "the portfolio as software",
          nodes: [
            {
              id: "ask",
              label: "Ask Elijah",
              detail: "chat - trace - spec - evals",
              status: "in flight",
            },
            {
              id: "portfolio",
              label: "Portfolio apps",
              detail: "about - projects - resume - contact",
              status: "live",
            },
            {
              id: "lab",
              label: "Lab experiments",
              detail: "generated registry - deep links",
              status: "live",
            },
            {
              id: "terminal",
              label: "Terminal + root puzzle",
              detail: "virtual FS - encrypted pitch",
              status: "live",
            },
            {
              id: "mini",
              label: "Mini apps",
              detail: "snake - clock - calculator",
              status: "live",
            },
          ],
        },
        {
          id: "agent-loop",
          heading: "/api/ask/stream",
          kicker: "agent loop",
          nodes: [
            {
              id: "gate",
              label: "1 - Gate + validate request",
              detail: "rate limits - injection refusals",
              status: "live",
            },
            {
              id: "retrieve",
              label: "2 - Hybrid retrieve evidence",
              detail: "BM25 + dense + RRF",
              status: "live",
            },
            {
              id: "prompt",
              label: "3 - Compose grounded prompt",
              detail: "server-only system prompt",
              status: "live",
            },
            {
              id: "tools",
              label: "4 - Stream + resolve tools",
              detail: "one continuation turn",
              status: "live",
            },
            {
              id: "grade",
              label: "5 - Grade, escalate, trace",
              detail: "deterministic judge",
              status: "live",
            },
          ],
        },
        {
          id: "webmcp-surface",
          heading: "WebMCP surface",
          kicker: "the visitor's agent",
          nodes: [
            {
              id: "adapter",
              label: "ModelContext adapter",
              detail: "navigator - document fallback",
              status: "live",
            },
            {
              id: "tool-surface",
              label: "Ten typed tools",
              detail: "6 read-only - 4 visibly mutate",
              status: "live",
            },
            {
              id: "evidence",
              label: "Evidence layer",
              detail: "provenance - scope - limitations",
              status: "live",
            },
            {
              id: "agent",
              label: "Agent workspace",
              detail: "visit intent - honest gaps",
              status: "live",
            },
            {
              id: "activity",
              label: "Agent activity log",
              detail: "every registered tool call visible",
              status: "live",
            },
          ],
        },
        {
          id: "data",
          heading: "Retrieval & data",
          kicker: "facts before fluency",
          nodes: [
            {
              id: "source",
              label: "Typed source content",
              detail: "bio - projects - case study",
              status: "live",
            },
            {
              id: "manual",
              label: "Manual KB chunks",
              detail: "positioning - philosophy - roadmap",
              status: "live",
            },
            {
              id: "bm25",
              label: "BM25 retriever",
              detail: "inspectable sparse baseline",
              status: "live",
            },
            {
              id: "vectors",
              label: "Embeddings",
              detail: "OpenAI text embeddings",
              status: "live",
            },
            {
              id: "stores",
              label: "Vector stores",
              detail: "pgvector + in-process fallback",
              status: "live",
            },
          ],
        },
        {
          id: "generation",
          heading: "Generation & providers",
          kicker: "model-agnostic by design",
          nodes: [
            {
              id: "adapters",
              label: "Provider adapters",
              detail: "OpenAI + Anthropic SDKs",
              status: "live",
            },
            {
              id: "default-model",
              label: "Default model",
              detail: "OpenAI gpt-5.6-luna",
              status: "live",
            },
            {
              id: "escalation",
              label: "Confidence-gated fallback",
              detail: "Anthropic Sonnet + Haiku",
              status: "live",
            },
            {
              id: "factories",
              label: "Swappable by env",
              detail: "generator - judge - embedder",
              status: "live",
            },
          ],
        },
        {
          id: "quality",
          heading: "Observability",
          kicker: "proof surfaces",
          nodes: [
            {
              id: "trace-ui",
              label: "Trace UI",
              detail: "chunks - tools - cost - confidence",
              status: "live",
            },
            {
              id: "eval-ui",
              label: "Eval report UI",
              detail: "golden cases",
              status: "live",
            },
            {
              id: "tests",
              label: "Test suite",
              detail: "node:test - Playwright - UI contract",
              status: "live",
            },
            {
              id: "next",
              label: "Next roadmap",
              detail: "reranker - LLM judge - persistent traces",
              status: "planned",
            },
          ],
        },
      ],
      outro: [
        "The important pattern is degradation. The best path uses dense search, pgvector, and confidence-gated model escalation. Local or partially configured paths still answer with BM25, in-process vectors, and a single default model. Optional infrastructure and extra providers improve the product without making the demo brittle.",
      ],
    },
    decisions: [
      {
        considered: [
          "Plain scrolling portfolio",
          "Framer-style marketing site",
          "Desktop OS metaphor",
        ],
        picked: "Desktop OS metaphor",
        reason:
          "The OS metaphor costs more to build, so it has to carry real weight. Here it turns navigation into evidence: visitors can inspect apps, move through tools, open traces, and see how the system behaves instead of only reading claims about it.",
        knowledge: {
          id: "decision-elijahos-os-interface",
          topic: "Decision · interactive OS portfolio",
          tags: [
            "why os interface",
            "portfolio architecture decision",
            "desktop metaphor",
            "interactive proof",
            "design tradeoff",
          ],
          app: "projects",
        },
      },
      {
        considered: ["Opaque chatbot", "Static FAQ", "Inspectable agent surface"],
        picked: "Inspectable agent surface",
        reason:
          "Ask Elijah needed to prove judgment, not just produce fluent answers. Citations, tool traces, rejected chunks, confidence, cost, and evals make the assistant reviewable by the same visitor it is trying to help.",
        knowledge: {
          id: "decision-ask-inspectable-surface",
          topic: "Decision · inspectable Ask Elijah",
          tags: [
            "why inspectable ai",
            "opaque chatbot alternative",
            "assistant design decision",
            "reviewable ai",
            "citations and traces",
          ],
          app: "ask",
        },
      },
      {
        considered: [
          "Immediate vector search",
          "BM25 forever",
          "BM25 baseline then hybrid retrieval",
        ],
        picked: "BM25 baseline then hybrid retrieval",
        reason:
          "BM25 made the first system deterministic and easy to inspect. Once the corpus, embeddings, and eval cases were in place, hybrid retrieval added semantic recall without throwing away the sparse channel that makes failures understandable.",
        knowledge: {
          id: "decision-ask-hybrid-retrieval",
          topic: "Decision · hybrid retrieval",
          tags: [
            "why hybrid retrieval",
            "bm25 versus vector search",
            "retrieval tradeoff",
            "semantic recall",
            "inspectable search",
            "rrf",
          ],
          app: "ask",
        },
      },
      {
        considered: [
          "Hardcoded single model",
          "One provider, swapped by hand",
          "Model-agnostic provider layer",
        ],
        picked: "Model-agnostic provider layer",
        reason:
          "Generation, grading, and embeddings each sit behind a small adapter chosen by environment. OpenAI answers by default, a weak grade can escalate the same turn to a stronger Anthropic model, and changing providers is a config edit instead of a refactor. The trace records which model actually answered, so the abstraction stays honest rather than decorative.",
        knowledge: {
          id: "decision-ask-provider-layer",
          topic: "Decision · model provider layer",
          tags: [
            "why model agnostic",
            "provider abstraction",
            "openai anthropic",
            "model fallback",
            "swap models",
            "technical judgment",
          ],
          app: "ask",
        },
      },
      {
        considered: [
          "Hard dependency on managed infra",
          "Local-only demo",
          "Graceful optional infrastructure",
        ],
        picked: "Graceful optional infrastructure",
        reason:
          "The portfolio has to survive previews, local development, and missing secrets. Postgres, embeddings, leaderboards, and experiment persistence can improve the experience, but disabled modes and fallbacks keep the core product intact.",
        knowledge: {
          id: "decision-elijahos-graceful-infrastructure",
          topic: "Decision · graceful optional infrastructure",
          tags: [
            "graceful degradation",
            "optional infrastructure",
            "missing secrets",
            "preview reliability",
            "fallback architecture",
            "postgres optional",
          ],
          app: "projects",
        },
      },
      {
        considered: [
          "CMS-first content",
          "Hardcoded one-off copy",
          "Typed source content reused across surfaces",
        ],
        picked: "Typed source content reused across surfaces",
        reason:
          "The same facts power project cards, app content, retrieval chunks, citations, and the case study. Keeping that content in typed source files makes it versioned, testable, diffable, and harder for the assistant to contradict.",
        knowledge: {
          id: "decision-elijahos-typed-content",
          topic: "Decision · typed source content",
          tags: [
            "content architecture",
            "typed content",
            "single source of truth",
            "knowledge base consistency",
            "versioned content",
            "avoid contradictions",
          ],
          app: "projects",
        },
      },
      {
        considered: ["External analytics dashboard", "No observability", "In-app traces and evals"],
        picked: "In-app traces and evals",
        reason:
          "For this product, observability is part of the user experience. The trace and eval tabs make the AI system's behavior visible where the claim is being made, which is more persuasive than a private dashboard nobody can inspect.",
        knowledge: {
          id: "decision-ask-in-app-observability",
          topic: "Decision · in-app traces and evals",
          tags: [
            "why traces in the product",
            "why evals in the ui",
            "ai observability",
            "visible evidence",
            "evaluation design",
            "product judgment",
          ],
          app: "ask",
        },
      },
      {
        considered: [
          "Site-owned assistant only",
          "DOM automation for visiting agents",
          "Typed WebMCP tools over page state",
        ],
        picked: "Typed WebMCP tools over page state",
        reason:
          "However well Ask Elijah cited, a visitor was still talking to the candidate's own model. WebMCP inverts that: the visitor's agent does the reasoning through ten small typed tools over the same live workspace — six read-only, every mutation visible. DOM automation lost because an OS metaphor is exactly where scraping is most brittle.",
        knowledge: {
          id: "decision-elijahos-webmcp-surface",
          topic: "Decision · WebMCP over DOM automation",
          tags: [
            "why webmcp",
            "agent access decision",
            "dom automation alternative",
            "typed page-scoped tools",
            "ask elijah inversion",
            "agent-readable site",
          ],
          app: "agent",
        },
      },
    ],
    stack: [
      {
        tech: "Next.js 16 App Router",
        what: "App shell, metadata, and route handlers",
        why: "Keeps the portfolio shell, APIs, streaming routes, and production metadata in one deployable app.",
      },
      {
        tech: "React 19",
        what: "Interactive app runtime",
        why: "The OS metaphor depends on stateful, composable UI surfaces rather than static pages.",
      },
      {
        tech: "React Three Fiber + Three.js + GLSL",
        what: "WebGL particle field",
        why: "Adds a GPU-backed ambient layer while keeping the scene integrated with the React component model.",
      },
      {
        tech: "Zustand",
        what: "Window, widget, and Ask state",
        why: "Small client stores handle focus, drag, resize, app launch, widgets, traces, and chat state without heavier app framework machinery.",
      },
      {
        tech: "Tailwind 4 + CSS tokens",
        what: "Visual system",
        why: "The UI needs shared tokens plus plain CSS control for windows, apps, widgets, mobile, and case-study surfaces.",
      },
      {
        tech: "OpenAI + Anthropic SDKs",
        what: "Model-agnostic generation",
        why: "OpenAI gpt-5.6-luna answers by default; Anthropic claude-sonnet-5 is wired through the same interface as a confidence-gated escalation. Generator, judge, and embedder are all chosen by env, so swapping a model is a config change, not a rewrite — and the trace records which one actually answered.",
      },
      {
        tech: "BM25 + Hybrid RRF retrieval",
        what: "Sparse and dense evidence retrieval",
        why: "BM25 keeps matching inspectable; dense embeddings improve semantic recall; RRF fuses both without hiding the individual signals.",
      },
      {
        tech: "OpenAI embeddings",
        what: "Dense query and chunk vectors",
        why: "The semantic channel gives Ask Elijah a better shot at paraphrased questions that do not share exact keywords with the source.",
      },
      {
        tech: "Vercel Postgres pgvector",
        what: "Optional managed vector store",
        why: "Production can serve vector search from Postgres when configured, while local and preview paths retain fallbacks.",
      },
      {
        tech: "SSE streaming",
        what: "Chat response transport",
        why: "Visitors see the answer stream while traces, tool events, and completion metadata stay attached to the same turn.",
      },
      {
        tech: "Per-IP + global rate limits",
        what: "Abuse and cost guardrails",
        why: "A sliding per-IP window plus a per-instance circuit breaker keep the public assistant from being trivially drained, and deterministic refusals reject prompt-injection before the model is ever called.",
      },
      {
        tech: "WebMCP (ModelContext API)",
        what: "Page-scoped agent tool surface",
        why: "Ten typed tools registered through navigator.modelContext (document fallback) let a visitor's agent search evidence and compose the live workspace — client-side only, while the normal interface remains usable when no host exists.",
      },
      {
        tech: "node:test + Playwright + evals",
        what: "Verification suite",
        why: "Unit tests cover the runtime, Playwright checks responsive behavior and drives the WebMCP tools through an injected fake ModelContext host, and executable acceptance fixtures replay planned agent journeys through the real dispatcher.",
      },
    ],
  },
};
