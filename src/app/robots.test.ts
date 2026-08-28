import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { robotsFor } from "@/app/robots";
import { SITE_URL } from "@/lib/site-url";

describe("robots", () => {
  it("blocks preview and local copies so they cannot compete with production", () => {
    assert.deepEqual(robotsFor(false), {
      rules: { userAgent: "*", disallow: "/" },
    });
  });

  it("allows production documents while excluding API endpoints", () => {
    assert.deepEqual(robotsFor(true), {
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
      host: SITE_URL,
    });
  });
});
