import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  readTrustedPublicIpForWeather,
  shouldTrustWeatherProxyHeaders,
} from "./route";

describe("weather route proxy geolocation", () => {
  it("trusts sanitized proxy headers by default for Vercel deployments", () => {
    assert.equal(shouldTrustWeatherProxyHeaders(), true);
    assert.equal(
      readTrustedPublicIpForWeather(
        new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" }),
        true,
      ),
      "8.8.8.8",
    );
  });

  it("lets self-hosted deployments disable proxy header trust", () => {
    assert.equal(
      shouldTrustWeatherProxyHeaders("false"),
      false,
    );
    assert.equal(
      readTrustedPublicIpForWeather(new Headers({ "x-forwarded-for": "8.8.8.8" }), false),
      null,
    );
  });
});
