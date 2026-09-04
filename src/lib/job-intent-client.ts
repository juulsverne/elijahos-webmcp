// Browser-side caller for /api/job-intent (mirrors weather-client): POST the
// pasted link, defensively narrow whatever comes back. Network problems
// surface as an ordinary failure payload, never a throw.

import {
  parseJobIntentPayload,
  type JobIntentPayload,
} from "./job-intent-payload";

const JOB_INTENT_ENDPOINT = "/api/job-intent";

type JobIntentFetch = typeof fetch;

export async function fetchJobIntent(
  url: string,
  fetcher: JobIntentFetch = fetch,
): Promise<JobIntentPayload> {
  try {
    const response = await fetcher(JOB_INTENT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return parseJobIntentPayload(await response.json());
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}
