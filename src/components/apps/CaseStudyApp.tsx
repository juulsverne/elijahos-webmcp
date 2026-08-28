"use client";

import { APPS } from "@/lib/apps";
import { CASE_STUDIES } from "@/lib/case-studies";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { StatusPill } from "@/components/StatusPill";
import { ArchitectureDiagram } from "@/components/case-study/ArchitectureDiagram";

export function CaseStudyApp() {
  // Single case study for now — keyed off ELIJAH.osSlug so the lookup
  // stays in sync with the brand. Multi-case-study support (picking
  // which one to show based on the project that opened the window) lands
  // when there's a second case study worth telling.
  const cs = CASE_STUDIES[ELIJAH.osSlug];
  if (!cs) return null;

  return (
    <div className={`case-study-app accent-${cs.accent}`}>
      <header className="case-study-head">
        {cs.glyph && (
          <span className="case-study-glyph" aria-hidden="true">
            {cs.glyph}
          </span>
        )}
        <div className="case-study-head-text">
          <span className="app-kicker">{APPS.case.title}</span>
          <h1 className="case-study-title serif-i">{cs.title}</h1>
          <span className="case-study-kicker">{cs.kicker}</span>
          <p className="case-study-desc">{cs.desc}</p>
        </div>
        <StatusPill status={cs.status} />
      </header>

      {cs.sections.map((section) => (
        <section className="case-study-section" key={section.id}>
          <h2 className="case-study-heading">{section.heading}</h2>
          {section.body.map((para, i) => (
            <p className="case-study-body" key={i}>
              {para}
            </p>
          ))}
        </section>
      ))}

      <section className="case-study-section">
        <h2 className="case-study-heading">
          {UI_COPY.caseStudy.sections.architecture}
        </h2>
        {cs.architecture.intro.map((para, i) => (
          <p className="case-study-body" key={`intro-${i}`}>
            {para}
          </p>
        ))}
        <ArchitectureDiagram layers={cs.architecture.layers} />
        {cs.architecture.outro?.map((para, i) => (
          <p className="case-study-body" key={`outro-${i}`}>
            {para}
          </p>
        ))}
      </section>

      <section className="case-study-section">
        <h2 className="case-study-heading">
          {UI_COPY.caseStudy.sections.decisions}
        </h2>
        <div className="case-study-decisions">
          {cs.decisions.map((d, i) => (
            <article className="decision-vignette" key={i}>
              <span className="decision-label">
                {UI_COPY.caseStudy.decisionLabels.considered}
              </span>
              <p className="decision-considered">{d.considered.join(" · ")}</p>
              <span className="decision-label">
                {UI_COPY.caseStudy.decisionLabels.picked}
              </span>
              <p className="decision-picked serif-i">{d.picked}</p>
              <p className="decision-reason">{d.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="case-study-section">
        <h2 className="case-study-heading">
          {UI_COPY.caseStudy.sections.stack}
        </h2>
        <div className="case-study-stack">
          {cs.stack.map((s) => (
            <article className="stack-row" key={s.tech}>
              <strong>{s.tech}</strong>
              <span className="stack-what">{s.what}</span>
              <span className="stack-why">{s.why}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
