# WebMCP Challenge baseline

ElijahOS existed before the WebMCP Challenge. This document separates the imported foundation from the meaningful WebMCP extension added during the submission period.

## Verifiable provenance

- Private source snapshot: `6e135e4f125f14ab2a877ad5ee70dcf7315913bf`
- Source snapshot date: August 6, 2026
- Sanitized import: the commit identified by the annotated `challenge-baseline` tag
- Baseline commit lookup: `git rev-parse challenge-baseline^{commit}`
- Pre-challenge public artifact: [elijahos.com](https://www.elijahos.com), backed by a Vercel Production deployment observed at `2026-08-06T05:39:04.465Z`

The sanitized import keeps its real creation date. It was not backdated. A commit cannot contain its own final object id, so the annotated tag is the stable reference.

## What existed before the challenge

The baseline includes:

- the windowed desktop OS and separate mobile shell;
- the shared app registry, launcher, desktop store, themes, widgets, and mini apps;
- public About, Projects, Case Study, Resume, Contact, and crawlable document routes;
- typed public portfolio content;
- the original Ask Elijah concept and interface shell, without its private runtime;
- a public-safe weather endpoint and content-only index visualization;
- unit tests, UI-contract checks, production build configuration, and responsive-browser test harness;
- allowlisted interface code, icons, and bundled fonts.

None of those elements is represented as work created during the WebMCP Challenge.

## What the sanitized baseline excluded

Before Git initialization, the export excluded:

- the original Git history, remotes, worktrees, Vercel link, and machine-local state;
- model providers, private retrieval code, query logs, analytics, databases, and provider configuration;
- generated embeddings and evaluation reports;
- private or internal documentation and unrelated experiments;
- unpublished audio and personal photo/video media;
- unused template or trademark assets;
- production environment values, deployment configuration, and credentials.

The public export was designed to preserve a usable ElijahOS shell without publishing private runtime services or a second biography.

## What was added during the challenge

All challenge implementation appears after `challenge-baseline`. The meaningful WebMCP extension includes:

- one isolated client-side ModelContext adapter;
- a ten-tool page capability surface with six read-only and four visible action tools;
- schema validation, structured errors, accurate annotations, and idempotent registration;
- evidence records derived from the existing typed public content;
- provenance, documented contribution scope, limitations, explicit search gaps, and first-hand source links;
- browser-session visit intent that is visible, editable, and clearable;
- a desktop/mobile workspace bridge that reuses the existing app launcher and shells;
- a narrow workspace snapshot that reflects both agent and human actions;
- a visible, in-memory tool activity feed;
- unit, injected-host browser, responsive, and native release checks;
- public tool, architecture, verification, and submission documentation.

Post-baseline work also restored owner-approved web media and rebuilt Ask Elijah Lite as a separately labeled site-owned guide. Those additions complete the product experience but are not represented as the core WebMCP implementation.

## Review the challenge diff

```bash
git log --oneline --reverse challenge-baseline..HEAD
git diff --stat challenge-baseline...HEAD
git diff challenge-baseline...HEAD
```

The final submitted comparison will be:

```text
challenge-baseline...webmcp-challenge-submission-v1
```

Create the final tag only from the exact commit that is publicly accessible, deployed, anonymously tested, and depicted in the submission video.
