import { handleAskRequest } from "@/lib/ask-lite/handler";
import { streamOpenAIAnswer } from "@/lib/ask-lite/openai-stream";
import {
  clientIpKey,
  createRateLimiter,
  shouldTrustProxyHeaders,
} from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 8;
const GLOBAL_WINDOW_MS = 3_600_000;
const TRUST_PROXY_HEADERS = shouldTrustProxyHeaders(
  process.env.ASK_TRUST_PROXY_HEADERS,
);

function environmentBudget(raw: string | undefined, fallback: number): number {
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const GLOBAL_HOURLY_CAP = environmentBudget(
  process.env.ASK_GLOBAL_HOURLY_CAP,
  120,
);

const limiter = createRateLimiter({
  namespace: "ask-lite",
  perIp: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_PER_WINDOW,
  },
  global: {
    windowMs: GLOBAL_WINDOW_MS,
    cap: GLOBAL_HOURLY_CAP,
  },
});

export async function POST(request: Request): Promise<Response> {
  return handleAskRequest(request, {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.ASK_OPENAI_MODEL?.trim() || "gpt-5.6-luna",
    consumeRequest: (incoming) =>
      limiter.consumePerIp(
        clientIpKey(incoming, TRUST_PROXY_HEADERS),
        Date.now(),
      ),
    consumeGeneration: () => limiter.consumeGlobal(Date.now()),
    streamAnswer: streamOpenAIAnswer,
  });
}
