import "server-only";

// In-memory rate limiter shared by API routes (Ask Elijah and the
// experiments AI endpoint). Two independent budgets:
//
//   per-IP  — a sliding fixed window per client key (spoof-resistant only
//             when x-forwarded-for is trustworthy; see `clientIpKey`).
//   global  — a per-instance circuit breaker capping total work per window,
//             so an IP-rotating attacker can't run an instance's model spend
//             away unbounded.
//
// Each limiter namespaces its storage on `globalThis` via Symbol.for, so two
// limiters (e.g. "ask" vs "experiments") never share buckets or caps — a
// spike in one can't exhaust the other. This is per-instance, not a durable
// cross-instance cap; a provider-side spend cap remains the real backstop.

export type RateLimiterConfig = {
  // Storage namespace. Distinct namespaces get isolated buckets + counters.
  namespace: string;
  perIp: { windowMs: number; max: number; pruneThreshold?: number };
  global: { windowMs: number; cap: number };
};

export type RateLimiter = {
  // Returns false when the caller is over budget (deny the request).
  consumePerIp(key: string, now: number): boolean;
  consumeGlobal(now: number): boolean;
};

type RateBucket = { hits: number; windowStart: number };
type GlobalCounter = { hits: number; windowStart: number };

const DEFAULT_PRUNE_THRESHOLD = 1024;

function positiveIntegerBudget(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const ipKey = Symbol.for(`elijahos.ratelimit.${config.namespace}.ip`);
  const globalKey = Symbol.for(`elijahos.ratelimit.${config.namespace}.global`);
  const pruneThreshold = config.perIp.pruneThreshold ?? DEFAULT_PRUNE_THRESHOLD;
  const perIpMax = positiveIntegerBudget(config.perIp.max);
  const globalCap = positiveIntegerBudget(config.global.cap);
  const perIpWindowMs = positiveIntegerBudget(config.perIp.windowMs);
  const globalWindowMs = positiveIntegerBudget(config.global.windowMs);

  function getBuckets(): Map<string, RateBucket> {
    const g = globalThis as typeof globalThis & {
      [k: symbol]: Map<string, RateBucket> | undefined;
    };
    if (!g[ipKey]) g[ipKey] = new Map<string, RateBucket>();
    return g[ipKey] as Map<string, RateBucket>;
  }

  return {
    consumePerIp(key, now) {
      if (perIpMax <= 0 || perIpWindowMs <= 0) return false;
      const buckets = getBuckets();
      if (buckets.size > pruneThreshold) {
        for (const [k, v] of buckets) {
          if (now - v.windowStart >= perIpWindowMs) buckets.delete(k);
        }
      }
      const bucket = buckets.get(key);
      if (!bucket || now - bucket.windowStart >= perIpWindowMs) {
        buckets.set(key, { hits: 1, windowStart: now });
        return true;
      }
      if (bucket.hits >= perIpMax) return false;
      bucket.hits += 1;
      return true;
    },

    consumeGlobal(now) {
      if (globalCap <= 0 || globalWindowMs <= 0) return false;
      const g = globalThis as typeof globalThis & {
        [k: symbol]: GlobalCounter | undefined;
      };
      const current = g[globalKey];
      if (!current || now - current.windowStart >= globalWindowMs) {
        g[globalKey] = { hits: 1, windowStart: now };
        return true;
      }
      if (current.hits >= globalCap) return false;
      current.hits += 1;
      return true;
    },
  };
}

// Decide whether proxy-supplied client-IP headers are trustworthy. Explicit
// env values win; unset defaults to trusting them exactly when running on
// Vercel, whose edge rewrites x-forwarded-for. Without this default, every
// visitor on Vercel would collapse into one shared rate-limit bucket.
export function shouldTrustProxyHeaders(
  value: string | undefined,
  isVercel = process.env.VERCEL === "1",
): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return isVercel;
}

// Derive a per-IP key from request headers. When `trustProxy` is false (self-
// hosting behind an untrusted network where clients can spoof the header),
// collapse everyone to a single "shared" bucket rather than minting a fresh
// bucket per spoofed IP. On Vercel the edge rewrites x-forwarded-for, so the
// first hop is trustworthy and trustProxy should be true.
export function clientIpKey(req: Request, trustProxy: boolean): string {
  if (!trustProxy) return "shared";
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp;
  return candidate ? candidate.slice(0, 128) : "shared";
}
