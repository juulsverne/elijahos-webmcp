import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseWeatherPayload } from "./weather-payload";

describe("parseWeatherPayload", () => {
  it("treats weather without a numeric temperature as unavailable", () => {
    assert.deepEqual(
      parseWeatherPayload({
        ok: true,
        city: 42,
        country: "US",
        tempC: "hot",
        feelsC: Number.NaN,
        code: 3.5,
        isDay: "yes",
        condition: "overcast",
      }),
      { ok: false },
    );
  });

  it("keeps optional malformed weather values out of display state", () => {
    assert.deepEqual(
      parseWeatherPayload({
        ok: true,
        city: 42,
        country: "US",
        tempC: 19.5,
        feelsC: Number.NaN,
        code: 3.5,
        isDay: "yes",
        condition: "overcast",
      }),
      {
        ok: true,
        country: "US",
        tempC: 19.5,
        condition: "overcast",
      },
    );
  });

  it("falls back to an unavailable payload for non-object responses", () => {
    assert.deepEqual(parseWeatherPayload("not json object"), { ok: false });
  });

  it("publishes today's range and UV when the daily block is well formed", () => {
    assert.deepEqual(
      parseWeatherPayload({
        ok: true,
        tempC: 22,
        highC: 25.6,
        lowC: 17.8,
        uvIndex: 6,
      }),
      { ok: true, tempC: 22, highC: 25.6, lowC: 17.8, uvIndex: 6 },
    );
  });

  it("drops a half-present or inverted range instead of drawing a broken bar", () => {
    // Lone high (no low) — nothing to span between.
    assert.deepEqual(parseWeatherPayload({ ok: true, tempC: 22, highC: 25 }), {
      ok: true,
      tempC: 22,
    });
    // Inverted pair — a provider misread, not a real range.
    assert.deepEqual(
      parseWeatherPayload({ ok: true, tempC: 22, highC: 10, lowC: 20 }),
      { ok: true, tempC: 22 },
    );
  });

  it("keeps a malformed or negative UV out of display state", () => {
    assert.deepEqual(
      parseWeatherPayload({ ok: true, tempC: 22, uvIndex: "high" }),
      { ok: true, tempC: 22 },
    );
    assert.deepEqual(parseWeatherPayload({ ok: true, tempC: 22, uvIndex: -1 }), {
      ok: true,
      tempC: 22,
    });
  });

  it("still yields a usable payload when the daily block is missing entirely", () => {
    assert.deepEqual(
      parseWeatherPayload({ ok: true, tempC: 22, condition: "clear" }),
      { ok: true, tempC: 22, condition: "clear" },
    );
  });
});
