import { City } from "../models/City";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { fetchAirQuality } from "./airQuality.service";
import { fetchWeather } from "./weather.service";
import { logger } from "../utils/logger";

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

// ─── Ingest one city ──────────────────────────────────────────────────────────
async function ingestCity(city: {
  cityId: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}): Promise<boolean> {
  try {
    const [aq, wx] = await Promise.all([
      fetchAirQuality(city.lat, city.lng),
      fetchWeather(city.lat, city.lng),
    ]);

    if (!aq && !wx) {
      logger.warn(`[ingestion] No data received for ${city.name} — skipping`);
      return false;
    }

    // Get last reading for this city to carry forward fields not in real APIs
    const prev = await EnvironmentalData.findOne({ cityId: city.cityId })
      .sort({ timestamp: -1 })
      .lean();

    const water = prev?.water ?? 70;
    const renewableShare = prev?.renewableShare ?? 20;
    const greenCover = prev?.greenCover ?? 20;
    const co2 = prev?.co2 ?? 415; // background CO2

    const aqi = aq?.aqi ?? prev?.aqi ?? 80;
    const pm25 = aq?.pm25 ?? prev?.pm25 ?? 25;

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
      temp: wx?.temp ?? prev?.temp ?? 25,
      humidity: wx?.humidity ?? prev?.humidity ?? 60,
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
    logger.info(`[ingestion] ✅ ${city.name} — AQI ${aqi}, PM2.5 ${pm25}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[ingestion] ❌ ${city.name}: ${msg}`);
    return false;
  }
}

// ─── Main ingestion run — iterates all active cities from DB ─────────────────
export async function runIngestion(): Promise<{ success: number; failed: number; total: number }> {
  logger.info("[ingestion] Starting environmental data ingestion run...");

  const cities = await City.find({ isActive: true }).lean();
  if (!cities.length) {
    logger.warn("[ingestion] No active cities in City registry — skipping run");
    return { success: 0, failed: 0, total: 0 };
  }

  let success = 0;
  let failed = 0;

  // Process cities with a small delay between calls to avoid rate limits
  for (const city of cities) {
    const ok = await ingestCity({
      cityId: city.cityId,
      name: city.name,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
    });
    if (ok) success++;
    else failed++;

    // 500ms between cities to avoid API rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  logger.info(
    `[ingestion] Run complete — ${success} success, ${failed} failed of ${cities.length} cities`,
  );
  return { success, failed, total: cities.length };
}
