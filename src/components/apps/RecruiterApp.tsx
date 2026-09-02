"use client";

// Recruiter workspace — the visible face of the WebMCP tool surface.
//
// Three jobs:
// 1. Show the visit intent (whether a human typed it or an agent called
//    set_visit_intent), with edit and clear controls, and compare each
//    priority against the documented evidence — explicit gaps included.
//    The workspace works fully without any agent.
// 2. Show which agent tools this page registers (with honest read-only /
//    acts badges) and whether the current browser supports WebMCP at all.
// 3. Log every tool invocation agents make, live, so nothing happens in
//    this browser that the visitor can't see.

import { useMemo, useState } from "react";
import { APPS } from "@/lib/apps";
import { EVIDENCE_DISCLOSURE, searchEvidence } from "@/lib/evidence";
import { UI_COPY } from "@/lib/ui-copy";
import { useToolActivityStore } from "@/lib/webmcp/activity";
import {
  intentFromText,
  intentToText,
  useVisitIntentStore,
} from "@/lib/webmcp/visit-intent";
import { WEBMCP_TOOLS } from "@/lib/webmcp/tools";

const COPY = UI_COPY.recruiter;

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
    <section className="recruiter-section" aria-label={COPY.status.heading}>
      <div className="recruiter-section-head">
        <h2 className="recruiter-heading">{COPY.status.heading}</h2>
        <span className="recruiter-count">
          {COPY.status.toolCount(WEBMCP_TOOLS.length)}
        </span>
      </div>
      <p
        className="recruiter-status"
        data-supported={supported === null ? "unknown" : supported}
      >
        {statusCopy}
      </p>
      <ul className="recruiter-tools">
        {WEBMCP_TOOLS.map((t) => (
          <li key={t.name} className="recruiter-tool">
            <code className="recruiter-tool-name">{t.name}</code>
            <span
              className="recruiter-badge"
              data-kind={t.readOnly ? "read" : "act"}
            >
              {t.readOnly ? COPY.status.readOnlyBadge : COPY.status.writesBadge}
            </span>
            <span className="recruiter-tool-desc">{t.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IntentSection() {
  const intent = useVisitIntentStore((s) => s.intent);
  const setIntent = useVisitIntentStore((s) => s.setIntent);
  const clear = useVisitIntentStore((s) => s.clear);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const matches = useMemo(
    () =>
      (intent?.priorities ?? []).map((priority) => ({
        priority,
        result: searchEvidence(priority, 3),
      })),
    [intent],
  );

  const showForm = !intent || editing;

  return (
    <section className="recruiter-section" aria-label={COPY.intent.heading}>
      <div className="recruiter-section-head">
        <h2 className="recruiter-heading">{COPY.intent.heading}</h2>
        {intent && (
          <span
            className="recruiter-badge"
            data-kind={intent.suppliedBy === "visitor-agent" ? "act" : "read"}
          >
            {intent.suppliedBy === "visitor-agent"
              ? COPY.intent.suppliedByAgent
              : COPY.intent.suppliedByHuman}
          </span>
        )}
      </div>
      <p className="recruiter-explainer">{COPY.intent.explainer}</p>
      {showForm ? (
        <form
          className="recruiter-role-form"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = intentFromText(draft);
            if (parsed.objective) {
              setIntent(parsed, "human");
              setDraft("");
              setEditing(false);
            }
          }}
        >
          <textarea
            className="recruiter-role-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={COPY.intent.placeholder}
            rows={5}
          />
          <div className="recruiter-role-actions">
            <button
              type="submit"
              className="recruiter-btn"
              disabled={!draft.trim()}
            >
              {COPY.intent.set}
            </button>
          </div>
        </form>
      ) : (
        <div className="recruiter-role-stored">
          <div className="recruiter-role-stored-head">
            <span className="recruiter-role-title">{intent.objective}</span>
            <span className="recruiter-count">
              {COPY.intent.priorityCount(intent.priorities.length)}
            </span>
            <button
              type="button"
              className="recruiter-btn"
              onClick={() => {
                setDraft(intentToText(intent));
                setEditing(true);
              }}
            >
              {COPY.intent.edit}
            </button>
            <button type="button" className="recruiter-btn" onClick={clear}>
              {COPY.intent.clear}
            </button>
          </div>
          {(intent.contextLabel || intent.evidenceStandard) && (
            <p className="recruiter-intent-meta">
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
              <h3 className="recruiter-subheading">
                {COPY.intent.matchHeading}
              </h3>
              <ul className="recruiter-matches">
                {matches.map(({ priority, result }) => (
                  <li key={priority} className="recruiter-match">
                    <span className="recruiter-match-req">{priority}</span>
                    {result.matches.length === 0 ? (
                      <span className="recruiter-gap">{COPY.intent.gap}</span>
                    ) : (
                      <ul className="recruiter-evidence">
                        {result.matches.map((m) => (
                          <li
                            key={m.record.id}
                            className="recruiter-evidence-item"
                          >
                            <a
                              className="recruiter-evidence-link"
                              href={m.record.source.canonicalPath}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {m.record.title}
                            </a>
                            <span className="recruiter-evidence-terms">
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
          <p className="recruiter-note">{COPY.intent.matchNote}</p>
        </div>
      )}
    </section>
  );
}

function ActivitySection() {
  const entries = useToolActivityStore((s) => s.entries);
  const clear = useToolActivityStore((s) => s.clear);
  return (
    <section className="recruiter-section" aria-label={COPY.activity.heading}>
      <div className="recruiter-section-head">
        <h2 className="recruiter-heading">{COPY.activity.heading}</h2>
        {entries.length > 0 && (
          <button type="button" className="recruiter-btn" onClick={clear}>
            {COPY.activity.clear}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="recruiter-empty">{COPY.activity.empty}</p>
      ) : (
        <ol className="recruiter-log">
          {entries.map((e) => (
            <li key={e.id} className="recruiter-log-entry" data-ok={e.ok}>
              <time className="recruiter-log-time" dateTime={e.at}>
                {formatTime(e.at)}
              </time>
              <code className="recruiter-log-tool">{e.tool}</code>
              <span className="recruiter-log-summary">
                {e.summary}
                {!e.ok && (
                  <span className="recruiter-log-failed">
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

export function RecruiterApp() {
  return (
    <div className="recruiter-app">
      <header className="recruiter-header">
        <span className="app-kicker">{APPS.recruiter.title}</span>
        <h1 className="recruiter-title">{COPY.title}</h1>
        <p className="recruiter-tagline">{COPY.tagline}</p>
      </header>
      <IntentSection />
      <StatusSection />
      <ActivitySection />
      <section
        className="recruiter-section"
        aria-label={COPY.disclosureHeading}
      >
        <div className="recruiter-section-head">
          <h2 className="recruiter-heading">{COPY.disclosureHeading}</h2>
        </div>
        <ul className="recruiter-disclosure">
          {EVIDENCE_DISCLOSURE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
