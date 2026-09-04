// Server-side fetch for the workspace's "paste a job link" control.
//
// Browsers can't fetch arbitrary job boards cross-origin, so this route
// fetches the page once and returns only the extracted ingredients (title,
// organization, requirement bullets). Nothing is persisted or logged beyond
// the shared rate-limit counters — the pasted URL passes through this
// instance's memory and is gone (AGENTS.md: no query logging, visit context
// stays browser-local).
//
// Because this is a URL-fetching proxy, it refuses URL shapes that don't
// look like a plain public web origin: http(s) only, no credentials in the
// URL, no IP literals, no intranet-style single-label names, default ports
// only, and every redirect hop is re-validated against the same rules. The
// checks are name-based and do not resolve DNS, so a public hostname pointed
// at a private address is outside this guard; the serverless deployment
// gives the function no privileged internal network to reach.

import { clientIpKey, createRateLimiter, type RateLimiter } from "@/lib/ratelimit";
import type {
  JobIntentFailureReason,
  JobIntentPayload,
} from "@/lib/job-intent-payload";
import { readJsonBody } from "@/lib/request-body";
import { extractJobIntent } from "./extract-job-intent";

export type JobIntentHandlerDependencies = {
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
  now?: () => number;
  trustProxyHeaders?: boolean;
  timeoutMs?: number;
};

const MAX_BODY_BYTES = 4_096;
const MAX_URL_LENGTH = 2_048;
const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
// Each request costs an outbound fetch, so budgets sit well below weather's.
const RATE_LIMIT_MAX_PER_IP = 6;
const RATE_LIMIT_GLOBAL_CAP = 20;

const jobIntentLimiter = createRateLimiter({
  namespace: "job-intent",
  perIp: { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_PER_IP },
  global: { windowMs: RATE_LIMIT_WINDOW_MS, cap: RATE_LIMIT_GLOBAL_CAP },
});

const PRIVATE_IPV4_RE =
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    return true;
  }
  // IPv6 literal (URL hostname keeps the brackets' inner colons).
  if (host.includes(":")) return true;
  // IPv4 literal: public or not, job postings live on names, not addresses.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (PRIVATE_IPV4_RE.test(host)) return true;
  // Single-label names are intranet-style; public sites have a dot.
  if (!host.includes(".")) return true;
  return false;
}

// null when the URL is not fetchable under this proxy's rules.
export function validateJobUrl(raw: string): URL | null {
  if (raw.length > MAX_URL_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  if (isBlockedHostname(url.hostname)) return null;
  return url;
}

function failure(
  reason: JobIntentFailureReason,
  status: number,
  headers?: Record<string, string>,
): Response {
  return Response.json(
    { ok: false, reason } satisfies JobIntentPayload,
    { status, headers },
  );
}

async function readHtmlCapped(response: Response): Promise<string> {
  const body = response.body;
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total >= MAX_HTML_BYTES) {
      // Enough page to hold <head> metadata and the posting body; JSON-LD
      // and requirement lists live early. Cancel the rest.
      await reader.cancel();
      break;
    }
  }
  const bytes = new Uint8Array(Math.min(total, MAX_HTML_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const room = bytes.length - offset;
    if (room <= 0) break;
    bytes.set(room >= chunk.byteLength ? chunk : chunk.subarray(0, room), offset);
    offset += Math.min(room, chunk.byteLength);
  }
  return new TextDecoder().decode(bytes);
}

async function fetchJobPage(
  url: URL,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ html: string; finalUrl: URL } | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    // The timer covers the whole hop — headers and body. A server that
    // returns headers quickly and then trickles the body must not pin the
    // function; aborting also cancels the in-flight body stream.
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "ElijahOS/1.0 (job-intent reader)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        const next = validateJobUrl(new URL(location, current).toString());
        if (!next) return null;
        current = next;
        continue;
      }
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") ?? "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        return null;
      }
      return { html: await readHtmlCapped(response), finalUrl: current };
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function handleJobIntentRequest(
  req: Request,
  dependencies: JobIntentHandlerDependencies = {},
): Promise<Response> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const limiter = dependencies.limiter ?? jobIntentLimiter;
  const now = (dependencies.now ?? Date.now)();
  const trustProxyHeaders =
    dependencies.trustProxyHeaders ?? process.env.VERCEL === "1";
  const timeoutMs = dependencies.timeoutMs ?? FETCH_TIMEOUT_MS;

  if (!limiter.consumePerIp(clientIpKey(req, trustProxyHeaders), now)) {
    return failure("rate-limited", 429, { "Retry-After": "60" });
  }

  const body = await readJsonBody(req, { maxBytes: MAX_BODY_BYTES });
  if (!body.ok) return failure("invalid-url", 400);
  const rawUrl =
    typeof body.value === "object" &&
    body.value !== null &&
    typeof (body.value as Record<string, unknown>).url === "string"
      ? ((body.value as Record<string, unknown>).url as string).trim()
      : null;
  if (!rawUrl) return failure("invalid-url", 400);

  const url = validateJobUrl(rawUrl);
  if (!url) {
    // Distinguish "not a URL" from "a URL this proxy refuses" so the
    // workspace can say which happened.
    let parses = false;
    try {
      new URL(rawUrl);
      parses = rawUrl.length <= MAX_URL_LENGTH;
    } catch {
      parses = false;
    }
    return failure(parses ? "blocked-url" : "invalid-url", 400);
  }

  // Outbound fetches are the real cost; the global cap stops rotating IPs
  // from turning this instance into a crawler.
  if (!limiter.consumeGlobal(now)) {
    return failure("rate-limited", 429, { "Retry-After": "60" });
  }

  try {
    const page = await fetchJobPage(url, fetchImpl, timeoutMs);
    if (!page) return failure("fetch-failed", 200);
    const extraction = extractJobIntent(page.html);
    if (!extraction) return failure("no-details", 200);
    return Response.json({
      ok: true,
      host: page.finalUrl.hostname,
      jobTitle: extraction.jobTitle,
      organization: extraction.organization,
      priorities: extraction.priorities,
    } satisfies JobIntentPayload);
  } catch {
    return failure("fetch-failed", 200);
  }
}
