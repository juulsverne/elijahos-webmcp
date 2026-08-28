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

The WebMCP adapter, evidence schema, recruiter workspace, tool-selection tests, and judged demo flow will be committed **after** the baseline tag so the challenge work remains reviewable as a clean diff.

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

## License status

No repository-wide open-source license has been selected yet. That is an explicit owner approval and public-release gate. Until a license is added, the original ElijahOS source and assets remain all rights reserved. Bundled font files retain their own OFL-1.1 licenses in `licenses/`.
