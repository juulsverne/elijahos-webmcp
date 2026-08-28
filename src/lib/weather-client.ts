import { parseWeatherPayload, type WeatherPayload } from "./weather-payload";

const WEATHER_ENDPOINT = "/api/weather";

type WeatherFetch = typeof fetch;

export async function fetchWeatherPayload(
  fetcher: WeatherFetch = fetch,
): Promise<WeatherPayload> {
  try {
    const response = await fetcher(WEATHER_ENDPOINT);
    if (!response.ok) return { ok: false };
    return parseWeatherPayload(await response.json());
  } catch {
    return { ok: false };
  }
}
