import { createRateLimiter, type RateLimiter } from "@/lib/ratelimit";
import { parseWeatherPayload, type WeatherPayload } from "@/lib/weather-payload";
import {
  readIpapiGeoForWeather,
  readTrustedPublicIpForWeather,
  readVercelGeoForWeather,
  shouldTrustWeatherProxyHeaders,
  type VercelGeo,
} from "./weather-proxy";

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    uv_index_max?: number[];
  };
};

export type WeatherHandlerDependencies = {
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
  now?: () => number;
  trustProxyHeaders?: boolean;
  trustVercelGeoHeaders?: boolean;
};

const REVALIDATE_SECONDS = 600;
// A hung upstream must fail fast into the graceful { ok: false } payload
// instead of holding the function for the platform's full timeout.
const UPSTREAM_TIMEOUT_MS = 5_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 30;
const FALLBACK_GEO_GLOBAL_CAP = 60;

const weatherLimiter = createRateLimiter({
  namespace: "weather",
  perIp: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_PER_WINDOW,
  },
  global: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    cap: FALLBACK_GEO_GLOBAL_CAP,
  },
});

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

function buildGeoUrl(ip: string | null): string {
  return ip ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` : "https://ipapi.co/json/";
}

async function lookupGeoViaIpapi(
  ip: string | null,
  fetchImpl: typeof fetch,
): Promise<VercelGeo> {
  const response = await fetchImpl(buildGeoUrl(ip), {
    headers: { "User-Agent": "ElijahOS/1.0" },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`geo ${response.status}`);

  const geo = readIpapiGeoForWeather(await response.json());
  if (!geo) throw new Error("geo: invalid coordinates");
  return geo;
}

function buildWeatherUrl(latitude: number, longitude: number): string {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,is_day");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,uv_index_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");
  return url.toString();
}

function rateLimitKey(trustedIp: string | null): string {
  return trustedIp ?? "shared";
}

function rateLimited(): Response {
  return Response.json(
    { ok: false } satisfies WeatherPayload,
    { status: 429, headers: { "Retry-After": "60" } },
  );
}

function genericFailure(): Response {
  return Response.json(
    { ok: false } satisfies WeatherPayload,
    { status: 200 },
  );
}

export async function handleWeatherRequest(
  requestHeaders: Headers,
  dependencies: WeatherHandlerDependencies = {},
): Promise<Response> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const limiter = dependencies.limiter ?? weatherLimiter;
  const now = (dependencies.now ?? Date.now)();
  const trustProxyHeaders =
    dependencies.trustProxyHeaders ?? shouldTrustWeatherProxyHeaders();
  const trustVercelGeoHeaders =
    dependencies.trustVercelGeoHeaders ?? process.env.VERCEL === "1";
  const ip = readTrustedPublicIpForWeather(requestHeaders, trustProxyHeaders);

  if (!limiter.consumePerIp(rateLimitKey(ip), now)) return rateLimited();

  try {
    // A self-hosted reverse proxy may safely rewrite X-Forwarded-For without
    // also guaranteeing Vercel's geo headers. Keep those trust decisions
    // separate so caller-supplied x-vercel-ip-* values cannot skip fallback.
    let geo = trustVercelGeoHeaders ? readVercelGeoForWeather(requestHeaders) : null;
    if (!geo) {
      // The global fallback budget prevents spoofed/rotating client keys from
      // multiplying outbound geolocation work on a single server instance.
      if (!limiter.consumeGlobal(now)) return rateLimited();
      geo = await lookupGeoViaIpapi(ip, fetchImpl);
    }

    const weatherResponse = await fetchImpl(buildWeatherUrl(geo.latitude, geo.longitude), {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!weatherResponse.ok) throw new Error(`wx ${weatherResponse.status}`);

    const weather = (await weatherResponse.json()) as WeatherResponse;
    const isDay = weather.current?.is_day === 1;
    const payload = parseWeatherPayload({
      ok: true,
      city: geo.city,
      country: geo.country,
      tempC: weather.current?.temperature_2m,
      feelsC: weather.current?.apparent_temperature,
      code: weather.current?.weather_code,
      isDay,
      condition: describeCode(weather.current?.weather_code, isDay),
      highC: weather.daily?.temperature_2m_max?.[0],
      lowC: weather.daily?.temperature_2m_min?.[0],
      uvIndex: weather.daily?.uv_index_max?.[0],
    });
    if (!payload.ok) throw new Error("wx: malformed payload");

    return Response.json(payload satisfies WeatherPayload);
  } catch (error) {
    console.error(
      "[weather] lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return genericFailure();
  }
}
