import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(join(process.cwd(), "src/app/projects/page.tsx"), "utf8");

describe("/projects", () => {
  it("sets its own canonical, OpenGraph, and Twitter data", () => {
    assert.match(source, /alternates:\s*\{\s*canonical: PUBLIC_ROUTES\.projects/);
    assert.match(source, /openGraph:\s*\{/);
    assert.match(source, /twitter:\s*\{/);
  });

  it("renders every project in full, not as teasers", () => {
    assert.match(source, /ELIJAH\.projects\.map/);
    assert.match(source, /project\.desc/);
    assert.match(source, /project\.stack/);
    assert.match(source, /project\.result/);
    assert.match(source, /project\.year/);
  });

  it("links to a detail page only where a case study exists", () => {
    // The gate must be computed from CASE_STUDIES...
    assert.match(source, /const hasCaseStudy = Boolean\(CASE_STUDIES\[project\.id\]\)/);
    // ...and the <Link> must actually be conditional on that gate. A regression
    // that drops the `hasCaseStudy &&` guard would link every project (thin
    // duplicate pages), so this has to check the JSX is gated, not just that
    // the substring "CASE_STUDIES[" appears somewhere in the file.
    assert.match(source, /\{hasCaseStudy &&\s*\(\s*<p>\s*<Link/);
  });

  it("renders exactly one h1, via DocPage", () => {
    assert.match(source, /<DocPage/);
    assert.doesNotMatch(source, /<h1/);
  });

  it("emits a CollectionPage node describing this page and its entity graph position", () => {
    // /projects had 2,261 chars of content, was in the sitemap, and was
    // linked from every doc route — but emitted no structured data at all.
    assert.match(source, /"@type": "CollectionPage"/);
    assert.match(source, /"@id": absoluteUrl\(PUBLIC_ROUTES\.projects\)/);
    assert.match(source, /about:\s*\{\s*"@id": PERSON_ID\s*\}/);
    assert.match(source, /isPartOf:\s*\{\s*"@id": WEBSITE_ID\s*\}/);
  });

  it("escapes the JSON-LD payload", () => {
    assert.match(source, /replace\(\/</);
  });
});
