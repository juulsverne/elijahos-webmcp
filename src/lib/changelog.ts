// Changelog content lives here, newest entry first. Separated from
// elijah.ts the same way case-studies.ts is: curated, forward-facing release
// notes that can grow without bloating the personal-copy file.
//
// This is intentionally NOT a git commit dump. Each entry is a milestone worth
// a visitor's attention — what shipped, what improved, what's deprecated — in
// plain, benefit-oriented language. Add a new entry by prepending one object.
//
// The data is validated by changelog.test.ts (sorted newest-first, unique ids,
// valid kinds, every deep-link appId resolves to a real app).

// The category a change falls into. Drives the colored tag chip in the UI.
export type ChangeKind = "added" | "improved" | "fixed" | "deprecated" | "removed";

// One line item inside an entry.
export type ChangeItem = {
  kind: ChangeKind;
  // One sentence, written for a visitor — what changed and why they'd care.
  text: string;
  // Optional deep-link target. When set, the row renders an "Open ↗" button
  // that launches this app via app-launcher. Must be a real id in APPS
  // (enforced by changelog.test.ts). Typed as string, not AppId, so experiment
  // ids are valid targets too.
  appId?: string;
  // Optional external destination for a release-note action. Keep this to
  // public HTTPS pages; changelog rows render it with the same compact action
  // treatment used for internal app links.
  href?: string;
};

