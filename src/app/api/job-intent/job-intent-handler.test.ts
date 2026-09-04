import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RateLimiter } from "@/lib/ratelimit";
import {
  handleJobIntentRequest,
  validateJobUrl,
} from "./job-intent-handler";

const JOB_HTML = `<html><head>
  <script type="application/ld+json">${JSON.stringify({
    "@type": "JobPosting",
    title: "AI Engineer",
    hiringOrganization: { name: "Example Corp" },
    description:
      "<h3>Requirements</h3><ul><li>Experience with TypeScript</li></ul>",
  })}</script></head><body></body></html>`;

function openLimiter(overrides: Partial<RateLimiter> = {}): RateLimiter {
  return {
    consumePerIp: () => true,
    consumeGlobal: () => true,
    ...overrides,
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/job-intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function htmlResponse(html: string, contentType = "text/html; charset=utf-8") {
  return new Response(html, {
    status: 200,
    headers: { "content-type": contentType },
  });
}

describe("validateJobUrl", () => {
  it("accepts plain public http(s) URLs", () => {
    assert.ok(validateJobUrl("https://boards.example.com/jobs/123"));
    assert.ok(validateJobUrl("http://example.com/careers"));
  });

  it("rejects everything that is not a public web origin", () => {
    const blocked = [
      "notaurl",
      "ftp://example.com/file",
      "javascript:alert(1)",
      "https://user:pass@example.com/",
      "https://localhost/jobs",
      "https://foo.localhost/jobs",
      "https://intranet/jobs",
      "https://printer.local/jobs",
      "https://vault.internal/jobs",
      "https://127.0.0.1/jobs",
      "https://10.1.2.3/jobs",
      "https://192.168.1.1/jobs",
      "https://172.16.0.9/jobs",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/jobs",
      "https://example.com:8080/jobs",
    ];
    for (const url of blocked) {
      assert.equal(validateJobUrl(url), null, url);
    }
  });
});

describe("handleJobIntentRequest", () => {
  it("extracts job details through a fake fetch", async () => {
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://boards.example.com/jobs/123" }),
      {
        fetchImpl: async () => htmlResponse(JOB_HTML),
        limiter: openLimiter(),
      },
    );
    assert.equal(response.status, 200);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload.ok, true);
    assert.equal(payload.host, "boards.example.com");
    assert.equal(payload.jobTitle, "AI Engineer");
    assert.equal(payload.organization, "Example Corp");
    assert.deepEqual(payload.priorities, ["Experience with TypeScript"]);
  });

  it("follows a same-rules redirect and reports the final host", async () => {
    const calls: string[] = [];
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://short.example.com/j/1" }),
      {
        fetchImpl: async (input) => {
          const url = String(input);
          calls.push(url);
          if (url.startsWith("https://short.example.com")) {
            return new Response(null, {
              status: 302,
              headers: { location: "https://boards.example.com/jobs/123" },
            });
          }
          return htmlResponse(JOB_HTML);
        },
        limiter: openLimiter(),
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload.ok, true);
    assert.equal(payload.host, "boards.example.com");
    assert.equal(calls.length, 2);
  });

  it("refuses a redirect that points at a blocked target", async () => {
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://short.example.com/j/1" }),
      {
        fetchImpl: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest/meta-data" },
          }),
        limiter: openLimiter(),
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(payload, { ok: false, reason: "fetch-failed" });
  });

  it("rejects blocked URLs before any fetch happens", async () => {
    let fetched = false;
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://127.0.0.1/admin" }),
      {
        fetchImpl: async () => {
          fetched = true;
          return htmlResponse(JOB_HTML);
        },
        limiter: openLimiter(),
      },
    );
    assert.equal(response.status, 400);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(payload, { ok: false, reason: "blocked-url" });
    assert.equal(fetched, false);
  });

  it("rejects non-HTML responses", async () => {
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://boards.example.com/jobs.json" }),
      {
        fetchImpl: async () =>
          htmlResponse('{"job": true}', "application/json"),
        limiter: openLimiter(),
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(payload, { ok: false, reason: "fetch-failed" });
  });

  it("reports no-details when a page has nothing job-shaped", async () => {
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://boards.example.com/empty" }),
      {
        fetchImpl: async () =>
          htmlResponse("<html><body><p>nothing here</p></body></html>"),
        limiter: openLimiter(),
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(payload, { ok: false, reason: "no-details" });
  });

  it("returns 429 when the per-IP budget is exhausted", async () => {
    const response = await handleJobIntentRequest(
      jsonRequest({ url: "https://boards.example.com/jobs/123" }),
      {
        fetchImpl: async () => htmlResponse(JOB_HTML),
        limiter: openLimiter({ consumePerIp: () => false }),
      },
    );
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "60");
  });

  it("returns invalid-url for a missing or non-string url", async () => {
    for (const body of [{}, { url: 42 }, { url: "   " }]) {
      const response = await handleJobIntentRequest(jsonRequest(body), {
        fetchImpl: async () => htmlResponse(JOB_HTML),
        limiter: openLimiter(),
      });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as Record<string, unknown>;
      assert.deepEqual(payload, { ok: false, reason: "invalid-url" });
    }
  });
});
