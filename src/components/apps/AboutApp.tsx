"use client";

import type { ReactNode } from "react";
import { ELIJAH } from "@/lib/elijah";
import { APPS } from "@/lib/apps";
import { openApp } from "@/lib/app-launcher";
import { UI_COPY } from "@/lib/ui-copy";

// Tiny markdown-lite: two emphasis flavors, no nesting, no escapes.
//   **foo**  → .bio-em      (accent-violet, regular emphasis)
//   ||foo||  → .bio-puzzle  (accent-gold, puzzle-tagged words)
// Both are split-and-wrapped in a single pass; everything else passes through.
function renderEmphasis(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\|\|[^|]+\|\|)/g);
  return parts.map((part, i) => {
    const violet = /^\*\*([^*]+)\*\*$/.exec(part);
    if (violet) {
      return (
        <span key={i} className="bio-em">
          {violet[1]}
        </span>
      );
    }
    const gold = /^\|\|([^|]+)\|\|$/.exec(part);
    if (gold) {
      return (
        <span key={i} className="bio-puzzle">
          {gold[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function AboutApp() {
  const firstName = ELIJAH.firstName;

  return (
    <div className="about-app">
      {/* Hero greeting — serif italic, gradient period.
          No hard line break: lets the headline sit on one line when the
          window is wide and wrap naturally when narrow. textWrap: balance
          keeps the wrap point sane. */}
      <div className="about-title serif-i">
        Hi, I&apos;m {firstName}
        <span className="gradient-text">
          .
        </span>
      </div>

      <p className="about-role">{ELIJAH.role}</p>
      <p className="about-tagline">{ELIJAH.positioning}</p>

      {/* Bio blocks — mono kicker (OS-system-info feel) + body paragraphs.
          Body supports \n\n for paragraph breaks, **foo** for inline
          accent-violet emphasis spans, and ||foo|| for accent-gold
          puzzle-tagged words. */}
      {ELIJAH.longBio.map((block, i) => {
        const paragraphs = block.body.split(/\n\n+/);
        return (
          <div key={i} className="about-bio">
            {block.kicker && (
              <span className="about-bio-kicker">{block.kicker}</span>
            )}
            {paragraphs.map((para, j) => (
              <p key={j}>{renderEmphasis(para)}</p>
            ))}
          </div>
        );
      })}

      {/* CTAs — drive engagement with the demo, not external conversion.
          marginTop: auto pushes the row to the bottom of the (flex column)
          container so the CTAs hug the window's bottom edge when the window
          is tall. paddingTop guarantees breathing room from the bio above
          when the content fills the window and auto resolves to zero. */}
      <div className="about-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openApp("ask")}
        >
          {`${UI_COPY.about.askCta(ELIJAH.firstName)} ${APPS.ask.icon}`}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => openApp("projects")}
        >
          {UI_COPY.about.seeProjects}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => openApp("resume")}
        >
          {UI_COPY.about.viewResume}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => openApp("contact")}
        >
          {UI_COPY.about.contact}
        </button>
      </div>
    </div>
  );
}
