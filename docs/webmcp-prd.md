# ElijahOS WebMCP product requirements document

> Retrospective PRD for the WebMCP Challenge release.
>
> This document was written to record the product intent behind the implementation that shipped. The [README](../README.md) owns the project thesis and the Devpost answers, the [tool reference](./webmcp-tools.md) owns the exact WebMCP contracts, and the [submission control ledger](./webmcp-submission-control.md) owns release evidence. Where this document and shipped behavior disagree, the shipped behavior and its tests are the truth.

## Problem statement

A personal website normally serves one participant: the person looking at the page. When a visitor brings their own agent, the agent receives rendered text and has to infer the site's capabilities, the author's intent, and the current interface state. In evaluation contexts — recruiting, client scoping, technical review — this fails in a specific way: a polished page does not distinguish individual contribution from team output, first-hand artifacts from claims, or documented facts from gaps the agent will fill with guesses. DOM automation does not fix this; it is brittle against overlapping windows, focus, minimization, and a separate mobile shell.

The cost of not solving it is that the visitor must choose between a slow manual tour and a detached summary that severs reasoning from evidence and loses the site's interactive state.

## Users

- **The visitor**: a recruiter, prospective client, engineer, or curious person exploring ElijahOS as a desktop-style OS (windowed) or mobile shell (one app at a time). They retain control at all times.
- **The visitor's agent**: an assistant running in a WebMCP-capable browser or in-app browser, acting on the visitor's behalf inside their own conversation.
- **The site owner**: publishes typed public evidence once and needs it represented honestly — including its limitations — to both participants.

## Goals

1. **Give each participant a native interface over the same application.** The person navigates an OS; their agent uses typed, page-scoped capabilities — not scraped text, not a detached API.
2. **Make agent work visible and correctable.** Every agent action is displayed on the page (visit brief, activity feed, real windows opening), and the person can edit, redirect, or continue by hand.
3. **Make the evidence honest.** Results carry provenance, documented contribution scope, limitations, and first-hand links; "no documented evidence on this site" is a valid, typed answer.
4. **Enable a bidirectional handoff.** Agent action → human correction → agent continuation over one shared workspace state, which was not reliably possible before.
5. **Cost nothing when absent.** With no ModelContext host, the desktop and mobile experiences are fully unchanged.

## Non-goals

