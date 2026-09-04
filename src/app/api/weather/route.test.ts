import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  readIpapiGeoForWeather,
  readTrustedPublicIpForWeather,
  readVercelGeoForWeather,
  shouldTrustWeatherProxyHeaders,
} from "./weather-proxy";

describe("weather route Vercel geolocation headers", () => {
  it("reads coordinates, city, and country name from Vercel geo headers", () => {
    const geo = readVercelGeoForWeather(
      new Headers({
        "x-vercel-ip-latitude": "41.8781",
        "x-vercel-ip-longitude": "-87.6298",
        "x-vercel-ip-city": "S%C3%A3o%20Paulo",
        "x-vercel-ip-country": "BR",
      }),
    );
    assert.deepEqual(geo, {
      latitude: 41.8781,
      longitude: -87.6298,
      city: "São Paulo",
      country: "Brazil",
    });
  });

  it("returns null when coordinates are missing or malformed", () => {
    assert.equal(readVercelGeoForWeather(new Headers()), null);
    assert.equal(
      readVercelGeoForWeather(
        new Headers({ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "-87.6" }),
      ),
      null,
    );
    assert.equal(
      readVercelGeoForWeather(
        new Headers({ "x-vercel-ip-latitude": "91", "x-vercel-ip-longitude": "-87.6" }),
      ),
      null,
    );
  });

  it("tolerates a missing city and an unknown country code", () => {
    const geo = readVercelGeoForWeather(
      new Headers({
        "x-vercel-ip-latitude": "41.8781",
        "x-vercel-ip-longitude": "-87.6298",
        "x-vercel-ip-country": "XX",
      }),
    );
    assert.deepEqual(geo, { latitude: 41.8781, longitude: -87.6298, country: "XX" });
  });
});

describe("weather route proxy geolocation", () => {
  it("trusts proxy headers by default only on Vercel", () => {
    assert.equal(shouldTrustWeatherProxyHeaders(undefined, false), false);
    assert.equal(shouldTrustWeatherProxyHeaders(undefined, true), true);
    assert.equal(
      readTrustedPublicIpForWeather(
        new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" }),
        true,
      ),
      "8.8.8.8",
    );
  });

  it("supports an explicit trust override for self-hosted deployments", () => {
    assert.equal(shouldTrustWeatherProxyHeaders("true", false), true);
    assert.equal(shouldTrustWeatherProxyHeaders("false", true), false);
    assert.equal(
      readTrustedPublicIpForWeather(new Headers({ "x-forwarded-for": "8.8.8.8" }), false),
      null,
    );
  });
});

describe("weather route fallback geolocation payloads", () => {
  it("accepts bounded coordinates and trims optional labels", () => {
    assert.deepEqual(
      readIpapiGeoForWeather({
        latitude: "41.8781",
        longitude: -87.6298,
        city: " Chicago ",
        country_name: " United States ",
      }),
      {
        latitude: 41.8781,
        longitude: -87.6298,
        city: "Chicago",
        country: "United States",
      },
    );
  });

  it("rejects malformed and out-of-range coordinates", () => {
    assert.equal(readIpapiGeoForWeather({ latitude: 91, longitude: 0 }), null);
    assert.equal(readIpapiGeoForWeather({ latitude: 0, longitude: -181 }), null);
    assert.equal(readIpapiGeoForWeather({ latitude: "", longitude: 0 }), null);
    assert.equal(readIpapiGeoForWeather({ latitude: 0, longitude: null }), null);
  });
});
