import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchWeatherPayload } from "./weather-client";

describe("fetchWeatherPayload", () => {
  it("returns an unavailable payload when the weather request fails", async () => {
    const fetcher = async () => {
      throw new Error("network down");
    };

    assert.deepEqual(await fetchWeatherPayload(fetcher), { ok: false });
  });

  it("returns an unavailable payload when weather JSON parsing fails", async () => {
    const fetcher = async () =>
      new Response("not json", {
        headers: { "content-type": "application/json" },
      });

    assert.deepEqual(await fetchWeatherPayload(fetcher), { ok: false });
  });

  it("returns an unavailable payload when the weather response fails", async () => {
    const fetcher = async () =>
      Response.json(
        {
          ok: true,
          city: "Chicago",
          tempC: 21.2,
        },
        { status: 500 },
      );

    assert.deepEqual(await fetchWeatherPayload(fetcher), { ok: false });
  });

  it("parses valid weather responses through the payload sanitizer", async () => {
    const fetcher = async () =>
      Response.json({
        ok: true,
        city: "Chicago",
        tempC: 21.2,
        feelsC: "warm",
      });

    assert.deepEqual(await fetchWeatherPayload(fetcher), {
      ok: true,
      city: "Chicago",
      tempC: 21.2,
    });
  });
});
