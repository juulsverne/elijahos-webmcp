// Shared chrome for the server-rendered document routes (/about, /projects,
// /projects/[id], /resume). A server component — no "use client".
//
// Every document links to its siblings and home, so no route is orphaned from
// the others once a crawler reaches any one of them. Anchor text carries the
// name (UI_COPY.docs.*Link) because Google uses it to understand the target,
// and the name is the query being targeted.

import Link from "next/link";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import s from "./doc.module.css";

export type Crumb = { href: string; label: string };

type DocPageProps = {
  kicker: string;
  title: string;
  lede?: string;
  crumbs?: Crumb[];
  children: React.ReactNode;
};

export function DocPage({ kicker, title, lede, crumbs, children }: DocPageProps) {
  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <Link className={s.brand} href={PUBLIC_ROUTES.home}>
          <span className={s.brandDot} aria-hidden />
          {UI_COPY.docs.homeLink(ELIJAH.osName)}
        </Link>

        {crumbs && crumbs.length > 0 && (
          <nav aria-label={UI_COPY.docs.breadcrumbAriaLabel}>
            <ol className={s.crumbs}>
              {crumbs.map((crumb) => (
                <li key={crumb.href}>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <header className={s.head}>
          <span className={s.kicker}>{kicker}</span>
          <h1 className={s.title}>{title}</h1>
          {lede && <p className={s.lede}>{lede}</p>}
        </header>

        <div className={s.body}>{children}</div>

        <nav className={s.docNav} aria-label={UI_COPY.docs.navAriaLabel}>
          <Link href={PUBLIC_ROUTES.about}>
            {UI_COPY.docs.aboutLink(ELIJAH.name)}
          </Link>
          <Link href={PUBLIC_ROUTES.projects}>
            {UI_COPY.docs.projectsLink(ELIJAH.name)}
          </Link>
          <Link href={PUBLIC_ROUTES.resume}>
            {UI_COPY.docs.resumeLink(ELIJAH.name)}
          </Link>
        </nav>
      </div>
    </main>
  );
}
