import axios from "axios";
import { logger } from "../utils/logger";

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

function toFinite(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
 * @param timezone IANA timezone string — defaults to "UTC". For current
 *                 measurement values this only affects the `time` field
 *                 in the response, which GreenGuard does not consume.
 */
export async function fetchAirQuality(
  lat: number,
  lng: number,
  timezone = "UTC",
): Promise<AirQualityReading | null> {
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
      return null;
    }

    const aqi = toFinite(c.us_aqi);
    const pm25 = toFinite(c.pm2_5);

    // At minimum we require AQI or PM2.5 — both null means the response
    // is not usable for ingestion purposes.
    if (aqi === null && pm25 === null) {
      logger.warn(
        `[airQuality] Open-Meteo missing required AQI/PM2.5 for (${lat}, ${lng})`,
      );
      return null;
    }

    logger.info(`[airQuality] Open-Meteo US AQI=${aqi ?? "n/a"} PM2.5=${pm25 ?? "n/a"} for (${lat}, ${lng})`);

    return {
      aqi: Math.round(aqi ?? 0),
      aqiStandard: "US_AQI",
      pm25: Math.round((pm25 ?? 0) * 10) / 10,
      pm10: Math.round((toFinite(c.pm10) ?? 0) * 10) / 10,
      no2: Math.round((toFinite(c.nitrogen_dioxide) ?? 0) * 10) / 10,
      // so2 and co are intentionally omitted — see module-level comment above.
      o3: Math.round((toFinite(c.ozone) ?? 0) * 10) / 10,
      source: "api",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `[airQuality] Open-Meteo current fetch failed for (${lat}, ${lng}): ${msg}`,
    );
    return null;
  }
}
