// Source-of-truth public content for the portfolio.

import type { AppId } from "@/lib/apps";

export type Pillar = { k: string; v: string };

// One labeled section of the About bio.
// `body` is plain text with two affordances:
//   - `\n\n` separates paragraphs
//   - `**foo**` wraps a phrase in the .bio-em accent-violet emphasis span
// AboutApp.tsx parses both at render time.
export type BioBlock = {
  kicker?: string;
  body: string;
};

export type ProjectStatus = "live" | "shipped" | "in flight" | "planned" | "archived";
export type ProjectAccent = "pink" | "blue" | "gold" | "violet";

export type Project = {
  id: string;
  name: string;
  // Short subtitle line (mono, dim) shown beneath the title — e.g.
  // "Personal site · the one you're on" or "Side project".
  kind: string;
  // 1-3 sentences describing what the project is.
  desc: string;
  stack: string[];
  // Compact one-liner kept available for future use (case-study window,
  // resume export, etc.). Not currently rendered on the project card.
  result: string;
  year: string;
  // Marks the project that opens the case-study window via its action button.
  featured?: boolean;
  // Drives the small status pill in the card header.
  status?: ProjectStatus;
  // Drives the left-edge accent stripe and the glyph color.
  accent?: ProjectAccent;
  // Single character shown next to the title (matches the dock glyph language).
  glyph?: string;
  // External links rendered as action buttons at the bottom of the card.
  links?: { demo?: string; repo?: string };
  // Reserved for a future case-study window (longer than `desc`).
  summary?: string;
};

export type Experience = {
  co: string;
  role: string;
  when: string;
  what: string;
};

export type Education = {
  school: string;
  degree: string;
  when: string;
};

export type Contact = {
  emailUser: string;
  emailDomain: string;
  github: string;
  linkedin: string;
};

export type NowBuilding = {
  // Key into APPS — supplies the card's glyph and the app it opens. Kept as
  // an id (not a path/icon) so adding or renaming the app is a one-file edit.
  appId: string;
  // Display name in the card's serif line. Distinct from the app's own
  // `title` (which is a route-style "/leverage-map" for window chrome).
  name: string;
  // One mono line under the name — what it is and where it's at.
  blurb: string;
};

export type Track = {
  id: string;
  // Bare track name, no release-status suffix — surfaces that want one append
  // it themselves (see `unreleased`). Keeping the two separate lets the mobile
  // player set the name in display serif and the status in its mono kicker.
  title: string;
  // Path under /public — e.g. "/music/track-1.mp3".
  file: string;
  // Not yet released anywhere. The desktop widget renders this as a
  // "(UNRELEASED)" suffix; the mobile player folds it into its kicker line.
  unreleased?: boolean;
  // Optional cosmetic duration label (server-truth comes from the audio).
  durationLabel?: string;
  // Released track page. The player prefers this over the artist fallback.
  spotifyUrl?: string;
};

export type Music = {
  // Artist alias surfaced in the player.
  artist: string;
  // Artist page used by /about and as a player fallback.
  spotifyArtistUrl: string;
  tracks: Track[];
};

export type WobblesMedia = {
  // Stable unique id — used by mediaById() to resolve a media_id to this
  // descriptor without embedding the full object in a generative-UI block.
  id: string;
  src: string;
  alt: string;
  // "video" plays as a looping muted clip; "photo" renders as a still image.
  kind?: "photo" | "video";
  // Poster frame for videos — shown before the clip loads so off-screen
  // slides cost one small image, not a video download.
  poster?: string;
};

// Two-column contrast pair for the ComparisonPanel.
// Each entry shows how Elijah bridges the finance/operations world (left)
// with the AI/engineering world (right). Grounded in the `differentiator`
// KB chunk and ELIJAH identity copy — no invented claims.
export type ComparisonPair = { left: string; right: string };

