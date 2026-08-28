// /about — the canonical human-readable identity document, and the only page
// carrying the full Person schema node. Every property marked up below is
// visibly rendered on this page; structured data must not assert facts the
// reader cannot see.

import type { Metadata } from "next";
import Link from "next/link";
import { ELIJAH, type PublicAnswerEvidence } from "@/lib/elijah";
import { APPS, appDeepLink } from "@/lib/apps";
import { UI_COPY } from "@/lib/ui-copy";
import { absoluteUrl, PERSON_ID, WEBSITE_ID } from "@/lib/site-url";
import {
  PUBLIC_ROUTES,
  aboutAnswerRoute,
  projectRoute,
} from "@/lib/public-routes";
import { DocPage } from "@/components/doc/DocPage";
import { parseBioText } from "@/lib/bio-text";

const TITLE = `${UI_COPY.docs.aboutLink(ELIJAH.name)} — ${ELIJAH.role}`;

export const metadata: Metadata = {
  title: TITLE,
  description: ELIJAH.profileDescription,
  alternates: { canonical: PUBLIC_ROUTES.about },
  openGraph: {
    type: "profile",
    url: absoluteUrl(PUBLIC_ROUTES.about),
    siteName: ELIJAH.osName,
    title: TITLE,
    description: ELIJAH.profileDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: ELIJAH.profileDescription,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      // name, url, and jobTitle are deliberately omitted: the layout's
      // site-wide Person stub (src/app/layout.tsx) already declares them on
      // every page, including this one. Redeclaring them here would let two
      // <script type="application/ld+json"> blocks assert different values
      // for the same @id (this page's URL vs. the site root) — additive-only
      // is the pattern /resume and /projects/[id] already follow.
      "@type": "Person",
      "@id": PERSON_ID,
      description: ELIJAH.profileDescription,
      knowsAbout: ELIJAH.pillars.map((pillar) => pillar.k),
      alumniOf: ELIJAH.education.map((entry) => ({
        "@type": "CollegeOrUniversity",
        name: entry.school,
      })),
      address: {
        "@type": "PostalAddress",
        addressLocality: ELIJAH.location.locality,
        addressRegion: ELIJAH.location.region,
        addressCountry: ELIJAH.location.country,
      },
      sameAs: [
        `https://${ELIJAH.contact.github}`,
        `https://${ELIJAH.contact.linkedin}`,
      ],
    },
    {
      "@type": "ProfilePage",
      "@id": absoluteUrl(PUBLIC_ROUTES.about),
      url: absoluteUrl(PUBLIC_ROUTES.about),
      name: TITLE,
      dateModified: ELIJAH.updated.about,
      mainEntity: { "@id": PERSON_ID },
      isPartOf: { "@id": WEBSITE_ID },
    },
  ],
};

// `/\n\n+/` splits paragraphs — matching AboutApp.tsx and bio-text.test.ts, so
// a triple newline collapses to one paragraph break instead of producing an
// empty <p></p> on this route only. Inline markup is tokenized by the shared
// parseBioText (src/lib/bio-text.ts) — the same dialect AboutApp.tsx parses
// with its own client-side renderer (kept separate deliberately: AboutApp is
// a client component with OS-window styling concerns this plain document
// doesn't share). `/about` is a plain document, not the OS window: `em`
// renders as <strong>, and `tag` — the accent-gold puzzle styling in
// AboutApp — has no visual meaning here, so it renders as plain text with
// the delimiters stripped and nothing else.
function renderParagraph(text: string, key: string) {
  return (
    <p key={key}>
      {parseBioText(text).map((token, index) =>
        token.kind === "em" ? (
          <strong key={index}>{token.value}</strong>
        ) : (
          token.value
        ),
      )}
    </p>
  );
}

