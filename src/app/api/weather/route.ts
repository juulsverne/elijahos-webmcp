import { headers } from "next/headers";
import { handleWeatherRequest } from "./weather-handler";

export async function GET(): Promise<Response> {
  return handleWeatherRequest(await headers());
}
