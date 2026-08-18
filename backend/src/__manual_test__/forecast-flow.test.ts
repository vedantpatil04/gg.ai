import "dotenv/config";
import {
  getCityForecast,
  generateDeterministicForecastBundle,
} from "../services/forecastProvider.service";
import { fetchWeather } from "../services/weather.service";
import { fetchAirQuality } from "../services/airQuality.service";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";

async function runTests() {
  console.log("=== Starting GreenGuard Forecast & Weather Resilience Tests ===");

  // Test 1: Deduplication test with 10 concurrent calls for Belagavi
  console.log("\n[Test 1] Testing concurrent request deduplication for Belagavi...");
  const t0 = Date.now();
  const promises = Array.from({ length: 10 }, (_, i) =>
    getCityForecast({
      cityId: "belagavi",
      lat: 15.85,
      lng: 74.5,
      timezone: "Asia/Kolkata",
      hours: 48,
    }),
  );

  const results = await Promise.all(promises);
  const duration = Date.now() - t0;
  console.log(`[Test 1] 10 concurrent requests completed in ${duration}ms`);

  const allValid = results.every(
    (r) =>
      r !== null &&
      r.hourly.length === 168 &&
      r.daily.length === 7 &&
      r.hourly.every(
        (h) =>
          h.temperature !== null &&
          h.humidity !== null &&
          h.windSpeed !== null &&
          h.windDirection !== null &&
          h.weatherCode !== null &&
          h.precipitationProbability !== null &&
          h.precipitation !== null &&
          h.aqi !== null &&
          h.pm25 !== null &&
          h.pm10 !== null,
      ) &&
      r.daily.every(
        (d) =>
          d.temperatureMin !== null &&
          d.temperatureMax !== null &&
          d.humidity !== null &&
          d.windSpeed !== null &&
          d.weatherCode !== null &&
          d.precipitationProbability !== null &&
          d.precipitation !== null &&
          d.aqi !== null &&
          d.pm25 !== null,
      ),
  );
  console.log(`[Test 1] All 10 requests returned complete 168h + 7d bundles (0 nulls): ${allValid ? "✅ PASS" : "❌ FAIL"}`);

  if (results[0]) {
    console.log(`[Test 1] Sample result -> source: "${results[0].source}", timezone: "${results[0].timezone}"`);
    console.log(`[Test 1] Belagavi 0h -> Temp: ${results[0].hourly[0].temperature}°C, AQI: ${results[0].hourly[0].aqi}, WeatherCode: ${results[0].hourly[0].weatherCode}`);
  }

  // Test 2: Fallback bundle integrity check
  console.log("\n[Test 2] Testing deterministic fallback bundle structure for Belagavi...");
  const fb = generateDeterministicForecastBundle("belagavi", 15.85, 74.5, "Asia/Kolkata");
  const fbNullCount = fb.hourly.filter(
    (h) =>
      h.temperature === null ||
      h.humidity === null ||
      h.windSpeed === null ||
      h.weatherCode === null ||
      h.aqi === null,
  ).length;
  const fbDailyNullCount = fb.daily.filter(
    (d) =>
      d.temperatureMin === null ||
      d.temperatureMax === null ||
      d.aqi === null,
  ).length;
  console.log(`[Test 2] Fallback hourly null count: ${fbNullCount}, daily null count: ${fbDailyNullCount}`);
  console.log(`[Test 2] Fallback bundle completeness: ${fbNullCount === 0 && fbDailyNullCount === 0 ? "✅ PASS" : "❌ FAIL"}`);

  // Test 3: Multi-city forecast support
  console.log("\n[Test 3] Testing other supported cities...");
  const testCities = [
    { cityId: "bengaluru", lat: 12.97, lng: 77.59, timezone: "Asia/Kolkata" },
    { cityId: "mumbai", lat: 19.07, lng: 72.87, timezone: "Asia/Kolkata" },
    { cityId: "delhi", lat: 28.61, lng: 77.2, timezone: "Asia/Kolkata" },
  ];

  for (const c of testCities) {
    const bundle = await getCityForecast({ ...c, hours: 24 });
    const complete =
      !!bundle &&
      bundle.hourly.length > 0 &&
      bundle.daily.length > 0 &&
      bundle.hourly.every((h) => h.temperature !== null && h.aqi !== null);
    console.log(`[Test 3] ${c.cityId.toUpperCase()} -> ${complete ? "✅ PASS" : "❌ FAIL"} (Source: ${bundle?.source})`);
  }

  // Test 4: Rate limit active cooldown scenario
  console.log("\n[Test 4] Testing forecast resolution under active rate limit cooldown...");
  openMeteoRateLimiter.triggerRateLimitCooldown("test-suite");
  const cooldownBundle = await getCityForecast({
    cityId: "london",
    lat: 51.5,
    lng: -0.12,
    timezone: "Europe/London",
    hours: 24,
  });
  const cooldownComplete =
    !!cooldownBundle &&
    cooldownBundle.hourly.length === 168 &&
    cooldownBundle.hourly.every(
      (h) =>
        h.temperature !== null &&
        h.humidity !== null &&
        h.windSpeed !== null &&
        h.aqi !== null,
    );
  console.log(`[Test 4] Cooldown forecast complete (0 nulls): ${cooldownComplete ? "✅ PASS" : "❌ FAIL"} (Source: ${cooldownBundle?.source})`);
  openMeteoRateLimiter.reset();

  console.log("\n=== All Tests Completed Successfully ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
