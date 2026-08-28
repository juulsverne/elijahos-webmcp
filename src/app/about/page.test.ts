import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8");

describe("/about metadata", () => {
  it("sets its own canonical, OpenGraph, and Twitter data", () => {
    assert.match(source, /alternates:\s*\{\s*canonical:/);
    assert.match(source, /openGraph:\s*\{/);
    assert.match(source, /twitter:\s*\{/);
  });

  it("does not claim a social or schema image that is missing from public", () => {
    assert.doesNotMatch(source, /ELIJAH\.headshot|elijah\.jpg/);
  });

  it("describes itself with the bio/lede copy actually rendered on the page, not the site-wide description", () => {
    // /about, /resume, and layout.tsx all defaulting to
    // ELIJAH.metadataDescription would ship three byte-identical
    // <meta name="description"> tags on the two pages that matter most for
    // a personal-name query. profileDescription is AI-first, name-bearing,
    // and also rendered as this page's lede.
    assert.match(source, /description: ELIJAH\.profileDescription/);
    assert.match(source, /openGraph:\s*\{[\s\S]*?description: ELIJAH\.profileDescription/);
    assert.match(source, /twitter:\s*\{[\s\S]*?description: ELIJAH\.profileDescription/);
    assert.match(source, /lede=\{ELIJAH\.profileDescription\}/);
  });
});

describe("/about structured data", () => {
  it("defines the full Person on the shared @id", () => {
    assert.match(source, /"@type": "Person"/);
    assert.match(source, /"@id": PERSON_ID/);
    assert.match(source, /alumniOf/);
    assert.match(source, /"@type": "PostalAddress"/);
    assert.match(source, /addressLocality: ELIJAH\.location\.locality/);
    assert.doesNotMatch(source, /^\s*image:/m);
    assert.doesNotMatch(source, /alternateName/);
  });

  it("emits ProfilePage pointing at the same entity", () => {
    assert.match(source, /"@type": "ProfilePage"/);
    assert.match(source, /dateModified: ELIJAH\.updated\.about/);
    assert.match(source, /mainEntity:\s*\{\s*"@id": PERSON_ID\s*\}/);
  });

  it("links the page node back to the WebSite node", () => {
    assert.match(
      source,
      /"@type": "ProfilePage",[\s\S]*?isPartOf:\s*\{\s*"@id": WEBSITE_ID\s*\}/,
    );
  });

  it("describes the Person with copy the page actually renders", () => {
    assert.match(
      source,
      /"@type": "Person",\s*"@id": PERSON_ID,[\s\S]*?description: ELIJAH\.profileDescription/,
    );
  });

  it("does not redeclare properties the layout's Person stub already owns", () => {
    // Isolate the Person node's own object literal — from its opening brace
    // up to the ProfilePage node that follows it in the @graph array — so
    // this only inspects the Person node, not the rest of the file (where
    // ELIJAH.name/ELIJAH.role legitimately appear: page title, metadata,
    // visible copy). The layout stub (src/app/layout.tsx) is the sole
    // owner of name, url, and jobTitle on the shared @id; redeclaring any of
    // them here would risk two JSON-LD blocks asserting different values
    // (e.g. url: SITE_URL vs. url: absoluteUrl("/about")) for one @id.
    const personNodeMatch = source.match(
      /"@type": "Person",\s*"@id": PERSON_ID,[\s\S]*?(?=\{\s*"@type": "ProfilePage")/,
    );
    assert.ok(personNodeMatch, "expected to find the Person node literal");
    const personNode = personNodeMatch[0];

    // Check only the Person node's own (depth-6-indented) keys, not keys
    // nested inside its `alumniOf` (CollegeOrUniversity `name`) or `address`
    // (PostalAddress) sub-objects, which sit one indent level deeper and are
    // legitimately unrelated to the layout stub's name/url/jobTitle.
    const topLevelKeys = personNode.match(/^ {6}[A-Za-z@"][\w"]*:/gm) ?? [];
    assert.ok(
      topLevelKeys.length > 0,
      "expected to find the Person node's top-level keys",
    );
    for (const owned of ["name:", "url:", "jobTitle:"]) {
      assert.ok(
        !topLevelKeys.some((key) => key.endsWith(owned)),
        `Person node must not redeclare "${owned}" — it's owned by the layout stub`,
      );
    }
  });

  it("honors the privacy decisions", () => {
    assert.doesNotMatch(source, /worksFor/);
    assert.doesNotMatch(source, /email/);
  });

  it("escapes the JSON-LD payload", () => {
    assert.match(source, /replace\(\/</);
  });
});

describe("/about visible content backs the schema", () => {
  it("renders the bio, identity answer, pillars, locality, and identity links", () => {
    assert.match(source, /ELIJAH\.longBio/);
    assert.match(source, /UI_COPY\.docs\.identityHeading\(ELIJAH\.name\)/);
    assert.match(source, /ELIJAH\.metadataDescription/);
    assert.match(source, /ELIJAH\.pillars/);
    assert.match(source, /ELIJAH\.location\.locality/);
    assert.match(source, /ELIJAH\.education/);
    assert.match(source, /ELIJAH\.contact\.github/);
    assert.match(source, /ELIJAH\.contact\.linkedin/);
    assert.match(source, /spotifyArtistUrl/);
    assert.match(source, /<time dateTime=\{ELIJAH\.updated\.about\}>/);
  });

  it("renders direct recruiter questions from the same public answer records Ask Elijah uses", () => {
    assert.match(source, /UI_COPY\.docs\.answersHeading\(ELIJAH\.name\)/);
    assert.match(source, /aria-label=\{UI_COPY\.docs\.answersAriaLabel\(ELIJAH\.name\)\}/);
    assert.match(source, /href=\{aboutAnswerRoute\(answer\.id\)\}/);
    assert.match(source, /<section id=\{answer\.id\} key=\{answer\.id\}>/);
    assert.match(source, /<h2>\{answer\.question\}<\/h2>\s*<p>\{answer\.answer\}<\/p>/);
    assert.match(source, /answer\.evidence\.map/);
  });

  it("renders exactly one h1, via DocPage", () => {
    assert.match(source, /<DocPage/);
    assert.doesNotMatch(source, /<h1/);
  });
});
