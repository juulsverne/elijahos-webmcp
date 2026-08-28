import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(join(process.cwd(), "src/app/resume/page.tsx"), "utf8");

describe("/resume", () => {
  it("sets its own canonical, OpenGraph, and Twitter data", () => {
    assert.match(source, /alternates:\s*\{\s*canonical: PUBLIC_ROUTES\.resume/);
    assert.match(source, /openGraph:\s*\{/);
    assert.match(source, /twitter:\s*\{/);
  });

  it("renders every experience entry's role, employer, dates, and description", () => {
    assert.match(source, /ELIJAH\.experience\.map/);
    // Checking the fields individually would pass even if the entry weren't
    // actually rendered inside the .map callback, so require them anchored to
    // an <article> built from `entry`.
    assert.match(
      source,
      /ELIJAH\.experience\.map\(\s*\(entry\)\s*=>[\s\S]*?entry\.role[\s\S]*?entry\.co[\s\S]*?entry\.when[\s\S]*?entry\.what/,
    );
  });

  it("renders every education entry's school and degree", () => {
    assert.match(source, /ELIJAH\.education\.map/);
    assert.match(
      source,
      /ELIJAH\.education\.map\(\s*\(entry\)\s*=>[\s\S]*?entry\.school[\s\S]*?entry\.degree/,
    );
  });

  it("emits hasOccupation derived from the same experience entries it renders, and a WebPage pointing at the Person", () => {
    // A regex that only checks the token "hasOccupation" appears somewhere
    // would still pass if it were hardcoded to a static array, which is
    // exactly the fact this schema must not assert falsely. Require it to be
    // built from ELIJAH.experience with name/description pulled from the
    // real role and description fields.
    assert.match(
      source,
      /hasOccupation:\s*ELIJAH\.experience\.map\(\s*\(entry\)\s*=>\s*\(\{[\s\S]*?"@type":\s*"Occupation"[\s\S]*?name:\s*entry\.role[\s\S]*?description:\s*entry\.what[\s\S]*?\}\)\)/,
    );
    // /about owns the canonical ProfilePage for PERSON_ID; /resume must not
    // declare a second one — a WebPage that points at the same entity is not
    // the self-contradictory "two profile pages, one entity" claim.
    assert.doesNotMatch(source, /"@type": "ProfilePage"/);
    assert.match(source, /"@type": "WebPage"/);
    assert.match(source, /mainEntity:\s*\{\s*"@id": PERSON_ID\s*\}/);
  });

  it("links the page node back to the WebSite node", () => {
    assert.match(
      source,
      /"@type": "WebPage",[\s\S]*?isPartOf:\s*\{\s*"@id": WEBSITE_ID\s*\}/,
    );
  });

  it("describes itself with the résumé lede it actually renders, not the site-wide description", () => {
    assert.match(source, /description: ELIJAH\.shortPositioning/);
    assert.match(
      source,
      /openGraph:\s*\{[\s\S]*?description: ELIJAH\.shortPositioning/,
    );
    assert.match(
      source,
      /twitter:\s*\{[\s\S]*?description: ELIJAH\.shortPositioning/,
    );
  });

  it("honors the privacy decisions", () => {
    assert.doesNotMatch(source, /worksFor/);
    assert.doesNotMatch(source, /email/);
  });

  it("escapes the JSON-LD payload", () => {
    assert.match(source, /replace\(\/</);
  });

  it("renders exactly one h1, via DocPage", () => {
    assert.match(source, /<DocPage/);
    assert.doesNotMatch(source, /<h1/);
  });
});