function evidenceLink(evidence: PublicAnswerEvidence) {
  if (evidence.kind === "app") {
    const app = APPS[evidence.id];
    return (
      <Link key={`${evidence.kind}-${evidence.id}`} href={appDeepLink(app.id)}>
        {UI_COPY.docs.contactLink(ELIJAH.name)}
      </Link>
    );
  }

  if (evidence.kind === "document") {
    const label =
      evidence.id === "projects"
        ? UI_COPY.docs.projectsLink(ELIJAH.name)
        : UI_COPY.docs.resumeLink(ELIJAH.name);
    return (
      <Link key={`${evidence.kind}-${evidence.id}`} href={PUBLIC_ROUTES[evidence.id]}>
        {label}
      </Link>
    );
  }

  if (evidence.kind === "profile") {
    const profile = ELIJAH.contact[evidence.id];
    return (
      <a key={`${evidence.kind}-${evidence.id}`} href={`https://${profile}`}>
        {profile}
      </a>
    );
  }

  const project = ELIJAH.projects.find((candidate) => candidate.id === evidence.id);
  return (
    <Link key={`${evidence.kind}-${evidence.id}`} href={projectRoute(evidence.id)}>
      {UI_COPY.docs.projectEvidenceLink(project?.name ?? evidence.id, ELIJAH.name)}
    </Link>
  );
}

export default function AboutPage() {
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
        title={ELIJAH.name}
        lede={ELIJAH.profileDescription}
      >
        <p>
          {ELIJAH.location.locality}, {ELIJAH.location.region},{" "}
          {ELIJAH.location.country}
        </p>
        <p>
          {UI_COPY.docs.updatedLabel}{" "}
          <time dateTime={ELIJAH.updated.about}>{ELIJAH.updated.about}</time>
        </p>

        <section>
          <h2>{UI_COPY.docs.identityHeading(ELIJAH.name)}</h2>
          <p>
            <strong>{ELIJAH.name}</strong> — {ELIJAH.metadataDescription}
          </p>
        </section>

        <section>
          <h2>{UI_COPY.docs.answersHeading(ELIJAH.name)}</h2>
          <p>{UI_COPY.docs.answersIntro}</p>
          <nav aria-label={UI_COPY.docs.answersAriaLabel(ELIJAH.name)}>
            <ul>
              {ELIJAH.publicAnswers.map((answer) => (
                <li key={answer.id}>
                  <Link href={aboutAnswerRoute(answer.id)}>{answer.question}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {ELIJAH.publicAnswers.map((answer) => (
          <section id={answer.id} key={answer.id}>
            <h2>{answer.question}</h2>
            <p>{answer.answer}</p>
            {answer.evidence.length > 0 && (
              <p>
                <strong>{UI_COPY.docs.evidenceLabel}:</strong>{" "}
                {answer.evidence.map((evidence, index) => (
                  <span key={`${evidence.kind}-${evidence.id}`}>
                    {index > 0 && UI_COPY.docs.evidenceSeparator}
                    {evidenceLink(evidence)}
                  </span>
                ))}
              </p>
            )}
          </section>
        ))}

        {ELIJAH.longBio.map((block, blockIndex) => (
          <section key={block.kicker ?? `bio-${blockIndex}`}>
            {block.kicker && <h2>{block.kicker}</h2>}
            {block.body
              .split(/\n\n+/)
              .map((paragraph, index) =>
                renderParagraph(paragraph, `${blockIndex}-${index}`),
              )}
          </section>
        ))}

        <section>
          <h2>{UI_COPY.docs.sections.capabilities}</h2>
          <ul>
            {ELIJAH.pillars.map((pillar) => (
              <li key={pillar.k}>
                <strong>{pillar.k}</strong> — {pillar.v}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{UI_COPY.docs.sections.education}</h2>
          <ul>
            {ELIJAH.education.map((entry) => (
              <li key={entry.school}>
                {entry.degree}, {entry.school} ({entry.when})
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{UI_COPY.docs.sections.elsewhere}</h2>
          <ul>
            <li>
              <a href={`https://${ELIJAH.contact.github}`}>
                {ELIJAH.contact.github}
              </a>
            </li>
            <li>
              <a href={`https://${ELIJAH.contact.linkedin}`}>
                {ELIJAH.contact.linkedin}
              </a>
            </li>
            <li>
              <a href={ELIJAH.music.spotifyArtistUrl}>{ELIJAH.music.artist}</a>
            </li>
          </ul>
        </section>
      </DocPage>
    </>
  );
}
