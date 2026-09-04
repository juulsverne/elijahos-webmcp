import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRIORITY_MAX } from "@/lib/webmcp/visit-intent";
import { extractJobIntent } from "./extract-job-intent";

const JOB_POSTING_LD = {
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  title: "Staff AI Engineer",
  hiringOrganization: { "@type": "Organization", name: "Acme Robotics" },
  description:
    "<p>We build agents.</p><h3>Requirements</h3><ul>" +
    "<li>5+ years of TypeScript &amp; React experience</li>" +
    "<li>Experience shipping AI agent systems to production</li>" +
    "<li>Strong written communication</li>" +
    "<li>Familiarity with evals and observability</li>" +
    "<li>Bonus: WebMCP experience</li></ul>",
};

function pageWithJsonLd(ld: unknown): string {
  return `<!doctype html><html><head><title>Careers | Acme</title>
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
    </head><body><h1>Join us</h1></body></html>`;
}

describe("extractJobIntent", () => {
  it("reads title, organization, and requirement bullets from JobPosting JSON-LD", () => {
    const result = extractJobIntent(pageWithJsonLd(JOB_POSTING_LD));
    assert.ok(result);
    assert.equal(result.via, "json-ld");
    assert.equal(result.jobTitle, "Staff AI Engineer");
    assert.equal(result.organization, "Acme Robotics");
    assert.equal(result.priorities.length, 4); // capped at PRIORITIES_MAX
    assert.equal(
      result.priorities[0],
      "5+ years of TypeScript & React experience",
    );
  });

  it("finds a JobPosting nested in an @graph array", () => {
    const result = extractJobIntent(
      pageWithJsonLd({
        "@context": "https://schema.org/",
        "@graph": [{ "@type": "WebSite" }, JOB_POSTING_LD],
      }),
    );
    assert.ok(result);
    assert.equal(result.via, "json-ld");
    assert.equal(result.jobTitle, "Staff AI Engineer");
  });

  it("accepts an array @type containing JobPosting", () => {
    const result = extractJobIntent(
      pageWithJsonLd({ ...JOB_POSTING_LD, "@type": ["Thing", "JobPosting"] }),
    );
    assert.ok(result);
    assert.equal(result.jobTitle, "Staff AI Engineer");
  });

  it("skips malformed JSON-LD blocks and falls back to page HTML", () => {
    const html = `<html><head>
      <script type="application/ld+json">{not json</script>
      <meta property="og:title" content="Platform Engineer" />
      <meta property="og:site_name" content="Jobs at Example" />
      </head><body>
      <h2>What you'll need</h2>
      <ul><li>Experience running production Kubernetes clusters</li>
      <li>Comfort with on-call rotations and incident response</li></ul>
      </body></html>`;
    const result = extractJobIntent(html);
    assert.ok(result);
    assert.equal(result.via, "html");
    assert.equal(result.jobTitle, "Platform Engineer");
    assert.equal(result.organization, "Jobs at Example");
    assert.deepEqual(result.priorities, [
      "Experience running production Kubernetes clusters",
      "Comfort with on-call rotations and incident response",
    ]);
  });

  it("ignores nav-chrome bullets when no requirements heading exists", () => {
    const html = `<html><head><title>Some Role</title></head><body>
      <ul><li>Home</li><li>About us</li><li>Contact</li></ul>
      </body></html>`;
    const result = extractJobIntent(html);
    assert.ok(result);
    assert.equal(result.jobTitle, "Some Role");
    assert.deepEqual(result.priorities, []);
  });

  it("returns null when the page has neither a title nor bullets", () => {
    assert.equal(extractJobIntent("<html><body><p>hi</p></body></html>"), null);
  });

  it("caps overlong bullets at the priority limit", () => {
    const longBullet = "Deep experience with " + "distributed systems ".repeat(20);
    const result = extractJobIntent(
      pageWithJsonLd({
        ...JOB_POSTING_LD,
        description: `<h3>Requirements</h3><ul><li>${longBullet}</li></ul>`,
      }),
    );
    assert.ok(result);
    assert.equal(result.priorities.length, 1);
    assert.ok(result.priorities[0].length <= PRIORITY_MAX);
    assert.ok(result.priorities[0].endsWith("…"));
  });

  it("decodes entities and strips markup from titles", () => {
    const result = extractJobIntent(
      pageWithJsonLd({
        ...JOB_POSTING_LD,
        title: "Senior&nbsp;Engineer &amp; Team&#32;Lead",
      }),
    );
    assert.ok(result);
    assert.equal(result.jobTitle, "Senior Engineer & Team Lead");
  });
});
