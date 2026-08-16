import axios from "axios";
import { logger } from "../utils/logger";

// ─── Open-Meteo Current Weather API ──────────────────────────────────────────
// Docs: https://open-meteo.com/en/docs#current
// Replaces the former OpenWeather current-conditions integration.
// No API key is required for non-commercial use.
//
// Consumer interface: ingestion.service.ts reads temp, humidity, pressure,
// windSpeed, windDirection, rainfall. All other fields are optional additions
// that do not break existing downstream consumers.

export interface WeatherReading {
  temp: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  /** Not available from the Open-Meteo current endpoint — always null.
   *  Preserved in the interface so existing consumers do not break. */
  visibility: number | null;
  /** Open-Meteo `precipitation` — total precipitation in the last hour (mm). */
  rainfall: number;
  // ─── Phase 1 additions (optional, backward-compatible) ───────────────────
  /** Open-Meteo `apparent_temperature` (°C). */
  apparentTemperature?: number | null;
  /** Open-Meteo WMO weather interpretation code. */
  weatherCode?: number | null;
  /** Open-Meteo `rain` — liquid rain component of precipitation (mm). */
  rain?: number | null;
}

// ─── Open-Meteo base URL — read from env, fall back to public endpoint ────────
const WEATHER_BASE_URL =
  process.env.OPEN_METEO_WEATHER_BASE_URL ||
  "https://api.open-meteo.com/v1/forecast";

// All current-condition variables requested from Open-Meteo
const CURRENT_WEATHER_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "weather_code",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
].join(",");

interface OpenMeteoCurrentWeatherResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    pressure_msl?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

function toFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch current weather conditions from Open-Meteo for a given coordinate.
 * Returns null if the provider is unavailable or returns incomplete data
 * for the required fields (temp, humidity). Missing optional fields are
 * returned as null rather than fabricated.
 *
 * @param lat      Latitude of the city
 * @param lng      Longitude of the city
 * @param timezone IANA timezone string — defaults to "UTC". For current
 *                 condition values this does not affect measurement accuracy;
 *                 it only influences the `time` field that Open-Meteo
 *                 includes in the `current` block (which GreenGuard does not
 *                 use for ingestion).
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  timezone = "UTC",
): Promise<WeatherReading | null> {
  try {
    const { data } = await axios.get<OpenMeteoCurrentWeatherResponse>(
      WEATHER_BASE_URL,
      {
        timeout: 8000,
        params: {
          latitude: lat,
          longitude: lng,
          timezone,
          current: CURRENT_WEATHER_VARS,
          wind_speed_unit: "ms",
          precipitation_unit: "mm",
        },
      },
    );

    const c = data?.current;
    if (!c) {
      logger.warn(
        `[weather] Open-Meteo returned no current block for (${lat}, ${lng})`,
      );
      return null;
    }

    const temp = toFinite(c.temperature_2m);
    const humidity = toFinite(c.relative_humidity_2m);

    // Require at minimum temperature and humidity — every other field
    // degrades gracefully to a carried-forward value in ingestion.service.ts.
    if (temp === null || humidity === null) {
      logger.warn(
        `[weather] Open-Meteo missing required temp/humidity for (${lat}, ${lng})`,
      );
      return null;
    }

    const apparentRaw = toFinite(c.apparent_temperature);
    const weatherCodeRaw = toFinite(c.weather_code);
    const rainRaw = toFinite(c.rain);

    return {
      temp: Math.round(temp * 10) / 10,
      humidity: Math.round(humidity),
      pressure: Math.round(toFinite(c.pressure_msl) ?? 1013),
      windSpeed: Math.round((toFinite(c.wind_speed_10m) ?? 0) * 10) / 10,
      windDirection: Math.round(toFinite(c.wind_direction_10m) ?? 0),
      // Open-Meteo /v1/forecast current endpoint does not expose visibility.
      visibility: null,
      rainfall: Math.round((toFinite(c.precipitation) ?? 0) * 10) / 10,
      // Optional Phase 1 additions
      apparentTemperature:
        apparentRaw !== null
          ? Math.round(apparentRaw * 10) / 10
          : null,
      weatherCode:
        weatherCodeRaw !== null ? Math.round(weatherCodeRaw) : null,
      rain: rainRaw !== null ? Math.round(rainRaw * 10) / 10 : null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `[weather] Open-Meteo current fetch failed for (${lat}, ${lng}): ${msg}`,
    );
    return null;
  }
}
