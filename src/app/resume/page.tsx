// /resume — experience and education. `hasOccupation` is emitted here (and only
// here) because this is the page that visibly lists the roles behind it.
// Employers stay anonymized per ELIJAH.experience[].co; the employment
// relationship itself is not asserted as structured data.

import type { Metadata } from "next";
import { ELIJAH } from "@/lib/elijah";
import { UI_COPY } from "@/lib/ui-copy";
import { absoluteUrl, PERSON_ID, WEBSITE_ID } from "@/lib/site-url";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import { DocPage } from "@/components/doc/DocPage";

const TITLE = UI_COPY.docs.resumeLink(ELIJAH.name);

export const metadata: Metadata = {
  title: TITLE,
  description: ELIJAH.shortPositioning,
  alternates: { canonical: PUBLIC_ROUTES.resume },
  openGraph: {
    type: "profile",
    url: absoluteUrl(PUBLIC_ROUTES.resume),
    siteName: ELIJAH.osName,
    title: TITLE,
    description: ELIJAH.shortPositioning,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: ELIJAH.shortPositioning,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      // /about is the canonical ProfilePage for PERSON_ID — Google's
      // guidance assumes one profile page per entity. This route stays a
      // plain WebPage that points at the same entity via mainEntity.
      "@type": "WebPage",
      "@id": absoluteUrl(PUBLIC_ROUTES.resume),
      url: absoluteUrl(PUBLIC_ROUTES.resume),
      name: TITLE,
      mainEntity: { "@id": PERSON_ID },
      isPartOf: { "@id": WEBSITE_ID },
    },
    {
      "@type": "Person",
      "@id": PERSON_ID,
      hasOccupation: ELIJAH.experience.map((entry) => ({
        "@type": "Occupation",
        name: entry.role,
        description: entry.what,
      })),
    },
  ],
};

export default function ResumePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <DocPage kicker={ELIJAH.role} title={TITLE} lede={ELIJAH.shortPositioning}>
        <section>
          <h2>{UI_COPY.docs.sections.experience}</h2>
          {ELIJAH.experience.map((entry) => (
            <article key={`${entry.co}-${entry.when}`}>
              <h3>
                {entry.role} — {entry.co}
              </h3>
              <p>{entry.when}</p>
              <p>{entry.what}</p>
            </article>
          ))}
        </section>

        <section>
          <h2>{UI_COPY.docs.sections.education}</h2>
          {ELIJAH.education.map((entry) => (
            <article key={entry.school}>
              <h3>{entry.school}</h3>
              <p>
                {entry.degree} ({entry.when})
              </p>
            </article>
          ))}
        </section>
      </DocPage>
    </>
  );
}
