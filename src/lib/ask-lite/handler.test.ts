import assert from "node:assert/strict";
import test from "node:test";

import { handleAskRequest, type AskHandlerDeps } from "./handler";

function askRequest(messages: unknown): Request {
  return new Request("http://localhost/api/ask/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

function deps(
  options: {
    deltas?: string[];
    providerError?: Error;
    apiKey?: string;
    allowRequest?: boolean;
    allowGeneration?: boolean;
    onGenerate?: () => void;
  } = {},
): AskHandlerDeps {
  return {
    apiKey: options.apiKey ?? "test-key",
    model: "gpt-5.6-luna",
    consumeRequest: () => options.allowRequest ?? true,
    consumeGeneration: () => options.allowGeneration ?? true,
    streamAnswer: async function* () {
      options.onGenerate?.();
      if (options.providerError) throw options.providerError;
      for (const delta of options.deltas ?? ["Grounded answer [1]"]) {
        yield delta;
      }
    },
  };
}

function eventTypes(body: string): string[] {
  return body
    .split("\n\n")
    .map((frame) => frame.split("\n").find((line) => line.startsWith("data:")))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice(5).trim()).type as string);
}

test("streams sources before answer tokens and terminates with done", async () => {
  const response = await handleAskRequest(
    askRequest([{ role: "user", content: "Who is Elijah?" }]),
    deps({ deltas: ["Grounded", " answer [1]"] }),
  );
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.deepEqual(eventTypes(body), ["sources", "token", "token", "done"]);
  assert.ok(body.indexOf('"type":"sources"') < body.indexOf('"type":"token"'));
  assert.match(body, /Grounded/);
});

test("uses a deterministic evidence gap without invoking generation", async () => {
  let generated = false;
  const response = await handleAskRequest(
    askRequest([{ role: "user", content: "kubernetes certification" }]),
    deps({ onGenerate: () => (generated = true) }),
  );
  const body = await response.text();

  assert.equal(generated, false);
  assert.deepEqual(eventTypes(body), ["sources", "token", "done"]);
  assert.match(body, /not documented/i);
});

test("uses a deterministic greeting without consuming the generation budget", async () => {
  let generationBudgetChecked = false;
  const base = deps({ onGenerate: () => assert.fail("provider should not run") });
  const response = await handleAskRequest(
    askRequest([{ role: "user", content: "hello" }]),
    {
      ...base,
      consumeGeneration: () => {
        generationBudgetChecked = true;
        return true;
      },
    },
  );

  assert.equal(generationBudgetChecked, false);
  assert.match(await response.text(), /site-owned guide/i);
});

test("returns JSON errors for invalid input and request limits", async () => {
  const invalid = await handleAskRequest(
    askRequest([{ role: "assistant", content: "not a user turn" }]),
    deps(),
  );
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), {
    ok: false,
    error: "latest message must be a non-empty user message",
  });

  const limited = await handleAskRequest(
    askRequest([{ role: "user", content: "Who is Elijah?" }]),
    deps({ allowRequest: false }),
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
});

test("streams a safe configuration error when the API key is absent", async () => {
  const response = await handleAskRequest(
    askRequest([{ role: "user", content: "Who is Elijah?" }]),
    deps({ apiKey: " " }),
  );
  const body = await response.text();

  assert.deepEqual(eventTypes(body), ["sources", "error", "done"]);
  assert.match(body, /not configured/i);
});

test("streams a safe busy error when the generation cap is exhausted", async () => {
  const response = await handleAskRequest(
    askRequest([{ role: "user", content: "Who is Elijah?" }]),
    deps({ allowGeneration: false }),
  );
  const body = await response.text();

  assert.deepEqual(eventTypes(body), ["sources", "error", "done"]);
  assert.match(body, /busy/i);
});

test("does not expose provider error details to the browser", async () => {
  const response = await handleAskRequest(
    askRequest([{ role: "user", content: "Who is Elijah?" }]),
    deps({ providerError: new Error("provider-secret-detail") }),
  );
  const body = await response.text();

  assert.deepEqual(eventTypes(body), ["sources", "error", "done"]);
  assert.doesNotMatch(body, /provider-secret-detail/);
  assert.match(body, /could not finish/i);
});

