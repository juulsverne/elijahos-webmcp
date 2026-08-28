// robots.txt (Next file convention). siteUrl resolves the same way as in
// layout.tsx.
//
// Production allows public documents for ordinary search crawlers and
// answer-engine search/user agents such as OAI-SearchBot, Claude-SearchBot,
// Claude-User, and PerplexityBot. Training controls are separate from search
// eligibility; the wildcard policy preserves the site's current permissive
// choice without implying that any bot guarantees inclusion or citation.
//
// Every other environment disallows everything. Vercel gives each preview
// deploy its own public URL, and those are a full copy of production — left
// crawlable they get indexed as duplicates competing with the real domain,
// and they leak unreleased work. VERCEL_ENV is set by Vercel to
// "production" | "preview" | "development"; it is undefined locally, so
// `npm run dev` and `npm run start` are treated as non-production too.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

export function robotsFor(isProduction: boolean): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

export default function robots(): MetadataRoute.Robots {
  return robotsFor(IS_PRODUCTION);
}
