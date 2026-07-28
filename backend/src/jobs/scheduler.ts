import cron from "node-cron";
import { runIngestion } from "../services/ingestion.service";
import { logger } from "../utils/logger";

let isRunning = false;
// Whether the cron job was actually registered (false when no ingestion API
// key is configured — see startScheduler below). Distinct from `isRunning`,
// which only reflects a single in-flight tick.
let isEnabled = false;

let lastRunAt: Date | null = null;
let lastRunResult: { success: number; failed: number; total: number } | null = null;

async function safeRun() {
  if (isRunning) {
    logger.warn("[scheduler] Previous ingestion still running — skipping this tick");
    return;
  }
  isRunning = true;
  try {
    const result = await runIngestion();
    lastRunAt = new Date();
    lastRunResult = result;
  } finally {
    isRunning = false;
  }
}

export function startScheduler(): void {
  const hasApiKey = !!(process.env.OPENWEATHER_API_KEY || process.env.WAQI_API_KEY);

  if (!hasApiKey) {
    logger.warn(
      "[scheduler] No external API keys found (OPENWEATHER_API_KEY / WAQI_API_KEY). " +
        "Scheduler will not run. Platform uses seeded data. " +
        "Set API keys in .env to enable real-time ingestion.",
    );
    return;
  }

  isEnabled = true;
  logger.info("[scheduler] Starting data ingestion scheduler (every 30 minutes)");

  // Run immediately on startup (non-blocking)
  setImmediate(() => safeRun());

  // Then every 30 minutes: "*/30 * * * *"
  cron.schedule("*/30 * * * *", () => {
    safeRun();
  });

  logger.info("[scheduler] ✅ Ingestion scheduled: every 30 minutes");
}

// ─── Status for the platform health endpoint (Phase 2.2) ────────────────────
export function getSchedulerStatus(): {
  enabled: boolean;
  running: boolean;
  lastRunAt: Date | null;
  lastRunResult: { success: number; failed: number; total: number } | null;
} {
  return { enabled: isEnabled, running: isRunning, lastRunAt, lastRunResult };
}

// ─── Manual trigger endpoint support ─────────────────────────────────────────
export async function triggerManualIngestion(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  if (isRunning) {
    return { success: 0, failed: 0, total: -1 }; // -1 signals "already running"
  }
  isRunning = true;
  try {
    const result = await runIngestion();
    lastRunAt = new Date();
    lastRunResult = result;
    return result;
  } finally {
    isRunning = false;
  }
}
