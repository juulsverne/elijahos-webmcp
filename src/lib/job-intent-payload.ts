// Wire shape shared by the /api/job-intent route and its client (mirrors
// the weather-payload pattern): the server builds it with `satisfies`, the
// client re-narrows whatever JSON arrives so a malformed response can never
// leak `undefined` into the workspace UI.

export const JOB_INTENT_FAILURE_REASONS = [
  // The pasted text isn't an http(s) URL at all.
  "invalid-url",
  // The URL is syntactically fine but points somewhere this proxy refuses
  // to fetch (IP literals, localhost, intranet-style names, odd ports).
  "blocked-url",
  "rate-limited",
  // Network error, non-HTML response, or a non-2xx status from the site.
  "fetch-failed",
  // The page fetched fine but nothing job-posting-shaped could be read.
  "no-details",
] as const;

export type JobIntentFailureReason =
  (typeof JOB_INTENT_FAILURE_REASONS)[number];

export type JobIntentPayload =
  | {
      ok: true;
      // Hostname the details were pulled from, for the "pulled from X" line.
      host: string;
      jobTitle: string | null;
      organization: string | null;
      priorities: string[];
    }
  | { ok: false; reason: JobIntentFailureReason };

function isFailureReason(value: unknown): value is JobIntentFailureReason {
  return (
    typeof value === "string" &&
    (JOB_INTENT_FAILURE_REASONS as readonly string[]).includes(value)
  );
}

export function parseJobIntentPayload(value: unknown): JobIntentPayload {
  if (typeof value !== "object" || value === null) {
    return { ok: false, reason: "fetch-failed" };
  }
  const raw = value as Record<string, unknown>;
  if (raw.ok !== true) {
    return {
      ok: false,
      reason: isFailureReason(raw.reason) ? raw.reason : "fetch-failed",
    };
  }
  if (typeof raw.host !== "string" || raw.host.length === 0) {
    return { ok: false, reason: "fetch-failed" };
  }
  const priorities = Array.isArray(raw.priorities)
    ? raw.priorities.filter((p): p is string => typeof p === "string")
    : [];
  return {
    ok: true,
    host: raw.host,
    jobTitle: typeof raw.jobTitle === "string" ? raw.jobTitle : null,
    organization:
      typeof raw.organization === "string" ? raw.organization : null,
    priorities,
  };
}
