import axios from "axios";
import { logger } from "../utils/logger";
import { TtlCache } from "../utils/ttlCache";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";
import {
  executeWithRetry,
  RateLimitExceededError,
  parseRetryAfterHeader,
} from "../utils/httpRetry";

// ─── Open-Meteo Air Quality API (current conditions) ─────────────────────────
// Docs: https://open-meteo.com/en/docs/air-quality-api
// Replaces the former OpenWeather Air Pollution + WAQI integrations.
// No API key is required for non-commercial use.
//
// AQI standard: Open-Meteo's `us_aqi` variable follows the EPA US AQI scale
// (0–500). It must NOT be labelled as CPCB, Indian, or GreenGuard AQI.
//
// SO₂ and CO: Open-Meteo does not expose these in the `current` block of the
// air-quality endpoint. They are intentionally left undefined (not set to 0)
// so that ingestion.service.ts can carry forward the most-recent measured
// value via its existing `aq?.so2 ?? prev?.so2` / `aq?.co ?? prev?.co`
// fallback — returning 0 would be a fabricated measurement.

export interface CityCoordinateTarget {
  cityId: string;
  lat: number;
  lng: number;
}

// ─── Normalised output matching ingestion.service.ts expectations ─────────────
export interface AirQualityReading {
  aqi: number;
  /** Always "US_AQI" — the AQI standard returned by Open-Meteo `us_aqi`. */
  aqiStandard: "US_AQI";
  pm25: number;
  pm10: number;
  no2: number;
  /**
   * SO₂ is NOT available from Open-Meteo current air-quality.
   * Left undefined so ingestion can carry forward the previous measurement.
   * Never set to 0 as that would fabricate a measured concentration.
   */
  so2?: number;
  o3: number;
  /**
   * CO is NOT available from Open-Meteo current air-quality.
   * Left undefined so ingestion can carry forward the previous measurement.
   * Never set to 0 as that would fabricate a measured concentration.
   */
  co?: number;
  source: "api" | "sensor";
}

// ─── Open-Meteo base URL — read from env, fall back to public endpoint ────────
const AIR_QUALITY_BASE_URL =
  process.env.OPEN_METEO_AIR_QUALITY_BASE_URL ||
  "https://air-quality-api.open-meteo.com/v1/air-quality";

// Current air-quality variables available from the Open-Meteo endpoint.
// so2 and co are deliberately excluded — they are not available here.
const CURRENT_AQI_VARS = [
  "us_aqi",
  "pm2_5",
  "pm10",
  "nitrogen_dioxide",
  "ozone",
].join(",");

interface OpenMeteoAirQualityCurrentBlock {
  time?: string;
  us_aqi?: number;
  pm2_5?: number;
  pm10?: number;
  nitrogen_dioxide?: number;
  ozone?: number;
}

interface OpenMeteoAirQualityLocationItem {
  latitude?: number;
  longitude?: number;
  location_id?: number;
  current?: OpenMeteoAirQualityCurrentBlock;
}

// ─── Multi-tier cache & in-flight deduplication for current air quality ──────
// 30m fresh window (aligned with 30m scheduler cycle), 24h stale fallback.
const airQualityCache = new TtlCache<AirQualityReading>(
  30 * 60 * 1000,
  24 * 60 * 60 * 1000,
);
let inFlightAirQualityBatchPromise: Promise<Map<string, AirQualityReading>> | null = null;

function toFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Parse an Open-Meteo `current` air quality block into a normalized AirQualityReading.
 * Returns null if both AQI and PM2.5 are missing.
 */
function parseCurrentAirQuality(
  c?: OpenMeteoAirQualityCurrentBlock,
): AirQualityReading | null {
  if (!c) return null;

  const aqi = toFinite(c.us_aqi);
  const pm25 = toFinite(c.pm2_5);

  if (aqi === null && pm25 === null) {
    return null;
  }

  return {
    aqi: Math.round(aqi ?? 0),
    aqiStandard: "US_AQI",
    pm25: Math.round((pm25 ?? 0) * 10) / 10,
    pm10: Math.round((toFinite(c.pm10) ?? 0) * 10) / 10,
    no2: Math.round((toFinite(c.nitrogen_dioxide) ?? 0) * 10) / 10,
    o3: Math.round((toFinite(c.ozone) ?? 0) * 10) / 10,
    source: "api",
  };
}

