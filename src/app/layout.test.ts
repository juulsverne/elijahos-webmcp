import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const layoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

describe("RootLayout privacy boundary", () => {
  it("does not wire analytics into the clean challenge export", () => {
    assert.doesNotMatch(layoutSource, /@vercel\/analytics/);
    assert.doesNotMatch(layoutSource, /@vercel\/speed-insights/);
    assert.doesNotMatch(layoutSource, /ANALYTICS_ENABLED/);
  });
});

describe("RootLayout professional metadata", () => {
  it("uses the current identity for search and social metadata", () => {
    assert.match(
      layoutSource,
      /const PAGE_TITLE = `\$\{ELIJAH\.name\} \| \$\{ELIJAH\.role\}`/,
    );
    assert.match(layoutSource, /description: ELIJAH\.metadataDescription/);
    assert.match(layoutSource, /openGraph:\s*\{[\s\S]*title: PAGE_TITLE/);
    assert.match(layoutSource, /twitter:\s*\{[\s\S]*title: PAGE_TITLE/);
  });

  it("emits a WebSite node and a minimal Person stub", () => {
    assert.match(layoutSource, /"@type": "WebSite"/);
    assert.match(layoutSource, /"@id": WEBSITE_ID/);
    assert.match(layoutSource, /"@type": "Person"/);
    assert.match(layoutSource, /"@id": PERSON_ID/);
    assert.match(layoutSource, /jobTitle: ELIJAH\.role/);
    assert.match(layoutSource, /type="application\/ld\+json"/);
    assert.doesNotMatch(layoutSource, /worksFor:/);
  });

  it("leaves the full Person to /about, where its facts are visible", () => {
    // address, alumniOf, and knowsAbout only belong on the page that
    // renders them. Google's structured-data policy forbids marking up
    // information a reader cannot see.
    assert.doesNotMatch(layoutSource, /alumniOf/);
    assert.doesNotMatch(layoutSource, /PostalAddress/);
    assert.doesNotMatch(layoutSource, /knowsAbout/);
  });

  it("supports optional Search Console and Bing verification without hardcoded tokens", () => {
    assert.match(layoutSource, /process\.env\.GOOGLE_SITE_VERIFICATION/);
    assert.match(layoutSource, /process\.env\.BING_SITE_VERIFICATION/);
    assert.match(layoutSource, /"msvalidate\.01"/);
    assert.match(layoutSource, /verification: SITE_VERIFICATION/);
  });
});
