import cron from "node-cron";
import { runIngestion } from "../services/ingestion.service";
import { logger } from "../utils/logger";

// ─── Phase 1: Real Forecast Data Foundation ───────────────────────────────────
// The former scheduler gated real-time ingestion on the presence of
// OPENWEATHER_API_KEY or WAQI_API_KEY. Both providers have been replaced by
// Open-Meteo (see weather.service.ts and airQuality.service.ts). Open-Meteo
// requires no API key, so the scheduler now checks whether the Open-Meteo
// base URLs are configured in the environment (they are unconditionally
// present in .env) and enables real ingestion accordingly.

let isRunning = false;
// Whether the cron job was actually registered. Distinct from `isRunning`,
// which only reflects a single in-flight tick.
let isEnabled = false;

let lastRunAt: Date | null = null;
let lastRunResult: { success: number; failed: number; total: number } | null =
  null;

async function safeRun() {
  if (isRunning) {
    logger.warn(
      "[scheduler] Previous ingestion still running — skipping this tick",
    );
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
  // Open-Meteo requires no API key. The scheduler is considered configured
  // when the base URLs are present in the environment. Both are set in .env
  // by default so real ingestion runs unconditionally on startup.
  const weatherUrl =
    process.env.OPEN_METEO_WEATHER_BASE_URL ||
    "https://api.open-meteo.com/v1/forecast";
  const aqUrl =
    process.env.OPEN_METEO_AIR_QUALITY_BASE_URL ||
    "https://air-quality-api.open-meteo.com/v1/air-quality";

  const isConfigured = !!(weatherUrl && aqUrl);

  if (!isConfigured) {
    // This branch is only reachable if someone explicitly empties both env
    // vars, which is an unusual misconfiguration.
    logger.warn(
      "[scheduler] Open-Meteo base URLs are not configured. " +
        "Scheduler will not run real-time ingestion. " +
        "Set OPEN_METEO_WEATHER_BASE_URL and OPEN_METEO_AIR_QUALITY_BASE_URL in .env.",
    );
    return;
  }

  isEnabled = true;
  logger.info(
    "[scheduler] Open-Meteo provider configured — starting data ingestion scheduler (every 30 minutes)",
  );
  logger.info(`[scheduler]   Weather URL : ${weatherUrl}`);
  logger.info(`[scheduler]   Air Quality : ${aqUrl}`);

  // Run immediately on startup (non-blocking)
  setImmediate(() => safeRun());

  // Then every 30 minutes: "*/30 * * * *"
  cron.schedule("*/30 * * * *", () => {
    safeRun();
  });

  logger.info(
    "[scheduler] ✅ Ingestion scheduled: Open-Meteo weather + air-quality, every 30 minutes",
  );
}

// ─── Status for the platform health endpoint ──────────────────────────────────
export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  lastRunAt: Date | null;
  lastRunResult: { success: number; failed: number; total: number } | null;
}

export function getSchedulerStatus(): SchedulerStatus {
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
