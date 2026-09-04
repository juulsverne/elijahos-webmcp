"use client";

import { AskChat } from "./ask-lite/AskChat";

export function AskApp() {
  return (
    <div className="portfolio-app ask-app">
      <header className="ask-header">
        <div>
          <span className="ask-boundary">Site-owned guide</span>
          <h1>Ask Elijah</h1>
        </div>
        <p>
          A lightweight guide to Elijah&apos;s published work. Separate from the
          visitor-controlled agent workspace.
        </p>
      </header>
      <AskChat />
    </div>
  );
}
