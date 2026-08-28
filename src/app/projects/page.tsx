// /projects — every project described in full. Only projects with a CASE_STUDIES
// entry get a detail route; the rest live entirely here. A detail page that
// merely restates its index entry is a thin duplicate, so we do not create one.

import type { Metadata } from "next";
import Link from "next/link";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { CASE_STUDIES } from "@/lib/case-studies";
import { absoluteUrl, PERSON_ID, WEBSITE_ID } from "@/lib/site-url";
import { PUBLIC_ROUTES, projectRoute } from "@/lib/public-routes";
import { DocPage } from "@/components/doc/DocPage";

const TITLE = UI_COPY.docs.projectsLink(ELIJAH.name);

export const metadata: Metadata = {
  title: TITLE,
  description: ELIJAH.projectsSubtitle,
  alternates: { canonical: PUBLIC_ROUTES.projects },
  openGraph: {
    type: "website",
    url: absoluteUrl(PUBLIC_ROUTES.projects),
    siteName: ELIJAH.osName,
    title: TITLE,
    description: ELIJAH.projectsSubtitle,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: ELIJAH.projectsSubtitle,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": absoluteUrl(PUBLIC_ROUTES.projects),
      url: absoluteUrl(PUBLIC_ROUTES.projects),
      name: TITLE,
      about: { "@id": PERSON_ID },
      isPartOf: { "@id": WEBSITE_ID },
    },
  ],
};

export default function ProjectsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <DocPage
        kicker={ELIJAH.role}
        title={TITLE}
        lede={ELIJAH.projectsSubtitle}
      >
        {ELIJAH.projects.map((project) => {
          const hasCaseStudy = Boolean(CASE_STUDIES[project.id]);
          return (
            <section key={project.id}>
              <h2>{project.name}</h2>
              <p>{project.kind}</p>
              <p>{project.desc}</p>
              <p>{project.result}</p>
              <p>
                {UI_COPY.docs.sections.stack}: {project.stack.join(", ")}
              </p>
              <p>
                {project.year}
                {project.status &&
                  ` · ${UI_COPY.docs.sections.status}: ${project.status}`}
              </p>
              {hasCaseStudy && (
                <p>
                  <Link href={projectRoute(project.id)}>
                    {project.name} — {UI_COPY.docs.sections.architecture}
                  </Link>
                </p>
              )}
              {project.links?.repo && (
                <p>
                  <a href={project.links.repo}>{project.links.repo}</a>
                </p>
              )}
            </section>
          );
        })}
      </DocPage>
    </>
  );
}
