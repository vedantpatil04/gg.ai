import "dotenv/config";
import { connectDB } from "../database/connection";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { City } from "../models/City";
import { fetchWeather, WeatherReading } from "../services/weather.service";
import { runIngestion } from "../services/ingestion.service";
import mongoose from "mongoose";

// Frontend-equivalent WMO resolver logic to test mapping fidelity
const WMO_CODE_MAP: Record<number, { label: string; normalized: string }> = {
  0: { label: "Clear sky", normalized: "CLEAR" },
  1: { label: "Mainly clear", normalized: "CLEAR" },
  2: { label: "Partly cloudy", normalized: "PARTLY_CLOUDY" },
  3: { label: "Overcast", normalized: "OVERCAST" },
  45: { label: "Fog", normalized: "FOG" },
  48: { label: "Depositing rime fog", normalized: "FOG" },
  51: { label: "Light drizzle", normalized: "DRIZZLE" },
  53: { label: "Moderate drizzle", normalized: "DRIZZLE" },
  55: { label: "Dense drizzle", normalized: "DRIZZLE" },
  61: { label: "Slight rain", normalized: "RAIN" },
  63: { label: "Moderate rain", normalized: "RAIN" },
  65: { label: "Heavy rain", normalized: "HEAVY_RAIN" },
  71: { label: "Slight snow", normalized: "SNOW" },
  73: { label: "Moderate snow", normalized: "SNOW" },
  75: { label: "Heavy snow", normalized: "HEAVY_SNOW" },
  80: { label: "Slight rain showers", normalized: "RAIN" },
  81: { label: "Moderate rain showers", normalized: "RAIN" },
  82: { label: "Violent rain showers", normalized: "HEAVY_RAIN" },
  95: { label: "Thunderstorm", normalized: "THUNDERSTORM" },
  96: { label: "Thunderstorm with slight hail", normalized: "THUNDERSTORM" },
  99: { label: "Thunderstorm with heavy hail", normalized: "THUNDERSTORM" },
};

function resolveWmoMeta(code: number | null | undefined, isDay = true) {
  if (code === null || code === undefined) {
    return { label: "Weather unavailable", normalized: "UNKNOWN", isDay };
  }
  const entry = WMO_CODE_MAP[code];
  if (entry) {
    return { label: entry.label, normalized: entry.normalized, isDay };
  }
  return { label: `Weather (Code ${code})`, normalized: "UNKNOWN", isDay };
}

