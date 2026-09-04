import type { AskChatMessage, AskRole } from "./types";

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_TOTAL_CHARS = 8_000;

export type NormalizeAskMessagesResult =
  | { ok: true; messages: AskChatMessage[] }
  | { ok: false; error: string };

function isRole(value: unknown): value is AskRole {
  return value === "user" || value === "assistant";
}

export function normalizeAskMessages(raw: unknown): NormalizeAskMessagesResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "messages must be an array" };
  }

  const messages: AskChatMessage[] = [];
  let totalChars = 0;

  for (const [index, item] of raw.slice(-MAX_MESSAGES).entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: `message ${index} must be an object` };
    }

    const candidate = item as Record<string, unknown>;
    if (!isRole(candidate.role)) {
      return { ok: false, error: `message ${index} has an invalid role` };
    }
    if (typeof candidate.content !== "string") {
      return { ok: false, error: `message ${index} content must be a string` };
    }
    if (candidate.content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        error: `message ${index} exceeds ${MAX_MESSAGE_CHARS} characters`,
      };
    }

    totalChars += candidate.content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return {
        ok: false,
        error: `messages exceed ${MAX_TOTAL_CHARS} total characters`,
      };
    }

    messages.push({
      role: candidate.role,
      content: candidate.content.trim(),
    });
  }

  while (messages[0]?.role === "assistant") messages.shift();

  for (let index = 1; index < messages.length; index += 1) {
    if (messages[index].role === messages[index - 1].role) {
      return {
        ok: false,
        error: "messages must alternate between user and assistant",
      };
    }
  }

  const latest = messages.at(-1);
  if (latest?.role !== "user" || !latest.content) {
    return {
      ok: false,
      error: "latest message must be a non-empty user message",
    };
  }

  return { ok: true, messages };
}

