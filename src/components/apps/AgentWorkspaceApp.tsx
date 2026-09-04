"use client";

// Agent workspace — the visible face of the WebMCP tool surface, where a
// visitor and their AI agent browse this site together.
//
// Three jobs:
// 1. Show the visit intent (typed, pulled from a job posting link, taken
//    from a quick-start preset, or set by an agent via set_visit_intent),
//    with edit and clear controls, and compare each priority against the
//    documented evidence — explicit gaps included. The workspace works
//    fully without any agent.
// 2. Show which agent tools this page registers (with honest read-only /
//    acts badges) and whether the current browser supports WebMCP at all.
// 3. Log every tool invocation agents make, live, so nothing happens in
//    this browser that the visitor can't see.

import { useMemo, useState } from "react";
import { APPS } from "@/lib/apps";
import { EVIDENCE_DISCLOSURE, searchEvidence } from "@/lib/evidence";
import { fetchJobIntent } from "@/lib/job-intent-client";
import { UI_COPY } from "@/lib/ui-copy";
import { useToolActivityStore } from "@/lib/webmcp/activity";
import { INTENT_PRESETS } from "@/lib/webmcp/intent-presets";
import {
  intentFromText,
  intentToText,
  useVisitIntentStore,
} from "@/lib/webmcp/visit-intent";
import { WEBMCP_TOOLS } from "@/lib/webmcp/tools";

const COPY = UI_COPY.agent;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