/**
 * Deterministically map Open-Meteo multi-location AQ responses to requested cities.
 */
function mapResponseToCities(
  targets: CityCoordinateTarget[],
  items: OpenMeteoAirQualityLocationItem[],
): Map<string, AirQualityReading> {
  const results = new Map<string, AirQualityReading>();
  const unassignedTargets = new Set(targets.map((t) => t.cityId));

  // Step 1: Match by location_id if provided
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const locId = item.location_id ?? (items.length === targets.length ? i : undefined);

    if (locId !== undefined && locId >= 0 && locId < targets.length) {
      const target = targets[locId];
      if (unassignedTargets.has(target.cityId)) {
        const latDiff = Math.abs((item.latitude ?? target.lat) - target.lat);
        const lngDiff = Math.abs((item.longitude ?? target.lng) - target.lng);
        if (latDiff < 1.5 && lngDiff < 1.5) {
          const reading = parseCurrentAirQuality(item.current);
          if (reading) {
            results.set(target.cityId, reading);
            airQualityCache.set(target.cityId, reading);
            airQualityCache.set(coordKey(target.lat, target.lng), reading);
            unassignedTargets.delete(target.cityId);
            continue;
          }
        }
      }
    }
  }

  // Step 2: Nearest coordinate matching for any unassigned targets
  for (const target of targets) {
    if (!unassignedTargets.has(target.cityId)) continue;

    let closestItem: OpenMeteoAirQualityLocationItem | null = null;
    let minDistance = Infinity;

    for (const item of items) {
      if (item.latitude === undefined || item.longitude === undefined) continue;
      const d = Math.hypot(item.latitude - target.lat, item.longitude - target.lng);
      if (d < minDistance) {
        minDistance = d;
        closestItem = item;
      }
    }

    if (closestItem && minDistance < 2.0) {
      const reading = parseCurrentAirQuality(closestItem.current);
      if (reading) {
        results.set(target.cityId, reading);
        airQualityCache.set(target.cityId, reading);
        airQualityCache.set(coordKey(target.lat, target.lng), reading);
        unassignedTargets.delete(target.cityId);
      }
    }
  }

  return results;
}

/**
 * Execute a single HTTP query for an array of coordinate targets with retry support.
 */
