// /projects/[id] — long-form case study. Params come from CASE_STUDIES, not
// ELIJAH.projects: a project whose only content is a 1-3 sentence `desc` and a
// one-line `result` would produce a page that restates its index entry, which
// is a thin duplicate. Adding a CASE_STUDIES entry grants a route automatically.

import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { CASE_STUDIES } from "@/lib/case-studies";
import { absoluteUrl, PERSON_ID, WEBSITE_ID } from "@/lib/site-url";
import { PUBLIC_ROUTES, projectRoute } from "@/lib/public-routes";
import { DocPage } from "@/components/doc/DocPage";

type Props = { params: Promise<{ id: string }> };

// Next 16 defaults `dynamicParams` to true, which would generate unlisted ids
// on request instead of 404ing. Both this and the notFound() below are needed.
export const dynamicParams = false;

export function generateStaticParams(): { id: string }[] {
  return Object.keys(CASE_STUDIES).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const study = CASE_STUDIES[id];
  if (!study) return {};

  const title = `${study.title} — ${ELIJAH.name}`;
  const path = projectRoute(id);

  return {
    title,
    description: study.desc,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: absoluteUrl(path),
      siteName: ELIJAH.osName,
      title,
      description: study.desc,
    },
    twitter: { card: "summary_large_image", title, description: study.desc },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const study = CASE_STUDIES[id];
  if (!study) notFound();

  const path = projectRoute(id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        // isPartOf also disambiguates this CreativeWork (named "ElijahOS"
        // for the elijahos case study) from the site-wide WebSite node,
        // which shares that name.
        "@type": "CreativeWork",
        "@id": absoluteUrl(path),
        url: absoluteUrl(path),
        name: study.title,
        headline: study.title,
        description: study.desc,
        inLanguage: "en",
        dateModified: ELIJAH.updated.projects,
        author: { "@id": PERSON_ID },
        creator: { "@id": PERSON_ID },
        isPartOf: { "@id": WEBSITE_ID },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: UI_COPY.docs.breadcrumbHome,
            item: absoluteUrl(PUBLIC_ROUTES.home),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: UI_COPY.docs.projectsLink(ELIJAH.name),
            item: absoluteUrl(PUBLIC_ROUTES.projects),
          },
          { "@type": "ListItem", position: 3, name: study.title },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <DocPage
        kicker={study.kicker}
        title={study.title}
        lede={study.desc}
        crumbs={[
          { href: PUBLIC_ROUTES.home, label: UI_COPY.docs.breadcrumbHome },
          {
            href: PUBLIC_ROUTES.projects,
            label: UI_COPY.docs.projectsLink(ELIJAH.name),
          },
        ]}
      >
        <p>
          {UI_COPY.docs.byline(ELIJAH.name)} · {UI_COPY.docs.updatedLabel}{" "}
          <time dateTime={ELIJAH.updated.projects}>{ELIJAH.updated.projects}</time>
        </p>

        {study.sections.map((section) => (
          <section key={section.id}>
            <h2>{section.heading}</h2>
            {/* Same order as the OS window: lede, points, closing prose. */}
            {section.body.slice(0, 1).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {section.points && (
              <ul>
                {section.points.map((point) => (
                  <li key={point.label}>
                    <strong>{point.label}</strong> — {point.text}
                  </li>
                ))}
              </ul>
            )}
            {section.body.slice(1).map((paragraph, index) => (
              <p key={index + 1}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section>
          <h2>{UI_COPY.docs.sections.architecture}</h2>
          {study.architecture.intro.map((paragraph, index) => (
            <p key={`architecture-intro-${index}`}>{paragraph}</p>
          ))}
          {study.architecture.layers.map((layer) => (
            <Fragment key={layer.id}>
              <h3>{layer.heading}</h3>
              {layer.kicker && <p>{layer.kicker}</p>}
              <ul>
                {layer.nodes.map((node) => (
                  <li key={node.id}>
                    <strong>{node.label}</strong>
                    {node.detail && ` — ${node.detail}`}
                    {node.status &&
                      ` (${UI_COPY.docs.sections.status}: ${node.status})`}
                  </li>
                ))}
              </ul>
            </Fragment>
          ))}
          {study.architecture.outro?.map((paragraph, index) => (
            <p key={`architecture-outro-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section>
          <h2>{UI_COPY.docs.sections.decisions}</h2>
          <ul>
            {study.decisions.map((decision) => (
              <li key={decision.picked}>
                <strong>{decision.picked}</strong> — {decision.reason}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{UI_COPY.docs.sections.stack}</h2>
          <ul>
            {study.stack.map((item) => (
              <li key={item.tech}>
                <strong>{item.tech}</strong> — {item.what} {item.why}
              </li>
            ))}
          </ul>
        </section>
      </DocPage>
    </>
  );
}