function StatusSection() {
  const supported = useToolActivityStore((s) => s.supported);
  const statusCopy =
    supported === null
      ? COPY.status.checking
      : supported
        ? COPY.status.supported
        : COPY.status.unsupported;
  return (
    <section
      className="agent-section"
      data-tone="blue"
      aria-label={COPY.status.heading}
    >
      <div className="agent-section-head">
        <h2 className="agent-heading">{COPY.status.heading}</h2>
        <span className="agent-count">
          {COPY.status.toolCount(WEBMCP_TOOLS.length)}
        </span>
      </div>
      <p
        className="agent-status"
        data-supported={supported === null ? "unknown" : supported}
      >
        <span className="agent-status-dot" aria-hidden="true" />
        {statusCopy}
      </p>
      <ul className="agent-tools">
        {WEBMCP_TOOLS.map((t) => (
          <li key={t.name} className="agent-tool">
            <code
              className="agent-tool-name"
              data-kind={t.readOnly ? "read" : "act"}
            >
              {t.name}
            </code>
            <span
              className="agent-badge"
              data-kind={t.readOnly ? "read" : "act"}
            >
              {t.readOnly ? COPY.status.readOnlyBadge : COPY.status.writesBadge}
            </span>
            <span className="agent-tool-desc">{t.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type PullNote = { kind: "ok" | "error"; text: string };

function IntentSection() {
  const intent = useVisitIntentStore((s) => s.intent);
  const setIntent = useVisitIntentStore((s) => s.setIntent);
  const clear = useVisitIntentStore((s) => s.clear);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullNote, setPullNote] = useState<PullNote | null>(null);

  const matches = useMemo(
    () =>
      (intent?.priorities ?? []).map((priority) => ({
        priority,
        result: searchEvidence(priority, 3),
      })),
    [intent],
  );

  const showForm = !intent || editing;

  async function pullFromJobLink() {
    const url = jobUrl.trim();
    if (!url || pulling) return;
    setPulling(true);
    setPullNote(null);
    const result = await fetchJobIntent(url);
    setPulling(false);
    if (!result.ok) {
      setPullNote({
        kind: "error",
        text: COPY.intent.jobLink.failed[result.reason],
      });
      return;
    }
    const objective = result.jobTitle
      ? COPY.intent.jobLink.objective(result.jobTitle, result.organization)
      : COPY.intent.jobLink.untitledObjective;
    // Prefill only — the human reviews the draft and presses Set themselves.
    setDraft(
      [objective, ...result.priorities.map((p) => `- ${p}`)].join("\n"),
    );
    setEditing(true);
    setJobUrl("");
    setPullNote({ kind: "ok", text: COPY.intent.jobLink.pulled(result.host) });
  }

  return (
    <section
      className="agent-section"
      data-tone="violet"
      aria-label={COPY.intent.heading}
    >
      <div className="agent-section-head">
        <h2 className="agent-heading">{COPY.intent.heading}</h2>
        {intent && (
          <span
            className="agent-badge"
            data-kind={intent.suppliedBy === "visitor-agent" ? "act" : "read"}
          >
            {intent.suppliedBy === "visitor-agent"
              ? COPY.intent.suppliedByAgent
              : COPY.intent.suppliedByHuman}
          </span>
        )}
      </div>
      <p className="agent-explainer">{COPY.intent.explainer}</p>
      {!intent && <p className="agent-note">{COPY.intent.emptyNote}</p>}
      {showForm ? (
        <div className="agent-intent-builder">
          {!intent && (
            <div className="agent-presets">
              <span className="agent-lead">{COPY.intent.presetsLead}</span>
              {INTENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="agent-chip"
                  aria-label={COPY.intent.presetAria(preset.label)}
                  onClick={() => {
                    setIntent(preset.intent, "human");
                    setDraft("");
                    setEditing(false);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          <form
            className="agent-joblink"
            onSubmit={(e) => {
              e.preventDefault();
              void pullFromJobLink();
            }}
          >
            <span className="agent-lead">{COPY.intent.jobLink.lead}</span>
            <div className="agent-joblink-row">
              <input
                className="agent-joblink-input"
                type="url"
                inputMode="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder={COPY.intent.jobLink.placeholder}
                aria-label={COPY.intent.jobLink.aria}
              />
              <button
                type="submit"
                className="agent-btn"
                disabled={!jobUrl.trim() || pulling}
              >
                {pulling ? COPY.intent.jobLink.pulling : COPY.intent.jobLink.pull}
              </button>
            </div>
            <p
              className="agent-joblink-note"
              data-kind={pullNote?.kind}
              role="status"
            >
              {pullNote ? pullNote.text : COPY.intent.jobLink.privacy}
            </p>
          </form>
          <form
            className="agent-intent-form"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = intentFromText(draft);
              if (parsed.objective) {
                setIntent(parsed, "human");
                setDraft("");
                setEditing(false);
                setPullNote(null);
              }
            }}
          >
            <textarea
              className="agent-intent-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={COPY.intent.placeholder}
              rows={5}
            />
            <div className="agent-intent-actions">
              <button
                type="submit"
                className="agent-btn is-primary"
                disabled={!draft.trim()}
              >
                {COPY.intent.set}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="agent-intent-stored">
          <div className="agent-intent-stored-head">
            <span className="agent-intent-title">{intent.objective}</span>
            <span className="agent-count">
              {COPY.intent.priorityCount(intent.priorities.length)}
            </span>
            <button
              type="button"
              className="agent-btn"
              onClick={() => {
                setDraft(intentToText(intent));
                setEditing(true);
              }}
            >
              {COPY.intent.edit}
            </button>
            <button type="button" className="agent-btn" onClick={clear}>
              {COPY.intent.clear}
            </button>
          </div>
          {(intent.contextLabel || intent.evidenceStandard || intent.visitType) && (
            <p className="agent-intent-meta">
              {intent.visitType && (
                <span>
                  {COPY.intent.visitTypeLabel}:{" "}
                  {COPY.intent.visitTypeNames[intent.visitType]}
                </span>
              )}
              {intent.contextLabel && (
                <span>
                  {COPY.intent.contextLabel}: {intent.contextLabel}
                </span>
              )}
              {intent.evidenceStandard && (
                <span>
                  {COPY.intent.evidenceStandardLabel}: {intent.evidenceStandard}
                </span>
              )}
            </p>
          )}
          {matches.length > 0 && (
            <>
              <h3 className="agent-subheading">{COPY.intent.matchHeading}</h3>
              <ul className="agent-matches">
                {matches.map(({ priority, result }) => (
                  <li key={priority} className="agent-match">
                    <span className="agent-match-req">{priority}</span>
                    {result.matches.length === 0 ? (
                      <span className="agent-gap">{COPY.intent.gap}</span>
                    ) : (
                      <ul className="agent-evidence">
                        {result.matches.map((m) => (
                          <li
                            key={m.record.id}
                            className="agent-evidence-item"
                          >
                            <a
                              className="agent-evidence-link"
                              href={m.record.source.canonicalPath}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {m.record.title}
                            </a>
                            <span className="agent-evidence-terms">
                              {m.matchedTerms.join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="agent-note">{COPY.intent.matchNote}</p>
        </div>
      )}
    </section>
  );
}

function ActivitySection() {
  const entries = useToolActivityStore((s) => s.entries);
  const clear = useToolActivityStore((s) => s.clear);
  return (
    <section
      className="agent-section"
      data-tone="pink"
      aria-label={COPY.activity.heading}
    >
      <div className="agent-section-head">
        <h2 className="agent-heading">{COPY.activity.heading}</h2>
        {entries.length > 0 && (
          <button type="button" className="agent-btn" onClick={clear}>
            {COPY.activity.clear}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="agent-empty">{COPY.activity.empty}</p>
      ) : (
        <ol className="agent-log">
          {entries.map((e) => (
            <li key={e.id} className="agent-log-entry" data-ok={e.ok}>
              <time className="agent-log-time" dateTime={e.at}>
                {formatTime(e.at)}
              </time>
              <code className="agent-log-tool">{e.tool}</code>
              <span className="agent-log-summary">
                {e.summary}
                {!e.ok && (
                  <span className="agent-log-failed">
                    {" "}
                    ({COPY.activity.failed})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AgentWorkspaceApp() {
  return (
    <div className="agent-app">
      <header className="agent-header">
        <span className="app-kicker">{APPS.agent.title}</span>
        <h1 className="agent-title">{COPY.title}</h1>
        <p className="agent-tagline">{COPY.tagline}</p>
      </header>
      <IntentSection />
      <StatusSection />
      <ActivitySection />
      <section
        className="agent-section"
        data-tone="gold"
        aria-label={COPY.disclosureHeading}
      >
        <div className="agent-section-head">
          <h2 className="agent-heading">{COPY.disclosureHeading}</h2>
        </div>
        <ul className="agent-disclosure">
          {EVIDENCE_DISCLOSURE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