export type WobblesBio = {
  name: string;
  title: string;
  // ISO date — age is computed at render time so it stays accurate forever.
  born: string;
  color: string;
  breed?: string;
  weight: string;
  treats: string[];
  // One-line playful trivia line shown at the bottom of the vitals panel.
  fact?: string;
};

export type Wobbles = {
  bio: WobblesBio;
  media: WobblesMedia[];
};

// Puzzle gate for /root/.real. The bundle exposes only these values —
// no plaintext password, no plaintext pitch. Searching the source for
// `leverage`, `wobbles`, `.real`, etc. returns nothing useful.
//
// Regenerate by running:
//   node web/scripts/encrypt-pitch.mjs "<password>" path/to/pitch.json
// where pitch.json is a JSON array of strings (one entry per displayed line).
export type PuzzleBlock = {
  // SHA-256 hex digest of the password.
  passwordHash: string;
  // Base64-encoded AES-GCM ciphertext of JSON.stringify(pitchLines).
  // Decryption key is SHA-256(password) used as raw 256-bit AES key.
  pitchCiphertext: string;
  // Base64-encoded 12-byte IV used for the AES-GCM encryption.
  pitchIV: string;
  // Sticky line at the top of the System Pulse log feed. Real, ungated,
  // intentionally indistinguishable from the rolling feed on a casual scan
  // — but a hint for the puzzle when read carefully.
  pinnedLog: { tag: string; time: string; message: string };
};

// One line of the frozen boot log on the generated OpenGraph card.
// `tone` picks the result's color in opengraph-image.tsx: "fg" bright
// foreground, "ok" traffic-light green, "cursor" renders a gold block
// cursor instead of the result text.
export type OgBootLogLine = {
  prompt: string;
  result: string;
  tone: "fg" | "ok" | "cursor";
};

// Copy for the site-wide OpenGraph card (web/src/app/opengraph-image.tsx):
// a frozen frame of ElijahOS mid-boot. Lives here (not in the generator)
// per the no-hardcoded-copy rule.
export type OgCard = {
  bootLog: OgBootLogLine[];
  // Set in caps on the card, gold, letterspaced — the hook line.
  tagline: string;
  // Caption under the progress bar; rendered as "<caption> · <progress>%".
  bootCaption: string;
  // Progress bar fill percentage (0–100), also shown in the caption.
  bootProgress: number;
};

// Where Elijah is based. Feeds the schema.org PostalAddress node on /about and
// is displayed there visibly — structured data must never assert a fact the
// page does not show.
export type SiteLocation = {
  locality: string;
  region: string;
  country: string;
};

// Hand-maintained ISO (YYYY-MM-DD) dates driving sitemap `lastModified`.
// Deliberately not derived from build time or file mtime: both would report
// fabricated freshness on every deploy. Update these when the content changes.
export type ContentDates = {
  about: string;
  projects: string;
  resume: string;
};

export type PublicAnswerEvidence =
  | { kind: "app"; id: "contact" }
  | { kind: "document"; id: "projects" | "resume" }
  | { kind: "project"; id: string }
  | { kind: "profile"; id: "github" | "linkedin" };

// Answer-first facts rendered on the canonical /about ProfilePage and reused
// by Ask Elijah. Keeping the public document and retrieval corpus on one
// record prevents a recruiter, crawler, and the assistant from receiving
// different versions of the same professional claim.
export type PublicAnswer = {
  id: string;
  topic: string;
  question: string;
  tags: string[];
  answer: string;
  app?: AppId;
  evidence: PublicAnswerEvidence[];
};

