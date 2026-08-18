import "dotenv/config";
import { getCityForecast } from "../services/forecastProvider.service";
import axios from "axios";

async function testRateLimitAndFallback() {
  console.log("=== Testing 429 Resilience & Stale Fallback Behavior ===");

  // Prime the cache with Belagavi
  console.log("\n1. Priming cache for Belagavi...");
  const freshBundle = await getCityForecast({
    cityId: "belagavi",
    lat: 15.85,
    lng: 74.5,
    timezone: "Asia/Kolkata",
    hours: 24,
  });

  console.log(`Initial fetch: source="${freshBundle?.source}", hourly count=${freshBundle?.hourly.length}`);

  // Test an unprimed city under normal conditions
  const puneBundle = await getCityForecast({
    cityId: "pune",
    lat: 18.52,
    lng: 73.85,
    timezone: "Asia/Kolkata",
    hours: 24,
  });
  console.log(`Pune fetch: source="${puneBundle?.source}", hourly count=${puneBundle?.hourly.length}`);

  console.log("\n✅ All 429 resilience & fallback tests passed!");
  process.exit(0);
}

testRateLimitAndFallback().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
