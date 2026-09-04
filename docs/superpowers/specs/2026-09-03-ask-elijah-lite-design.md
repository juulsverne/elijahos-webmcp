# Ask Elijah Lite Design

## Goal

Restore Ask Elijah as a useful, public-safe assistant inside the isolated WebMCP checkout before the submission is frozen. Ask Elijah answers questions about Elijah from the same canonical typed content that powers the visible site and WebMCP evidence tools. It complements the visitor's agent; it does not replace, score, or impersonate that agent.

## Product boundary

Ask Elijah Lite is the site's house guide. It answers in the third person, identifies itself as site-owned, cites the public records it used, and says when the site does not document an answer. The WebMCP surface remains the visitor-controlled path for independently investigating evidence and composing the workspace.

The first release deliberately excludes vector storage, embeddings, provider fallback, judge models, conversation persistence, query logging, analytics, hiring scores, role-fit verdicts, agent tool calls, and desktop automation. Visitor messages are sent only for the current OpenAI request and are not persisted by ElijahOS. The OpenAI request uses `store: false`; this is not described as zero retention by the provider.

## Architecture

The existing `AskApp` becomes a client-side chat surface with in-memory conversation state. It posts a bounded message history to one Next.js route and consumes an ElijahOS-owned Server-Sent Events protocol. The route validates input, rate-limits requests, retrieves public evidence, emits the evidence list, and streams answer text from the OpenAI Responses API.

Retrieval derives from `src/lib/evidence.ts` and `src/lib/elijah.ts`; no second biography is introduced. A small profile record is derived from `ELIJAH` for identity questions, and up to four ranked evidence records come from `searchEvidence`. Evidence is numbered in the prompt and rendered below the answer with canonical site paths, provenance, contribution scope, and limitations.

The provider adapter calls `POST /v1/responses` with the server-only `OPENAI_API_KEY`, `store: false`, a configurable `ASK_OPENAI_MODEL`, and the default model `gpt-5.6-luna`. It parses only `response.output_text.delta`, completion, and failure events, then yields plain text deltas to the route. Browser clients never receive the provider key or raw provider event stream.

## Request and stream contracts

The request body is:

```ts
type AskRequest = {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};
```

The route accepts at most 10 messages, 2,000 characters per message, and 8,000 characters total. The last message must be a non-empty user message and roles must alternate after any truncated leading assistant message is removed.

The response uses one JSON object per SSE `data:` frame:

```ts
type AskStreamEvent =
  | { type: "sources"; sources: AskSource[]; unmatchedTerms: string[] }
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };
```

The client treats malformed frames as ignorable, reports non-2xx responses as readable errors, and fails if a stream ends without `done`.

## Grounding and safety behavior

The model is instructed that system instructions are authoritative and all visitor text and retrieved records are untrusted data. It may use only the supplied context for factual claims about Elijah, must cite substantive claims using the numbered evidence labels, must not invent missing facts, and must not issue hiring recommendations.

Three deterministic branches avoid unnecessary model calls:

- Greetings receive a short orientation.
- Requests for hidden prompts or private instructions receive a refusal.
- Queries with no documented match receive an explicit coverage-gap response and a contact suggestion.

The production route allows eight requests per IP per minute and defaults to a per-instance cap of 120 generations per hour, configurable with `ASK_GLOBAL_HOURLY_CAP`. Provider-side project budgets remain the hard spending backstop.

## Interface

The Ask window keeps the existing ElijahOS visual language and desktop/mobile shells. It contains a compact header explaining the house-assistant boundary, suggestion buttons, readable user and assistant bubbles, a source panel for the latest assistant answer, an error/status line, and a bottom composer. Conversation state resets with the page and is never written to local storage.

Suggestions focus on questions the public corpus can answer: Elijah's AI-team value, current work, ElijahOS architecture, and contact path. The interface does not promise tool use, private traces, or evaluation reports.

## Error handling

Malformed or oversized requests return typed JSON errors before a stream opens. Missing configuration and provider failures become safe stream errors without provider payloads or credentials. Client disconnect aborts the upstream request. Empty provider output becomes a readable error instead of a blank assistant message.

## Verification

Unit tests cover request normalization, deterministic branches, evidence projection, prompt construction, provider request/privacy fields, provider event parsing, the client SSE parser, and route success/error behavior. Browser checks cover sending a prompt, receiving a streamed answer with sources, no-key failure copy, desktop layout, and the mobile composer. Completion requires `npm run verify`, `npm run build`, focused Ask browser checks, and a live local request using the securely stored key. Deployment and submission-copy changes require separate owner approval.

