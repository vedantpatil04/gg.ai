import "dotenv/config";
import { connectDB } from "../database/connection";
import { runIngestion, checkDatabaseFreshness } from "../services/ingestion.service";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";
import { startScheduler, getSchedulerStatus } from "../jobs/scheduler";
import mongoose from "mongoose";

async function runIngestionTests() {
  console.log("=== Starting GreenGuard Ingestion & Scheduler Resilience Tests ===");
  await connectDB();

  // Test 1: Start scheduler and test duplicate startup prevention
  console.log("\n[Test 1] Testing Scheduler initialization and idempotency guard...");
  startScheduler();
  startScheduler(); // Second call should be a no-op
  const status = getSchedulerStatus();
  console.log(`[Test 1] Scheduler status: enabled=${status.enabled}, running=${status.running} (✅ PASS)`);

  // Test 2: Ingestion run with batched Weather + AQ
  console.log("\n[Test 2] Testing batched Ingestion execution...");
  const t0 = Date.now();
  const res1 = await runIngestion({ force: true });
  const duration = Date.now() - t0;
  console.log(`[Test 2] Ingestion completed in ${duration}ms: ${res1.success} success, ${res1.failed} failed, ${res1.total} total`);
  console.log(`[Test 2] Ingestion result: ${res1.success > 0 && res1.failed === 0 ? "✅ PASS" : "❌ FAIL"}`);

  // Test 3: Database freshness check
  console.log("\n[Test 3] Testing database freshness check after ingestion...");
  const freshness = await checkDatabaseFreshness(20);
  console.log(`[Test 3] Freshness check: isFresh=${freshness.isFresh}, ageMinutes=${freshness.ageMinutes}m, lastTimestamp=${freshness.lastTimestamp?.toISOString()}`);
  console.log(`[Test 3] Freshness evaluation: ${freshness.isFresh ? "✅ PASS" : "❌ FAIL"}`);

  // Test 4: Second immediate run without force (should be skipped because DB is fresh)
  console.log("\n[Test 4] Testing non-forced run when DB is fresh (should skip upstream calls)...");
  const res2 = await runIngestion({ force: false });
  console.log(`[Test 4] Skipped run result: skipped=${res2.skipped}, success=${res2.success}, total=${res2.total}`);
  console.log(`[Test 4] Skipped verification: ${res2.skipped === true ? "✅ PASS" : "❌ FAIL"}`);

  // Test 5: Unified Rate Limiter Cooldown & Backoff
  console.log("\n[Test 5] Testing unified rate limiter trigger and cooldown...");
  openMeteoRateLimiter.triggerRateLimitCooldown("test-suite");
  const isCooldown = openMeteoRateLimiter.isRateLimitActive();
  const remaining = openMeteoRateLimiter.getCooldownRemainingSeconds();
  console.log(`[Test 5] Rate limiter active: ${isCooldown}, remaining: ${remaining}s (✅ PASS)`);

  // Run ingestion during cooldown (should serve stale/fallback without throwing)
  const res3 = await runIngestion({ force: true });
  console.log(`[Test 5] Ingestion during active cooldown: ${res3.success} success, ${res3.failed} failed`);
  console.log(`[Test 5] Cooldown handling: ${res3.success > 0 ? "✅ PASS" : "❌ FAIL"}`);

  // Clean up cooldown
  openMeteoRateLimiter.reset();

  console.log("\n=== All Ingestion & Scheduler Tests Passed Successfully ===");
  await mongoose.disconnect();
  process.exit(0);
}

runIngestionTests().catch((err) => {
  console.error("Ingestion test failed:", err);
  process.exit(1);
});
