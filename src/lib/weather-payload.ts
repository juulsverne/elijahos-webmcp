export type WeatherPayload = {
  ok: boolean;
  city?: string;
  country?: string;
  tempC?: number;
  feelsC?: number;
  code?: number;
  isDay?: boolean;
  condition?: string;
  // Today's forecast range and peak UV. All three are optional and independent
  // of `ok`: the current-conditions read is what makes a payload usable, so a
  // provider that drops the daily block still yields a valid payload and the
  // widgets simply hide the range bar / UV readout.
  highC?: number;
  lowC?: number;
  uvIndex?: number;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function finiteInteger(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && Number.isInteger(number) ? number : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseWeatherPayload(raw: unknown): WeatherPayload {
  if (!raw || typeof raw !== "object") return { ok: false };
  const data = raw as Record<string, unknown>;
  if (data.ok !== true) return { ok: false };

  const payload: WeatherPayload = { ok: true };
  const city = stringValue(data.city);
  const country = stringValue(data.country);
  const tempC = finiteNumber(data.tempC);
  const feelsC = finiteNumber(data.feelsC);
  const code = finiteInteger(data.code);
  const isDay = typeof data.isDay === "boolean" ? data.isDay : undefined;
  const condition = stringValue(data.condition);
  const highC = finiteNumber(data.highC);
  const lowC = finiteNumber(data.lowC);
  const uvIndex = finiteNumber(data.uvIndex);

  if (tempC === undefined) return { ok: false };

  if (city !== undefined) payload.city = city;
  if (country !== undefined) payload.country = country;
  if (tempC !== undefined) payload.tempC = tempC;
  if (feelsC !== undefined) payload.feelsC = feelsC;
  if (code !== undefined) payload.code = code;
  if (isDay !== undefined) payload.isDay = isDay;
  if (condition !== undefined) payload.condition = condition;
  // Only publish a range when BOTH ends are present and ordered — a lone
  // bound (or an inverted pair from a bad provider read) can't draw a
  // meaningful low→high bar, so drop both rather than render a broken one.
  if (highC !== undefined && lowC !== undefined && highC >= lowC) {
    payload.highC = highC;
    payload.lowC = lowC;
  }
  if (uvIndex !== undefined && uvIndex >= 0) payload.uvIndex = uvIndex;

  return payload;
}
