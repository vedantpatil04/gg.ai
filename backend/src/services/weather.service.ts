import axios from "axios";
import { logger } from "../utils/logger";
import { TtlCache } from "../utils/ttlCache";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";
import {
  executeWithRetry,
  RateLimitExceededError,
  parseRetryAfterHeader,
} from "../utils/httpRetry";

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
  /** Open-Meteo `is_day` (1 = day, 0 = night). */
  isDay?: boolean | null;
}

export interface CityCoordinateTarget {
  cityId: string;
  lat: number;
  lng: number;
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
  "is_day",
].join(",");

interface OpenMeteoCurrentBlock {
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
  is_day?: number;
}

interface OpenMeteoLocationItem {
  latitude?: number;
  longitude?: number;
  location_id?: number;
  current?: OpenMeteoCurrentBlock;
}

// ─── Multi-tier TTL Cache for current weather (30m fresh, 24h stale fallback) ───
// 30m fresh window (aligned with 30m scheduler cycle), 24h stale fallback.
const weatherCache = new TtlCache<WeatherReading>(
  30 * 60 * 1000,
  24 * 60 * 60 * 1000,
);

// In-flight batch fetch promise to prevent duplicate concurrent network requests
let inFlightBatchPromise: Promise<Map<string, WeatherReading>> | null = null;

function toFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Helper to get the cached / stale weather reading for a city or coordinate.
 * Returns undefined if no real observation has been cached yet.
 */
export function getCachedWeather(
  cityIdOrKey: string,
  lat?: number,
  lng?: number,
): WeatherReading | undefined {
  const fresh =
    weatherCache.get(cityIdOrKey) ||
    (lat !== undefined && lng !== undefined
      ? weatherCache.get(coordKey(lat, lng))
      : undefined);
  if (fresh) return fresh;

  return (
    weatherCache.getStale(cityIdOrKey) ||
    (lat !== undefined && lng !== undefined
      ? weatherCache.getStale(coordKey(lat, lng))
      : undefined)
  );
}

/**
 * Parse an Open-Meteo `current` block into a normalized WeatherReading.
 * Returns null if required fields (temp, humidity) are missing or incomplete.
 */
function parseCurrentWeather(c?: OpenMeteoCurrentBlock): WeatherReading | null {
  if (!c) return null;

  const temp = toFinite(c.temperature_2m);
  const humidity = toFinite(c.relative_humidity_2m);

  if (temp === null || humidity === null) {
    return null;
  }

  const apparentRaw = toFinite(c.apparent_temperature);
  const weatherCodeRaw = toFinite(c.weather_code);
  const rainRaw = toFinite(c.rain);
  const isDayRaw = toFinite(c.is_day);

  return {
    temp: Math.round(temp * 10) / 10,
    humidity: Math.round(humidity),
    pressure: Math.round(toFinite(c.pressure_msl) ?? 1013),
    windSpeed: Math.round((toFinite(c.wind_speed_10m) ?? 0) * 10) / 10,
    windDirection: Math.round(toFinite(c.wind_direction_10m) ?? 0),
    visibility: null,
    rainfall: Math.round((toFinite(c.precipitation) ?? 0) * 10) / 10,
    apparentTemperature:
      apparentRaw !== null ? Math.round(apparentRaw * 10) / 10 : null,
    weatherCode: weatherCodeRaw !== null ? Math.round(weatherCodeRaw) : null,
    rain: rainRaw !== null ? Math.round(rainRaw * 10) / 10 : null,
    isDay: isDayRaw !== null ? isDayRaw === 1 : null,
  };
}

/**
 * Deterministically map Open-Meteo multi-location responses to requested cities.
 * Never relies solely on assumed array position without coordinate or location_id validation.
 */
function mapResponseToCities(
  targets: CityCoordinateTarget[],
  items: OpenMeteoLocationItem[],
): Map<string, WeatherReading> {
  const results = new Map<string, WeatherReading>();
  const unassignedTargets = new Set(targets.map((t) => t.cityId));

  // Step 1: Match by location_id if provided by Open-Meteo
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const locId = item.location_id ?? (items.length === targets.length ? i : undefined);

    if (locId !== undefined && locId >= 0 && locId < targets.length) {
      const target = targets[locId];
      if (unassignedTargets.has(target.cityId)) {
        // Validate coordinate proximity (< 1.5 degrees) to guard against any misalignment
        const latDiff = Math.abs((item.latitude ?? target.lat) - target.lat);
        const lngDiff = Math.abs((item.longitude ?? target.lng) - target.lng);
        if (latDiff < 1.5 && lngDiff < 1.5) {
          const reading = parseCurrentWeather(item.current);
          if (reading) {
            results.set(target.cityId, reading);
            weatherCache.set(target.cityId, reading);
            weatherCache.set(coordKey(target.lat, target.lng), reading);
            unassignedTargets.delete(target.cityId);
            continue;
          }
        }
      }
    }
  }

  // Step 2: Fallback nearest-coordinate matching for any unassigned targets
  for (const target of targets) {
    if (!unassignedTargets.has(target.cityId)) continue;

    let closestItem: OpenMeteoLocationItem | null = null;
    let minDistance = Infinity;

    for (const item of items) {
      if (item.latitude === undefined || item.longitude === undefined) continue;
      const d = Math.hypot(item.latitude - target.lat, item.longitude - target.lng);
      if (d < minDistance) {
        minDistance = d;
        closestItem = item;
      }
    }

    // Grid snap in Open-Meteo is typically within 0.25 degrees (~25km)
    if (closestItem && minDistance < 2.0) {
      const reading = parseCurrentWeather(closestItem.current);
      if (reading) {
        results.set(target.cityId, reading);
        weatherCache.set(target.cityId, reading);
        weatherCache.set(coordKey(target.lat, target.lng), reading);
        unassignedTargets.delete(target.cityId);
      }
    }
  }

  return results;
}

