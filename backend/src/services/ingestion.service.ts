import { City } from "../models/City";
import { EnvironmentalData } from "../models/EnvironmentalData";
import {
  fetchAirQuality,
  fetchAirQualityBatch,
  AirQualityReading,
} from "./airQuality.service";
import {
  fetchWeather,
  fetchWeatherBatch,
  WeatherReading,
} from "./weather.service";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";
import { logger } from "../utils/logger";

// ─── Freshness Threshold Constants ───────────────────────────────────────────
// Minimum interval between database ingestion runs. If data was already
// ingested within the last 20 minutes (e.g. by another instance or prior to
// a server restart), scheduled cycles safely skip upstream calls.
export const MIN_INGESTION_FRESHNESS_MINUTES = 20;

// ─── Derive AQI-based composite scores (no hardcoded city values) ─────────────
function deriveRiskScore(aqi: number, pm25: number): number {
  // WHO-based composite: AQI contributes 70%, PM2.5 exceedance 30%
  const aqiNorm = Math.min(aqi / 300, 1) * 70;
  const pm25Norm = Math.min(pm25 / 75, 1) * 30;
  return Math.round(aqiNorm + pm25Norm);
}

function deriveEcoScore(aqi: number, water: number, renewableShare: number): number {
  const aqiScore = Math.max(0, 100 - aqi / 3);
  const waterScore = water;
  const renewableScore = renewableShare;
  return Math.round(aqiScore * 0.5 + waterScore * 0.3 + renewableScore * 0.2);
}

function deriveCarbonEstimate(aqi: number, baseCarbon: number): number {
  // Adjust base carbon estimate by AQI deviation from 100 (moderate baseline)
  const factor = 1 + ((aqi - 100) / 500) * 0.2;
  return Math.round(baseCarbon * factor * 100) / 100;
}

/**
 * Check if the database already contains fresh environmental data from a recent run.
 * Protects against restart storms and multi-instance redundant fetching.
 */
export async function checkDatabaseFreshness(
  minMinutes: number = MIN_INGESTION_FRESHNESS_MINUTES,
): Promise<{ isFresh: boolean; lastTimestamp: Date | null; ageMinutes: number | null }> {
  try {
    const latest = await EnvironmentalData.findOne()
      .sort({ timestamp: -1 })
      .select("timestamp")
      .lean();

    if (!latest || !latest.timestamp) {
      return { isFresh: false, lastTimestamp: null, ageMinutes: null };
    }

    const ageMs = Date.now() - new Date(latest.timestamp).getTime();
    const ageMinutes = Math.round(ageMs / 60000);
    const isFresh = ageMs < minMinutes * 60 * 1000;

    return { isFresh, lastTimestamp: new Date(latest.timestamp), ageMinutes };
  } catch {
    return { isFresh: false, lastTimestamp: null, ageMinutes: null };
  }
}

