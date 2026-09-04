import "server-only";

import type { AskChatMessage } from "./types";

type OpenAIStreamArgs = {
  apiKey: string;
  model: string;
  instructions: string;
  messages: AskChatMessage[];
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

type ProviderEvent = {
  type?: unknown;
  delta?: unknown;
};

function parseProviderFrame(frame: string): ProviderEvent | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") return null;

  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === "object"
      ? (parsed as ProviderEvent)
      : null;
  } catch {
    return null;
  }
}

function takeFrame(buffer: string): { frame: string; rest: string } | null {
  const separator = /\r?\n\r?\n/.exec(buffer);
  if (!separator || separator.index === undefined) return null;
  return {
    frame: buffer.slice(0, separator.index),
    rest: buffer.slice(separator.index + separator[0].length),
  };
}

export async function* streamOpenAIAnswer(
  args: OpenAIStreamArgs,
): AsyncGenerator<string> {
  const apiKey = args.apiKey.trim();
  if (!apiKey) throw new Error("OpenAI is not configured");

  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      instructions: args.instructions,
      input: args.messages,
      stream: true,
      store: false,
      reasoning: { effort: "none" },
      text: { verbosity: "low" },
      max_output_tokens: 700,
    }),
    signal: args.signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }
  if (!response.body) {
    throw new Error("OpenAI returned no response stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  let emittedText = false;

  try {
    while (!completed) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
      } else {
        buffer += decoder.decode(value, { stream: true });
      }

      let framed = takeFrame(buffer);
      while (framed) {
        buffer = framed.rest;
        const event = parseProviderFrame(framed.frame);
        if (event?.type === "response.output_text.delta") {
          if (typeof event.delta === "string" && event.delta) {
            emittedText = true;
            yield event.delta;
          }
        } else if (event?.type === "response.completed") {
          completed = true;
          break;
        } else if (
          event?.type === "response.failed" ||
          event?.type === "response.incomplete"
        ) {
          throw new Error("OpenAI could not complete the answer");
        }
        framed = takeFrame(buffer);
      }

      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (!completed) {
    throw new Error("OpenAI stream ended before completion");
  }
  if (!emittedText) {
    throw new Error("OpenAI returned no answer");
  }
}

