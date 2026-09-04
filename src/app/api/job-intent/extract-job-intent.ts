// Deterministic extraction of visit-intent ingredients from a job posting
// page. No model calls and no guessing beyond stated heuristics, so the
// visitor can predict what a given page yields:
//
//   1. schema.org JobPosting JSON-LD when the page embeds it (most job
//      boards do): title, hiring organization, and requirement bullets
//      pulled from the posting's own description.
//   2. Otherwise: og:title / <title> plus <li> bullets that follow a
//      requirements-style heading in the page body.
//
// Extraction returns raw ingredients only — composing them into a visit
// intent (and storing it) stays in the workspace UI, where the human
// reviews the draft before setting anything.

import {
  CONTEXT_LABEL_MAX,
  PRIORITIES_MAX,
  PRIORITY_MAX,
} from "@/lib/webmcp/visit-intent";

export type JobIntentExtraction = {
  jobTitle: string | null;
  organization: string | null;
  priorities: string[];
  via: "json-ld" | "html";
};

const ORGANIZATION_MAX = 80;

// -- Small HTML helpers (regex-based on purpose: no DOM in a route handler,
// -- and a dependency-free parser keeps this auditable like schema.ts). ----

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(
      /&([a-z]+);/gi,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );
}

function collapseInline(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function truncate(text: string | null, max: number): string | null {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

type Line = { text: string; bullet: boolean };

// Delimited with a control character so page text can never collide.
const LI_MARKER = "\u0001li\u0001";

// Flattens an HTML fragment into trimmed text lines, remembering which lines
// were <li> items — those are the requirement-bullet candidates.
function htmlToLines(html: string): Line[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<li\b[^>]*>/gi, `\n${LI_MARKER}`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(li|p|div|h[1-6]|tr|ul|ol|section|article)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return text
    .split("\n")
    .map((line) => {
      const bullet = line.includes(LI_MARKER);
      const cleaned = collapseInline(line.split(LI_MARKER).join(" "));
      return { text: cleaned, bullet };
    })
    .filter((line) => line.text.length > 0);
}

// -- JSON-LD JobPosting ----------------------------------------------------

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(re)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Malformed embedded JSON is common; skip the block.
    }
  }
  return blocks;
}

function isJobPosting(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as Record<string, unknown>)["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (t) => typeof t === "string" && t.toLowerCase() === "jobposting",
  );
}

function findJobPosting(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 4 || typeof value !== "object" || value === null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (isJobPosting(value)) return value;
  const graph = (value as Record<string, unknown>)["@graph"];
  return graph ? findJobPosting(graph, depth + 1) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function organizationName(value: unknown): string | null {
  if (typeof value === "object" && value !== null) {
    return asString((value as Record<string, unknown>).name);
  }
  return asString(value);
}

// -- Requirement bullets ---------------------------------------------------

const HEADING_RE =
  /(requirements?|qualifications?|must[- ]haves?|looking for|about you|what you.{0,12}(need|bring|do)|your (skills|profile|experience)|skills)/i;

// Words that make a bullet look like a job requirement rather than nav
// chrome ("Home", "Cookie settings") when scanning a whole page.
const REQUIREMENT_WORD_RE =
  /(experience|years?|proficien|knowledge|familiar|degree|skills?|build|design|develop|ship|work|strong|excellent|ability|understand)/i;

function pickPriorities(lines: Line[], strict: boolean): string[] {
  const headingIdx = lines.findIndex(
    (l) => !l.bullet && l.text.length <= 80 && HEADING_RE.test(l.text),
  );
  const pool = headingIdx >= 0 ? lines.slice(headingIdx + 1) : lines;
  const bullets = pool.filter((l) => l.bullet).map((l) => l.text);
  const plausible = bullets.filter((text) => {
    if (text.length < 8) return false;
    if (!strict || headingIdx >= 0) return true;
    // Whole-page scan with no requirements heading found: only keep bullets
    // that read like requirements, so nav links don't become priorities.
    return REQUIREMENT_WORD_RE.test(text) && text.length >= 24;
  });
  return plausible
    .slice(0, PRIORITIES_MAX)
    .map((text) =>
      text.length > PRIORITY_MAX
        ? `${text.slice(0, PRIORITY_MAX - 1).trimEnd()}…`
        : text,
    );
}

// -- Fallback title/site metadata -------------------------------------------

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    const value = match ? collapseInline(match[1]) : "";
    if (value) return value;
  }
  return null;
}

function titleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  const value = match ? collapseInline(match[1]) : "";
  return value || null;
}

// -- Entry point -------------------------------------------------------------

export function extractJobIntent(html: string): JobIntentExtraction | null {
  for (const block of jsonLdBlocks(html)) {
    const posting = findJobPosting(block);
    if (!posting) continue;
    const jobTitle = truncate(
      asString(posting.title) ? collapseInline(posting.title as string) : null,
      CONTEXT_LABEL_MAX,
    );
    const organization = truncate(
      organizationName(posting.hiringOrganization)
        ? collapseInline(organizationName(posting.hiringOrganization) as string)
        : null,
      ORGANIZATION_MAX,
    );
    const description = asString(posting.description);
    const priorities = description
      ? pickPriorities(htmlToLines(description), false)
      : [];
    if (jobTitle || priorities.length > 0) {
      return { jobTitle, organization, priorities, via: "json-ld" };
    }
  }

  const jobTitle = truncate(
    metaContent(html, "og:title") ?? titleTag(html),
    CONTEXT_LABEL_MAX,
  );
  const organization = truncate(
    metaContent(html, "og:site_name"),
    ORGANIZATION_MAX,
  );
  const priorities = pickPriorities(htmlToLines(html), true);
  if (!jobTitle && priorities.length === 0) return null;
  return { jobTitle, organization, priorities, via: "html" };
}
