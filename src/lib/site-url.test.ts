import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { SITE_URL, absoluteUrl, PERSON_ID, WEBSITE_ID } from "@/lib/site-url";
import { ELIJAH } from "@/lib/elijah";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

describe("site-url", () => {
  it("resolves an absolute origin with no trailing slash", () => {
    assert.match(SITE_URL, /^https:\/\/[^/]+$/);
  });

  it("defaults the identity record to the redirect destination, not the apex alias", () => {
    assert.equal(new URL(ELIJAH.siteUrl).hostname, "www.elijahos.com");
  });

  it("builds absolute URLs from root-relative paths", () => {
    assert.equal(absoluteUrl(PUBLIC_ROUTES.about), `${SITE_URL}/about`);
    assert.equal(absoluteUrl("/projects/elijahos"), `${SITE_URL}/projects/elijahos`);
  });

  it("rejects a path with no leading slash instead of silently mis-resolving it", () => {
    assert.throws(() => absoluteUrl("about"));
  });

  it("rejects a protocol-relative path (leading //) so it can't silently change origin", () => {
    // WHATWG URL treats "//host/path" as a network-path reference and
    // resolves it against that foreign host rather than SITE_URL.
    assert.throws(() => absoluteUrl("//evil.example.com/x"));
  });

  it("exposes stable entity ids anchored to the origin", () => {
    assert.equal(PERSON_ID, `${SITE_URL}/#elijah`);
    assert.equal(WEBSITE_ID, `${SITE_URL}/#website`);
  });
});

describe("site-url is the only place the origin expression appears", () => {
  const files = ["src/app/layout.tsx", "src/app/robots.ts", "src/app/sitemap.ts"];

  for (const file of files) {
    it(`${file} imports SITE_URL instead of re-deriving it`, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      assert.doesNotMatch(source, /process\.env\.NEXT_PUBLIC_SITE_URL/);
      assert.match(source, /from "@\/lib\/site-url"/);
    });
  }
});
