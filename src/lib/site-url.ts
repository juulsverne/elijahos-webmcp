// Single source of truth for the site's absolute origin and its schema.org
// entity ids.
//
// The `NEXT_PUBLIC_SITE_URL ?? ELIJAH.siteUrl` expression previously appeared
// in layout.tsx, robots.ts, and sitemap.ts. Per AGENTS.md, a value shared
// across files gets one named home rather than N copies that can drift.
//
// The env override is what makes preview deploys point at the right host; the
// ELIJAH value is the build-time fallback and the real launch domain.

import { ELIJAH } from "@/lib/elijah";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || ELIJAH.siteUrl
).replace(/\/+$/, "");

/**
 * Absolute URL for a site-root-relative path.
 * `absoluteUrl("/about")` -> "https://www.elijahos.com/about"
 *
 * Rejects anything that isn't site-root-relative. WHATWG `URL` treats a
 * leading `//` as a network-path reference and resolves it against that
 * foreign scheme/host instead of `SITE_URL` — `absoluteUrl("//evil.example.com/x")`
 * would silently return `"https://evil.example.com/x"`. Every call site today
 * passes a static literal path, so this is hardening against future dynamic
 * input, not a fix for a live bug.
 */
export function absoluteUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(
      `absoluteUrl: path must be site-root-relative (start with exactly one "/"), got ${JSON.stringify(path)}`,
    );
  }
  return new URL(path, SITE_URL).toString();
}

// Stable JSON-LD @id anchors. Every route that emits structured data
// references these rather than repeating the person/site as a fresh node, so
// separately-specified items resolve to one entity.
export const PERSON_ID = `${SITE_URL}/#elijah`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