export type ElijahData = {
  name: string;
  firstName: string;
  role: string;
  positioning: string;
  shortPositioning: string;
  metadataDescription: string;
  profileDescription: string;
  // Brand name of this site itself (shown in boot screen, page <title>, etc.)
  osName: string;
  // Canonical site URL — drives metadataBase, OpenGraph/Twitter card URLs,
  // robots, and sitemap. Override per-environment with NEXT_PUBLIC_SITE_URL
  // (set it in Vercel to your real domain). This value is the build-time
  // fallback; update it when the domain is final.
  siteUrl: string;
  // Base city. Rendered on /about and mirrored into the Person schema node.
  location: SiteLocation;
  // Per-document revision dates. See ContentDates.
  updated: ContentDates;
  // URL/storage-key-safe slug for the OS brand. Used in terminal prompt
  // (`guest@<slug>`), localStorage namespacing, and similar non-display
  // contexts. Decoupled from `osName` so the displayed brand can be
  // re-cased without forcing a localStorage migration.
  osSlug: string;
  // Single-character mark shown inside the boot-screen orb. Decoupled from
  // `firstName` so a fork (different person, different brand) can change one
  // without the other.
  osGlyph: string;
  // Subtitle line under the boot-screen title ("an OS made by Elijah").
  // Lives here (not in the component) per the no-hardcoded-copy rule.
  osBootSubtitle: string;
  // System-event message emitted when the desktop finishes booting.
  bootReadyMessage: string;
  // Copy for the generated OpenGraph / link-preview card.
  ogCard: OgCard;
  // Free-text status surfaced in the topbar pill, rendered verbatim.
  topbarStatus: string;
  // The one project featured on the mobile home screen's "now building" card.
  // `appId` keys into APPS so the card's glyph and route come from the app
  // registry rather than being retyped here.
  nowBuilding: NowBuilding;
  longBio: BioBlock[];
  publicAnswers: PublicAnswer[];
  // Subtitle line under the /projects window header. Mirrors the personable
  // tone of the About copy.
  projectsSubtitle: string;
  // Title and subtitle lines for the /contact window header.
  contactTitle: string;
  contactSubtitle: string;
  pillars: Pillar[];
  projects: Project[];
  experience: Experience[];
  education: Education[];
  contact: Contact;
  music: Music;
  wobbles: Wobbles;
  // Two-column contrast pairs for the ComparisonPanel. Finance/ops world on
  // the left, AI/engineering world on the right — Elijah bridges both.
  comparison: ComparisonPair[];
  puzzle: PuzzleBlock;
  // Dev-only fallback the unlocked window uses if pitchCiphertext is empty.
  // Strip before merge — never ship plaintext to production.
  __DEV_PLAINTEXT_PITCH__?: string[];
};

