# WebMCP tool reference

ElijahOS exposes ten page-scoped WebMCP tools. They are not a second chatbot or a hidden automation layer. They give the agent a typed interface to the same evidence, applications, and workspace state a person can see.

This document describes the current repository implementation in [`src/lib/webmcp/tools.ts`](../src/lib/webmcp/tools.ts). The final deployment must be checked against this list before submission; deployment parity is tracked in [`webmcp-submission-control.md`](./webmcp-submission-control.md).

## Why this surface exists

Most personal websites expose one interface: rendered pages for people. An agent can scrape those pages, but it has to guess which text matters, what the author personally contributed, whether an apparent gap is meaningful, and how its work relates to what the person does next.

ElijahOS gives the site two native interfaces over one state:

- the human interface is the existing desktop or mobile operating-system shell;
- the agent interface is a small WebMCP capability surface registered by the page.

The agent owns interpretation. ElijahOS supplies bounded facts, provenance, documented limitations, and visible UI actions. No tool scores a person, ranks them, or makes a hiring decision.

## Surface at a glance

| Tool | Category | Read-only | Visible page effect |
| --- | --- | --- | --- |
| `set_visit_intent` | Shared journey | No | Opens Agent Workspace and displays the session brief |
| `search_evidence` | Shared journey | Yes | None |
| `inspect_evidence` | Shared journey | Yes | None |
| `compose_workspace` | Shared journey | No | Opens and arranges real ElijahOS apps |
| `get_workspace_state` | Shared journey | Yes | None |
| `get_candidate_profile` | Direct lookup | Yes | None |
| `get_resume` | Direct lookup | Yes | None |
| `get_contact` | Direct lookup | Yes | None |
| `open_app` | OS action | No | Opens a launchpad app |
| `play_music` | OS action | No | Opens the desktop widget panel and controls its player |

Six tools are read-only. Four tools change visible, reversible page state. Every call passes through the same schema validator, structured error wrapper, and visible activity log.

## The core human-agent journey

The first five tools form one deliberate loop:

1. `set_visit_intent` brings a distilled objective from the visitor's conversation into the page.
2. `search_evidence` finds relevant public records and says which query terms found no support.
3. `inspect_evidence` retrieves the complete record behind a promising search result.
4. `compose_workspace` opens the real apps that display up to three selected records.
5. The visitor can continue by hand, and `get_workspace_state` lets the agent resume from the resulting shared state.

The three direct lookups handle common factual questions without forcing a search. The two OS actions preserve the identity of ElijahOS as a personal operating system rather than reducing it to an evidence database.

## Tool details

### `set_visit_intent`

**What it does.** Stores a bounded description of why the visitor is here and opens Agent Workspace so the person can see it.

**Input.**

- `objective` — required, 1-280 characters;
- `context_label` — optional short label, up to 80 characters;
- `priorities` — optional ordered list of up to four items, each up to 120 characters;
- `evidence_standard` — optional statement of what would count as sufficient evidence, up to 200 characters;
- `visit_type` — optional closed enum: `hiring`, `client-project`, `technical-review`, `inspiration`, `just-exploring`, or `other`.

**Output.** The normalized stored intent, its browser-session scope, and a warning that visitor-supplied content is untrusted.

**Visible effect.** Agent Workspace opens in the current shell. The brief is labeled as agent-supplied and can be edited or cleared by the visitor.

**Intent behind the tool.** The visitor's agent may know far more context than this site should receive. This tool asks the agent to send only a small, explicit brief instead of exposing a private conversation or silently optimizing the page.

**Why the design works.**

- It makes the agent's objective legible and correctable by the person.
- It uses `sessionStorage`, not a database, analytics stream, or model prompt.
- Length caps, a closed visit-type enum, plain-text rendering, and `additionalProperties: false` limit fingerprinting and prompt-injection surface.
- The tool is correctly marked as mutating and as capable of returning untrusted content.

### `search_evidence`

**What it does.** Runs deterministic lexical search across evidence derived from the site's typed projects, case studies, decisions, experience, education, and public answers.

**Input.**

- `query` — required, 1-200 characters;
- `kinds` — optional filter over the six evidence kinds;
- `limit` — optional integer from 1-8, default 5.

**Output.** Ranked compact matches with an excerpt, canonical source, contribution scope, provenance, limitations, attached public links, and matched terms. It also returns the total searchable record count, unmatched query terms, an explicit coverage note when nothing matches, the site-wide evidence disclosure, and first-hand sources the agent can inspect directly.