- **No fit score, ranking, or hiring verdict.** The site supplies bounded domain truth; interpretation belongs to the visitor's agent. Scoring would convert candidate-authored data into a fake objective signal.
- **No replacement of the human interface.** WebMCP progressively enhances the OS; it does not gate any content behind agent access.
- **No server-side agent path for WebMCP.** The tool surface is client-only: no server, model, provider credential, database, analytics, or persistent query log. (Ask Elijah Lite is a separate, optional site-owned guide with its own server route, and is never presented as the visitor's agent.)
- **No outbound or irreversible actions.** No tool contacts anyone, purchases, authenticates, or submits anything. UI-changing tools use allowlisted existing controls and produce visible, reversible state.
- **No cross-session memory.** Visit intent is browser-local and session-scoped by design.

## User stories

**Visitor**

- As a visitor with a goal, I want my agent to state my objective to the site once, so I do not have to translate it into a manual tour — and I want to see and edit that brief on the page.
- As an evaluator, I want claims opened in their native context (a case study scrolled to the cited section), so I can inspect the evidence rather than trust a summary.
- As a person in control, I want to rearrange or open apps by hand mid-session and have my agent continue from what I actually did.
- As a visitor without a WebMCP browser, I want the full site to work normally.

**Visitor's agent**

- As an agent, I want typed search over public evidence with explicit unmatched terms, so I report gaps instead of hallucinating around them.
- As an agent, I want to inspect one complete evidence record — provenance, contribution scope, limitations, links — before presenting it.
- As an agent, I want to compose the workspace (open the real apps for selected records) and later read back a bounded snapshot of the shared shell state, including human changes.
- As an agent, I want structured failures and accurate read-only/untrusted-content annotations, so I can behave safely without guessing.

## Requirements

### Shipped (P0) — the core journey

Five tools carry the collaboration loop; the release could not ship without them:

| Requirement | Tool | Acceptance (as shipped) |
| --- | --- | --- |
| Session-scoped visitor brief, visible and editable on page | `set_visit_intent` | Brief renders in Agent Workspace; person can edit or clear; nothing persists beyond the session |
| Evidence search with honest gaps | `search_evidence` | Returns typed records and explicit unmatched terms; read-only |
| Full single-record inspection | `inspect_evidence` | Returns one complete record or a typed not-found result; read-only |
| Visible workspace composition | `compose_workspace` | Opens the real apps for 1–3 records via the existing shell; deduplicates ids; case studies open anchored to the cited section |
| Bounded shared-state readback | `get_workspace_state` | Snapshot reflects both agent-opened windows and subsequent human open/focus actions |

### Shipped (P0) — direct lookups and expressive actions

| Requirement | Tool | Acceptance (as shipped) |
| --- | --- | --- |
| Public profile with provenance and revision dates | `get_candidate_profile` | Read-only; candidate-authored and labeled as such |
| Typed public resume data | `get_resume` | Read-only |
| Public contact channels, no side effects | `get_contact` | Read-only; contacts no one |
| Open an allowlisted app | `open_app` | Visible, reversible; routes through the normal launcher on both shells |
| Control the visible music player | `play_music` | Best-effort; desktop player only; visible and reversible |

Cross-cutting P0 requirements, all shipped:

- Registration only after the shell is interactive, against `navigator.modelContext` or `document.modelContext`; the adapter is isolated in `src/lib/webmcp/`.
- Narrow JSON-schema input validation, structured failures, and accurate `readOnlyHint`/untrusted-content annotations on all ten tools (six read-only, four visible actions).
- Evidence records derived from the existing typed portfolio sources (`src/lib/evidence.ts`) — one biography, not two.
- Every invocation recorded in the on-page activity feed in Agent Workspace.
- Unit tests for schemas, annotations, outputs, validation, and side effects; Playwright tests through an injected ModelContext host; responsive tests proving the no-host experience is intact.

### Shipped (P1) — experience quality

- Case-study deep anchoring (open scrolled to the exact cited section) rather than just opening the app.
- Explicit unmatched-term reporting in search results rather than silent partial matches.
- The activity feed as an audit surface, not just a log.

### Future considerations (P2) — deliberately not built

- Native-host-specific affordances (e.g., elicitation or richer progress reporting) once host support matures.
- Additional evidence domains beyond the current portfolio scope.
- Any persistence or personalization — only if it can remain visible, optional, and session-bounded.

## Success criteria and verification

This project's success metrics are verification gates rather than adoption metrics, and each claim level is kept separate (implemented → unit-tested → injected-host-tested → natively discovered → natively executed → deployed → anonymously accessible):

- `npm run verify` (lint, typecheck, unit tests, UI contracts, public index, export manifest) passes.
- `npm run test:webmcp` exercises the real dispatcher through an injected host; `npm run test:responsive` proves both shells work with no host.
- Native checks on the deployed site confirm all ten tools register with correct titles and annotations, execute with real results, and that `get_workspace_state` reflects a human dock action.
- The recorded outcomes live in the [submission control ledger](./webmcp-submission-control.md); this PRD does not restate or upgrade them.

## Timeline and provenance

ElijahOS predates the WebMCP Challenge. The `challenge-baseline` tag marks the pre-existing OS, app system, and public content. The challenge-period work — the WebMCP adapter, ten-tool surface, evidence projection, session intent, workspace bridge, Agent Workspace activity feed, and tests — is reviewable as `git diff challenge-baseline...HEAD`. See [CHALLENGE_BASELINE.md](../CHALLENGE_BASELINE.md).

## Open questions

- **Host ecosystem (external):** which native hosts ship stable ModelContext support, and whether annotation semantics converge across them, determines how much P2 affordance work is worthwhile.
- **Evidence scope (owner):** whether future non-portfolio content (e.g., writing, experiments) joins the evidence projection or stays human-interface-only.
