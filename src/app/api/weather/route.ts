// Server route: silent weather lookup.
//
// By default this trusts Vercel-sanitized forwarding headers so the weather
// lookup follows the visitor instead of the server region. Set
// WEATHER_TRUST_PROXY_HEADERS=false when self-hosting behind a network where
// clients can spoof x-forwarded-for/x-real-ip.
//
// Rate limit: a tiny in-memory token bucket per requesting IP keeps the
// outbound geo provider's free quota safe even when TRUST_PROXY_HEADERS is on
// and an attacker rotates spoofed IPs. The bucket lives in module scope so
// it resets on cold start — acceptable for a portfolio; swap for Upstash or
// equivalent if this ever ships at scale.

import { headers } from "next/headers";
import { isIP } from "node:net";
import { parseWeatherPayload, type WeatherPayload } from "@/lib/weather-payload";

type GeoResponse = {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
};

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  // Daily arrays are parallel and index 0 is today (the query asks for a
  // single forecast day). Every field is optional — Open-Meteo omits the
  // whole block on some error paths and the payload parser tolerates that.
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    uv_index_max?: number[];
  };
};

const REVALIDATE_SECONDS = 600;
export function shouldTrustWeatherProxyHeaders(
  value = process.env.WEATHER_TRUST_PROXY_HEADERS,
): boolean {
  return value !== "false";
}

const TRUST_PROXY_HEADERS = shouldTrustWeatherProxyHeaders();
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

// Rate limit knobs — generous enough that real visitors never hit them,
// tight enough that scripted abuse stops well before the upstream quota.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 30;
const RATE_LIMIT_PRUNE_THRESHOLD = 1024;

function describeCode(code?: number, isDay = true): string {
  if (code == null) return "unknown";
  if (code === 0) return isDay ? "clear" : "clear night";
  if (code <= 2) return isDay ? "mostly sunny" : "mostly clear";
  if (code === 3) return "overcast";
  if (code >= 45 && code <= 48) return "foggy";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code >= 95) return "thunderstorm";
  return "unknown";
}

export function readTrustedPublicIpForWeather(
  h: Headers,
  trustProxyHeaders = TRUST_PROXY_HEADERS,
): string | null {
  if (!trustProxyHeaders) return null;

  const candidates = [
    h.get("x-forwarded-for")?.split(",")[0],
    h.get("x-real-ip"),
  ];

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip && isPublicIp(ip)) return ip;
  }

  return null;
}

function normalizeIp(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "localhost") return null;

  const withoutBrackets = trimmed.replace(/^\[|\]$/g, "");
  const withoutZone = withoutBrackets.split("%")[0] ?? withoutBrackets;
  if (IPV4_RE.test(withoutZone)) return withoutZone;

  const ipv4WithPort = withoutZone.match(/^((?:\d{1,3}\.){3}\d{1,3}):\d+$/);
  if (ipv4WithPort) return ipv4WithPort[1];

  // Defense-in-depth: only return colon-containing strings that actually
  // parse as IPv6. Stops malformed `host:port` shapes from ever reaching
  // upstream URL construction.
  if (!withoutZone.includes(":")) return null;
  return isIP(withoutZone) === 6 ? withoutZone : null;
}

function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice("::ffff:".length);
    return isIP(mapped) === 4 && isPublicIpv4(mapped);
  }
  return version === 6 && isPublicIpv6(ip);
}

function isPublicIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIpv6(ip: string): boolean {
  if (ip === "::" || ip === "::1") return false;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return false;
  if (ip.startsWith("2001:db8:")) return false;
  return true;
}

function buildGeoUrl(ip: string | null): string {
  return ip ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` : "https://ipapi.co/json/";
}

function buildWeatherUrl(latitude: number, longitude: number): string {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,is_day");
  // Today's range + peak UV feed the mobile weather card's L—H bar and UV
  // foot line. forecast_days=1 keeps the response small; timezone=auto makes
  // "today" the visitor's local day rather than UTC's.
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,uv_index_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");
  return url.toString();
}

// Per-bucket request log: { hits: count in current window, windowStart: ms }.
const rateBuckets = new Map<string, { hits: number; windowStart: number }>();

function rateLimitKey(trustedIp: string | null): string {
  if (trustedIp) return trustedIp;
  // Fall back to a single shared bucket when proxy headers aren't trusted —
  // matches the shared-cache behavior and prevents header-spoof bypass.
  return "shared";
}

function consumeRateBudget(key: string, now: number): boolean {
  // Cheap GC: when the map grows large, drop entries whose windows have
  // expired so it doesn't grow without bound under load.
  if (rateBuckets.size > RATE_LIMIT_PRUNE_THRESHOLD) {
    for (const [k, v] of rateBuckets) {
      if (now - v.windowStart >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(k);
    }
  }

  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { hits: 1, windowStart: now });
    return true;
  }
  if (bucket.hits >= RATE_LIMIT_MAX_PER_WINDOW) return false;
  bucket.hits += 1;
  return true;
}

function genericFailure(): Response {
  // Single opaque failure shape. Internal cause is logged server-side only;
  // clients never see upstream status codes, provider names, or stack info.
  return Response.json(
    { ok: false } satisfies WeatherPayload,
    { status: 200 },
  );
}

export async function GET(): Promise<Response> {
  const h = await headers();
  const ip = readTrustedPublicIpForWeather(h);

  const key = rateLimitKey(ip);
  if (!consumeRateBudget(key, Date.now())) {
    return Response.json(
      { ok: false } satisfies WeatherPayload,
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const geoRes = await fetch(buildGeoUrl(ip), {
      headers: { "User-Agent": "ElijahOS/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!geoRes.ok) throw new Error(`geo ${geoRes.status}`);

    const geo = (await geoRes.json()) as GeoResponse & { error?: boolean; reason?: string };
    if (
      geo.latitude == null ||
      geo.longitude == null ||
      !Number.isFinite(geo.latitude) ||
      !Number.isFinite(geo.longitude)
    ) {
      const reason = geo.reason ?? (geo.error ? "rate-limited" : "no coords");
      throw new Error(`geo: ${reason}`);
    }

    const wxRes = await fetch(buildWeatherUrl(geo.latitude, geo.longitude), {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!wxRes.ok) throw new Error(`wx ${wxRes.status}`);

    const wx = (await wxRes.json()) as WeatherResponse;
    const isDay = wx.current?.is_day === 1;

    const payload = parseWeatherPayload({
      ok: true,
      city: geo.city,
      country: geo.country_name,
      tempC: wx.current?.temperature_2m,
      feelsC: wx.current?.apparent_temperature,
      code: wx.current?.weather_code,
      isDay,
      condition: describeCode(wx.current?.weather_code, isDay),
      highC: wx.daily?.temperature_2m_max?.[0],
      lowC: wx.daily?.temperature_2m_min?.[0],
      uvIndex: wx.daily?.uv_index_max?.[0],
    });
    if (!payload.ok) throw new Error("wx: malformed payload");

    return Response.json(payload satisfies WeatherPayload);
  } catch (err) {
    // Log the real reason server-side; clients only ever see `ok: false`.
    console.error("[weather] lookup failed:", err instanceof Error ? err.message : err);
    return genericFailure();
  }
}