**Visible effect.** None. This is a read-only evidence operation.

**Intent behind the tool.** An agent should not have to infer personal contribution from a technology list or treat missing text as proof of inability. Search returns what the site documents and names what it does not.

**Why the design works.**

- Search is explicitly lexical, not presented as semantic understanding.
- Empty results are typed coverage statements, not negative assessments.
- Contribution scope and limitations travel with every hit instead of being buried elsewhere.
- Search results stay compact; a separate inspection tool retrieves full records.

### `inspect_evidence`

**What it does.** Retrieves one complete evidence record using an id returned by `search_evidence`.

**Input.** `id` — required evidence id, 1-120 characters.

**Output.** A typed `found` result. A successful response includes the full claim, source, contribution scope, provenance, limitations, app artifacts, public links, disclosure, and first-hand sources. An unknown id returns `found: false` with guidance to search again.

**Visible effect.** None. This is read-only.

**Intent behind the tool.** Discovery and verification are different jobs. Search should be fast and compact; inspection should provide everything needed to scrutinize one claim.

**Why the design works.**

- Stable ids create an auditable search-to-inspection chain.
- A typed not-found result prevents the agent from inventing a missing record.
- The full record names both what is claimed and what remains unverified.

### `compose_workspace`

**What it does.** Resolves one to three evidence ids to their allowlisted ElijahOS apps and opens those apps in the visitor's current shell. Repeated ids are deduplicated before resolution, and when the primary record cites a case-study section, the case study opens scrolled to that exact section.

**Input.**

- `evidence_ids` — required list of 1-3 evidence ids;
- `layout` — required: `compare`, `focus`, or `grid`.

**Output.** Requested layout, apps actually opened, unresolved evidence ids, active shell, and a mobile note when applicable.

**Visible effect.**

- On desktop, `compare` and `grid` use the existing arranged-window layout. `focus` foregrounds the primary app and opens supporting apps behind it.
- On mobile, the intentional one-app-at-a-time shell opens the primary artifact full-screen.

**Intent behind the tool.** A useful agent should not end with a detached summary. It should be able to place the underlying material into the interface where the person can verify it and continue.

**Why the design works.**

- It reuses the real app registry, launcher, desktop store, and mobile opener.
- Only launchpad-visible apps can be opened; unknown or non-displayable evidence is reported rather than guessed.
- The change is visible, reversible, and accurately marked as mutating.
- Desktop and mobile retain their established interaction models.

### `get_workspace_state`

**What it does.** Reads a deliberately narrow snapshot of the current human-agent workspace.

**Input.** None.

**Output.**

- active shell;
- visible/open app ids;
- focused app id;
- focused and composed evidence ids;
- current visit intent.

**Visible effect.** None. This is read-only.

**Intent behind the tool.** Shared work requires a return path. After the agent composes a workspace, the person may open, close, or focus something manually. The agent can observe that bounded state and continue from the person's action.

**Why the design works.**

- It creates real bidirectional handoff instead of a one-way agent command.
- It excludes browser history, tab data, DOM text, puzzle state, and unrelated store internals.
- It reports the same desktop/mobile shell the visitor is actually using.

### `get_candidate_profile`

**What it does.** Returns the compact public identity record a direct question needs, without requiring a broad evidence search.

**Input.** None.

**Output.** The public name, role, positioning, description, location, and positioning pillars; a creative block with the public music track list (including unreleased flags) and Spotify artist link; canonical site routes; per-document revision dates; first-hand sources; and the evidence disclosure.

**Visible effect.** None. This is read-only.

**Intent behind the tool.** Common identity and navigation questions should have a small, direct answer rather than forcing broad evidence search.

**Why the design works.** It reads from the same typed `ELIJAH` source as the visible site, includes an authorship disclosure, and exposes no private profile data.

### `get_resume`

**What it does.** Returns the public work-experience and education arrays, the canonical resume route, the resume revision date, and the evidence disclosure.

**Input.** None.

**Visible effect.** None. This is read-only.

**Intent behind the tool.** A resume is a conventional structured document. Giving it a direct typed lookup is faster and less ambiguous than asking an agent to reconstruct it from rendered sections.

**Why the design works.** The output stays synchronized with the typed resume source and remains explicitly candidate-authored.

### `get_contact`

**What it does.** Returns the public email address, GitHub profile, and LinkedIn profile.

