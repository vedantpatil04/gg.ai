import axios from "axios";
import { logger } from "../utils/logger";
import { TtlCache } from "../utils/ttlCache";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";

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
 * Generate a safe deterministic baseline weather reading for unprimed cities on 429/failure.
 */
export function generateFallbackWeatherReading(lat: number, lng: number): WeatherReading {
  const baseTemp = 24 + Math.sin(lat) * 4;
  return {
    temp: Math.round(baseTemp * 10) / 10,
    humidity: 62,
    pressure: 1013,
    windSpeed: 3.5,
    windDirection: 210,
    visibility: null,
    rainfall: 0,
    apparentTemperature: Math.round(baseTemp * 10) / 10,
    weatherCode: 1,
    rain: 0,
  };
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
 * Fetch current weather for multiple cities in a single batched Open-Meteo request.
 * Automatically checks TtlCache first, and only queries uncached coordinates.
 * Deterministically maps results to each cityId.
 */
export async function fetchWeatherBatch(
  cities: CityCoordinateTarget[],
): Promise<Map<string, WeatherReading>> {
  const finalMap = new Map<string, WeatherReading>();
  const toFetch: CityCoordinateTarget[] = [];

  for (const city of cities) {
    const cached =
      weatherCache.get(city.cityId) ||
      weatherCache.get(coordKey(city.lat, city.lng));

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

  // If rate limit cooldown is actively in effect, immediately serve stale data or fallback
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
      } else {
        const fallback = generateFallbackWeatherReading(city.lat, city.lng);
        weatherCache.set(city.cityId, fallback, 5 * 60 * 1000);
        finalMap.set(city.cityId, fallback);
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
      const lats = toFetch.map((c) => c.lat).join(",");
      const lngs = toFetch.map((c) => c.lng).join(",");

      const { data } = await axios.get<
        OpenMeteoLocationItem | OpenMeteoLocationItem[]
      >(WEATHER_BASE_URL, {
        timeout: 10000,
        params: {
          latitude: lats,
          longitude: lngs,
          current: CURRENT_WEATHER_VARS,
          wind_speed_unit: "ms",
          precipitation_unit: "mm",
        },
      });

      openMeteoRateLimiter.recordSuccess();

      const items: OpenMeteoLocationItem[] = Array.isArray(data)
        ? data
        : data
          ? [data]
          : [];

      const mapped = mapResponseToCities(toFetch, items);
      for (const [cId, reading] of mapped.entries()) {
        finalMap.set(cId, reading);
      }

      logger.info(
        `[weather] Batched fetch successful for ${mapped.size}/${toFetch.length} uncached cities (1 upstream request)`,
      );
      return finalMap;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        openMeteoRateLimiter.triggerRateLimitCooldown("weather");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `[weather] Open-Meteo batched current fetch failed for ${toFetch.length} cities: ${msg}`,
        );
      }

      // Populate any remaining uncached cities from stale cache or baseline
      for (const city of toFetch) {
        if (!finalMap.has(city.cityId)) {
          const stale =
            weatherCache.getStale(city.cityId) ||
            weatherCache.getStale(coordKey(city.lat, city.lng));
          if (stale) {
            finalMap.set(city.cityId, stale);
          } else {
            const fallback = generateFallbackWeatherReading(city.lat, city.lng);
            weatherCache.set(city.cityId, fallback, 5 * 60 * 1000);
            finalMap.set(city.cityId, fallback);
          }
        }
      }
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
  return stale ?? generateFallbackWeatherReading(lat, lng);
}
