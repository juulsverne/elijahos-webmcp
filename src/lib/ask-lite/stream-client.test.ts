import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeAskStream,
  streamAskLite,
  type AskStreamCallbacks,
} from "./stream-client";
import type { AskSource } from "./types";

function streamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    {
      status,
      headers: { "Content-Type": "text/event-stream" },
    },
  );
}

const source: AskSource = {
  id: "profile:summary",
  kind: "profile",
  title: "Profile summary",
  claim: "Elijah is an AI Transformation Engineer.",
  canonicalPath: "/about",
  sourceLabel: "src/lib/elijah.ts — profile",
  contributionScope: "Candidate-authored profile.",
  provenance: {
    type: "candidate-authored",
    label: "Published profile",
    updated: "2026-09-03",
  },
  limitations: ["Candidate-authored."],
  matchedTerms: [],
};

function callbacks(seen: string[]): AskStreamCallbacks {
  return {
    onSources: (sources) => seen.push(`sources:${sources[0]?.id}`),
    onToken: (value) => seen.push(value),
    onError: (message) => seen.push(`error:${message}`),
  };
}

test("delivers split SSE frames to source and token callbacks", async () => {
  const seen: string[] = [];
  const payload = JSON.stringify({
    type: "sources",
    sources: [source],
    unmatchedTerms: [],
  });

  await consumeAskStream(
    streamResponse([
      `data: ${payload.slice(0, 30)}`,
      `${payload.slice(30)}\n\n`,
      'data: {"type":"token","content":"Hello"}\n\n',
      'data: {"type":"token","content":" world"}\n\n',
      'data: {"type":"done"}\n\n',
    ]),
    callbacks(seen),
  );

  assert.deepEqual(seen, ["sources:profile:summary", "Hello", " world"]);
});

test("ignores malformed and unknown frames without losing the stream", async () => {
  const seen: string[] = [];

  await consumeAskStream(
    streamResponse([
      "data: not-json\n\n",
      'data: {"type":"future_event","value":1}\n\n',
      'data: {"type":"token","content":"kept"}\n\n',
      'data: {"type":"done"}\n\n',
    ]),
    callbacks(seen),
  );

  assert.deepEqual(seen, ["kept"]);
});

test("reports a stream error event and rejects", async () => {
  const seen: string[] = [];

  await assert.rejects(
    consumeAskStream(
      streamResponse([
        'data: {"type":"error","message":"Ask is busy"}\n\n',
        'data: {"type":"done"}\n\n',
      ]),
      callbacks(seen),
    ),
    /Ask is busy/,
  );
  assert.deepEqual(seen, ["error:Ask is busy"]);
});

test("rejects a stream that ends without done", async () => {
  const seen: string[] = [];

  await assert.rejects(
    consumeAskStream(
      streamResponse(['data: {"type":"token","content":"partial"}\n\n']),
      callbacks(seen),
    ),
    /ended before done/i,
  );
  assert.deepEqual(seen, ["partial"]);
});

test("posts the bounded history and surfaces JSON route errors", async () => {
  let capturedBody = "";
  const fetchImpl: typeof fetch = async (_input, init) => {
    capturedBody = String(init?.body);
    return Response.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429 },
    );
  };
  const messages = [{ role: "user" as const, content: "Who is Elijah?" }];
  const seen: string[] = [];

  await assert.rejects(
    streamAskLite(messages, callbacks(seen), undefined, fetchImpl),
    /rate limit exceeded/,
  );
  assert.deepEqual(JSON.parse(capturedBody), { messages });
  assert.deepEqual(seen, ["error:rate limit exceeded"]);
});

