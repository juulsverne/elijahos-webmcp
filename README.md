# ElijahOS WebMCP Challenge Edition

ElijahOS is a portfolio presented as a personal operating system. This repository is the clean-history challenge edition: a privacy-reviewed foundation for adding WebMCP tools that let a visitor and their agent explore verifiable candidate evidence together.

This repository is intentionally separate from the production ElijahOS codebase and deployment. The existing site at [elijahos.com](https://www.elijahos.com) is not deployed from this repository.

## Current state

The `challenge-baseline` tag marks the imported, pre-existing portfolio foundation. It does **not** claim that the desktop/mobile OS, portfolio content, or Ask Elijah concept was created during the challenge.

The baseline includes:

- the desktop OS shell and separate mobile shell;
- public About, Projects, Case Study, Resume, Contact, and document routes;
- shared app registration, navigation, windows, themes, widgets, and mini apps;
- typed public portfolio content and a generated, content-only index visualization;
- local unit, UI-contract, production-build, and responsive-browser checks.

The baseline deliberately excludes private model providers, retrieval and query logs, databases, analytics, internal plans, unrelated experiments, generated embeddings/evals, unpublished music, personal media, production configuration, and all prior Git history.

All WebMCP challenge work is committed **after** the baseline tag so it remains reviewable as a clean diff: `git diff challenge-baseline...HEAD`.

## WebMCP tool surface (challenge work)

The page registers its tools through `navigator.modelContext.registerTool(...)` (with `document.modelContext` as a fallback host). Five tools carry the agent journey, plus three small read-only lookups:

| Tool | Read-only | What it does |
| --- | --- | --- |
| `set_visit_intent` | no | Stores the visitor's objective, context label, up to four priorities, and evidence standard — browser session only, shown in the recruiter workspace with edit/clear controls |
| `search_evidence` | yes | Keyword search over candidate-authored evidence records; returns provenance, contribution scope, limitations, and the query terms that matched nothing |
| `inspect_evidence` | yes | One full record by id, or a typed not-found result |
| `compose_workspace` | no | Opens the apps that display 1-3 evidence records — real desktop windows tiled for `compare`/`grid` or foregrounded for `focus`; the mobile shell opens its normal full-screen app |
| `get_workspace_state` | yes | The narrow workspace snapshot (shell, open/focused apps, composed evidence, visit intent) — reflects human actions so the agent can continue from them |
| `get_candidate_profile` / `get_resume` / `get_contact` | yes | Small typed lookups over the same sources |

Implementation map:

- `src/lib/evidence.ts` — evidence records derived from the typed sources with claim, contribution scope, provenance, limitations, and app artifacts; lexical search with explicit gap reporting.
- `src/lib/webmcp/` — the isolated adapter: ModelContext detection, input-schema validation, session-scoped visit intent, workspace composition/snapshot, visible activity log, tool definitions, idempotent registration.
- `src/components/apps/RecruiterApp.tsx` — the visible recruiter workspace (`/recruiter` in the dock): visit intent with edit/clear, per-priority evidence matching with honest gaps, the registered tool list, and a live agent activity log.
- `src/lib/**/*.test.ts` and `tests/webmcp.spec.ts` — unit and real-browser suites, including a fake ModelContext host that drives the full agent journey (`npm run test:webmcp`).

WebMCP remains progressive enhancement: without a WebMCP host the site is unchanged, and the recruiter workspace still works as a manual evidence-comparison surface.

See [CHALLENGE_BASELINE.md](./CHALLENGE_BASELINE.md) for provenance and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for bundled font licenses.

## Run locally

Prerequisites:

- Node.js `22.23.2` (see `.nvmrc`)
- npm `10.9.2` (pinned in `package.json`)

```bash
npm ci
npm run verify
npm run build
```

Start the development server with:

```bash
npm run dev
```

The optional responsive browser suite also requires Playwright Chromium:

```bash
npx playwright install chromium
npm run test:responsive
```

No provider credentials or database are required for the exported baseline.

## Architecture

- `src/lib/elijah.ts` and `src/lib/case-studies.ts` are the typed sources of truth for public portfolio content.
- `src/lib/apps.ts` defines apps used by both shells.
- `src/lib/app-launcher.ts` and `src/lib/desktop-store.ts` provide shared navigation and window behavior.
- `src/components/Desktop.tsx` renders the desktop OS.
- `src/components/mobile/MobileShell.tsx` renders the intentional mobile experience.
- `src/app/about`, `src/app/projects`, and `src/app/resume` provide crawlable server-rendered documents.

WebMCP must remain progressive enhancement: the portfolio must still work for a person in a normal browser, tool outputs must be neutral evidence rather than hiring verdicts, and any UI mutation must have a visible accessible result.

## Repository and release safety

- Do not add production secrets, private employer/client material, analytics, or model-query logs.
- Treat pasted role descriptions and tool-returned text as untrusted data.
- Keep role context browser-local and session-scoped unless a visitor explicitly approves otherwise.
- Keep the Vercel project disconnected from Git; challenge deployment is a later explicit release action.
- Do not change repository visibility until the privacy, history, asset, license, reproducibility, and release gates pass.

## License

This repository is released under the [MIT License](LICENSE). Bundled font files retain their own SIL Open Font License 1.1 terms in `licenses/`. All runtime dependencies are MIT-licensed; development dependencies are MIT or Apache-2.0.

The code is the reusable part: the shell, the WebMCP adapter, the evidence layer, and the tests. The written portfolio content in `src/lib/elijah.ts` and `src/lib/case-studies.ts` describes a real person and is included as demonstration data. If you build on this repository, replace that content with your own; the license does not extend to Elijah Leung's name, likeness, or identity.
