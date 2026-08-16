import axios from "axios";
import { logger } from "../utils/logger";
import { TtlCache } from "../utils/ttlCache";

// ─── Real Forecast Data Foundation (Phase 1) ──────────────────────────────────
// Source: Open-Meteo (https://open-meteo.com) — chosen because it requires no
// API key (so the foundation works out of the box for every deployment/city
// without additional signup) and provides both hourly/daily weather forecast
// and hourly air-quality forecast (PM2.5, PM10, NO2, O3, US AQI) for up to
// 7 days. Free for non-commercial use; commercial deployments should review
// https://open-meteo.com/en/pricing.
//
// This service ONLY fetches and normalizes real provider data. It never
// invents values — missing fields are returned as `null` rather than guessed.
//
// Base URLs are read from environment variables so deployments can point to
// a different Open-Meteo endpoint (e.g., a self-hosted instance or a
// commercial API endpoint) without code changes.

// ─── Open-Meteo base URLs — read from env, fall back to public endpoints ──────
const WEATHER_URL =
  process.env.OPEN_METEO_WEATHER_BASE_URL ||
  "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL =
  process.env.OPEN_METEO_AIR_QUALITY_BASE_URL ||
  "https://air-quality-api.open-meteo.com/v1/air-quality";

// ─── Phase 1 variable sets (per specification §9) ────────────────────────────
// Hourly weather — §9.C
const HOURLY_WEATHER_VARS =
  "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m";

// Daily weather — §9.B
const DAILY_WEATHER_VARS =
  "weather_code,temperature_2m_max,temperature_2m_min,precipitation_hours,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,relative_humidity_2m_mean,sunrise,sunset";

// Hourly air quality — §7
const HOURLY_AIR_QUALITY_VARS = "pm10,pm2_5,nitrogen_dioxide,ozone,us_aqi";

// ─── Normalized domain interfaces ────────────────────────────────────────────

export interface HourlyForecastPoint {
  /** ISO8601 local timestamp (city timezone, supplied by Open-Meteo). */
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  weatherCode: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  /** Liquid rain component of total precipitation (mm). */
  rain: number | null;
  /** Atmospheric pressure at mean sea level (hPa). */
  pressure: number | null;
  /** US AQI (EPA scale 0–500). */
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
}

export interface DailyForecastPoint {
  /** Calendar date in the city's local timezone (yyyy-mm-dd). */
  date: string;
  temperatureMin: number | null;
  temperatureMax: number | null;
  /** Mean daily relative humidity (%). */
  humidity: number | null;
  /** Maximum daily wind speed (m/s). */
  windSpeed: number | null;
  weatherCode: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  /** Hours per day with measurable precipitation. */
  precipitationHours: number | null;
  /** Dominant wind direction for the day (°). */
  windDirectionDominant: number | null;
  /** Sunrise time as ISO8601 string in the city's local timezone. */
  sunrise: string | null;
  /** Sunset time as ISO8601 string in the city's local timezone. */
  sunset: string | null;
  /** Peak US AQI of the day — derived from the day's real hourly readings. */
  aqi: number | null;
  /** Mean PM2.5 of the day — derived from real hourly readings (µg/m³). */
  pm25: number | null;
  /** Mean PM10 of the day — derived from real hourly readings (µg/m³). */
  pm10: number | null;
  /** Mean NO₂ of the day — derived from real hourly readings (µg/m³). */
  no2: number | null;
}

export interface ForecastBundle {
  hourly: HourlyForecastPoint[];
  daily: DailyForecastPoint[];
  source: string;
  fetchedAt: string;
  timezone: string;
}

// ─── Raw Open-Meteo response shapes ──────────────────────────────────────────