export const ELIJAH: ElijahData = {
  name: "Elijah Leung",
  firstName: "Elijah",
  role: "AI Transformation Engineer",
  // Tone-setter under the name in /about. Deliberately does NOT start with
  // "I" — the bio opener right below it does ("I've been a builder..."),
  // and stacking two I-sentences read as a stutter.
  positioning:
    "Curious builder with finance roots. Ships agent systems, writes the evals, and knows where the ROI hides.",
  shortPositioning:
    "Enterprise AI systems, agent workflows, and operating models.",
  metadataDescription:
    "AI Transformation Engineer designing enterprise AI systems, agent workflows, automation platforms, and the operating models that make them useful.",
  profileDescription:
    "Elijah Leung is a Chicago-based AI Transformation Engineer building enterprise AI systems, agent workflows, evaluation infrastructure, workflow automation, and the operating models around them. His prior experience includes FP&A and financial operations.",
  osName: "ElijahOS",
  // Canonical production domain. Per-env override still wins via
  // NEXT_PUBLIC_SITE_URL (set it in Vercel for preview deploys); this is the
  // build-time fallback and the real launch domain.
  siteUrl: "https://www.elijahos.com",
  location: { locality: "Chicago", region: "IL", country: "US" },
  updated: {
    about: "2026-08-05",
    projects: "2026-08-05",
    resume: "2026-08-05",
  },
  osSlug: "elijahos",
  osGlyph: "e",
  osBootSubtitle: "Elijah Leung · AI Transformation Engineer",
  bootReadyMessage: "ElijahOS ready",
  ogCard: {
    bootLog: [
      { prompt: "> whoami", result: "elijah", tone: "fg" },
      { prompt: "> mount /finance", result: "ok", tone: "ok" },
      { prompt: "> mount /operations", result: "ok", tone: "ok" },
      { prompt: "> load ai.modules", result: "ok", tone: "ok" },
      { prompt: "> run portfolio --live", result: "▮", tone: "cursor" },
    ],
    tagline: "COME SEE HOW I OPERATE",
    bootCaption: "booting portfolio",
    bootProgress: 78,
  },
  topbarStatus: "WebMCP enabled",
  nowBuilding: {
    appId: "leverage-map",
    name: "Leverage Map",
    blurb: "agentic ops graph · v0.4",
  },
  longBio: [
    {
      body:
        "I've been a **builder** my whole life. Songs, side projects, weird little tools, this OS. These days the things I take apart and put back together are **enterprise AI systems**.\n\nMost of it starts the same way: I get curious about how something works, and I can't leave it alone.",
    },
    {
      kicker: "BACKGROUND",
      body:
        "I come from **FP&A and financial operations**. Forecast cycles, budgets, cloud spend. The **unglamorous plumbing** companies run on.\n\nThat's where you learn how a business actually behaves: where money flows, where decisions stall, and where a workaround quietly becomes the process.\n\nIn 2026 the jump became official: financial analyst → **AI Transformation Engineer**.",
    },
    {
      kicker: "WHY AI",
      body:
        "Most companies know they should be using AI. Fewer know where it actually pays off.\n\nThat's the part that hooks me. I can read the business case, model the ROI, and then go make the tool people end up using every day.\n\nAI is powerful. But token bills are real, and bolting a chatbot onto a broken process is not a strategy.",
    },
    {
      kicker: "WHAT I BUILD",
      body:
        "AI tools, agent systems, automations, and prototypes that grow into production.\n\nThe model call is the easy part. The interesting questions live around it: who owns this, what happens when it fails, how do we know it's right. I design that part too.\n\n**Not slideware. Not AI theater.**",
    },
    {
      kicker: "HOW I WORK",
      body:
        "Figure out the decision the system supports and what it takes to trust the result. Ship the smallest version that can prove or kill the idea. Stop when it's enough.\n\nThese days I spend as much time on how teams build as on what I ship myself: patterns, verification, and standards that turn experiments into infrastructure people depend on.",
    },
    {
      kicker: "OFF THE CLOCK",
      body:
        "I make music as **Juuls Verne**, start more side projects than I can reasonably finish, and run a slightly excessive omakase program for my cat, ||Wobbles||.",
    },
  ],
  publicAnswers: [
    {
      id: "role-fit-ai-transformation-engineer",
      topic: "Roles Elijah fits best",
      question: "What kinds of roles is Elijah Leung best suited for?",
      tags: [
        "role fit",
        "roles",
        "job",
        "hire",
        "hiring",
        "ideal job",
        "recruiter",
        "ai strategy",
        "ai transformation",
        "ai transformation engineer",
        "ai product manager",
        "internal ai product",
        "solutions consulting",
        "finance automation",
        "fp&a",
        "operations",
        "enterprise workflows",
        "workflow automation",
        "business operations automation",
        "finance systems automation",
        "technical founder",
        "founder track",
      ],
      answer:
        "Elijah's official current title is AI Transformation Engineer. His strongest work combines finance and operational judgment, enterprise systems thinking, AI architecture and orchestration, product and workflow design, and the ability to translate executive objectives into technical systems. He is most useful where business, leadership, and technical teams need AI tools, services, workflows, and operating models that people can use, verify, govern, and improve.",
      app: "resume",
      evidence: [
        { kind: "document", id: "resume" },
        { kind: "document", id: "projects" },
      ],
    },
    {
      id: "differentiator",
      topic: "Differentiator",
      question: "What makes Elijah Leung different from other AI builders?",
      tags: [
        "different",
        "differentiator",
        "unique",
        "edge",
        "why him",
        "useful",
        "team",
        "recruiter",
        "summary",
        "special",
        "best at",
        "strength",
        "finance ai",
      ],
      answer:
        "Elijah combines a finance and operations lens with AI architecture, orchestration, product judgment, and workflow design. He can translate an executive objective into system boundaries, a working prototype, verification criteria, and an operating model, while keeping cost, controls, and adoption in the same conversation.",
      evidence: [
        { kind: "document", id: "resume" },
        { kind: "project", id: "elijahos" },
      ],
    },
    {
      id: "career-finance-to-ai-transition",
      topic: "Finance to AI transition",
      question: "How did Elijah Leung move from finance into AI?",
      tags: [
        "career story",
        "finance to ai",
        "fp&a automation",
        "cloud spend",
        "forecasting",
        "workflow pain",
        "ai transition",
        "why ai",
        "finance background",
        "manual reporting",
        "approval loops",
        "variance narratives",
      ],
      answer:
        "Elijah's move from finance into AI came from seeing how much high-value finance work gets trapped inside manual reporting, cleanup, and coordination loops. In FP&A and product and technology finance, he saw that valuable analysis often starts with pulling data from different systems, checking versions, reconciling assumptions, explaining variances, rebuilding slides, chasing approvals, and translating business changes into forecast updates; finance work is not just math, it is workflow design under pressure. AI became interesting because it can compress repetitive but context-heavy work like first-pass commentary, source retrieval, workflow intake, checklist enforcement, requirements drafting, codebase orientation, and structured summaries, as long as it improves cycle time, trust, traceability, decision quality, or team capacity.",
      app: "about",
      evidence: [{ kind: "document", id: "resume" }],
    },
    {
      id: "ai-roi-operating-philosophy",
      topic: "AI ROI philosophy",
      question: "How does Elijah Leung evaluate AI ROI?",
      tags: [
        "ai roi",
        "capacity not headcount",
        "finance ai",
        "human review",
        "automation strategy",
        "trust",
        "governance",
        "cycle time",
        "auditability",
        "decision quality",
        "team capacity",
        "operating leverage",
      ],
      answer:
        "Elijah evaluates AI by whether it improves a real workflow: cycle time, manual assembly, version control, auditability, decision quality, stakeholder communication, or team capacity. His finance lens makes him cautious where AI touches financial reporting, executive narratives, approvals, or sensitive decisions, so he prefers sequencing by impact and risk: start with high-effort, lower-risk workflows where humans already review the output, then move into more sensitive areas only when data foundation, review gates, and governance are ready. His preferred framing is capacity, not headcount: good AI gives teams time back for analysis, judgment, and better business partnering instead of creating another pile of machine-generated work to audit.",
      app: "about",
      evidence: [
        { kind: "project", id: "elijahos" },
        { kind: "document", id: "projects" },
      ],
    },
    {
      id: "workflow-automation-method",
      topic: "How Elijah approaches workflow automation",
      question: "How does Elijah Leung approach enterprise workflow automation?",
      tags: [
        "workflow automation",
        "process design",
        "source of truth",
        "approval trails",
        "finance operations",
        "requirements",
        "human in the loop",
        "review gates",
        "decision logs",
        "intake",
        "contract metadata",
        "audit-ready trails",
      ],
      answer:
        "Elijah starts workflow automation before the AI layer by mapping the decision, trusted source, input owner, approval path, conflict handling, traceability needs, and failure points. His projects keep returning to intake, review gates, source registries, decision logs, forecast commentary, contract metadata, and audit-ready trails because the pattern is to reduce the scramble, keep the judgment, and preserve the evidence. His implementation style is practical: separate assembly work from judgment work, define the source of truth and review loop, then build the smallest system that changes the workflow without creating a new mess, whether that is AI-assisted retrieval, a structured prompt, a checklist, a typed data model, a dashboard, a workflow automation, or a better handoff.",
      app: "about",
      evidence: [{ kind: "project", id: "elijahos" }],
    },
    {
      id: "availability",
      topic: "Availability",
      question: "How can recruiters and hiring managers contact Elijah Leung?",
      tags: [
        "availability",
        "available",
        "hire",
        "hiring",
        "engagement",
        "work with",
        "open to",
        "looking for",
        "open",
        "job",
        "role",
      ],
      answer:
        "Elijah welcomes relevant conversations about enterprise AI systems, agent workflows, AI operating models, and the work shown in this portfolio. His official current title is AI Transformation Engineer; the contact app has the direct path.",
      app: "contact",
      evidence: [
        { kind: "app", id: "contact" },
        { kind: "profile", id: "linkedin" },
        { kind: "profile", id: "github" },
      ],
    },
  ],
  projectsSubtitle: "What I've built, and what I'm building now.",
  contactTitle: "Say hello.",
  contactSubtitle: "For conversations about enterprise AI systems, agent workflows, or the work shown here.",
  pillars: [
    { k: "Enterprise AI Systems", v: "Architecture · prototypes · production pathways" },
    { k: "Agent Operations", v: "Orchestration · collaboration · verification gates" },
    { k: "AI Operating Models", v: "Governance · documentation · adoption · build vs. buy" },
    { k: "Finance & Operations", v: "FP&A · controls · forecasting · ROI modeling" },
  ],
  // Real projects only. Each entry is rendered as a ProjectCard and also
  // auto-derived into the Ask Elijah knowledge base (see lib/ask/kb.ts), so
  // anything here is stated as fact by the assistant. Keep it accurate,
  // public-safe, and explicit about maturity.
  projects: [
    {
      id: "vibe-modeling",
      name: "Vibe Modeling",
      kind: "Human–AI collaboration · concept",
      desc:
        "An early idea exploring how people and AI agents might collaborate on complex work with more structure, clarity, and thoughtful review. It is a concept, not a launched product or a public description of an underlying business.",
      stack: ["Human–AI collaboration", "Workflow design", "Structured review"],
      result: "A working vocabulary for thinking about clearer human–AI collaboration.",
      year: "2026",
      status: "planned",
      accent: "pink",
      glyph: "◇",
    },
    {
      id: "glyph",
      name: "Glyph",
      kind: "Reusable AI development system · high-level public view",
      desc:
        "A body of work around reusable AI components, skills, documentation, and standardized AI-enabled development workflows. The public description stays intentionally high-level and excludes private architecture, repositories, credentials, and security configuration.",
      stack: ["Reusable components", "Skills", "Documentation", "Workflow standards"],
      result: "Shared patterns that make AI-assisted development more consistent, reviewable, and easier to adopt.",
      year: "2026",
      status: "in flight",
      accent: "violet",
      glyph: "✦",
      links: { repo: "https://github.com/juulsverne/glyph" },
    },
    {
      id: "finance-ai-workshop",
      name: "Finance AI Workshop",
      kind: "Practical AI enablement · workshop format",
      desc:
        "A scenario-based workshop that teaches finance teams to use AI inside realistic workflows: source retrieval, commentary, review, controls, and handoffs. The emphasis is applied judgment and verification, not generic prompting demonstrations.",
      stack: ["Finance workflows", "Scenario design", "Human review", "AI enablement"],
      result: "A reusable teaching format grounded in the work finance teams actually perform.",
      year: "2026",
      status: "in flight",
      accent: "gold",
      glyph: "△",
      links: { repo: "https://github.com/juulsverne/Finance-AI-Workshop" },
    },
    {
      id: "elijahos",
      name: "ElijahOS",
      kind: "Personal site · the one you're on",
      desc:
        "A portfolio that doubles as the proof: a browser OS with desktop and mobile shells, draggable windows, widgets, mini apps — and a WebMCP tool surface for the agents visitors bring with them. Eight typed, page-scoped tools let an agent state its visit intent, search evidence that carries provenance, contribution scope, and limitations, compose real OS windows around what it finds, and read the workspace back after a person redirects it.",
      stack: ["TypeScript", "Next.js 16", "React 19", "R3F", "WebMCP", "Zustand"],
      result: "Live browser OS - WebMCP agent tools - evidence with provenance - visible workspace",
      year: "2026",
      featured: true,
      status: "in flight",
      accent: "blue",
      glyph: "★",
    },
  ],
  experience: [
    {
      co: "Enterprise technology",
      role: "AI Transformation Engineer",
      when: "2026 — now",
      what: "I design and build enterprise AI tools, services, automations, development workflows, and operating models. The work spans rapid prototypes, reusable components, agent orchestration, build-versus-buy evaluation, documentation, governance, verification, and adoption.",
    },
    {
      co: "Finance & operations",
      role: "Financial Analyst",
      when: "2024 — 2026",
      what: "Worked in FP&A and financial operations with responsibility for cloud infrastructure planning, forecasting, controls, and the systems that connected technical spend to business decisions.",
    },
    {
      co: "Defense Manufacturer",
      role: "Financial Analyst",
      when: "2021 — 2023",
      what: "Automated financial reporting workflows and built a forecast-tracking system for a recurring project portfolio, improving how teams reconciled forecasts and revenue analysis.",
    },
    {
      co: "NASA – SpaceICE",
      role: "Project Manager",
      when: "2017",
      what: "Led a cross-functional engineering team through multi-phase development and established controlled collaboration and data-handling practices for the project.",
    },
  ],
  education: [
    {
      school: "University of Illinois at Urbana-Champaign",
      degree: "B.S. Operations Management",
      when: "2021",
    },
  ],
  contact: {
    emailUser: "elijah",
    emailDomain: "elijahos.com",
    github: "github.com/juulsverne",
    linkedin: "www.linkedin.com/in/elijahleung",
  },
  music: {
    artist: "JUULS VERNE",
    spotifyArtistUrl: "https://open.spotify.com/artist/5XbOG4aFpBBHsMpC5DHt7O",
    // Drop real .mp3 files into public/music/ and update this list.
    // Players gracefully handle missing files (skip → next track).
    tracks: [
      {
        id: "silhouettes",
        title: "SILHOUETTES",
        file: "/music/SILHOUETTES.mp3",
        spotifyUrl:
          "https://open.spotify.com/track/6bckKbcaP9yjPlaAy6vEmz?si=e1d8512183d64117",
      },
      { id: "aether",     title: "AETHER",     unreleased: true, file: "/music/AETHER.mp3" },
      { id: "stallions",  title: "STALLIONS",  unreleased: true, file: "/music/STALLIONS.mp3" },
      { id: "always-you", title: "ALWAYS YOU", unreleased: true, file: "/music/always%20you.mp3" },
    ],
  },
  wobbles: {
    bio: {
      name: "Wobbles",
      title: "resident CEO",
      born: "2024-10-05",
      color: "lilac golden shell",
      // breed: "...", // fill in once confirmed
      weight: "10.5 lb",
      treats: ["bluefin tuna"],
      fact: "judges every PR",
    },
    // Web-optimized via `npm run optimize:media` (videos -> .mp4 + poster,
    // photos -> .webp). Drop new source files into public/wobbles/, re-run
    // the script, point these refs at the outputs, then move the originals out
    // of public/ so they don't ship in the deploy bundle.
    media: [
      { id: "wob-live-1", src: "/wobbles/IMG_6116.mp4", poster: "/wobbles/IMG_6116.poster.jpg", kind: "video", alt: "Wobbles, live cam" },
      { id: "wob-live-2", src: "/wobbles/IMG_2608.mp4", poster: "/wobbles/IMG_2608.poster.jpg", kind: "video", alt: "Wobbles, live cam" },
      { id: "wob-live-3", src: "/wobbles/copy_FDAF8B3E-A383-4C4F-94C6-5CAAB787BB13.mp4", poster: "/wobbles/copy_FDAF8B3E-A383-4C4F-94C6-5CAAB787BB13.poster.jpg", kind: "video", alt: "Wobbles, live cam" },
      { id: "wob-1", src: "/wobbles/IMG_5495.webp", alt: "Wobbles" },
      { id: "wob-2", src: "/wobbles/IMG_5617.webp", alt: "Wobbles" },
      { id: "wob-3", src: "/wobbles/IMG_5702.webp", alt: "Wobbles" },
      { id: "wob-4", src: "/wobbles/IMG_6136.webp", alt: "Wobbles" },
      { id: "wob-5", src: "/wobbles/IMG_6299.webp", alt: "Wobbles" },
      { id: "wob-6", src: "/wobbles/IMG_6478.webp", alt: "Wobbles" },
      { id: "wob-7", src: "/wobbles/IMG_6480.webp", alt: "Wobbles" },
      { id: "wob-8", src: "/wobbles/IMG_6512.webp", alt: "Wobbles" },
    ],
  },
  // Two-column contrast pairs used by the ComparisonPanel block.
  // Grounded in the `differentiator` KB chunk and the ELIJAH identity copy.
  // Left = finance/operations lens; right = AI/engineering lens.
  // No em-dashes; each side stays short enough for two clean columns.
  comparison: [
    { left: "Reads the ledger",         right: "Writes the architecture" },
    { left: "CFO-ready ROI memo",       right: "Deployment script" },
    { left: "Models the business case", right: "Ships the prototype" },
    { left: "Finds where money leaks",  right: "Builds the system that stops it" },
    { left: "Finance and operations",   right: "AI and engineering" },
  ],
  // Generated by web/scripts/encrypt-pitch.mjs. Re-run when the candid pitch
  // text changes. The password lives nowhere in source — only its hash and
  // the AES-GCM ciphertext of the pitch.
  puzzle: {
    passwordHash:
      "bac28d9630d1264b79b18248ad6b7919ab9c2d032b45e81b4133b14658460fee",
    pitchCiphertext:
      "NEYvJKpPBO+k/iQwoiq++2u9rbIvtJeKuQpl/z49p2EkzD0g8XO5u4pOcvlRbxhVBPkCrj39qjPQ70eH4oKRfKBuHc1mXZHQuvuRL/2iLJ1wE+eqpf90Gi3QAhJTn9gqIl+tbFpi3OGDYdhDb/pEsQmXAPS7a4Th5cgZ9DJBQcwf9fg+pgs3JJYCUU5H4JT89VJh0TsTrhtmgxOcGJrgbe1REG71ZML6NeHtDbbB28ivm9D5dZa4oSuynj1cyg3sK5hMaFSwjQ==",
    pitchIV: "Yf/gKgl7wDhOiPaT",
    pinnedLog: { tag: "WARN", time: "03:14", message: "auth: handshake_id=alpha7" },
  },
};

export const BOOT_LINES = [
  "[ OK ] Mounting /personality",
  "[ OK ] Loading kernel modules: strategy, build, ship",
  "[ OK ] Initializing AI co-processor… 17.2 TFLOPS",
  "[ OK ] Establishing trust with recruiter.exe",
  "[ OK ] Decrypting side-projects/",
  "[ ok ] Calibrating taste vectors",
  "[ OK ] Loading resume into RAM",
  "[ OK ] Spinning up portfolio.os v4.2",
  "",
  "welcome back, elijah.",
];