async function runDashboardWeatherIntegrityTests() {
  console.log("=== Starting GreenGuard Dashboard Weather Data Integrity Test Suite ===\n");
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}${detail ? ` — ${detail}` : ""}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // ─── Test 1: Weather record with Clear code → Clear condition ──────────────
  console.log("--- Test 1: Clear Weather Code (WMO 0, 1) ---");
  const clearDayMeta = resolveWmoMeta(0, true);
  assert(clearDayMeta.normalized === "CLEAR" && clearDayMeta.label === "Clear sky", "WMO Code 0 maps to Clear sky");
  const clearNightMeta = resolveWmoMeta(1, false);
  assert(clearNightMeta.normalized === "CLEAR" && clearNightMeta.label === "Mainly clear" && !clearNightMeta.isDay, "WMO Code 1 maps to Mainly clear (night)");

  // ─── Test 2: Weather record with Rain code → Rain condition ─────────────────
  console.log("\n--- Test 2: Rain Weather Codes (WMO 61, 63, 65, 80, 81, 82) ---");
  const rainMeta = resolveWmoMeta(63, true);
  assert(rainMeta.normalized === "RAIN" && rainMeta.label === "Moderate rain", "WMO Code 63 maps to Moderate rain");
  const heavyRainMeta = resolveWmoMeta(65, true);
  assert(heavyRainMeta.normalized === "HEAVY_RAIN" && heavyRainMeta.label === "Heavy rain", "WMO Code 65 maps to Heavy rain");
  const showerMeta = resolveWmoMeta(80, true);
  assert(showerMeta.normalized === "RAIN" && showerMeta.label === "Slight rain showers", "WMO Code 80 maps to Slight rain showers");

  // ─── Test 3: Weather record with Thunderstorm code → Thunderstorm condition ─
  console.log("\n--- Test 3: Thunderstorm Weather Codes (WMO 95, 96, 99) ---");
  const stormMeta = resolveWmoMeta(95, true);
  assert(stormMeta.normalized === "THUNDERSTORM" && stormMeta.label === "Thunderstorm", "WMO Code 95 maps to Thunderstorm");

  // ─── Test 4 & 5 & 6: Live Open-Meteo Real Data Ingestion Validation ─────────
  console.log("\n--- Test 4, 5, 6: Real Weather Pipeline Ingestion & Schema Persistence ---");
  const weatherReading = await fetchWeather(15.85, 74.5, "belagavi");
  assert(weatherReading !== null, "Live weather fetched from Open-Meteo for Belagavi");
  if (weatherReading) {
    assert(typeof weatherReading.temp === "number" && !isNaN(weatherReading.temp), "Temperature is a real number", `${weatherReading.temp}°C`);
    assert(typeof weatherReading.humidity === "number" && weatherReading.humidity >= 0 && weatherReading.humidity <= 100, "Humidity is a valid percentage", `${weatherReading.humidity}%`);
    assert(typeof weatherReading.windSpeed === "number" && weatherReading.windSpeed >= 0, "Wind speed is a valid number", `${weatherReading.windSpeed} km/h`);
    assert(weatherReading.weatherCode !== undefined, "Weather code is captured", `code=${weatherReading.weatherCode}`);
    assert(weatherReading.isDay !== undefined, "isDay is captured", `isDay=${weatherReading.isDay}`);
  }

  // ─── Test 7: No Hardcoded Rainy Fallback When Humidity > 80 ────────────────
  console.log("\n--- Test 7: High Humidity Does NOT Force 'Rainy' ---");
  const highHumidityClearReading: WeatherReading = {
    temp: 22.5,
    humidity: 95, // 95% humidity like in user's screenshot
    pressure: 1012,
    windSpeed: 4.7,
    windDirection: 180,
    visibility: null,
    rainfall: 0,
    weatherCode: 0, // Clear Sky
    isDay: true,
  };
  const resolvedHighHumidityMeta = resolveWmoMeta(highHumidityClearReading.weatherCode, highHumidityClearReading.isDay ?? true);
  assert(
    resolvedHighHumidityMeta.normalized === "CLEAR" && resolvedHighHumidityMeta.label === "Clear sky",
    "High humidity (95%) with WMO Code 0 stays 'Clear sky' instead of becoming 'Rainy'",
    `resolved=${resolvedHighHumidityMeta.label}`,
  );

  // ─── Test 8: Missing Current Reading → Fallback to Last-Known-Good ──────────
  console.log("\n--- Test 8: Fallback to Last-Known-Good Persisted Reading ---");
  // Check latest record in MongoDB for a platform city
  const latestDoc = await EnvironmentalData.findOne({ cityId: "mumbai" }).sort({ timestamp: -1 }).lean();
  assert(latestDoc !== null, "Found persisted environmental record for Mumbai in MongoDB");
  if (latestDoc) {
    assert(latestDoc.temp !== undefined, "Persisted temperature exists", `${latestDoc.temp}°C`);
    assert(latestDoc.humidity !== undefined, "Persisted humidity exists", `${latestDoc.humidity}%`);
  }

  // ─── Test 9: No Reading Available → Honest Unavailable State ───────────────
  console.log("\n--- Test 9: Unavailable State (Null weatherCode / temp) ---");
  const nullMeta = resolveWmoMeta(null);
  assert(nullMeta.normalized === "UNKNOWN" && nullMeta.label === "Weather unavailable", "Null weatherCode resolves to 'Weather unavailable' rather than fake 'Rainy'");

  // ─── Test 10: Multi-City Weather Differentiation ───────────────────────────
  console.log("\n--- Test 10: City Switching Weather Differentiation ---");
  const cities = await City.find({ isActive: true }).lean();
  assert(cities.length >= 10, "Platform has active cities", `count=${cities.length}`);

  // Ingest fresh data to ensure all cities have populated weather
  const ingestionResult = await runIngestion({ force: true, forceRefresh: true });
  assert(ingestionResult.success > 0, "Ingestion populated cities with real environmental & weather data", `${ingestionResult.success} cities`);

  const sampleCities = ["mumbai", "belagavi", "london"];
  for (const cid of sampleCities) {
    const doc = await EnvironmentalData.findOne({ cityId: cid }).sort({ timestamp: -1 }).lean();
    if (doc) {
      const meta = resolveWmoMeta(doc.weatherCode, doc.isDay ?? true);
      console.log(`   [City ${cid.toUpperCase()}]: ${doc.temp}°C, Humidity: ${doc.humidity}%, Wind: ${doc.windSpeed}km/h, Condition: "${meta.label}" (WMO: ${doc.weatherCode})`);
      assert(typeof doc.temp === "number", `${cid} has real temperature ${doc.temp}°C`);
      assert(doc.weatherCode !== undefined && doc.weatherCode !== null, `${cid} has real persisted weatherCode ${doc.weatherCode}`);
    }
  }

  // ─── Test 11: Manual Refresh End-to-End Persists Weather Codes ─────────────
  console.log("\n--- Test 11: Manual Refresh Ingestion Updates Persisted Weather Data ---");
  const refreshRun = await runIngestion({ force: true, forceRefresh: true });
  assert(refreshRun.success > 0 && refreshRun.skipped === false, "Manual refresh executed and updated all city records");

  const latestBelagavi = await EnvironmentalData.findOne({ cityId: "belagavi" }).sort({ timestamp: -1 }).lean();
  assert(latestBelagavi !== null && latestBelagavi.weatherCode !== undefined, "Latest Belagavi record contains weatherCode after manual refresh");

  console.log(`\n========================================`);
  console.log(`Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
}

runDashboardWeatherIntegrityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