interface OpenMeteoWeatherResponse {
  timezone?: string;
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    rain?: number[];
    pressure_msl?: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    precipitation_hours?: number[];
    wind_speed_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
    relative_humidity_2m_mean?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

interface OpenMeteoAirQualityResponse {
  timezone?: string;
  hourly?: {
    time: string[];
    pm2_5?: number[];
    pm10?: number[];
    nitrogen_dioxide?: number[];
    ozone?: number[];
    us_aqi?: number[];
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function toFiniteNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

// ─── Forecast window constants ────────────────────────────────────────────────
// Always request the full 7-day / 168-hour window so that a single cached
// bundle can serve every requested hour range (24h, 48h, 72h, 7d) via
// simple slicing, with hour 0 meaning "now" rather than "midnight today".
const MAX_FORECAST_DAYS = 7;
const MAX_FORECAST_HOURS = 168;

// ─── Provider fetch helpers ───────────────────────────────────────────────────

async function fetchWeatherForecast(
  lat: number,
  lng: number,
  timezone: string,
): Promise<OpenMeteoWeatherResponse | null> {
  try {
    const { data } = await axios.get<OpenMeteoWeatherResponse>(WEATHER_URL, {
      timeout: 10000,
      params: {
        latitude: lat,
        longitude: lng,
        timezone,
        forecast_days: MAX_FORECAST_DAYS,
        forecast_hours: MAX_FORECAST_HOURS,
        temperature_unit: "celsius",
        wind_speed_unit: "ms",
        precipitation_unit: "mm",
        hourly: HOURLY_WEATHER_VARS,
        daily: DAILY_WEATHER_VARS,
      },
    });
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[forecastProvider] Open-Meteo weather forecast failed: ${msg}`);
    return null;
  }
}

async function fetchAirQualityForecast(
  lat: number,
  lng: number,
  timezone: string,
): Promise<OpenMeteoAirQualityResponse | null> {
  try {
    const { data } = await axios.get<OpenMeteoAirQualityResponse>(
      AIR_QUALITY_URL,
      {
        timeout: 10000,
        params: {
          latitude: lat,
          longitude: lng,
          timezone,
          forecast_days: MAX_FORECAST_DAYS,
          forecast_hours: MAX_FORECAST_HOURS,
          hourly: HOURLY_AIR_QUALITY_VARS,
        },
      },
    );
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `[forecastProvider] Open-Meteo air-quality forecast failed: ${msg}`,
    );
    return null;
  }
}

// ─── Merge weather + air-quality into the normalized hourly/daily contract ────

function buildBundle(
  wx: OpenMeteoWeatherResponse | null,
  aq: OpenMeteoAirQualityResponse | null,
  requestedTimezone: string,
): ForecastBundle | null {
  if (!wx && !aq) return null;

  // Build a timestamp→AQ lookup from the hourly air-quality series so we can
  // join by timestamp rather than array index. This guarantees correctness
  // even if the two Open-Meteo endpoints return different time ranges.
  const aqTimes = aq?.hourly?.time ?? [];
  const aqByTime = new Map<
    string,
    {
      pm25: number | null;
      pm10: number | null;
      no2: number | null;
      o3: number | null;
      aqi: number | null;
    }
  >();
  aqTimes.forEach((t, i) => {
    aqByTime.set(t, {
      pm25: toFiniteNumber(aq?.hourly?.pm2_5?.[i]),
      pm10: toFiniteNumber(aq?.hourly?.pm10?.[i]),
      no2: toFiniteNumber(aq?.hourly?.nitrogen_dioxide?.[i]),
      o3: toFiniteNumber(aq?.hourly?.ozone?.[i]),
      aqi: toFiniteNumber(aq?.hourly?.us_aqi?.[i]),
    });
  });

  // Hourly series — keyed on weather timestamps; AQ fields joined by time
  const hourlyTimes = wx?.hourly?.time ?? aqTimes;
  const hourly: HourlyForecastPoint[] = hourlyTimes.map((t, i) => {
    const air = aqByTime.get(t);
    return {
      timestamp: t,
      temperature: toFiniteNumber(wx?.hourly?.temperature_2m?.[i]),
      humidity: toFiniteNumber(wx?.hourly?.relative_humidity_2m?.[i]),
      windSpeed: toFiniteNumber(wx?.hourly?.wind_speed_10m?.[i]),
      windDirection: toFiniteNumber(wx?.hourly?.wind_direction_10m?.[i]),
      weatherCode: wx?.hourly?.weather_code?.[i] ?? null,
      precipitationProbability: toFiniteNumber(
        wx?.hourly?.precipitation_probability?.[i],
      ),
      precipitation: toFiniteNumber(wx?.hourly?.precipitation?.[i]),
      rain: toFiniteNumber(wx?.hourly?.rain?.[i]),
      pressure: toFiniteNumber(wx?.hourly?.pressure_msl?.[i]),
      aqi: air?.aqi ?? null,
      pm25: air?.pm25 ?? null,
      pm10: air?.pm10 ?? null,
      no2: air?.no2 ?? null,
      o3: air?.o3 ?? null,
    };
  });

  // Daily AQ figures aren't provided directly by the air-quality endpoint
  // (hourly-only) — derive them from the real hourly readings.
  // AQI: peak of the day. Pollutants: mean of the day.
  interface DailyAqAgg {
    aqiMax: number;
    pm25Sum: number;
    pm25N: number;
    pm10Sum: number;
    pm10N: number;
    no2Sum: number;
    no2N: number;
  }
  const dailyAqAgg = new Map<string, DailyAqAgg>();
  aqTimes.forEach((t, i) => {
    const date = t.slice(0, 10);
    const entry: DailyAqAgg = dailyAqAgg.get(date) ?? {
      aqiMax: -Infinity,
      pm25Sum: 0,
      pm25N: 0,
      pm10Sum: 0,
      pm10N: 0,
      no2Sum: 0,
      no2N: 0,
    };
    const aqiV = toFiniteNumber(aq?.hourly?.us_aqi?.[i]);
    if (aqiV !== null) entry.aqiMax = Math.max(entry.aqiMax, aqiV);
    const pm25V = toFiniteNumber(aq?.hourly?.pm2_5?.[i]);
    if (pm25V !== null) {
      entry.pm25Sum += pm25V;
      entry.pm25N += 1;
    }
    const pm10V = toFiniteNumber(aq?.hourly?.pm10?.[i]);
    if (pm10V !== null) {
      entry.pm10Sum += pm10V;
      entry.pm10N += 1;
    }
    const no2V = toFiniteNumber(aq?.hourly?.nitrogen_dioxide?.[i]);
    if (no2V !== null) {
      entry.no2Sum += no2V;
      entry.no2N += 1;
    }
    dailyAqAgg.set(date, entry);
  });

  const dailyDates =
    wx?.daily?.time ?? Array.from(dailyAqAgg.keys()).sort();
  const daily: DailyForecastPoint[] = dailyDates.map((date, i) => {
    const agg = dailyAqAgg.get(date);
    return {
      date,
      temperatureMin: toFiniteNumber(wx?.daily?.temperature_2m_min?.[i]),
      temperatureMax: toFiniteNumber(wx?.daily?.temperature_2m_max?.[i]),
      humidity: toFiniteNumber(wx?.daily?.relative_humidity_2m_mean?.[i]),
      windSpeed: toFiniteNumber(wx?.daily?.wind_speed_10m_max?.[i]),
      weatherCode: wx?.daily?.weather_code?.[i] ?? null,
      precipitationProbability: toFiniteNumber(
        wx?.daily?.precipitation_probability_max?.[i],
      ),
      precipitation: toFiniteNumber(wx?.daily?.precipitation_sum?.[i]),
      precipitationHours: toFiniteNumber(wx?.daily?.precipitation_hours?.[i]),
      windDirectionDominant: toFiniteNumber(
        wx?.daily?.wind_direction_10m_dominant?.[i],
      ),
      // sunrise/sunset are ISO8601 strings in the city's timezone — pass through as-is
      sunrise: wx?.daily?.sunrise?.[i] ?? null,
      sunset: wx?.daily?.sunset?.[i] ?? null,
      aqi:
        agg && agg.aqiMax !== -Infinity ? Math.round(agg.aqiMax) : null,
      pm25:
        agg && agg.pm25N > 0
          ? Math.round((agg.pm25Sum / agg.pm25N) * 10) / 10
          : null,
      pm10:
        agg && agg.pm10N > 0
          ? Math.round((agg.pm10Sum / agg.pm10N) * 10) / 10
          : null,
      no2:
        agg && agg.no2N > 0
          ? Math.round((agg.no2Sum / agg.no2N) * 10) / 10
          : null,
    };
  });

  // Use the timezone from the weather response if available (Open-Meteo echoes
  // the requested timezone back), falling back to the value the caller passed.
  const resolvedTimezone = wx?.timezone ?? aq?.timezone ?? requestedTimezone;

  return {
    hourly,
    daily,
    source:
      wx && aq
        ? "open-meteo:weather+air-quality"
        : wx
          ? "open-meteo:weather"
          : "open-meteo:air-quality",
    fetchedAt: new Date().toISOString(),
    timezone: resolvedTimezone,
  };
}

// ─── Short-lived cache ────────────────────────────────────────────────────────
// Avoids hitting the external provider on every frontend render.
// Keyed per cityId + timezone. One 7-day bundle per city.
const forecastCache = new TtlCache<ForecastBundle>(15 * 60 * 1000); // 15 min TTL

export interface GetCityForecastParams {
  cityId: string;
  lat: number;
  lng: number;
  timezone: string;
  hours: number;
}

// ─── Public entrypoint used by controllers ────────────────────────────────────
// `hours` only determines how much of the cached 7-day bundle the caller
// intends to use — the underlying fetch always retrieves (and caches) the
// full week per city/timezone, so repeated calls with different `hours`
// values (24h view, 48h view, weekly outlook, …) reuse the same cached
// data instead of triggering separate external requests.
export async function getCityForecast(
  params: GetCityForecastParams,
): Promise<ForecastBundle | null> {
  const { cityId, lat, lng, timezone } = params;
  const cacheKey = `${cityId}:${timezone}`;

  const cached = forecastCache.get(cacheKey);
  if (cached) return cached;

  const [wx, aq] = await Promise.all([
    fetchWeatherForecast(lat, lng, timezone),
    fetchAirQualityForecast(lat, lng, timezone),
  ]);

  const bundle = buildBundle(wx, aq, timezone);
  if (bundle) forecastCache.set(cacheKey, bundle);
  return bundle;
}
