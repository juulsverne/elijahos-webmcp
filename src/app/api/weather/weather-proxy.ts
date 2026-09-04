import { isIP } from "node:net";

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function shouldTrustWeatherProxyHeaders(
  value = process.env.WEATHER_TRUST_PROXY_HEADERS,
  isVercel = process.env.VERCEL === "1",
): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return isVercel;
}

const TRUST_PROXY_HEADERS = shouldTrustWeatherProxyHeaders();

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

export type VercelGeo = {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
};

// Vercel stamps every request with the visitor's geolocation for free
// (x-vercel-ip-latitude/longitude/city/country). Reading these avoids an
// outbound geo lookup entirely, which matters because keyless ipapi.co
// quotas are keyed by the *calling* IP — and on Vercel that is a shared
// egress address exhausted by other tenants long before our traffic hits it.
// Returns null when the headers are absent (local dev, self-hosting) so the
// caller can fall back to a network lookup.
export function readVercelGeoForWeather(h: Headers): VercelGeo | null {
  const coordinates = readWeatherCoordinates(
    h.get("x-vercel-ip-latitude"),
    h.get("x-vercel-ip-longitude"),
  );
  if (!coordinates) return null;

  const geo: VercelGeo = coordinates;
  const city = decodeHeaderText(h.get("x-vercel-ip-city"));
  if (city) geo.city = city;
  const country = countryNameFromCode(h.get("x-vercel-ip-country"));
  if (country) geo.country = country;
  return geo;
}

export function readIpapiGeoForWeather(input: unknown): VercelGeo | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const coordinates = readWeatherCoordinates(record.latitude, record.longitude);
  if (!coordinates) return null;

  const geo: VercelGeo = coordinates;
  const city = optionalText(record.city);
  if (city) geo.city = city;
  const country = optionalText(record.country_name);
  if (country) geo.country = country;
  return geo;
}

export function readWeatherCoordinates(
  rawLatitude: unknown,
  rawLongitude: unknown,
): Pick<VercelGeo, "latitude" | "longitude"> | null {
  const latitude = parseCoordinate(rawLatitude, 90);
  const longitude = parseCoordinate(rawLongitude, 180);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

function parseCoordinate(raw: unknown, limit: number): number | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  if (typeof raw === "string" && !raw.trim()) return null;
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

function optionalText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().slice(0, 120);
  return value || null;
}

// Vercel percent-encodes non-ASCII header text (e.g. S%C3%A3o%20Paulo).
function decodeHeaderText(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || null;
  } catch {
    return raw.trim() || null;
  }
}

function countryNameFromCode(raw: string | null): string | null {
  const code = raw?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region", fallback: "code" }).of(code) ?? code;
  } catch {
    return code;
  }
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