/**
 * Execute a single HTTP query for an array of coordinate targets with retry support.
 */
async function queryOpenMeteoWeatherBatch(
  targets: CityCoordinateTarget[],
): Promise<{ mapped: Map<string, WeatherReading>; attempts: number; durationMs: number; recovered: boolean }> {
  const lats = targets.map((c) => c.lat).join(",");
  const lngs = targets.map((c) => c.lng).join(",");

  const retryResult = await executeWithRetry(
    async () => {
      const res = await axios.get<OpenMeteoLocationItem | OpenMeteoLocationItem[]>(
        WEATHER_BASE_URL,
        {
          timeout: 10000,
          params: {
            latitude: lats,
            longitude: lngs,
            current: CURRENT_WEATHER_VARS,
            wind_speed_unit: "ms",
            precipitation_unit: "mm",
          },
        },
      );
      return res.data;
    },
    {
      serviceName: "weather",
      maxAttempts: 3,
      baseDelayMs: 600,
      maxDelayMs: 3000,
      backoffFactor: 2,
      jitterMs: 250,
      maxAllowedRetryAfterMs: 3000,
    },
  );

  const items: OpenMeteoLocationItem[] = Array.isArray(retryResult.data)
    ? retryResult.data
    : retryResult.data
      ? [retryResult.data]
      : [];

  const mapped = mapResponseToCities(targets, items);
  return {
    mapped,
    attempts: retryResult.attempts,
    durationMs: retryResult.durationMs,
    recovered: retryResult.recovered,
  };
}

export interface FetchWeatherBatchOptions {
  forceRefresh?: boolean;
}

/**
 * Fetch current weather for multiple cities in a single batched Open-Meteo request.
 * Automatically checks TtlCache first (unless forceRefresh is true), and only queries uncached coordinates.
 * Handles transient 503/502/504/429 upstream errors with bounded exponential backoff.
 * When upstream is temporarily unavailable, retains real last-known-good readings.
 */
