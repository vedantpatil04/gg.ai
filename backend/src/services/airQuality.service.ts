import axios from "axios";
import { logger } from "../utils/logger";

// ─── Normalised output matching EnvironmentalData schema ─────────────────────
export interface AirQualityReading {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  co: number;
  source: "api" | "sensor";
}

// ─── OpenWeather Air Pollution API ───────────────────────────────────────────
// Docs: https://openweathermap.org/api/air-pollution
// AQI scale from OpenWeather is 1–5; we convert to US AQI 0–500

function pm25ToUsAqi(pm25: number): number {
  // Use PM2.5 breakpoints for US AQI (EPA standard)
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + ((100 - 50) / (35.4 - 12.1)) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(100 + ((150 - 100) / (55.4 - 35.5)) * (pm25 - 35.5));
  if (pm25 <= 150.4) return Math.round(150 + ((200 - 150) / (150.4 - 55.5)) * (pm25 - 55.5));
  if (pm25 <= 250.4) return Math.round(200 + ((300 - 200) / (250.4 - 150.5)) * (pm25 - 150.5));
  if (pm25 <= 350.4) return Math.round(300 + ((400 - 300) / (350.4 - 250.5)) * (pm25 - 250.5));
  return Math.round(400 + ((500 - 400) / (500.4 - 350.5)) * (pm25 - 350.5));
}

async function fetchFromOpenWeather(lat: number, lng: number): Promise<AirQualityReading | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${key}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const comp = data?.list?.[0]?.components;
    const owAqi = data?.list?.[0]?.main?.aqi ?? 2;
    if (!comp) return null;

    const pm25 = Number(comp.pm2_5) || 0;
    const pm10 = Number(comp.pm10) || 0;

    return {
      aqi: pm25ToUsAqi(pm25),
      pm25: Math.round(pm25 * 10) / 10,
      pm10: Math.round(pm10 * 10) / 10,
      no2: Math.round((Number(comp.no2) || 0) * 10) / 10,
      so2: Math.round((Number(comp.so2) || 0) * 10) / 10,
      o3: Math.round((Number(comp.o3) || 0) * 10) / 10,
      co: Math.round(((Number(comp.co) || 0) / 1000) * 100) / 100, // µg/m³ → mg/m³
      source: "api",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`OpenWeather air quality fetch failed: ${msg}`);
    return null;
  }
}

// ─── WAQI API ─────────────────────────────────────────────────────────────────
// Docs: https://aqicn.org/api/
async function fetchFromWAQI(lat: number, lng: number): Promise<AirQualityReading | null> {
  const key = process.env.WAQI_API_KEY;
  if (!key) return null;

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${key}`;
    const { data } = await axios.get(url, { timeout: 8000 });

    if (data?.status !== "ok") return null;

    const d = data.data;
    const iaqi = d?.iaqi ?? {};

    const pm25 = Number(iaqi.pm25?.v) || 0;
    const pm10 = Number(iaqi.pm10?.v) || 0;
    const aqiVal = Number(d?.aqi) || pm25ToUsAqi(pm25);

    return {
      aqi: aqiVal,
      pm25,
      pm10,
      no2: Number(iaqi.no2?.v) || 0,
      so2: Number(iaqi.so2?.v) || 0,
      o3: Number(iaqi.o3?.v) || 0,
      co: Number(iaqi.co?.v) || 0,
      source: "api",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`WAQI fetch failed: ${msg}`);
    return null;
  }
}

// ─── Public function — tries OpenWeather first, falls back to WAQI ───────────
export async function fetchAirQuality(lat: number, lng: number) {
  const result = await fetchFromOpenWeather(lat, lng);

  if (result) {
    logger.info("[AQI] Using OpenWeather");
    return result;
  }

  return fetchFromWAQI(lat, lng);
}
