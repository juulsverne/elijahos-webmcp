import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sitemap from "@/app/sitemap";
import { CASE_STUDIES } from "@/lib/case-studies";
import { ELIJAH } from "@/lib/elijah";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { PUBLIC_ROUTES, projectRoute } from "@/lib/public-routes";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it("includes every document route", () => {
    for (const path of [
      PUBLIC_ROUTES.about,
      PUBLIC_ROUTES.projects,
      PUBLIC_ROUTES.resume,
    ]) {
      assert.ok(
        urls.some((url) => url.endsWith(path)),
        `missing ${path}`,
      );
    }
  });

  it("includes one detail URL per case study and no others", () => {
    const detail = urls.filter((url) => url.includes("/projects/"));
    assert.equal(detail.length, Object.keys(CASE_STUDIES).length);
    for (const id of Object.keys(CASE_STUDIES)) {
      assert.ok(urls.includes(absoluteUrl(projectRoute(id))));
    }
  });

  it("omits priority and changeFrequency, which Google ignores", () => {
    for (const entry of entries) {
      assert.equal(entry.priority, undefined);
      assert.equal(entry.changeFrequency, undefined);
    }
  });

  it("sets lastModified from hand-maintained dates, never build time", () => {
    for (const entry of entries) {
      assert.ok(entry.lastModified, `${entry.url} has no lastModified`);
    }
  });

  it("emits exactly the expected URL set — root, three document routes, and one per case study", () => {
    const expected = new Set([
      SITE_URL,
      absoluteUrl(PUBLIC_ROUTES.about),
      absoluteUrl(PUBLIC_ROUTES.projects),
      absoluteUrl(PUBLIC_ROUTES.resume),
      ...Object.keys(CASE_STUDIES).map((id) => absoluteUrl(projectRoute(id))),
    ]);
    assert.equal(urls.length, expected.size, "unexpected entry count");
    assert.deepEqual(new Set(urls), expected);
  });

  it("keeps /m/[code] out of the sitemap — it is unbounded user-generated space", () => {
    assert.ok(urls.every((url) => !url.includes("/m/")));
  });

  it("contains no fragments — recruiter answers share the canonical /about URL", () => {
    assert.ok(urls.every((url) => !url.includes("#")));
  });

  it("derives each document route's lastModified from its own ELIJAH.updated date", () => {
    const byUrl = new Map(entries.map((e) => [e.url, e.lastModified]));

    assert.equal(
      (byUrl.get(absoluteUrl(PUBLIC_ROUTES.about)) as Date).getTime(),
      new Date(ELIJAH.updated.about).getTime(),
    );
    assert.equal(
      (byUrl.get(absoluteUrl(PUBLIC_ROUTES.projects)) as Date).getTime(),
      new Date(ELIJAH.updated.projects).getTime(),
    );
    assert.equal(
      (byUrl.get(absoluteUrl(PUBLIC_ROUTES.resume)) as Date).getTime(),
      new Date(ELIJAH.updated.resume).getTime(),
    );
    for (const id of Object.keys(CASE_STUDIES)) {
      assert.equal(
        (byUrl.get(absoluteUrl(projectRoute(id))) as Date).getTime(),
        new Date(ELIJAH.updated.projects).getTime(),
      );
    }
  });

  it("sets the root URL's lastModified to the newest of the hand-maintained dates", () => {
    const newest = Object.values(ELIJAH.updated).reduce((a, b) => (a > b ? a : b));
    const root = entries.find((entry) => entry.url === SITE_URL);
    assert.ok(root, "root entry missing");
    assert.equal((root!.lastModified as Date).getTime(), new Date(newest).getTime());
  });

  it("emits only url and lastModified keys on every entry", () => {
    for (const entry of entries) {
      assert.deepEqual(Object.keys(entry).sort(), ["lastModified", "url"]);
    }
  });
});
