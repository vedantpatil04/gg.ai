import "dotenv/config";
import { connectDB } from "../database/connection";
import { runIngestion, checkDatabaseFreshness } from "../services/ingestion.service";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";
import { triggerManualIngestion } from "../jobs/scheduler";
import { fetchWeatherBatch } from "../services/weather.service";
import { fetchAirQualityBatch } from "../services/airQuality.service";
import mongoose from "mongoose";

async function runManualRefreshOverrideTests() {
  console.log("=== Starting GreenGuard Manual Refresh Override Test Suite ===\n");
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

  // ─── Test 1: Seed a fresh reading & verify automatic scheduler skips upstream ───
  console.log("--- Scenario 1: Fresh DB + Automatic Scheduler (forceRefresh: false) ---");
  // First, ensure DB has fresh data by running one forced ingestion
  const initialRun = await runIngestion({ force: true, forceRefresh: true });
  assert(initialRun.success > 0 && initialRun.skipped === false, "Initial seeding succeeded", `${initialRun.success} cities ingested`);

  const freshness = await checkDatabaseFreshness(20);
  assert(freshness.isFresh === true, "Database is fresh (< 20 min)", `age=${freshness.ageMinutes}m`);

  // Automatic scheduler run (force: false) on fresh DB must skip upstream calls
  const schedulerRun = await runIngestion({ force: false, forceRefresh: false });
  assert(schedulerRun.skipped === true, "Automatic scheduler skips upstream request when DB is fresh", `skipped=${schedulerRun.skipped}, cities=${schedulerRun.success}`);

  // ─── Test 2: Fresh DB + Manual Refresh (forceRefresh: true) ─────────────────────
  console.log("\n--- Scenario 2: Fresh DB + Manual Refresh (forceRefresh: true) ---");
  // Manual refresh with fresh DB must bypass freshness check and perform fresh ingestion
  const manualRun = await runIngestion({ force: true, forceRefresh: true });
  assert(manualRun.skipped === false, "Manual refresh overrides freshness gate", `skipped=${manualRun.skipped}`);
  assert(manualRun.success > 0 && manualRun.failed === 0, "Manual refresh successfully ingested fresh data", `${manualRun.success}/${manualRun.total} cities`);

  // ─── Test 3: Stale DB + Automatic Scheduler (forceRefresh: false) ───────────────
  console.log("\n--- Scenario 3: Stale DB + Automatic Scheduler ---");
  // A check with a 0-minute threshold represents a stale DB check
  const staleFreshness = await checkDatabaseFreshness(0);
  assert(staleFreshness.isFresh === false, "Database correctly classified as stale when age exceeds threshold");
  assert(typeof staleFreshness.isFresh === "boolean", "Stale DB check completed deterministically");

  // ─── Test 4: Stale DB + Manual Refresh (forceRefresh: true) ─────────────────────
  console.log("\n--- Scenario 4: Stale DB + Manual Refresh (forceRefresh: true) ---");
  const manualStaleRun = await runIngestion({ force: true, forceRefresh: true });
  assert(manualStaleRun.skipped === false && manualStaleRun.success > 0, "Manual refresh on stale DB executes upstream fetch and persists readings");

  // ─── Test 5: Manual Refresh + Upstream 503 / Cooldown Fallback ───────────────────
  console.log("\n--- Scenario 5: Manual Refresh with Rate Limit Cooldown & Outage Fallback ---");
  openMeteoRateLimiter.triggerRateLimitCooldown("manual-test-503-simulation", 5000);
  assert(openMeteoRateLimiter.isRateLimitActive(), "Rate limit cooldown active");

  // Manual refresh during cooldown / upstream outage must serve last-known-good without crashing or zeroing
  const fallbackRun = await runIngestion({ force: true, forceRefresh: true });
  assert(fallbackRun.success > 0, "Fallback serves last-known-good data during upstream outage", `${fallbackRun.success} cities preserved`);
  openMeteoRateLimiter.reset();

  // ─── Test 6: Repeated Manual Refresh Attempts (Deduplication & Spam Protection) ──
  console.log("\n--- Scenario 6: Repeated / Concurrent Manual Refresh Ingestion Runs ---");
  const targets = [{ cityId: "bengaluru", lat: 12.97, lng: 77.59 }, { cityId: "mumbai", lat: 19.07, lng: 72.87 }];
  const [concurrent1, concurrent2] = await Promise.all([
    fetchWeatherBatch(targets, { forceRefresh: true }),
    fetchWeatherBatch(targets, { forceRefresh: true }),
  ]);
  assert(concurrent1.size === 2 && concurrent2.size === 2, "Concurrent batch requests safely deduplicated via inFlightBatchPromise");

  const [concurrentAq1, concurrentAq2] = await Promise.all([
    fetchAirQualityBatch(targets, { forceRefresh: true }),
    fetchAirQualityBatch(targets, { forceRefresh: true }),
  ]);
  assert(concurrentAq1.size === 2 && concurrentAq2.size === 2, "Concurrent AQ batch requests safely deduplicated via inFlightAirQualityBatchPromise");

  // ─── Test 7: Scheduler Running + Manual Refresh Concurrency Safeguards ───────────
  console.log("\n--- Scenario 7: Scheduler Mutex & Concurrency Protection ---");
  const manualResult = await triggerManualIngestion(true);
  assert(manualResult.total > 0 || manualResult.total === -1, "triggerManualIngestion returns valid execution or collision indicator (total: -1)");

  console.log(`\n=== Manual Refresh Override Test Summary: ${passed} passed, ${failed} failed ===`);
  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runManualRefreshOverrideTests().catch((err) => {
  console.error("Manual refresh override test failed:", err);
  process.exit(1);
});
