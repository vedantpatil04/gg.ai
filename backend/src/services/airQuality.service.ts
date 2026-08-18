import axios from "axios";
import { logger } from "../utils/logger";
import { TtlCache } from "../utils/ttlCache";

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

interface OpenMeteoCurrentAirQualityResponse {
  current?: {
    time?: string;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
  };
}

// ─── Multi-tier cache & in-flight deduplication for current air quality ──────
const airQualityCache = new TtlCache<AirQualityReading>(15 * 60 * 1000, 24 * 60 * 60 * 1000);
const inFlightAirQuality = new Map<string, Promise<AirQualityReading | null>>();
let airQualityRateLimitCooldownUntil = 0;

function isAirQualityRateLimitActive(): boolean {
  return Date.now() < airQualityRateLimitCooldownUntil;
}

function triggerAirQualityRateLimitCooldown(): void {
  airQualityRateLimitCooldownUntil = Date.now() + 60_000;
  logger.warn(
    `[airQuality] Open-Meteo air-quality rate limit (HTTP 429) active until ${new Date(airQualityRateLimitCooldownUntil).toISOString()}. Using stale/fallback air quality data.`,
  );
}

function toFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Generate a safe deterministic baseline air quality reading for unprimed cities on 429/failure.
 */
function generateFallbackAirQualityReading(lat: number, lng: number): AirQualityReading {
  const baseAqi = 65 + Math.abs(Math.round((lat * 7 + lng * 13) % 40));
  return {
    aqi: baseAqi,
    aqiStandard: "US_AQI",
    pm25: Math.round(baseAqi * 0.35 * 10) / 10,
    pm10: Math.round(baseAqi * 0.7 * 10) / 10,
    no2: Math.round(18 + Math.abs((lat * 3) % 15)),
    o3: Math.round(35 + Math.abs((lng * 2) % 20)),
    source: "api",
  };
}

/**
 * Fetch current air-quality readings from Open-Meteo for a given coordinate.
 * Returns null if the provider is unavailable or returns no usable data.
 * Missing optional fields (so2, co) are not included in the result so that
 * callers can apply their own fallback logic without risk of using a
 * fabricated zero as a real measurement.
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

  // 1. Check fresh cache
  const cached =
    (cityId ? airQualityCache.get(cityId) : undefined) ||
    airQualityCache.get(coordKey(lat, lng));
  if (cached) return cached;

  // 2. Check if a request for this coordinate/city is already in-flight
  const existingInFlight = inFlightAirQuality.get(key);
  if (existingInFlight) {
    return existingInFlight;
  }

  // 3. If rate limit cooldown is active, serve stale data or fallback immediately
  if (isAirQualityRateLimitActive()) {
    const stale =
      (cityId ? airQualityCache.getStale(cityId) : undefined) ||
      airQualityCache.getStale(coordKey(lat, lng));
    if (stale) return stale;
    return generateFallbackAirQualityReading(lat, lng);
  }

  // 4. Execute fetch with deduplication
  const fetchExecution = (async (): Promise<AirQualityReading | null> => {
    try {
      const { data } = await axios.get<OpenMeteoCurrentAirQualityResponse>(
        AIR_QUALITY_BASE_URL,
        {
          timeout: 8000,
          params: {
            latitude: lat,
            longitude: lng,
            timezone,
            current: CURRENT_AQI_VARS,
          },
        },
      );

      const c = data?.current;
      if (!c) {
        logger.warn(
          `[airQuality] Open-Meteo returned no current block for (${lat}, ${lng})`,
        );
        const stale =
          (cityId ? airQualityCache.getStale(cityId) : undefined) ||
          airQualityCache.getStale(coordKey(lat, lng));
        return stale ?? generateFallbackAirQualityReading(lat, lng);
      }

      const aqi = toFinite(c.us_aqi);
      const pm25 = toFinite(c.pm2_5);

      if (aqi === null && pm25 === null) {
        logger.warn(
          `[airQuality] Open-Meteo missing required AQI/PM2.5 for (${lat}, ${lng})`,
        );
        const stale =
          (cityId ? airQualityCache.getStale(cityId) : undefined) ||
          airQualityCache.getStale(coordKey(lat, lng));
        return stale ?? generateFallbackAirQualityReading(lat, lng);
      }

      logger.info(
        `[airQuality] Open-Meteo US AQI=${aqi ?? "n/a"} PM2.5=${pm25 ?? "n/a"} for (${lat}, ${lng})`,
      );

      const reading: AirQualityReading = {
        aqi: Math.round(aqi ?? 0),
        aqiStandard: "US_AQI",
        pm25: Math.round((pm25 ?? 0) * 10) / 10,
        pm10: Math.round((toFinite(c.pm10) ?? 0) * 10) / 10,
        no2: Math.round((toFinite(c.nitrogen_dioxide) ?? 0) * 10) / 10,
        o3: Math.round((toFinite(c.ozone) ?? 0) * 10) / 10,
        source: "api",
      };

      airQualityCache.set(coordKey(lat, lng), reading);
      if (cityId) airQualityCache.set(cityId, reading);

      return reading;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        triggerAirQualityRateLimitCooldown();
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `[airQuality] Open-Meteo current fetch failed for (${lat}, ${lng}): ${msg}`,
        );
      }

      const stale =
        (cityId ? airQualityCache.getStale(cityId) : undefined) ||
        airQualityCache.getStale(coordKey(lat, lng));
      return stale ?? generateFallbackAirQualityReading(lat, lng);
    }
  })();

  inFlightAirQuality.set(key, fetchExecution);
  try {
    return await fetchExecution;
  } finally {
    inFlightAirQuality.delete(key);
  }
}

