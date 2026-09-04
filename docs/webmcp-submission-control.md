# WebMCP Challenge submission control

> Public release ledger for ElijahOS
>
> Last rules and anonymous-access check: September 3, 2026
>
> Submission deadline: September 4, 2026 at 1:00 AM PDT / 3:00 AM CDT

This document records release truth, required evidence, and final freeze gates. The [README](../README.md) owns the project thesis and the four Devpost answers. The [tool reference](./webmcp-tools.md) owns the detailed WebMCP contracts.

## Authorities

- [WebMCP Challenge overview](https://webmcp.devpost.com/)
- [Official Rules](https://webmcp.devpost.com/rules)
- [Resources](https://webmcp.devpost.com/resources)
- [Deadline update and freeze reminder](https://webmcp.devpost.com/updates/46162-the-deadline-is-tomorrow)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)

If these sources conflict, the Official Rules control. The optional Devpost plugin and this repository's documentation are helpers, not rule authority.

## Current artifact ledger

| Artifact | Target | Current verified state |
| --- | --- | --- |
| Live application | <https://webmcp.elijahos.com> | September 3 (~1:15 PM CDT) injected-host checks against the deployed site: all ten tools registered with correct titles and read-only/untrusted annotations, all ten executed with real results, zero console errors, and the workspace snapshot reflected both agent-opened windows and a human dock action (Playwright demo driver, exit 0). An injected host is not native proof: native discovery and execution in a supported WebMCP browser remain required. A later production check (~10:59 PM CDT) confirmed Ask Elijah Lite is configured: `/api/ask/stream` returned source records, streamed answer tokens, and a clean completion. Ask remains a separate optional site guide, not part of the WebMCP tool surface. |
| Source repository | <https://github.com/juulsverne/elijahos-webmcp> | Public as of September 3 (~2:05 PM CDT). Unauthenticated checks confirm the repository opens logged out, GitHub detects the MIT license, and public `main` matches the local release candidate. |
| Baseline tag | `challenge-baseline` | Present locally and on origin; an unauthenticated API listing confirms it is visible on the public repository. |
| Final submission tag | `webmcp-challenge-submission-v1` | Create only from the anonymously tested release candidate. |
| Demo video | Public YouTube URL | Not yet recorded or published. |
| Devpost entry | Final submitted project | Not yet confirmed submitted. |

Do not convert a planned or local state into a completed claim. Update this table immediately after each release action.

## Devpost submission package

The Official Rules require:

- a working live URL accessible in ChatGPT's in-app browser or Chrome with WebMCP enabled;
- English text explaining the four required questions;
- a public GitHub, GitLab, or Bitbucket repository containing the source, assets, instructions, and a detectable open-source license;
- a public YouTube demonstration with audio, under three minutes;
- a project that functions as shown and remains available free of charge through judging;
- clear dated evidence separating pre-existing work from meaningful WebMCP work added during the submission period.

The four required written questions are answered under [Devpost submission questions](../README.md#devpost-submission-questions):

1. Why your use case is a strong fit for WebMCP.
2. How it creates a better user experience.
3. Describe what people and agents can do together that was difficult or impossible before.
4. Briefly explain how you implemented WebMCP.

Before pasting those answers into Devpost, edit them only to match the final deployment and recorded video. Delete unsupported claims rather than weakening them with vague qualifiers.

## Challenge work boundary

ElijahOS predates the challenge. The `challenge-baseline` tag contains the sanitized pre-existing desktop/mobile OS, app system, public content, and original Ask concept.

The post-baseline challenge diff must clearly show the meaningful WebMCP extension:

```bash
git log --oneline challenge-baseline..HEAD
git diff --stat challenge-baseline...HEAD
git diff challenge-baseline...HEAD -- src/lib/webmcp src/lib/evidence.ts src/components/apps/AgentWorkspaceApp.tsx tests/webmcp.spec.ts
```

The challenge claim belongs to the WebMCP adapter, typed evidence projection, tool surface, session intent, shared workspace bridge, visible activity, and tests. Do not imply that the underlying OS shell or portfolio was created during the submission period.

## Source-to-deployment parity gate

The current repository defines ten tools:

- five shared-journey tools;
- three direct read-only lookups;
- two visible OS actions.

A September 3 bundle-string check of the deployment found all ten tool names, but string presence is not parity proof. Before recording or submitting:

- [ ] Finish and commit the final tool surface.
- [ ] Run source-level tool contract tests.
- [ ] Deploy the exact release candidate to `webmcp.elijahos.com`.
- [ ] Open the deployed URL anonymously in a supported WebMCP browser.
- [ ] Confirm the discovered names, titles, schemas, and annotations exactly match [the tool reference](./webmcp-tools.md).
- [ ] Call every shipped tool on the deployed page and confirm its actual result.
- [ ] Confirm action tools visibly affect the current page and read-only tools do not mutate it.
- [ ] Confirm `get_workspace_state` reflects a human open/focus action.
- [ ] Confirm the normal site remains usable with no WebMCP host.

A successful HTTP response is not WebMCP proof. Tool discovery is not execution proof. An injected fake host is not deployed-native proof.

## Repository gate

- [ ] Review the public diff for personal, employer, client, credential, environment, and generated-data leaks.
- [ ] Confirm `.env.local`, provider keys, logs, databases, private plans, and source media are excluded.
- [ ] Run `npm run check:export-manifest` against the final tree.
- [ ] Confirm `LICENSE` is at repository root and GitHub detects MIT in the repository About area.
- [ ] Confirm bundled fonts and reserved media are covered by [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- [ ] Make the repository public only with explicit owner authorization.
- [ ] Open the repository and `challenge-baseline` tag in a logged-out browser.
- [ ] Confirm local HEAD, public default branch, deployed commit, and final tag identify the same release candidate.

## Verification gate

Run from a clean release candidate:

```bash
npm ci
npm run verify
npm run build
npm run test:webmcp
npm run test:responsive
```

Record exact command results in the final release evidence. Keep these claims separate:

- implemented in source;
- locally unit-tested;
- locally browser-tested with an injected host;
- natively discovered;
- natively executed;
- deployed;
- anonymously accessible;
- recorded in the public video;
- submitted on Devpost.

The optional Ask Elijah Lite path must also be checked separately when it appears in the demo. Its OpenAI route is not part of WebMCP and must never be described as the visitor's agent.

## Demo gate

- [ ] Use the deployed anonymous release candidate, not localhost.
- [ ] Show the site working as a normal human interface.
- [ ] Show native WebMCP tool discovery.
- [ ] Show a real tool call, a visible UI effect, an explicit evidence limitation or gap, and the human-to-agent continuation.
- [ ] Keep the video under three minutes and include clear audio.
- [ ] Use only media, marks, footage, and music the entrant has permission to publish.
- [ ] Scrub every frame for private tabs, notifications, names, employer/client material, credentials, and reflections.
- [ ] Upload publicly to YouTube and open the final URL while logged out.
- [ ] Confirm the video depicts the same build and behavior being submitted.

Do not show a fit score, ranking, hiring verdict, automated rejection claim, or any implication that the pre-existing OS was built during the challenge.

## Final Devpost gate

- [ ] Project name and one-line description match the README.
- [ ] All four answers match the final verified behavior.
- [ ] Live URL opens anonymously and exposes the final tool surface.
- [ ] Public repository and detectable MIT license open anonymously.
- [ ] Public YouTube video opens anonymously and remains under three minutes.
- [ ] Testing instructions are sufficient and contain no credentials unless authentication is actually required.
- [ ] Devpost entry is marked **submitted**, not left as a draft.
- [ ] Submission confirmation is captured before 1:00 AM PDT / 3:00 AM CDT on September 4.

## Freeze after submission

Once the submission period ends, do not change the submitted repository, live site, video, or Devpost materials except through an organizer-approved correction. Keep the project online, public, free, and functioning as depicted through the judging period ending September 21, 2026 at 5:00 PM PDT.

For post-deadline development, use a separate branch, fork, or deployment that cannot change the judged artifacts.
