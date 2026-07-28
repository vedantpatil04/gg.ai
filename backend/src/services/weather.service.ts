import axios from "axios";
import { logger } from "../utils/logger";

export interface WeatherReading {
  temp: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  rainfall: number; // mm in last hour (0 if none)
}

// ─── OpenWeather Current Weather API ─────────────────────────────────────────
// Docs: https://openweathermap.org/current
export async function fetchWeather(lat: number, lng: number): Promise<WeatherReading | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`;
    const { data } = await axios.get(url, { timeout: 8000 });

    return {
      temp: Math.round((Number(data?.main?.temp) || 0) * 10) / 10,
      humidity: Math.round(Number(data?.main?.humidity) || 0),
      pressure: Math.round(Number(data?.main?.pressure) || 1013),
      windSpeed: Math.round((Number(data?.wind?.speed) || 0) * 10) / 10,
      windDirection: Math.round(Number(data?.wind?.deg) || 0),
      visibility: Math.round(((Number(data?.visibility) || 10000) / 1000) * 10) / 10, // m → km
      rainfall: Math.round((Number(data?.rain?.["1h"]) || 0) * 10) / 10,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`OpenWeather weather fetch failed: ${msg}`);
    return null;
  }
}
