# ElijahOS

**A personal website with two native interfaces: an operating system for people and a WebMCP capability surface for the agents they bring.**

[Live challenge site](https://webmcp.elijahos.com) · [WebMCP tool reference](docs/webmcp-tools.md) · [Challenge baseline](CHALLENGE_BASELINE.md) · [Submission release status](docs/webmcp-submission-control.md)

ElijahOS is not a conventional scrolling portfolio. On desktop it behaves like a windowed personal operating system; on mobile it becomes an intentional one-app-at-a-time shell. WebMCP does not replace either interface. It progressively enhances the same application so a visitor's agent can investigate public evidence, expose uncertainty, and compose a workspace the visitor can inspect and continue using.

## The thesis

Websites are usually built for one participant: the person looking at the page. When an agent joins, it often receives rendered text and tries to infer the site's capabilities, the author's intent, and the state of the interface.

ElijahOS treats the agent as a second participant with a different native interface:

- **The person navigates an OS.** They open apps, arrange windows, read projects, play with the site, and retain control.
- **Their agent uses typed page capabilities.** It can bring in a narrow visit brief, search and inspect evidence, open the relevant artifacts, and read back a bounded workspace snapshot.
- **Both operate on the same state.** Agent actions are visible. Human changes are available to the agent through a narrow state tool.

The result is not an AI resume matcher and does not produce a fit score or hiring verdict. Recruiting is the sharpest demonstration because provenance and contribution scope matter immediately, but the same model supports client scoping, technical review, learning from the implementation, and open-ended exploration.

## What a visitor and agent can do

A representative journey looks like this:

1. The visitor explains what they want in their own agent conversation.
2. The agent calls `set_visit_intent` with only a distilled brief. ElijahOS displays it in Agent Workspace, where the person can edit or clear it.
3. The agent calls `search_evidence` and `inspect_evidence` to examine typed records with provenance, contribution scope, limitations, public links, and explicit unmatched terms.
4. The agent calls `compose_workspace` to open the actual ElijahOS apps that display the selected material.
5. The person continues by hand—opening or focusing another app, for example.
6. The agent calls `get_workspace_state` and continues from that bounded human-changed state.

The site also exposes direct public profile, resume, and contact lookups, plus `open_app` and `play_music`. Those last two matter: ElijahOS is an expressive personal OS, not merely a structured dossier.

No WebMCP support is required for normal use. Without a ModelContext host, the desktop and mobile experiences remain fully available.

## Devpost submission questions

The challenge requires a written explanation covering the following four questions. These answers describe the implementation in this repository as deployed to the live site.

### Why your use case is a strong fit for WebMCP

Most personal websites make a visitor choose between browsing by hand and asking an external agent to summarize rendered text. The first path is slow; the second separates the reasoning from the evidence and loses the site's interactive state. That problem becomes especially visible when someone is evaluating work: a polished page rarely distinguishes individual contribution, first-hand artifacts, and what the site cannot prove.

ElijahOS gives each participant the interface it needs. The human explores a personal operating system. Their agent receives a small set of typed, page-scoped capabilities over the same public content and live workspace. It can search evidence, inspect the source and limitations behind a claim, and place the underlying artifacts into the interface without brittle DOM guessing. The agent performs the interpretation; ElijahOS supplies bounded domain truth and visible actions.

WebMCP is essential here because the value is not just machine-readable content. It is coordinated action inside a page both participants can see and change. A session-scoped brief moves from the visitor's conversation into the site without transferring the full private context. The agent can compose the workspace, the person can redirect it through ordinary navigation, and the agent can resume from a narrow snapshot of that human action. Static metadata, scraping, or a detached server API cannot provide that same page-local handoff.

### How it creates a better user experience

The visitor no longer needs to translate a goal into a tour of the site. Their agent can state the objective once, find relevant evidence, call out unsupported terms, and open the right material in context. The brief is visible and editable, and every tool invocation is listed in an on-page activity feed inside Agent Workspace, so the visitor can see what the agent is optimizing for and audit what it actually did instead of trusting a hidden prompt.

The evidence is also more honest than a generic summary. Search and inspection results carry canonical sources, candidate-authored provenance, documented contribution scope, limitations, and first-hand links where available. “No documented evidence on this site” is a valid result rather than a blank for the agent to fill with a guess.

The interface remains expressive. On desktop, selected evidence opens in real arranged windows, and case-study evidence opens scrolled to the exact section a claim cites; on mobile, the primary artifact opens in the normal full-screen shell. The agent can also open apps or control the visible music player when the visitor wants to experience the site rather than evaluate it. People without a WebMCP-capable browser lose nothing.

### Describe what people and agents can do together that was difficult or impossible before

They can build and revise one shared workspace across two interaction modes.

Previously, a person could navigate ElijahOS while an external agent reasoned in a separate chat. The agent could summarize the page, but it could not reliably know what the person had opened, place the exact supporting artifacts into the OS, or make its objective visible inside the site. DOM automation would be especially brittle against overlapping windows, focus, minimization, and the separate mobile shell.

Now the agent can bring in a bounded objective, investigate structured evidence, and visibly compose the relevant apps—opening a case study scrolled to the exact section that supports a claim. The person can inspect every claim in its native context, review the agent's actions in the activity feed, change the workspace manually, and remain the decision-maker. The agent can then read only the shared shell state needed to continue. That bidirectional handoff—agent action, human correction, agent continuation—is the central collaboration enabled by WebMCP.

### Briefly explain how you implemented WebMCP

One client-side provider registers ten tools through the browser's available ModelContext host after the ElijahOS shell becomes interactive. Five tools carry the core journey: `set_visit_intent`, `search_evidence`, `inspect_evidence`, `compose_workspace`, and `get_workspace_state`. Three read-only tools provide direct profile, resume, and contact data. Two visible action tools open an app and control the on-page music player. Six tools are read-only; four make visible, reversible UI changes.

The registration adapter is isolated in `src/lib/webmcp/`. It detects `navigator.modelContext` or `document.modelContext`, validates narrow JSON-schema inputs, applies accurate read-only and untrusted-content annotations, returns structured failures, and records each invocation in an in-memory activity feed. The WebMCP path has no server, model, provider credential, database, analytics, or persistent query log.

Evidence records are derived from the existing typed portfolio sources rather than maintained as a second biography. Each record contains a canonical route, authorship provenance, documented contribution scope, limitations, displayable app artifacts, first-hand source links, and any public external links. Workspace actions deduplicate repeated ids, reuse the existing app registry, shell-neutral launcher, desktop window store, and mobile opener, and open case-study evidence anchored to the cited section.

Unit tests cover schemas, annotations, outputs, validation, and side effects. Playwright tests exercise the real tool dispatcher through an injected ModelContext host and confirm the normal interface still works without WebMCP. Native supported-browser checks are kept separate because fake-host tests do not prove live registration, live model tool choice, or deployed behavior.

## WebMCP tool surface

| Tool | Read-only | Role |
| --- | --- | --- |
| `set_visit_intent` | No | Stores and displays a bounded, session-only visitor brief |
| `search_evidence` | Yes | Searches typed public evidence and reports unmatched terms |
| `inspect_evidence` | Yes | Returns one complete evidence record or a typed not-found result |
| `compose_workspace` | No | Opens the apps that display one to three selected records |
| `get_workspace_state` | Yes | Reads the narrow shared desktop/mobile workspace snapshot |
| `get_candidate_profile` | Yes | Returns the public profile, positioning pillars, creative facts, first-hand sources, and revision dates |
| `get_resume` | Yes | Returns typed public experience and education data |
| `get_contact` | Yes | Returns public contact channels without contacting anyone |
| `open_app` | No | Opens an allowlisted launchpad app through the normal shell |
| `play_music` | No | Controls the visible desktop music player on a best-effort basis |

See [the complete tool reference](docs/webmcp-tools.md) for every input, output, visible effect, limitation, and design rationale.

## Try the core journey

Open the [live challenge site](https://webmcp.elijahos.com) in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled (`chrome://flags/#enable-webmcp-testing`), then ask your agent something like:

> I am reviewing ElijahOS as an agent-native web project. Set that as my visit intent, find evidence about the WebMCP architecture and testing, inspect the strongest records and any documented gaps, then compose a comparison workspace. Do not give me a score or hiring recommendation.

The exact tool sequence and final response belong to the visitor's agent. ElijahOS provides the capabilities and evidence; it does not script the judgment.

## Architecture

| Area | Source |
| --- | --- |
| Canonical public content | `src/lib/elijah.ts`, `src/lib/case-studies.ts` |
| Derived evidence projection | `src/lib/evidence.ts` |
| WebMCP detection, validation, registration, tools, and state | `src/lib/webmcp/` |
| Shared app registry and shell-neutral launcher | `src/lib/apps.ts`, `src/lib/app-launcher.ts` |
| Desktop window state | `src/lib/desktop-store.ts` |
| Desktop and mobile shells | `src/components/ElijahOS.tsx`, `src/components/WindowHost.tsx`, `src/components/mobile/MobileShell.tsx` |
| Visible agent brief and activity | `src/components/apps/AgentWorkspaceApp.tsx` |
| Optional site-owned guide | `src/components/apps/AskApp.tsx`, `src/app/api/ask/stream/route.ts` |

Ask Elijah Lite is intentionally separate from WebMCP. It is an optional site-owned guide grounded in the same public evidence and uses one server-side OpenAI route when configured. It is labeled as the site's assistant, does not act as the visitor's agent, and does not make hiring recommendations.

## Challenge provenance

ElijahOS existed before the submission period. The annotated `challenge-baseline` tag marks the sanitized pre-challenge foundation: the desktop/mobile OS, app system, public portfolio content, and original Ask concept.

The meaningful challenge extension is reviewable with:

```bash
git diff challenge-baseline...HEAD
```

Post-baseline work includes the WebMCP adapter, ten-tool surface, typed evidence projection, session-scoped visit intent, shared workspace bridge, Agent Workspace, tool activity feed, tests, direct first-hand source links, and release documentation. The separate Ask Elijah Lite restoration and approved personality media are also post-baseline work but are not represented as the core WebMCP implementation.

`PUBLIC_EXPORT_MANIFEST.json` and `PUBLIC_EXPORT_SHA256SUMS.txt` at the repository root are the sanitized-export inventory: every public file is listed and checksummed there, and `npm run verify` fails if the tree drifts from them.

See [CHALLENGE_BASELINE.md](CHALLENGE_BASELINE.md) for the full boundary.

## Run locally

Prerequisites:

- Node.js `22.23.2` from `.nvmrc`;
- npm `10.9.2` from `package.json`.

```bash
npm ci
npm run verify
npm run build
npm run dev
```

The optional browser suites require Playwright Chromium:

```bash
npx playwright install chromium
npm run test:webmcp
npm run test:responsive
```

No provider credential is required for the site or WebMCP tools. To enable the separate Ask Elijah Lite guide, copy the documented values from `.env.example` and provide a server-only `OPENAI_API_KEY`.

## Verification boundaries

- `npm run verify` covers lint, TypeScript, unit tests, UI contracts, public-index freshness, and the public export manifest.
- `npm run build` proves the production bundle compiles.
- `npm run test:webmcp` exercises browser integration against an injected ModelContext host.
- `npm run test:responsive` checks the desktop and mobile interfaces.
- Native release checks cover anonymous live access, deployed tool discovery and execution in a WebMCP-enabled browser, public repository and license visibility, and parity with the demo.

A page returning HTTP 200 does not prove WebMCP registration. Tool discovery does not prove a model will select the tools. An injected host does not prove the final deployment. The [submission release status](docs/webmcp-submission-control.md) keeps these states distinct.

## Privacy, trust, and safety

- Visitor intent remains browser-local and session-scoped.
- Pasted objectives and tool-supplied text are treated as untrusted data.
- Evidence is candidate-authored and labeled as such; external links are included only when the canonical content documents them.
- Tools report gaps and limitations instead of inferring inability.
- No WebMCP tool scores, ranks, recommends, contacts, purchases, authenticates, or submits anything.
- The WebMCP path has no provider key, database, analytics, persistence service, or server-side query log.
- UI-changing calls use allowlisted existing controls and produce visible, reversible state.

## License

The reusable code is released under the [MIT License](LICENSE). Bundled fonts retain their SIL Open Font License 1.1 terms under `licenses/`; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The portfolio copy in `src/lib/elijah.ts` and `src/lib/case-studies.ts` describes a real person and is included as demonstration data. Replace it with your own content when reusing the project. The MIT license does not grant rights to Elijah Leung's name, likeness, or identity.

Owner-approved audio, photo, and video under `public/music/` and `public/wobbles/` are included only to view and demonstrate ElijahOS. They are not licensed under MIT and remain all-rights-reserved material of their respective rights holders.
