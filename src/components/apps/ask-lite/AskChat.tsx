"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { streamAskLite } from "@/lib/ask-lite/stream-client";
import type { AskChatMessage, AskSource } from "@/lib/ask-lite/types";

type DisplayMessage = AskChatMessage & {
  id: string;
  sources?: AskSource[];
  unmatchedTerms?: string[];
};

const SUGGESTIONS = [
  "What makes Elijah useful on an AI team?",
  "What is Elijah building now?",
  "How does ElijahOS use WebMCP?",
  "How can I contact Elijah?",
] as const;

const DEFAULT_ERROR = "Ask Elijah could not answer right now. Please try again.";

function messageId(role: AskChatMessage["role"]): string {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AskChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stayPinnedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!stayPinnedRef.current) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const updateAssistant = (
    id: string,
    update: (message: DisplayMessage) => DisplayMessage,
  ) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? update(message) : message)),
    );
  };

  const send = async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt || busy) return;

    const userMessage: DisplayMessage = {
      id: messageId("user"),
      role: "user",
      content: prompt,
    };
    const assistantId = messageId("assistant");
    const assistantMessage: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    const requestMessages: AskChatMessage[] = [
      ...messages
        .filter((message) => message.content.trim())
        .map(({ role, content }) => ({ role, content })),
      { role: "user", content: prompt },
    ];

    setDraft("");
    setError(null);
    setBusy(true);
    stayPinnedRef.current = true;
    setMessages((current) => [...current, userMessage, assistantMessage]);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    let streamReportedError = false;

    try {
      await streamAskLite(
        requestMessages,
        {
          onSources: (sources, unmatchedTerms) =>
            updateAssistant(assistantId, (message) => ({
              ...message,
              sources,
              unmatchedTerms,
            })),
          onToken: (content) =>
            updateAssistant(assistantId, (message) => ({
              ...message,
              content: message.content + content,
            })),
          onError: (message) => {
            streamReportedError = true;
            setError(message);
          },
        },
        controller.signal,
      );
    } catch (streamError) {
      if (
        !streamReportedError &&
        !(streamError instanceof DOMException && streamError.name === "AbortError")
      ) {
        setError(DEFAULT_ERROR);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <div className="ask-chat">
      <div
        ref={listRef}
        className="ask-msglist"
        aria-live="polite"
        onScroll={(event) => {
          const list = event.currentTarget;
          stayPinnedRef.current =
            list.scrollHeight - list.scrollTop - list.clientHeight < 48;
        }}
      >
        {messages.length === 0 ? (
          <div className="ask-empty">
            <p>
              Ask about Elijah&apos;s work, operating style, current projects, or
              contact details. Answers stay grounded in evidence published on this
              site.
            </p>
            <div className="ask-suggestions" aria-label="Suggested questions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="ask-suggestion"
                  disabled={busy}
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isPending =
              busy &&
              message.role === "assistant" &&
              message.id === messages[messages.length - 1]?.id;
            const isThinking = isPending && !message.content;
            return (
            <article
              key={message.id}
              className="ask-message"
              data-role={message.role}
            >
              <span className="ask-message-label">
                {message.role === "user" ? "you" : "ask-elijah"}
              </span>
              <div
                className={`ask-bubble${isPending ? " ask-bubble-pending" : ""}${
                  isThinking ? " ask-bubble-thinking" : ""
                }`}
              >
                {isThinking ? (
                  <span className="ask-thinking">
                    <span>Reviewing the public record</span>
                    <span className="ask-thinking-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                ) : (
                  message.content
                )}
              </div>
              {message.role === "assistant" && message.sources?.length ? (
                <div className="ask-sources" aria-label="Public sources">
                  {message.sources.map((source, index) => (
                    <article className="ask-source" key={source.id}>
                      <a href={source.canonicalPath}>
                        [{index + 1}] {source.title}
                      </a>
                      <p>{source.claim}</p>
                      <dl>
                        <div>
                          <dt>provenance</dt>
                          <dd>{source.provenance.type}</dd>
                        </div>
                        <div>
                          <dt>scope</dt>
                          <dd>{source.contributionScope}</dd>
                        </div>
                        {source.limitations[0] ? (
                          <div>
                            <dt>limit</dt>
                            <dd>{source.limitations[0]}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  ))}
                </div>
              ) : null}
              {message.role === "assistant" && message.unmatchedTerms?.length ? (
                <p className="ask-gap">
                  No published match for: {message.unmatchedTerms.join(", ")}.
                </p>
              ) : null}
            </article>
            );
          })
        )}
        {error ? (
          <p className="ask-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <form className="ask-input" onSubmit={submit}>
        <label className="sr-only" htmlFor="ask-elijah-input">
          Ask Elijah about his public work
        </label>
        <input
          id="ask-elijah-input"
          value={draft}
          maxLength={2_000}
          autoComplete="off"
          placeholder="ask Elijah about his public work"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="btn-primary ask-send"
          type="submit"
          aria-label="send"
          disabled={busy || !draft.trim()}
        >
          {busy ? "…" : "send"}
        </button>
      </form>
    </div>
  );
}
