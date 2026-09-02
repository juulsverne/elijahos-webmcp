# ElijahOS WebMCP submission workbook

> Status: working submission copy, not final claims  
> Last live rules check: August 31, 2026  
> Official deadline: September 3, 2026 at 1:00 PM PDT / 3:00 PM CDT  
> Internal submission target: September 2, 2026 after work

This public document is limited to the material needed to prepare and verify the Devpost submission. It is not the implementation plan, personal schedule, recording runbook, or task tracker.

Primary authority: [WebMCP Challenge Official Rules](https://webmcp.devpost.com/rules)  
Product/API authority: [WebMCP documentation](https://learn.chatgpt.com/docs/webmcp)

Final copy rule: rewrite every answer against the verified release candidate. Delete unsupported claims rather than presenting planned behavior as shipped behavior.

## 1. Submission identity

**Project name:** ElijahOS

**Technical one-liner:**

> ElijahOS is a personal website built for two kinds of visitors: humans navigate the operating system, while their agents use WebMCP to investigate evidence and compose the same live workspace around their intent.

**Short public framing:**

> I rebuilt my portfolio for a web where every visitor brings an agent.

For challenge provenance, “rebuilt” means the post-`challenge-baseline` WebMCP transformation. The pre-existing ElijahOS shell, apps, content model, and Ask Elijah concept are baseline work.

### Submission URLs

| Submission field | Final value | Verification status |
| --- | --- | --- |
| Live challenge application | Not assigned | Must open anonymously over HTTPS in a supported WebMCP browser |
| Public source repository | <https://github.com/juulsverne/elijahos-webmcp> | Repository is private until owner-authorized release |
| Baseline tag | <https://github.com/juulsverne/elijahos-webmcp/tree/challenge-baseline> | Becomes anonymously verifiable when the repository is public |
| Public YouTube demo | Not assigned | Must be public, contain audio, and remain under three minutes |
| Devpost submission | Not assigned | Must be confirmed before the internal target |
| Final submission tag | `webmcp-challenge-submission-v1` | Create only from the anonymously tested release candidate |

## 2. Answer ownership

Each answer has one job so the four fields do not repeat the same demo loop.

| Answer | Owns |
| --- | --- |
| Question 1 | The two-interface thesis, primary user, and why WebMCP is essential |
| Question 2 | Concrete before/after experience and the Ask Elijah inversion |
| Question 3 | The bidirectional human-agent handoff demonstrated on the live page |
| Question 4 | The smallest honest implementation map a judge can verify in the repository |

## 3. Required Devpost answers

### Question 1 — “Why your use case is a strong fit for WebMCP”

**Working answer — locked August 30; rewrite only to match shipped evidence**

Most websites are built for one kind of visitor. ElijahOS is a personal website rebuilt for a web where every visitor brings an agent. The human gets an interactive operating system. Their agent gets a small, typed WebMCP capability surface over the same live application state. Neither one is a wrapper around the other.

The first visitor I designed for is the one I am right now. I'm hiring, and I've learned that a portfolio is weak evidence. It's self-authored, it says what someone worked on rather than what they personally did, and it never admits what it can't prove. A hiring manager, or the technical recruiter screening for them, has a few minutes to decide whether a candidate earns an interview. Today they browse by hand, or they paste the site into a chat and get a summary they can't verify. The evidence and the reasoning live in two different places.

WebMCP is the only mechanism that closes that gap on the page itself. Static metadata or `llms.txt` can make facts retrievable, and DOM automation is at its most brittle on an OS metaphor. With typed, page-scoped tools, the evaluator's agent brings the role in as a brief the person can see and edit. ElijahOS receives only that brief, never silent access to the agent's private context. From there the agent searches and inspects evidence with provenance, contribution scope, and documented limitations, including “no public evidence found.” It composes the real artifacts into the OS, where the person can inspect them, open something else, and have the agent continue from the new state. The agent investigates, the page responds, the human redirects, and the agent continues.

The site states its own terms to the agent: here is what I know, here is what I can do, here is what you may change, here is the provenance, and here is what stays with the human. That is the entire tool surface, and it is small enough to reason about. Hiring is the sharpest demonstration, but the same primitives serve any visitor who arrives with an intent. A portfolio that hands a skeptical agent its own limitations stops being a pitch and becomes something you can audit.

**Current status:** Narrative approved; final answer blocked on shipped evidence.

**Evidence gate:**

- [ ] Supported browser discovers the exact shipped tool surface.
- [ ] Tool calls operate on the live page and visible current session.
- [ ] Visit intent is visible, editable, clearable, and session-only.
- [ ] Evidence contains provenance, contribution scope, limitations, and a real documented gap.
- [ ] Agent composition is visible on desktop and has an honest mobile equivalent.
- [ ] A human change appears in the narrow workspace-state result.
- [ ] Human desktop/mobile interfaces work without WebMCP.
- [ ] Any claim that the primitives support non-hiring visitors is backed by eval evidence or removed.

### Question 2 — “How it creates a better user experience”

**Working answer — locked August 30; rewrite only to match shipped evidence**

Take the question a hiring manager really asks: “Has this person actually shipped something real, end to end, and what did they personally own?”

Before, ElijahOS already had an answer to that. Ask Elijah was a site-owned assistant with hybrid retrieval, citations, traces, and tools that could open apps and arrange windows. It was a real agent, but it was *my* agent. My model, my prompt, my retrieval, running on my server. However well it cited, the visitor was still talking to the candidate. The alternative was no better. Hand the URL to ChatGPT and you get a confident summary built from rendered text that can't tell individual work from team work, with nothing to click.

After, the reasoning changes hands. The visitor's own agent, with their model, their context, and their skepticism, asks ElijahOS for evidence instead of touring the site or trusting the house assistant. `search_evidence` and `inspect_evidence` return typed records: claim, source, Elijah's documented contribution, provenance, and limitations. The summary is grounded in fields, not adjectives. `compose_workspace` then opens the case study beside its architecture diagram and the running app it describes, arranged for the question. Side by side for a comparison, one window maximized for a deep read. The hiring manager sees the real thing in its native context in one exchange, and the agent's brief is visible on the page, so they can see what it was asked to optimize for and edit it.

What improves, specifically:

- **Faster.** One exchange replaces a navigation tour, because the agent queries concepts, not screens.
- **Clearer.** Evidence arrives as it was made: an architecture diagram, a running app, a documented decision, laid out in the OS rather than flattened into scraped text. Design and front-end craft are shown by the site working, not described. The agent's objective is visible instead of hidden in a chat window.
- **Safer.** The brief lives in the browser session. It can be edited or cleared, and it is never sent to a server, analytics, or another model. Pasted role text is treated as untrusted input. Three tools are read-only, and the two that change the page do only visible, labeled things. Nothing scores anyone.
- **More trustworthy.** The site no longer reasons about itself. Every record carries provenance and contribution scope, “no public evidence found” is a first-class result rather than a blank the agent fills in, and the hiring judgment stays with the person and the agent they already trust.

The agent's experience improves too. Tool descriptions are written for an intelligent actor, outputs are structured, and empty results are typed, which means less guessing and fewer failure modes. And none of it needs a backend. The tool loop that used to run through my server now runs in the page, from the same canonical sources, while desktop and mobile work exactly as before when no agent is present.

**Current status:** Narrative approved; final answer blocked on shipped evidence.

**Evidence gate:**

- [x] Baseline repository text documents Ask Elijah and its exclusion from this challenge checkout.
- [ ] Real WebMCP run uses no ElijahOS model, server call, or key.
- [ ] `inspect_evidence` returns the fields named in the answer.
- [ ] `compose_workspace` visibly produces the layouts named in the answer, or the copy is narrowed.
- [ ] Human intent controls and documented-gap state are visible.
- [ ] Shipped annotations match the stated read/write split.
- [ ] No new server route is present in the challenge diff.
- [ ] Desktop and mobile remain usable without WebMCP.

### Question 3 — “Describe what people and agents can do together that was difficult or impossible before”

**Working answer — locked August 30; rewrite only to match shipped evidence**

A person could do all of this by hand. They could open every window, read every case study, and keep the job description in another tab. What they could not do is share that work with their own agent on the same page.

Before, the two halves of an evaluation lived apart. The agent had the role, the notes, and the other candidates, but it saw the site as scraped text or a screenshot and could not touch it. The person worked in the browser and carried findings back and forth by hand.

Now three things meet on one page: the agent's private context, the site's ground truth, and the person's judgment. The hiring manager asks their agent whether I actually shipped something real end to end, what I personally owned, and one thing it can't verify. The agent gives ElijahOS a short brief the person can see and edit, searches the evidence, and lays the ElijahOS case study out beside its architecture diagram and the running app it describes. Then the person does something the agent did not plan. They open a second project on their own. The agent reads the workspace, notices, and answers from what is now open: that project is still in flight, there is no public record of what I owned there, and it says so.

That handoff is the new capability. An agent could always look at a screenshot. It could not read which evidence the person focused as data and continue from there. The person never leaves the page, never pastes anything, and never gets a verdict. They get a workspace the two of them built together, and the decision is still theirs.

**Current status:** Narrative approved; final answer blocked on the recorded reverse-handoff proof.

**Evidence gate:**

- [ ] The flagship prompt produces the claimed tool sequence in a supported browser.
- [ ] The agent composes the claimed ElijahOS evidence and running application.
- [ ] A person opens Glyph through the normal interface with no tool call.
- [ ] `get_workspace_state` reports the human-selected evidence id and no unrelated state.
- [ ] Glyph returns a truthful documented contribution gap.
- [ ] The final agent response contains evidence and uncertainty, not a hiring verdict.
- [ ] Baseline provenance explains what typed state adds beyond a screenshot or DOM read.

### Question 4 — “Briefly explain how you implemented WebMCP”

**Working answer — implementation target; rewrite after the build**

ElijahOS adds one client-side WebMCP adapter and no server. On load it feature-detects the WebMCP API and registers five tools; when the API is absent the site is unchanged. The tools sit on a small evidence layer, a set of pure functions that turn the site's existing typed content—projects, case studies, experience, and public answers—into records with stable ids, provenance, contribution scope, and limitations. Read-only tools return that JSON. The two tools that change the page use the shell's own actions: `compose_workspace` opens and arranges apps through the desktop store's existing grid, snap, and focus behavior, and through the mobile opener on phones. `set_visit_intent` writes a brief into a session-only store the person can see, edit, and clear. `get_workspace_state` reads back open apps, the focused evidence id, and that brief, and nothing else. Contract tests cover schemas, annotations, and side effects; a browser check covers discovery and progressive enhancement; an eval suite checks that realistic prompts pick the right tools. The shell, apps, and content model predate the challenge and are tagged `challenge-baseline`; the adapter, evidence layer, focus state, intent store, and tests are the diff.

**Current status:** Architecture direction approved; this answer is not approved as shipped copy until the code and evidence exist.

**Evidence gate:**

- [ ] Link to the actual top-level adapter and confirm no new server route.
- [ ] Confirm feature detection and normal behavior without WebMCP.
- [ ] Match the named tool count, schemas, annotations, and side effects to the shipped code.
- [ ] Link to the pure evidence layer and focused tests.
- [ ] Confirm composition uses existing desktop/mobile application seams.
- [ ] Confirm visit intent is session-only, visible, editable, and clearable.
- [ ] Confirm workspace output contains only the documented public keys.
- [ ] Record `npm run verify`, `npm run build`, focused Playwright, and eval results.
- [ ] Link the public `challenge-baseline` tag and document the post-baseline file diff.

## 4. Final submission evidence

This is the compact evidence set that must support the four answers.

| Evidence | Required result | Status |
| --- | --- | --- |
| Baseline provenance | Public `challenge-baseline` and meaningful post-baseline diff | Baseline exists; public verification pending |
| Tool discovery | Exact shipped tools visible in a supported browser | Not verified |
| Tool execution | Complete flagship loop with visible page effects | Not verified |
| Privacy boundary | Session-only brief; narrow workspace output; no backend/model/key | Not verified |
| Neutral evidence | Provenance, contribution scope, limitation, and real gap | Not verified |
| Progressive enhancement | Desktop and mobile work without WebMCP | Not verified after challenge changes |
| Verification | `npm run verify`, `npm run build`, and focused browser checks pass | Not run on a challenge implementation |
| Live application | Anonymous HTTPS access and supported-browser test | Not deployed |
| Public repository | Anonymous access, source/instructions present, MIT detected | Private |
| Demo video | Public YouTube, audio, under three minutes, matches build | Not recorded |
| Submission | All fields complete and confirmation captured | Not submitted |

## 5. Final copy freeze

- [ ] Re-check the live Official Rules, Resources/FAQ, Updates, and submission form.
- [ ] Replace every “not verified” status above with current evidence or narrow the affected answer.
- [ ] Confirm the live URL, repository, and video anonymously.
- [ ] Confirm no answer claims that the pre-challenge shell was built during the challenge.
- [ ] Confirm no answer or tool returns a score, ranking, or hiring recommendation.
- [ ] Confirm the video contains no unapproved music, employer/client material, or private information.
- [ ] Confirm the exact submitted app, repository commit/tag, video, and answer text.
- [ ] Submit and capture confirmation before the internal target.