**Input.** None.

**Visible effect.** None. This is read-only and does not send a message.

**Intent behind the tool.** Finding a public contact path is a common endpoint, but contacting someone is a separate consequential action that the visitor or their agent should choose.

**Why the design works.** It provides only already-public channels and does not submit a form, open an external composer, or transmit visitor data.

### `open_app`

**What it does.** Opens one launchpad-visible ElijahOS app through the same shell-neutral launcher used by the dock.

**Input.** `app` — required id from the live launchpad allowlist.

**Output.** The opened app id, title, and shell. A desktop-only app requested on mobile returns an honest no-op result.

**Visible effect.** The requested app opens as a desktop window or mobile full-screen app.

**Intent behind the tool.** ElijahOS is meant to be experienced, not only queried. An agent can open About or Projects, but it can also open Snake, Calculator, Clock, or the terminal when that fits the visitor's request.

**Why the design works.**

- The enum is derived from the app registry, so arbitrary routes cannot be opened.
- It reuses normal navigation instead of manipulating the DOM.
- It reports platform limitations instead of claiming an app opened when it did not.

### `play_music`

**What it does.** Sends `play`, `pause`, `next`, or `previous` to the on-page music player, optionally jumping to a 1-based track number first.

**Input.**

- `action` — optional, defaults to `play`;
- `track` — optional integer within the current track list.

**Output.** Whether the command reached the mounted player, the current playback snapshot, the public track list, and a note about browser audio restrictions. On mobile it returns a supported no-op with the public Spotify artist link, because the player lives in the desktop widget panel.

**Visible effect.** On desktop, the widget panel opens and shows the player handling the command.

**Intent behind the tool.** Music is part of ElijahOS's personality. This call demonstrates that agent-native interaction can be experiential and playful, not only transactional.

**Why the design works.**

- The agent drives the same player and controls a person uses.
- Track numbers are bounded by the typed track list.
- The result distinguishes command delivery from audible playback, because browsers may require a human gesture before sound begins.
- Mobile limitations are explicit.

## Shared implementation guarantees

### Progressive enhancement

`WebMCPProvider` registers tools after the shell becomes interactive and renders nothing itself. If neither `navigator.modelContext` nor `document.modelContext` exists, registration returns an unsupported result and ElijahOS continues as a normal website.

### One registration adapter

Only [`src/lib/webmcp/model-context.ts`](../src/lib/webmcp/model-context.ts) touches the browser ModelContext global. [`src/lib/webmcp/register.ts`](../src/lib/webmcp/register.ts) handles idempotent registration, validation, execution errors, annotations, and the activity log.

### Narrow schemas and structured failures

Inputs use a small auditable JSON-Schema subset, reject unknown properties, and cap strings and arrays. Invalid input returns a structured error instead of throwing through the browser host. One rejected tool registration does not prevent the remaining tools from registering.

### Accurate annotations

`readOnlyHint` is true only for handlers that mutate nothing. `untrustedContentHint` is set when a result may contain visitor- or caller-supplied content. The four action tools affect visible browser state only.

### Canonical public data

Evidence is derived at runtime from [`src/lib/elijah.ts`](../src/lib/elijah.ts) and [`src/lib/case-studies.ts`](../src/lib/case-studies.ts). [`src/lib/evidence.ts`](../src/lib/evidence.ts) is a projection, not a second biography.

### Visible accountability

Every invocation is recorded in an in-memory, capped activity feed shown in Agent Workspace. The feed is cleared on reload and contains bounded summaries rather than full tool inputs or outputs.

## Verification map

| Layer | What it proves | Command or location |
| --- | --- | --- |
| Unit contracts | Names, schemas, annotations, output shapes, validation, and side effects | `npm test` |
| Browser integration | Registration and all tool flows against an injected ModelContext host | `npm run test:webmcp` |
| Normal browsing | Desktop/mobile remain usable without WebMCP | `npm run test:responsive` |
| Native discovery | The deployed page registers the expected tools in a supported browser | ChatGPT in-app browser or Chrome 149+ with WebMCP enabled (`chrome://flags/#enable-webmcp-testing`) |
| Native execution | Real calls change and report the visible deployed page correctly | Recorded release check |

Injected-host tests prove application behavior; they do not prove that a live model will choose a particular tool. Native discovery proves registration; it does not by itself prove every call or the agent's final reasoning. The submission evidence keeps those claims separate.
