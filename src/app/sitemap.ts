// sitemap.xml (Next file convention).
//
// `priority` and `changeFrequency` are deliberately absent: Google ignores both.
// `lastModified` comes from the hand-maintained dates in ELIJAH.updated: the
// site root uses the newest of the three, /about /projects /resume each use
// their own, and every /projects/[id] case study reuses ELIJAH.updated.projects
// (there is no per-case-study date) — never from build time or file mtime,
// which would report fabricated freshness on every deploy.
//
// /m/[code] stays out: it is unbounded user-generated URL space.

import type { MetadataRoute } from "next";
import { ELIJAH } from "@/lib/elijah";
import { CASE_STUDIES } from "@/lib/case-studies";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { PUBLIC_ROUTES, projectRoute } from "@/lib/public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const dates = Object.values(ELIJAH.updated);
  const newest = dates.reduce((a, b) => (a > b ? a : b));

  return [
    { url: SITE_URL, lastModified: new Date(newest) },
    {
      url: absoluteUrl(PUBLIC_ROUTES.about),
      lastModified: new Date(ELIJAH.updated.about),
    },
    {
      url: absoluteUrl(PUBLIC_ROUTES.projects),
      lastModified: new Date(ELIJAH.updated.projects),
    },
    {
      url: absoluteUrl(PUBLIC_ROUTES.resume),
      lastModified: new Date(ELIJAH.updated.resume),
    },
    ...Object.keys(CASE_STUDIES).map((id) => ({
      url: absoluteUrl(projectRoute(id)),
      lastModified: new Date(ELIJAH.updated.projects),
    })),
  ];
}
