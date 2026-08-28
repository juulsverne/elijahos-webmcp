// Crawlable document links on `/`. A server component — these anchors must
// exist in the initial HTML response, which is the entire point.
//
// Native <details> rather than a JS disclosure: it is visible, tab-focusable,
// and fully operable with scripting off, which is what distinguishes it from
// links placed where a human cannot reach them.
//
// Rendered here rather than inside Topbar.tsx even though it is styled to sit
// in the topbar band: the whole desktop shell is dynamic(ssr:false) and mounts
// only after boot, so anything living in it is absent from the initial HTML —
// which is the one thing these links cannot afford to be.

import Link from "next/link";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import s from "./doc-nav.module.css";

function DocumentLinks() {
  return (
    <ul className={s.list}>
      <li>
        <Link href={PUBLIC_ROUTES.about}>
          {UI_COPY.docs.aboutLink(ELIJAH.name)}
        </Link>
      </li>
      <li>
        <Link href={PUBLIC_ROUTES.projects}>
          {UI_COPY.docs.projectsLink(ELIJAH.name)}
        </Link>
      </li>
      <li>
        <Link href={PUBLIC_ROUTES.resume}>
          {UI_COPY.docs.resumeLink(ELIJAH.name)}
        </Link>
      </li>
    </ul>
  );
}

export function DocNav() {
  return (
    <>
      <details className={s.nav}>
        <summary className={s.summary} title={UI_COPY.docs.navTitle(ELIJAH.name)}>
          <span className={s.glyph} aria-hidden>
            {UI_COPY.docs.navGlyph}
          </span>
          {UI_COPY.docs.navSummary}
        </summary>
        <nav aria-label={UI_COPY.docs.navAriaLabel}>
          <DocumentLinks />
        </nav>
      </details>
      {/* The no-script panel stands alone with no topbar around it, so it keeps
          the full name as its heading — "docs" would be a heading about
          nothing once the chip's context is gone. */}
      <noscript>
        <nav
          className={s.noScriptNav}
          aria-label={UI_COPY.docs.navAriaLabel}
        >
          <strong>{UI_COPY.docs.navTitle(ELIJAH.name)}</strong>
          <DocumentLinks />
        </nav>
      </noscript>
    </>
  );
}