export async function fetchWeatherBatch(
  cities: CityCoordinateTarget[],
  options?: FetchWeatherBatchOptions | boolean,
): Promise<Map<string, WeatherReading>> {
  const isForced = typeof options === "boolean" ? options : Boolean(options?.forceRefresh);
  const finalMap = new Map<string, WeatherReading>();
  const toFetch: CityCoordinateTarget[] = [];

  for (const city of cities) {
    const cached = !isForced
      ? weatherCache.get(city.cityId) ||
        weatherCache.get(coordKey(city.lat, city.lng))
      : undefined;

    if (cached) {
      finalMap.set(city.cityId, cached);
    } else {
      toFetch.push(city);
    }
  }

  // All cities satisfied from fresh cache — no network request needed
  if (toFetch.length === 0) {
    logger.debug(
      `[weather] ${cities.length} cities served from fresh cache (0 upstream requests)`,
    );
    return finalMap;
  }

  // If rate limit cooldown is actively in effect, immediately serve last-known-good stale data
  if (openMeteoRateLimiter.isRateLimitActive()) {
    logger.info(
      `[weather] Skipped upstream fetch for ${toFetch.length} cities — rate limit cooldown active (${openMeteoRateLimiter.getCooldownRemainingSeconds()}s remaining)`,
    );
    for (const city of toFetch) {
      const stale =
        weatherCache.getStale(city.cityId) ||
        weatherCache.getStale(coordKey(city.lat, city.lng));
      if (stale) {
        finalMap.set(city.cityId, stale);
      }
    }
    return finalMap;
  }

  // Deduplicate in-flight requests if another tick or caller is fetching concurrently
  if (inFlightBatchPromise) {
    try {
      const inFlightResults = await inFlightBatchPromise;
      for (const city of toFetch) {
        const res = inFlightResults.get(city.cityId);
        if (res) finalMap.set(city.cityId, res);
      }
      return finalMap;
    } catch {
      // In-flight request failed; fall through to attempt this batch
    }
  }

  const batchExecution = (async () => {
    try {
      const { mapped, attempts, durationMs, recovered } =
        await queryOpenMeteoWeatherBatch(toFetch);

      openMeteoRateLimiter.recordSuccess();

      for (const [cId, reading] of mapped.entries()) {
        finalMap.set(cId, reading);
      }

      if (recovered) {
        logger.info(
          `[weather] Open-Meteo current batch recovered after retry (attempt ${attempts}/3 for ${toFetch.length} cities in ${durationMs}ms)`,
        );
      } else {
        logger.info(
          `[weather] Batched fetch successful for ${mapped.size}/${toFetch.length} uncached cities (1 upstream request)`,
        );
      }
      return finalMap;
    } catch (err: unknown) {
      let status: number | null = null;
      if (axios.isAxiosError(err)) {
        status = err.response?.status ?? null;
      }

      if (err instanceof RateLimitExceededError || status === 429) {
        const retryAfter = parseRetryAfterHeader(err);
        openMeteoRateLimiter.triggerRateLimitCooldown(
          "weather",
          retryAfter ? retryAfter : undefined,
        );
      }

      // Small bounded sub-batch fallback on 503/504 if primary 14-city batch timed out or failed
      if ((status === 503 || status === 504 || status === null) && toFetch.length >= 8) {
        try {
          const mid = Math.ceil(toFetch.length / 2);
          const chunk1 = toFetch.slice(0, mid);
          const chunk2 = toFetch.slice(mid);

          logger.debug(
            `[weather] Attempting sub-batch fallback for ${toFetch.length} cities (chunks of ${chunk1.length} and ${chunk2.length})...`,
          );

          const [res1, res2] = await Promise.allSettled([
            queryOpenMeteoWeatherBatch(chunk1),
            queryOpenMeteoWeatherBatch(chunk2),
          ]);

          if (res1.status === "fulfilled") {
            for (const [cId, reading] of res1.value.mapped.entries()) {
              finalMap.set(cId, reading);
            }
          }
          if (res2.status === "fulfilled") {
            for (const [cId, reading] of res2.value.mapped.entries()) {
              finalMap.set(cId, reading);
            }
          }

          if (finalMap.size > 0) {
            openMeteoRateLimiter.recordSuccess();
            logger.info(
              `[weather] Sub-batch fallback succeeded for ${finalMap.size}/${toFetch.length} cities`,
            );
            return finalMap;
          }
        } catch {
          // Sub-batch fallback failed; proceed to last-known-good stale retention
        }
      }

      // Retain last-known-good stale readings for any uncached cities without fabricating data
      let staleRetainedCount = 0;
      for (const city of toFetch) {
        if (!finalMap.has(city.cityId)) {
          const stale =
            weatherCache.getStale(city.cityId) ||
            weatherCache.getStale(coordKey(city.lat, city.lng));
          if (stale) {
            finalMap.set(city.cityId, stale);
            staleRetainedCount++;
          }
        }
      }

      const errorMsg =
        status !== null
          ? `HTTP ${status}`
          : err instanceof Error
            ? err.message
            : String(err);

      logger.warn(
        `[weather] Open-Meteo batched current fetch temporarily unavailable (${errorMsg} after 3 attempts for ${toFetch.length} cities). ` +
          `Retaining last-known-good weather readings for ${staleRetainedCount}/${toFetch.length} cities.`,
      );

      return finalMap;
    }
  })();

  inFlightBatchPromise = batchExecution;
  try {
    return await batchExecution;
  } finally {
    inFlightBatchPromise = null;
  }
}

/**
 * Fetch current weather conditions from Open-Meteo for a given coordinate.
 * Preserves backward compatibility for single-city callers.
 * Checks TtlCache first, falling back to network fetch if uncached.
 *
 * @param lat      Latitude of the city
 * @param lng      Longitude of the city
 * @param timezone IANA timezone string — defaults to "UTC".
 * @param cityId   Optional city identifier for cache lookup
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  timezone = "UTC",
  cityId?: string,
): Promise<WeatherReading | null> {
  const key = cityId || coordKey(lat, lng);
  const cached =
    (cityId ? weatherCache.get(cityId) : undefined) ||
    weatherCache.get(coordKey(lat, lng));

  if (cached) {
    return cached;
  }

  const batchMap = await fetchWeatherBatch([{ cityId: key, lat, lng }]);
  const result = batchMap.get(key);
  if (result) return result;

  const stale =
    (cityId ? weatherCache.getStale(cityId) : undefined) ||
    weatherCache.getStale(coordKey(lat, lng));

  return stale ?? null;
}
