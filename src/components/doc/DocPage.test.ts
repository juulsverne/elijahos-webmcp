import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/components/doc/DocPage.tsx"),
  "utf8",
);

// Every route test (`/about`, `/projects`, `/projects/[id]`, `/resume`)
// asserts `doesNotMatch(/<h1/)` on the ROUTE — proving the route itself
// doesn't add a second one — but nothing asserts DocPage actually EMITS one.
// Deleting the <h1> from DocPage.tsx would leave all four "exactly one h1"
// route tests green while every doc route shipped zero <h1>. Same logic for
// the sibling nav: it's the anti-orphan mechanism for the whole route set,
// and was untested.
describe("DocPage", () => {
  it("emits exactly one h1", () => {
    const h1Matches = source.match(/<h1[\s>]/g) ?? [];
    assert.equal(h1Matches.length, 1);
  });

  it("links to all three sibling documents via stable public routes", () => {
    assert.match(source, /href=\{PUBLIC_ROUTES\.about\}/);
    assert.match(source, /href=\{PUBLIC_ROUTES\.projects\}/);
    assert.match(source, /href=\{PUBLIC_ROUTES\.resume\}/);
  });

  it("links back to the OS shell at the site root", () => {
    assert.match(source, /<Link className=\{s\.brand\} href=\{PUBLIC_ROUTES\.home\}/);
  });

  it("renders the breadcrumb nav only when crumbs are supplied", () => {
    assert.match(source, /\{crumbs && crumbs\.length > 0 && \(/);
    assert.match(source, /<ol className=\{s\.crumbs\}>/);
  });
});
