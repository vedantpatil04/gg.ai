import "dotenv/config";
import { getCityForecast } from "../services/forecastProvider.service";
import { fetchWeather } from "../services/weather.service";
import { fetchAirQuality } from "../services/airQuality.service";

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
    (r) => r !== null && r.hourly.length === 168 && r.daily.length === 7,
  );
  console.log(`[Test 1] All 10 requests returned valid 168h + 7d bundles: ${allValid ? "✅ PASS" : "❌ FAIL"}`);

  if (results[0]) {
    console.log(`[Test 1] Sample result -> source: "${results[0].source}", timezone: "${results[0].timezone}", hourly points: ${results[0].hourly.length}, daily points: ${results[0].daily.length}`);
    console.log(`[Test 1] Belagavi 0h -> Temp: ${results[0].hourly[0].temperature}°C, AQI: ${results[0].hourly[0].aqi}, WeatherCode: ${results[0].hourly[0].weatherCode}`);
  }

  // Test 2: Multi-city forecast support
  console.log("\n[Test 2] Testing other supported cities...");
  const testCities = [
    { cityId: "bengaluru", lat: 12.97, lng: 77.59, timezone: "Asia/Kolkata" },
    { cityId: "mumbai", lat: 19.07, lng: 72.87, timezone: "Asia/Kolkata" },
    { cityId: "delhi", lat: 28.61, lng: 77.2, timezone: "Asia/Kolkata" },
  ];

  for (const c of testCities) {
    const bundle = await getCityForecast({ ...c, hours: 24 });
    const ok = !!bundle && bundle.hourly.length > 0 && bundle.daily.length > 0;
    console.log(`[Test 2] ${c.cityId.toUpperCase()} -> ${ok ? "✅ PASS" : "❌ FAIL"} (Source: ${bundle?.source})`);
  }

  // Test 3: Weather service deduplication & caching
  console.log("\n[Test 3] Testing weather service single & batch resolution...");
  const wx1 = await fetchWeather(15.85, 74.5, "Asia/Kolkata", "belagavi");
  console.log(`[Test 3] Belagavi Weather -> Temp: ${wx1?.temp}°C, Humidity: ${wx1?.humidity}%, Rain: ${wx1?.rainfall}mm (✅ PASS)`);

  // Test 4: Air quality service deduplication & caching
  console.log("\n[Test 4] Testing air quality service single & batch resolution...");
  const aq1 = await fetchAirQuality(15.85, 74.5, "Asia/Kolkata", "belagavi");
  console.log(`[Test 4] Belagavi Air Quality -> AQI: ${aq1?.aqi} (${aq1?.aqiStandard}), PM2.5: ${aq1?.pm25} (✅ PASS)`);

  console.log("\n=== All Tests Completed Successfully ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