// One dated release/milestone.
export type ChangelogEntry = {
  // Stable slug, used as the React key. Unique across the log.
  id: string;
  // ISO "YYYY-MM-DD". Entries are kept sorted strictly newest-first by this.
  date: string;
  // Optional version label shown as a pill, e.g. "v1.0".
  version?: string;
  // Serif headline for the entry.
  title: string;
  // Optional 1-2 sentence intro under the title.
  summary?: string;
  changes: ChangeItem[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "webmcp-challenge-edition",
    date: "2026-09-03",
    version: "v1.8",
    title: "The WebMCP Challenge edition",
    summary:
      "This is the public WebMCP Challenge edition of ElijahOS: the familiar human-operated OS, extended with a typed interface that lets a visitor's agent investigate the same published work and share the visible workspace.",
    changes: [
      {
        kind: "added",
        text:
          "The challenge build keeps WebMCP as progressive enhancement: the desktop and mobile shells still work normally when no agent is present.",
        appId: "agent",
      },
      {
        kind: "improved",
        text:
          "Ask Elijah in this edition is a lightweight guide to the public evidence. For the full Ask Elijah app, visit the original ElijahOS at elijahos.com.",
        href: "https://www.elijahos.com",
      },
    ],
  },
  {
    id: "agent-workspace",
    date: "2026-09-03",
    version: "v1.7",
    title: "The recruiter workspace becomes the agent workspace",
    summary:
      "The workspace outgrew its recruiting-only framing: it's where you and your AI agent browse this OS together. The visit intent now fills itself three ways — quick-start presets, a pasted job posting link, or your agent — and the tool surface grew to ten tools, because an OS should let an agent open the snake game and put a track on, not just read a résumé.",
    changes: [
      {
        kind: "improved",
        text:
          "The recruiter workspace is now the agent workspace (/agent) — same honest evidence comparison, broader framing, and a fresh coat of color. Old /recruiter deep links still resolve.",
        appId: "agent",
      },
      {
        kind: "added",
        text:
          "Paste a job posting link and the workspace pulls the title, company, and requirement bullets into a visit-intent draft for you to review — fetched once, never stored.",
        appId: "agent",
      },
      {
        kind: "added",
        text:
          "Quick-start intent presets: hiring screen, technical deep-dive, or just exploring — one tap fills the visit intent, and you can edit it like any other.",
        appId: "agent",
      },
      {
        kind: "added",
        text:
          "Two personality tools for agents: open_app launches any launchpad app (yes, including /snake), and play_music drives the site's music player through the same controls a human clicks.",
        appId: "agent",
      },
    ],
  },
  {
    id: "webmcp-tools",
    date: "2026-09-03",
    version: "v1.6",
    title: "The OS opens a door for agents",
    summary:
      "ElijahOS now speaks WebMCP: an AI agent browsing this site gets eight typed, page-scoped tools — state a visit intent, search and inspect the documented evidence, compose real OS windows around what it finds, and read the workspace back after you change it. Six tools are read-only, the two that mutate do it visibly, and it all runs in the page: no new server route, no model, no scoring.",
    changes: [
      {
        kind: "added",
        text:
          "A recruiter workspace: state why you're here (or let your agent do it) and see every priority matched against the documented evidence — including an honest 'no documented evidence' when the site has none.",
        appId: "agent",
      },
      {
        kind: "added",
        text:
          "An agent tool surface with narrow inputs and accurate read-only annotations: visit intent, evidence search and inspection, workspace composition, workspace state, and small profile/resume/contact lookups.",
        appId: "agent",
      },
      {
        kind: "added",
        text:
          "A live agent activity log — every registered WebMCP tool call shows up in the workspace with a neutral summary.",
        appId: "agent",
      },
      {
        kind: "added",
        text:
          "A shared handoff: open or focus an app yourself and the narrow workspace snapshot your agent reads next reports that change — so it can continue from your decision, not its own assumptions.",
        appId: "agent",
      },
      {
        kind: "improved",
        text:
          "The whole surface is progressive enhancement — without an agent the normal interface remains usable, and the recruiter workspace still works as a manual evidence-comparison view.",
        appId: "agent",
      },
      {
        kind: "fixed",
        text:
          "An agent-set visit intent now opens the recruiter workspace front and center instead of leaving it buried behind other windows.",
        appId: "agent",
      },
    ],
  },
  {
    id: "index-visible",
    date: "2026-07-30",
    version: "v1.5",
    title: "The OS learns what it knows",
    summary:
      "The phone home stopped reporting frame rates and started showing the knowledge underneath it — 60 notes drawn as the shape they actually make. Ask Elijah can now explain why things were built, not just what they are.",
    changes: [
      {
        kind: "added",
        text:
          "The home screen's left tile draws the knowledge base itself: every note projected from its real embedding into a slow constellation, then reorganised into a ranked chart of the areas Elijah knows most about.",
        appId: "ask",
      },
      {
        kind: "added",
        text:
          "Ask Elijah reads the case studies now, so it can explain why ElijahOS was built the way it was — the problem, the tradeoffs, the outcome — instead of listing features.",
        appId: "ask",
      },
      {
        kind: "added",
        text:
          "It also knows the call analysis agent: thousands of support calls and recall cases handled on-device rather than shipped to an API, and thousands of hours of manual review retired.",
        appId: "ask",
      },
      {
        kind: "added",
        text:
          "The index quietly counts which areas visitors actually ask about, and once enough people have asked, re-ranks itself around the answers they want rather than the notes that happen to exist.",
      },
      {
        kind: "added",
        text:
          "The phone home leads with ElijahOS itself now — the brand, the role, and a live clock sharing one quiet line.",
      },
      {
        kind: "removed",
        text:
          "The phone's frame-rate and memory readout is gone. It measured the browser instead of the site, and on an iPhone the memory line could never fill in at all.",
      },
      {
        kind: "improved",
        text:
          "The desktop widget panel got the same index card, plus a pass over weather and music — condition-aware styling and a toggle that animates instead of snapping.",
      },
      {
        kind: "improved",
        text:
          "Share the site anywhere and the preview card now shows ElijahOS mid-boot — terminal log, progress bar frozen at 78%, wordmark aglow — instead of the old framed nameplate.",
      },
      {
        kind: "fixed",
        text:
          "Opening an app no longer leaves a glass halo parked behind its dock icon, and the weather glyph sits still instead of drifting behind the temperature.",
      },
    ],
  },
  {
    id: "liquid-motion",
    date: "2026-07-30",
    version: "v1.4",
    title: "The OS learns to move",
    summary:
      "A month of motion work: the phone home became an editorial console, windows morph out of their icons, and every edge of the mobile shell now dissolves instead of clipping.",
    changes: [
      {
        kind: "added",
        text:
          "The phone home is a status console now — serif greeting that knows the hour (even the 2am one), live widgets, and an ask bar — with every app tucked behind the dock.",
      },
      {
        kind: "added",
        text:
          "Desktop windows morph open from the icon you clicked and collapse back into it on close — the same physics the phone's app frames use.",
      },
      {
        kind: "added",
        text:
          "Weather grew up: today's high/low range and peak UV ride along with the live conditions.",
      },
      {
        kind: "improved",
        text:
          "Open apps on the phone dissolve into the status-bar and home-indicator bands, and scrolled content fades at the edges instead of chopping mid-line.",
        appId: "ask",
      },
      {
        kind: "added",
        text:
          "This very card — the changelog now lives on the phone's home screen, one tap from the latest release.",
        appId: "changelog",
      },
    ],
  },
  {
    id: "ai-transformation-profile",
    date: "2026-07-26",
    version: "v1.3",
    title: "The profile catches up to the work",
    summary:
      "ElijahOS now leads with Elijah's current role, enterprise AI scope, and finance-to-AI progression before the visitor opens a window.",
    changes: [
      {
        kind: "improved",
        text:
          "AI Transformation Engineer is now the canonical title across the desktop, résumé, metadata, social previews, and Ask Elijah knowledge.",
        appId: "about",
      },
      {
        kind: "improved",
        text:
          "The opening experience keeps the current role and career path consistent across About, résumé, mobile, and metadata without naming the current employer.",
        appId: "resume",
      },
      {
        kind: "added",
        text:
          "Vibe Modeling, Glyph, and Finance AI Workshop now have concise, maturity-aware project descriptions.",
        appId: "projects",
      },
    ],
  },
  {
    id: "ask-elijah-inspectable",
    date: "2026-06-13",
    version: "v1.2",
    title: "Ask Elijah grows up",
    summary:
      "The assistant went from a chat box to an inspectable AI product — it retrieves evidence, shows its work, and refuses the tricks.",
    changes: [
      {
        kind: "added",
        text:
          "Hybrid retrieval — BM25 plus dense embeddings, fused with RRF — so paraphrased questions still surface the right evidence.",
        appId: "ask",
      },
      {
        kind: "added",
        text:
          "Trace and Eval tabs: inspect the chunks, tool calls, latency, token cost, and confidence behind every answer.",
        appId: "ask",
      },
      {
        kind: "improved",
        text:
          'Grounded, guarded answers — prompt-injection and "reveal your system prompt" attempts are refused in code, before a token is spent.',
      },
      {
        kind: "added",
        text:
          "Durable query logging quietly records real questions so the knowledge base keeps getting sharper.",
      },
    ],
  },
  {
    id: "v1-0-launch",
    date: "2026-06-07",
    version: "v1.0",
    title: "ElijahOS boots up",
    summary:
      "A portfolio you operate instead of scroll — a browser OS with real windows, a dock, and a mobile shell of its own.",
    changes: [
      {
        kind: "added",
        text:
          "Desktop shell: draggable windows with focus stacking, resize, snap, tiling, a dock, launchpad, and a widget panel.",
      },
      {
        kind: "added",
        text:
          "A mobile shell that's its own thing — app grid, dock, and drawer — not a desktop squeezed onto a phone.",
      },
      {
        kind: "added",
        text:
          "The core portfolio, rebuilt as apps: About, Projects, Resume, Contact, and the ElijahOS case study.",
        appId: "case",
      },
      {
        kind: "added",
        text:
          "A zsh-style terminal with a puzzle-gated root window for anyone curious enough to look.",
        appId: "zsh",
      },
    ],
  },
];