// ─── Ingest one city ──────────────────────────────────────────────────────────
async function ingestCity(
  city: {
    cityId: string;
    name: string;
    country: string;
    lat: number;
    lng: number;
  },
  preloadedWx?: WeatherReading | null,
  preloadedAq?: AirQualityReading | null,
): Promise<boolean> {
  try {
    const [aq, wx] = await Promise.all([
      preloadedAq !== undefined
        ? Promise.resolve(preloadedAq)
        : fetchAirQuality(city.lat, city.lng, "UTC", city.cityId),
      preloadedWx !== undefined
        ? Promise.resolve(preloadedWx)
        : fetchWeather(city.lat, city.lng, "UTC", city.cityId),
    ]);

    if (!aq && !wx) {
      logger.warn(`[ingestion] No data received for ${city.name} — skipping`);
      return false;
    }

    // Get last reading for this city to carry forward unmeasured fields or fallback on upstream outage
    const prev = await EnvironmentalData.findOne({ cityId: city.cityId })
      .sort({ timestamp: -1 })
      .lean();

    if (!aq && !wx && !prev) {
      logger.warn(`[ingestion] No live data or historical baseline for ${city.name} — skipping`);
      return false;
    }

    const aqi = aq?.aqi ?? prev?.aqi;
    const pm25 = aq?.pm25 ?? prev?.pm25;
    const temp = wx?.temp ?? prev?.temp;
    const humidity = wx?.humidity ?? prev?.humidity;

    if (aqi === undefined || pm25 === undefined || temp === undefined || humidity === undefined) {
      logger.warn(
        `[ingestion] Incomplete environmental data for ${city.name} (live fetch unavailable and no previous record) — skipping`,
      );
      return false;
    }

    const water = prev?.water ?? 70;
    const renewableShare = prev?.renewableShare ?? 20;
    const greenCover = prev?.greenCover ?? 20;
    const co2 = prev?.co2 ?? 415; // background CO2

    const doc = {
      cityId: city.cityId,
      cityName: city.name,
      country: city.country,
      timestamp: new Date(),
      // Air quality — real or carried forward
      aqi,
      pm25,
      pm10: aq?.pm10 ?? prev?.pm10 ?? 40,
      no2: aq?.no2 ?? prev?.no2 ?? 25,
      o3: aq?.o3 ?? prev?.o3 ?? 40,
      co2,
      so2: aq?.so2 ?? prev?.so2,
      co: aq?.co ?? prev?.co,
      // Weather — real or carried forward
      temp,
      humidity,
      windSpeed: wx?.windSpeed ?? prev?.windSpeed,
      windDirection: wx?.windDirection ?? prev?.windDirection,
      pressure: wx?.pressure ?? prev?.pressure,
      // Sustained / derived
      water,
      renewableShare,
      greenCover,
      carbon: deriveCarbonEstimate(aqi, prev?.carbon ?? 5.0),
      risk: deriveRiskScore(aqi, pm25),
      eco: deriveEcoScore(aqi, water, renewableShare),
      lat: city.lat,
      lng: city.lng,
      source: "api" as const,
    };

    await EnvironmentalData.create(doc);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[ingestion] ❌ ${city.name}: ${msg}`);
    return false;
  }
}

export interface IngestionRunOptions {
  force?: boolean;
  forceRefresh?: boolean;
}

// ─── Main ingestion run — iterates all active cities from DB ─────────────────
export async function runIngestion(
  options: IngestionRunOptions = {},
): Promise<{ success: number; failed: number; total: number; skipped?: boolean }> {
  const startTime = Date.now();
  logger.info("[ingestion] Starting environmental data ingestion run...");

  const cities = await City.find({ isActive: true }).lean();
  if (!cities.length) {
    logger.warn("[ingestion] No active cities in City registry — skipping run");
    return { success: 0, failed: 0, total: 0 };
  }

  const isForced = Boolean(options.force || options.forceRefresh);

  // Cross-instance / restart check: Skip if database data is already fresh (unless forced)
  if (!isForced) {
    const freshness = await checkDatabaseFreshness(MIN_INGESTION_FRESHNESS_MINUTES);
    if (freshness.isFresh) {
      logger.info(
        `[ingestion] ⚡ Database readings are fresh (last ingested ${freshness.ageMinutes}m ago < ${MIN_INGESTION_FRESHNESS_MINUTES}m threshold) — skipping upstream calls for ${cities.length} cities`,
      );
      return { success: cities.length, failed: 0, total: cities.length, skipped: true };
    }
  } else {
    logger.info(
      `[ingestion] Manual refresh requested — bypassing freshness threshold for ${cities.length} cities`,
    );
  }

  // If rate limit cooldown is active, inform logs
  if (openMeteoRateLimiter.isRateLimitActive()) {
    logger.warn(
      `[ingestion] ⚠️ Rate limit cooldown active (${openMeteoRateLimiter.getCooldownRemainingSeconds()}s remaining) — serving cached/stale data for ${cities.length} cities`,
    );
  }

  const targets = cities.map((c) => ({
    cityId: c.cityId,
    lat: c.lat,
    lng: c.lng,
  }));

  // Pre-fetch weather and air quality concurrently in batched requests (1 request each)
  const [weatherMap, aqMap] = await Promise.all([
    fetchWeatherBatch(targets, { forceRefresh: isForced }),
    fetchAirQualityBatch(targets, { forceRefresh: isForced }),
  ]);

  let success = 0;
  let failed = 0;

  for (const city of cities) {
    const wx = weatherMap.get(city.cityId) ?? null;
    const aq = aqMap.get(city.cityId) ?? null;
    const ok = await ingestCity(
      {
        cityId: city.cityId,
        name: city.name,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
      },
      wx,
      aq,
    );
    if (ok) success++;
    else failed++;
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    `[ingestion] Ingestion complete in ${durationMs}ms — ${success} success, ${failed} failed across ${cities.length} cities`,
  );
  return { success, failed, total: cities.length, skipped: false };
}