async function queryOpenMeteoAirQualityBatch(
  targets: CityCoordinateTarget[],
): Promise<{ mapped: Map<string, AirQualityReading>; attempts: number; durationMs: number; recovered: boolean }> {
  const lats = targets.map((c) => c.lat).join(",");
  const lngs = targets.map((c) => c.lng).join(",");

  const retryResult = await executeWithRetry(
    async () => {
      const res = await axios.get<OpenMeteoAirQualityLocationItem | OpenMeteoAirQualityLocationItem[]>(
        AIR_QUALITY_BASE_URL,
        {
          timeout: 10000,
          params: {
            latitude: lats,
            longitude: lngs,
            current: CURRENT_AQI_VARS,
          },
        },
      );
      return res.data;
    },
    {
      serviceName: "air-quality",
      maxAttempts: 3,
      baseDelayMs: 600,
      maxDelayMs: 3000,
      backoffFactor: 2,
      jitterMs: 250,
      maxAllowedRetryAfterMs: 3000,
    },
  );

  const items: OpenMeteoAirQualityLocationItem[] = Array.isArray(retryResult.data)
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

export interface FetchAirQualityBatchOptions {
  forceRefresh?: boolean;
}

/**
 * Fetch current air-quality readings for multiple cities in a single batched Open-Meteo request.
 * Automatically checks TtlCache first (unless forceRefresh is true), and queries uncached coordinates with bounded retries.
 * Retains real last-known-good readings during upstream outages.
 */
export async function fetchAirQualityBatch(
  cities: CityCoordinateTarget[],
  options?: FetchAirQualityBatchOptions | boolean,
): Promise<Map<string, AirQualityReading>> {
  const isForced = typeof options === "boolean" ? options : Boolean(options?.forceRefresh);
  const finalMap = new Map<string, AirQualityReading>();
  const toFetch: CityCoordinateTarget[] = [];

  for (const city of cities) {
    const cached = !isForced
      ? airQualityCache.get(city.cityId) ||
        airQualityCache.get(coordKey(city.lat, city.lng))
      : undefined;

    if (cached) {
      finalMap.set(city.cityId, cached);
    } else {
      toFetch.push(city);
    }
  }

  // All cities served from fresh cache — no network request needed
  if (toFetch.length === 0) {
    logger.debug(
      `[airQuality] ${cities.length} cities served from fresh cache (0 upstream requests)`,
    );
    return finalMap;
  }

  // If rate limit cooldown is active, serve last-known-good stale data immediately
  if (openMeteoRateLimiter.isRateLimitActive()) {
    logger.info(
      `[airQuality] Skipped upstream fetch for ${toFetch.length} cities — rate limit cooldown active (${openMeteoRateLimiter.getCooldownRemainingSeconds()}s remaining)`,
    );
    for (const city of toFetch) {
      const stale =
        airQualityCache.getStale(city.cityId) ||
        airQualityCache.getStale(coordKey(city.lat, city.lng));
      if (stale) {
        finalMap.set(city.cityId, stale);
      }
    }
    return finalMap;
  }

  // Deduplicate in-flight batch requests if another caller is fetching concurrently
  if (inFlightAirQualityBatchPromise) {
    try {
      const inFlightResults = await inFlightAirQualityBatchPromise;
      for (const city of toFetch) {
        const res = inFlightResults.get(city.cityId);
        if (res) finalMap.set(city.cityId, res);
      }
      return finalMap;
    } catch {
      // In-flight batch failed; fall through to attempt this batch
    }
  }

  const batchExecution = (async () => {
    try {
      const { mapped, attempts, durationMs, recovered } =
        await queryOpenMeteoAirQualityBatch(toFetch);

      openMeteoRateLimiter.recordSuccess();

      for (const [cId, reading] of mapped.entries()) {
        finalMap.set(cId, reading);
      }

      if (recovered) {
        logger.info(
          `[airQuality] Open-Meteo current batch recovered after retry (attempt ${attempts}/3 for ${toFetch.length} cities in ${durationMs}ms)`,
        );
      } else {
        logger.info(
          `[airQuality] Batched fetch successful for ${mapped.size}/${toFetch.length} uncached cities (1 upstream request)`,
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
          "air-quality",
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
            `[airQuality] Attempting sub-batch fallback for ${toFetch.length} cities (chunks of ${chunk1.length} and ${chunk2.length})...`,
          );

          const [res1, res2] = await Promise.allSettled([
            queryOpenMeteoAirQualityBatch(chunk1),
            queryOpenMeteoAirQualityBatch(chunk2),
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
              `[airQuality] Sub-batch fallback succeeded for ${finalMap.size}/${toFetch.length} cities`,
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
            airQualityCache.getStale(city.cityId) ||
            airQualityCache.getStale(coordKey(city.lat, city.lng));
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
        `[airQuality] Open-Meteo batched current fetch temporarily unavailable (${errorMsg} after 3 attempts for ${toFetch.length} cities). ` +
          `Retaining last-known-good air quality readings for ${staleRetainedCount}/${toFetch.length} cities.`,
      );

      return finalMap;
    }
  })();

  inFlightAirQualityBatchPromise = batchExecution;
  try {
    return await batchExecution;
  } finally {
    inFlightAirQualityBatchPromise = null;
  }
}

/**
 * Fetch current air-quality readings from Open-Meteo for a given coordinate.
 * Preserves 100% backward compatibility for single-city callers.
 * Checks TtlCache first, delegating to batched fetch if uncached.
 *
 * @param lat      Latitude of the city
 * @param lng      Longitude of the city
 * @param timezone IANA timezone string — defaults to "UTC".
 * @param cityId   Optional city identifier for cache lookup
 */
export async function fetchAirQuality(
  lat: number,
  lng: number,
  timezone = "UTC",
  cityId?: string,
): Promise<AirQualityReading | null> {
  const key = cityId || coordKey(lat, lng);
  const cached =
    (cityId ? airQualityCache.get(cityId) : undefined) ||
    airQualityCache.get(coordKey(lat, lng));

  if (cached) {
    return cached;
  }

  const batchMap = await fetchAirQualityBatch([{ cityId: key, lat, lng }]);
  const result = batchMap.get(key);
  if (result) return result;

  const stale =
    (cityId ? airQualityCache.getStale(cityId) : undefined) ||
    airQualityCache.getStale(coordKey(lat, lng));

  return stale ?? null;
}
