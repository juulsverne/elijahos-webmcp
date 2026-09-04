"use client";

import type { AskChatMessage, AskSource } from "./types";

export type AskStreamCallbacks = {
  onSources: (sources: AskSource[], unmatchedTerms: string[]) => void;
  onToken: (content: string) => void;
  onError: (message: string) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAskSource(value: unknown): value is AskSource {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.canonicalPath === "string" &&
    typeof value.claim === "string" &&
    Array.isArray(value.limitations)
  );
}

function parseFrame(frame: string): Record<string, unknown> | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();
  if (!data) return null;

  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? parsed : null;
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

async function routeError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      isRecord(payload) &&
      typeof payload.error === "string" &&
      payload.error.trim()
    ) {
      return payload.error;
    }
  } catch {
    // Fall through to the status-only message.
  }
  return `Ask request failed (${response.status})`;
}

export async function consumeAskStream(
  response: Response,
  callbacks: AskStreamCallbacks,
): Promise<void> {
  if (!response.ok || !response.body) {
    const message = await routeError(response);
    callbacks.onError(message);
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  const handle = (frame: string): "done" | void => {
    const event = parseFrame(frame);
    if (!event || typeof event.type !== "string") return;

    if (event.type === "sources" && Array.isArray(event.sources)) {
      const sources = event.sources.filter(isAskSource);
      const unmatchedTerms = Array.isArray(event.unmatchedTerms)
        ? event.unmatchedTerms.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      callbacks.onSources(sources, unmatchedTerms);
      return;
    }

    if (event.type === "token" && typeof event.content === "string") {
      callbacks.onToken(event.content);
      return;
    }

    if (event.type === "error") {
      const message =
        typeof event.message === "string" && event.message.trim()
          ? event.message
          : "Ask Elijah returned an error";
      callbacks.onError(message);
      throw new Error(message);
    }

    if (event.type === "done") return "done";
  };

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
        if (handle(framed.frame) === "done") {
          completed = true;
          break;
        }
        framed = takeFrame(buffer);
      }

      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (!completed) throw new Error("Ask stream ended before done");
}

export async function streamAskLite(
  messages: AskChatMessage[],
  callbacks: AskStreamCallbacks,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl("/api/ask/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ask request could not start";
    callbacks.onError(message);
    throw error;
  }

  return consumeAskStream(response, callbacks);
}

