"use client";

import { ELIJAH, type Education } from "@/lib/elijah";
import { APPS } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";
import { StatusPill } from "@/components/StatusPill";

const RESUME_ACCENTS = ["blue", "gold", "violet", "pink"] as const;

export function ResumeApp() {
  return (
    <div className="resume-app">
      <header className="resume-header">
        <span className="app-kicker">{APPS.resume.title}</span>
        <h1 className="resume-title serif-i">{ELIJAH.role}</h1>
      </header>

      <section className="resume-section">
        <h2 className="resume-section-label">
          {UI_COPY.resume.sections.experience}
        </h2>
        <div className="resume-timeline">
          {ELIJAH.experience.map((item, i) => (
            <article
              className={`resume-entry accent-${RESUME_ACCENTS[i % RESUME_ACCENTS.length]}`}
              key={`${item.co}-${item.when}`}
            >
              <div className="resume-entry-head">
                <strong className="resume-role">{item.role}</strong>
                <div className="resume-entry-meta">
                  {item.when.toLowerCase().includes("now") && (
                    <StatusPill status="live" />
                  )}
                  <span className="resume-when">{item.when}</span>
                </div>
              </div>
              <span className="resume-co">{item.co}</span>
              <p className="resume-what">{item.what}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="resume-section">
        <h2 className="resume-section-label">
          {UI_COPY.resume.sections.capabilities}
        </h2>
        <div className="resume-pillars">
          {ELIJAH.pillars.map((pillar) => (
            <div className="resume-pillar" key={pillar.k}>
              <strong>{pillar.k}</strong>
              <span>{pillar.v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="resume-section">
        <h2 className="resume-section-label">
          {UI_COPY.resume.sections.education}
        </h2>
        <div className="resume-timeline">
          {ELIJAH.education.map((edu: Education) => (
            <div className="resume-entry accent-violet" key={edu.school}>
              <div className="resume-entry-head">
                <strong className="resume-role">{edu.school}</strong>
                <span className="resume-when">{edu.when}</span>
              </div>
              <span className="resume-co">{edu.degree}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
