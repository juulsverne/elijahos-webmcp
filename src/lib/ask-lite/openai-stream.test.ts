import assert from "node:assert/strict";
import test from "node:test";

import { streamOpenAIAnswer } from "./openai-stream";

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

async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const values: string[] = [];
  for await (const value of stream) values.push(value);
  return values;
}

test("sends a non-stored low-verbosity Responses request and yields text deltas", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return streamResponse([
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":" there"}\n\n',
      'event: response.completed\ndata: {"type":"response.completed","response":{"status":"completed"}}\n\n',
    ]);
  };

  const values = await collect(
    streamOpenAIAnswer({
      apiKey: "test-key",
      model: "gpt-5.6-luna",
      instructions: "grounded",
      messages: [{ role: "user", content: "Who is Elijah?" }],
      fetchImpl,
    }),
  );

  assert.deepEqual(values, ["Hello", " there"]);
  assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
  const body = JSON.parse(String(capturedInit?.body));
  assert.deepEqual(body, {
    model: "gpt-5.6-luna",
    instructions: "grounded",
    input: [{ role: "user", content: "Who is Elijah?" }],
    stream: true,
    store: false,
    reasoning: { effort: "none" },
    text: { verbosity: "low" },
    max_output_tokens: 700,
  });
  assert.equal(
    new Headers(capturedInit?.headers).get("authorization"),
    "Bearer test-key",
  );
});

test("parses provider frames split across transport chunks", async () => {
  const fetchImpl: typeof fetch = async () =>
    streamResponse([
      'data: {"type":"response.output_text.',
      'delta","delta":"split"}\n\n',
      'data: {"type":"response.completed","response":{"status":"completed"}}\n\n',
    ]);

  const values = await collect(
    streamOpenAIAnswer({
      apiKey: "test-key",
      model: "gpt-5.6-luna",
      instructions: "grounded",
      messages: [{ role: "user", content: "Question" }],
      fetchImpl,
    }),
  );

  assert.deepEqual(values, ["split"]);
});

test("sanitizes non-success provider responses", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response("provider-secret-payload", { status: 401 });

  await assert.rejects(
    collect(
      streamOpenAIAnswer({
        apiKey: "test-key",
        model: "gpt-5.6-luna",
        instructions: "grounded",
        messages: [{ role: "user", content: "Question" }],
        fetchImpl,
      }),
    ),
    (error: Error) => {
      assert.equal(error.message, "OpenAI request failed (401)");
      assert.doesNotMatch(error.message, /provider-secret-payload/);
      return true;
    },
  );
});

test("turns provider failure events into a safe error", async () => {
  const fetchImpl: typeof fetch = async () =>
    streamResponse([
      'data: {"type":"response.failed","response":{"error":{"message":"private provider detail"}}}\n\n',
    ]);

  await assert.rejects(
    collect(
      streamOpenAIAnswer({
        apiKey: "test-key",
        model: "gpt-5.6-luna",
        instructions: "grounded",
        messages: [{ role: "user", content: "Question" }],
        fetchImpl,
      }),
    ),
    (error: Error) => {
      assert.equal(error.message, "OpenAI could not complete the answer");
      assert.doesNotMatch(error.message, /private provider detail/);
      return true;
    },
  );
});

test("rejects a completed response with no answer text", async () => {
  const fetchImpl: typeof fetch = async () =>
    streamResponse([
      'data: {"type":"response.completed","response":{"status":"completed"}}\n\n',
    ]);

  await assert.rejects(
    collect(
      streamOpenAIAnswer({
        apiKey: "test-key",
        model: "gpt-5.6-luna",
        instructions: "grounded",
        messages: [{ role: "user", content: "Question" }],
        fetchImpl,
      }),
    ),
    /OpenAI returned no answer/,
  );
});

