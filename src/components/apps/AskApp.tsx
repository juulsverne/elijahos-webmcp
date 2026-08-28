"use client";

import { APPS } from "@/lib/apps";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";

export function AskApp() {
  return (
    <div className="portfolio-app about-app">
      <span className="app-kicker">{APPS.ask.title}</span>
      <div className="about-body">
        <h1>{UI_COPY.ask.publicBuild.title(ELIJAH.firstName)}</h1>
        <p>{UI_COPY.ask.publicBuild.body}</p>
        <p>{UI_COPY.ask.publicBuild.next}</p>
      </div>
    </div>
  );
}
