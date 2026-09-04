import { readJsonBody } from "@/lib/request-body";
import { buildAskContext, deterministicAskAnswer } from "./context";
import { buildAskInstructions } from "./prompt";
import { normalizeAskMessages } from "./request";
import type { AskChatMessage, AskStreamEvent } from "./types";

const MAX_BODY_BYTES = 24_000;

type StreamAnswerArgs = {
  apiKey: string;
  model: string;
  instructions: string;
  messages: AskChatMessage[];
  signal?: AbortSignal;
};

export type AskHandlerDeps = {
  apiKey: string;
  model: string;
  consumeRequest: (request: Request) => boolean;
  consumeGeneration: () => boolean;
  streamAnswer: (args: StreamAnswerArgs) => AsyncIterable<string>;
};

function jsonError(message: string, status: number, headers?: HeadersInit): Response {
  return Response.json(
    { ok: false, error: message },
    { status, headers },
  );
}

function sse(event: AskStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function handleAskRequest(
  request: Request,
  deps: AskHandlerDeps,
): Promise<Response> {
  if (!deps.consumeRequest(request)) {
    return jsonError("rate limit exceeded", 429, { "Retry-After": "60" });
  }

  const parsed = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES });
  if (!parsed.ok) return jsonError(parsed.error, parsed.status);

  const rawMessages =
    parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value)
      ? (parsed.value as { messages?: unknown }).messages
      : undefined;
  const normalized = normalizeAskMessages(rawMessages);
  if (!normalized.ok) return jsonError(normalized.error, 400);

  const latestQuery = normalized.messages.at(-1)?.content ?? "";
  const context = buildAskContext(latestQuery);
  const deterministic = deterministicAskAnswer(latestQuery, context);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      closed = true;
    },
    async start(controller) {
      const emit = (event: AskStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sse(event)));
        } catch {
          closed = true;
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // The browser can disconnect between the flag check and close.
        }
      };

      emit({
        type: "sources",
        sources: context.sources,
        unmatchedTerms: context.unmatchedTerms,
      });

      if (deterministic) {
        emit({ type: "token", content: deterministic });
        emit({ type: "done" });
        finish();
        return;
      }

      if (!deps.apiKey.trim()) {
        emit({
          type: "error",
          message: "Ask Elijah is not configured for this deployment.",
        });
        emit({ type: "done" });
        finish();
        return;
      }

      if (!deps.consumeGeneration()) {
        emit({
          type: "error",
          message: "Ask Elijah is busy right now. Please try again shortly.",
        });
        emit({ type: "done" });
        finish();
        return;
      }

      try {
        for await (const content of deps.streamAnswer({
          apiKey: deps.apiKey,
          model: deps.model,
          instructions: buildAskInstructions(context),
          messages: normalized.messages,
          signal: request.signal,
        })) {
          if (request.signal.aborted || closed) break;
          emit({ type: "token", content });
        }

        if (!request.signal.aborted && !closed) emit({ type: "done" });
      } catch {
        emit({
          type: "error",
          message: "Ask Elijah could not finish that answer. Please try again.",
        });
        emit({ type: "done" });
      } finally {
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

