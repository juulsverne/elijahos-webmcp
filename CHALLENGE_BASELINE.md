# WebMCP Challenge baseline

## Provenance

- Private source snapshot: `6e135e4f125f14ab2a877ad5ee70dcf7315913bf`
- Source snapshot date: 2026-08-06
- Sanitized import: the commit identified by the annotated `challenge-baseline` tag
- Resolve the sanitized import SHA with `git rev-parse challenge-baseline^{commit}`. The SHA is not self-embedded in this commit because a commit cannot contain its own final object ID.
- Externally verifiable pre-challenge artifact: [https://www.elijahos.com](https://www.elijahos.com), backed by a Vercel Production deployment observed at `2026-08-06T05:39:04.465Z`, before the challenge implementation window.
- The sanitized import commit keeps its real creation date; it is not backdated.

## Imported pre-existing foundation

- Desktop windowed OS and intentional mobile shell
- Shared app registry, launcher, desktop store, themes, widgets, and mini apps
- Public portfolio content and crawlable About, Projects, project-detail, Resume, and `llms.txt` routes
- Public-safe weather endpoint and content-only index visualization
- Unit tests, UI-contract checks, production build configuration, and responsive browser test harness
- Original ElijahOS interface code and icons included in the allowlisted export

## Excluded before Git initialization

- Original `.git` history, remotes, worktrees, `.vercel` link, machine-local state, and private agent configuration
- Model providers, Ask Elijah API routes, private retrieval implementation, query logs, analytics, databases, and provider configuration
- Generated embeddings, evaluation reports, private/internal documentation, unrelated experiments, and experiment routes
- Unpublished audio, personal photo/video media, and unused template/trademark assets
- Production environment values and deployment configuration

## Added for the WebMCP Challenge

Nothing in this baseline is represented as new challenge implementation. The WebMCP adapter, typed evidence records, tool surface, visible recruiter workspace, role-context controls, WebMCP evals, and final demo/release documentation must be committed after `challenge-baseline`.

The final challenge diff will be reviewable with:

```text
challenge-baseline...webmcp-challenge-submission-v1
```
