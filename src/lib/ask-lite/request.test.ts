import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAskMessages } from "./request";

test("drops a leading assistant turn after truncating to the newest ten messages", () => {
  const messages = Array.from({ length: 11 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message ${index}`,
  }));

  const result = normalizeAskMessages(messages);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.messages.length, 9);
  assert.equal(result.messages[0].role, "user");
  assert.equal(result.messages.at(-1)?.content, "message 10");
});

test("rejects input that is not a message array", () => {
  assert.deepEqual(normalizeAskMessages({ messages: [] }), {
    ok: false,
    error: "messages must be an array",
  });
});

test("rejects a message over 2,000 characters", () => {
  assert.deepEqual(
    normalizeAskMessages([{ role: "user", content: "x".repeat(2_001) }]),
    {
      ok: false,
      error: "message 0 exceeds 2000 characters",
    },
  );
});

test("rejects more than 8,000 total characters", () => {
  assert.deepEqual(
    normalizeAskMessages([
      { role: "user", content: "a".repeat(2_000) },
      { role: "assistant", content: "b".repeat(2_000) },
      { role: "user", content: "c".repeat(2_000) },
      { role: "assistant", content: "d".repeat(2_000) },
      { role: "user", content: "e" },
    ]),
    {
      ok: false,
      error: "messages exceed 8000 total characters",
    },
  );
});

test("rejects non-alternating roles", () => {
  assert.deepEqual(
    normalizeAskMessages([
      { role: "user", content: "one" },
      { role: "user", content: "two" },
    ]),
    {
      ok: false,
      error: "messages must alternate between user and assistant",
    },
  );
});

test("requires a final non-empty user message", () => {
  assert.deepEqual(
    normalizeAskMessages([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ]),
    {
      ok: false,
      error: "latest message must be a non-empty user message",
    },
  );
  assert.deepEqual(normalizeAskMessages([{ role: "user", content: "   " }]), {
    ok: false,
    error: "latest message must be a non-empty user message",
  });
});

test("normalizes only role and content fields", () => {
  assert.deepEqual(
    normalizeAskMessages([
      { role: "user", content: " hello ", id: "not-forwarded", extra: true },
    ]),
    {
      ok: true,
      messages: [{ role: "user", content: "hello" }],
    },
  );
});
