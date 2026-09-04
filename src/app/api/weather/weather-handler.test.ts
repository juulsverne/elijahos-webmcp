import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RateLimiter } from "@/lib/ratelimit";
import { handleWeatherRequest } from "./weather-handler";

const WEATHER_RESPONSE = {
  current: {
    temperature_2m: 22,
    apparent_temperature: 21,
    weather_code: 1,
    is_day: 1,
  },
  daily: {
    temperature_2m_max: [24],
    temperature_2m_min: [16],
    uv_index_max: [5],
  },
};

function makeLimiter(options: { perIp?: boolean; global?: boolean } = {}) {
  const perIpCalls: Array<{ key: string; now: number }> = [];
  const globalCalls: number[] = [];
  const limiter: RateLimiter = {
    consumePerIp(key, now) {
      perIpCalls.push({ key, now });
      return options.perIp ?? true;
    },
    consumeGlobal(now) {
      globalCalls.push(now);
      return options.global ?? true;
    },
  };
  return { limiter, perIpCalls, globalCalls };
}

function makeFetch(responses: Response[]) {
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const response = responses.shift();
    if (!response) throw new Error("unexpected fetch");
    return response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

describe("weather request handler", () => {
  it("uses trusted Vercel coordinates without the fallback provider", async () => {
    const { limiter, perIpCalls, globalCalls } = makeLimiter();
    const { fetchImpl, calls } = makeFetch([Response.json(WEATHER_RESPONSE)]);

    const response = await handleWeatherRequest(
      new Headers({
        "x-forwarded-for": "8.8.8.8",
        "x-vercel-ip-latitude": "41.8781",
        "x-vercel-ip-longitude": "-87.6298",
        "x-vercel-ip-city": "Chicago",
        "x-vercel-ip-country": "US",
      }),
      {
        fetchImpl,
        limiter,
        now: () => 123,
        trustProxyHeaders: true,
        trustVercelGeoHeaders: true,
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      city: "Chicago",
      country: "United States",
      tempC: 22,
      feelsC: 21,
      code: 1,
      isDay: true,
      condition: "mostly sunny",
      highC: 24,
      lowC: 16,
      uvIndex: 5,
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^https:\/\/api\.open-meteo\.com\//);
    assert.deepEqual(perIpCalls, [{ key: "8.8.8.8", now: 123 }]);
    assert.deepEqual(globalCalls, []);
  });

  it("does not trust Vercel geo headers merely because a self-hosted proxy is trusted", async () => {
    const { limiter, perIpCalls, globalCalls } = makeLimiter();
    const { fetchImpl, calls } = makeFetch([
      Response.json({
        latitude: 41.8781,
        longitude: -87.6298,
        city: "Chicago",
        country_name: "United States",
      }),
      Response.json(WEATHER_RESPONSE),
    ]);

    const response = await handleWeatherRequest(
      new Headers({
        "x-forwarded-for": "8.8.8.8",
        "x-vercel-ip-latitude": "0",
        "x-vercel-ip-longitude": "0",
        "x-vercel-ip-city": "Spoofed",
      }),
      {
        fetchImpl,
        limiter,
        now: () => 321,
        trustProxyHeaders: true,
        trustVercelGeoHeaders: false,
      },
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).city, "Chicago");
    assert.equal(calls.length, 2);
    assert.equal(calls[0], "https://ipapi.co/8.8.8.8/json/");
    assert.deepEqual(perIpCalls, [{ key: "8.8.8.8", now: 321 }]);
    assert.deepEqual(globalCalls, [321]);
  });

  it("uses the globally capped fallback before fetching weather", async () => {
    const { limiter, perIpCalls, globalCalls } = makeLimiter();
    const { fetchImpl, calls } = makeFetch([
      Response.json({
        latitude: 41.8781,
        longitude: -87.6298,
        city: "Chicago",
        country_name: "United States",
      }),
      Response.json(WEATHER_RESPONSE),
    ]);

    const response = await handleWeatherRequest(new Headers(), {
      fetchImpl,
      limiter,
      now: () => 456,
      trustProxyHeaders: false,
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.match(calls[0], /^https:\/\/ipapi\.co\/json\/$/);
    assert.match(calls[1], /^https:\/\/api\.open-meteo\.com\//);
    assert.deepEqual(perIpCalls, [{ key: "shared", now: 456 }]);
    assert.deepEqual(globalCalls, [456]);
  });

  it("returns an opaque failure for out-of-range fallback coordinates", async () => {
    const { limiter } = makeLimiter();
    const { fetchImpl, calls } = makeFetch([
      Response.json({ latitude: 91, longitude: -87.6298, reason: "sensitive detail" }),
    ]);
    const originalError = console.error;
    console.error = () => undefined;
    try {
      const response = await handleWeatherRequest(new Headers(), {
        fetchImpl,
        limiter,
        trustProxyHeaders: false,
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: false });
      assert.equal(calls.length, 1);
    } finally {
      console.error = originalError;
    }
  });

  it("returns 429 before network work when the per-IP budget is exhausted", async () => {
    const { limiter, globalCalls } = makeLimiter({ perIp: false });
    const { fetchImpl, calls } = makeFetch([]);
    const response = await handleWeatherRequest(new Headers(), {
      fetchImpl,
      limiter,
      now: () => 789,
      trustProxyHeaders: false,
    });

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.deepEqual(await response.json(), { ok: false });
    assert.deepEqual(globalCalls, []);
    assert.deepEqual(calls, []);
  });

  it("returns 429 before fallback work when the global budget is exhausted", async () => {
    const { limiter, globalCalls } = makeLimiter({ global: false });
    const { fetchImpl, calls } = makeFetch([]);
    const response = await handleWeatherRequest(new Headers(), {
      fetchImpl,
      limiter,
      now: () => 987,
      trustProxyHeaders: false,
    });

    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { ok: false });
    assert.deepEqual(globalCalls, [987]);
    assert.deepEqual(calls, []);
  });

  it("keeps upstream failures opaque to the client", async () => {
    const { limiter } = makeLimiter();
    const { fetchImpl } = makeFetch([new Response("provider details", { status: 503 })]);
    const originalError = console.error;
    console.error = () => undefined;
    try {
      const response = await handleWeatherRequest(new Headers(), {
        fetchImpl,
        limiter,
        trustProxyHeaders: false,
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: false });
    } finally {
      console.error = originalError;
    }
  });
});
