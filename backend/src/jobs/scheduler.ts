import cron from "node-cron";
import {
  runIngestion,
  IngestionRunOptions,
} from "../services/ingestion.service";
import { logger } from "../utils/logger";

// ─── Phase 1: Real Forecast Data Foundation & Safe Scheduler ─────────────────
// The scheduler periodically triggers real-time data ingestion for active
// cities via Open-Meteo. Uses batched network requests, shared rate-limit
// cooldowns, and database freshness validation to prevent upstream rate-limit
// exhaustion on Render and multi-instance deployments.

let isRunning = false;
let isEnabled = false;
let isSchedulerStarted = false;

let lastRunAt: Date | null = null;
let lastRunResult: {
  success: number;
  failed: number;
  total: number;
  skipped?: boolean;
} | null = null;

async function safeRun(options: IngestionRunOptions = {}): Promise<{
  success: number;
  failed: number;
  total: number;
  skipped?: boolean;
}> {
  if (isRunning) {
    logger.warn(
      "[scheduler] Previous ingestion still running — skipping this tick",
    );
    return { success: 0, failed: 0, total: -1 };
  }
  isRunning = true;
  const cycleStart = Date.now();
  const isForced = Boolean(options.force || options.forceRefresh);
  if (isForced) {
    logger.info("[scheduler] ⏳ Manual ingestion cycle started (forced override)");
  } else {
    logger.info("[scheduler] ⏳ Scheduled ingestion cycle started");
  }

  try {
    const result = await runIngestion(options);
    lastRunAt = new Date();
    lastRunResult = result;
    const elapsedMs = Date.now() - cycleStart;
    logger.info(
      `[scheduler] ✅ Ingestion cycle completed in ${elapsedMs}ms: ` +
        `${result.success} succeeded, ${result.failed} failed, ${result.total} total` +
        `${result.skipped ? " (skipped — DB fresh)" : ""}`,
    );
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[scheduler] ❌ Ingestion cycle encountered an error: ${msg}`);
    return { success: 0, failed: 1, total: 1 };
  } finally {
    isRunning = false;
  }
}

export function startScheduler(): void {
  // Idempotency guard: prevent duplicate scheduler registration across calls
  if (isSchedulerStarted) {
    logger.warn(
      "[scheduler] Scheduler is already initialized — skipping duplicate startScheduler() call",
    );
    return;
  }

  const weatherUrl =
    process.env.OPEN_METEO_WEATHER_BASE_URL ||
    "https://api.open-meteo.com/v1/forecast";
  const aqUrl =
    process.env.OPEN_METEO_AIR_QUALITY_BASE_URL ||
    "https://air-quality-api.open-meteo.com/v1/air-quality";

  const isConfigured = !!(weatherUrl && aqUrl);

  if (!isConfigured) {
    logger.warn(
      "[scheduler] Open-Meteo base URLs are not configured. " +
        "Scheduler will not run real-time ingestion. " +
        "Set OPEN_METEO_WEATHER_BASE_URL and OPEN_METEO_AIR_QUALITY_BASE_URL in .env.",
    );
    return;
  }

  isSchedulerStarted = true;
  isEnabled = true;

  const cronSchedule = process.env.INGESTION_CRON_SCHEDULE || "*/30 * * * *";

  logger.info(
    `[scheduler] Open-Meteo provider configured — starting safe ingestion scheduler (${cronSchedule})`,
  );
  logger.info(`[scheduler]   Weather URL : ${weatherUrl}`);
  logger.info(`[scheduler]   Air Quality : ${aqUrl}`);

  // Run on startup (non-blocking, automatically checks database freshness)
  setImmediate(() => {
    safeRun();
  });

  // Scheduled periodic run
  cron.schedule(cronSchedule, () => {
    safeRun();
  });

  logger.info(
    `[scheduler] ✅ Ingestion scheduled: Open-Meteo weather + air-quality (${cronSchedule})`,
  );
}

// ─── Status for the platform health endpoint ──────────────────────────────────
export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  lastRunAt: Date | null;
  lastRunResult: {
    success: number;
    failed: number;
    total: number;
    skipped?: boolean;
  } | null;
}

export function getSchedulerStatus(): SchedulerStatus {
  return { enabled: isEnabled, running: isRunning, lastRunAt, lastRunResult };
}

// ─── Manual trigger endpoint support ─────────────────────────────────────────
export async function triggerManualIngestion(force = true): Promise<{
  success: number;
  failed: number;
  total: number;
  skipped?: boolean;
}> {
  if (isRunning) {
    return { success: 0, failed: 0, total: -1 }; // -1 signals "already running"
  }
  return await safeRun({ force, forceRefresh: force });
}
