import { logger } from "./logger";

// ─── Centralized Open-Meteo Rate Limiter & Circuit Breaker ──────────────────
// Prevents cascade rate-limit exhaustion by sharing cooldown status across
// weather, air quality, forecast provider, and background ingestion.
// When any Open-Meteo endpoint returns HTTP 429, all Open-Meteo clients
// immediately enter cooldown and serve cached, stale, or deterministic fallback
// data instead of firing repeated network requests.

class OpenMeteoRateLimiter {
  private cooldownUntil = 0;
  private consecutive429s = 0;

  /**
   * Check whether rate limit cooldown is currently active.
   */
  public isRateLimitActive(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  /**
   * Get remaining cooldown duration in milliseconds (0 if not active).
   */
  public getCooldownRemainingMs(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  /**
   * Get remaining cooldown duration in integer seconds.
   */
  public getCooldownRemainingSeconds(): number {
    return Math.ceil(this.getCooldownRemainingMs() / 1000);
  }

  /**
   * Trigger rate limit cooldown across all Open-Meteo callers.
   * Employs exponential backoff (2m -> 5m -> 10m) based on consecutive 429s.
   */
  public triggerRateLimitCooldown(
    serviceName: string,
    customDurationMs?: number,
  ): void {
    this.consecutive429s += 1;

    // Base backoff schedule: 2m -> 5m -> 10m
    const backoffMs =
      customDurationMs ??
      (this.consecutive429s === 1
        ? 2 * 60 * 1000
        : this.consecutive429s === 2
          ? 5 * 60 * 1000
          : 10 * 60 * 1000);

    this.cooldownUntil = Date.now() + backoffMs;

    logger.warn(
      `[rateLimiter] ⚠️ Open-Meteo rate limit (HTTP 429) encountered by ${serviceName}. ` +
        `Unified cooldown active for ${Math.round(backoffMs / 1000)}s until ${new Date(this.cooldownUntil).toISOString()} ` +
        `(consecutive 429 count: ${this.consecutive429s}). Serving cached/fallback data.`,
    );
  }

  /**
   * Record a successful upstream Open-Meteo request, resetting the consecutive failure counter.
   */
  public recordSuccess(): void {
    if (this.consecutive429s > 0) {
      this.consecutive429s = 0;
    }
  }

  /**
   * Reset cooldown (primarily for test environments).
   */
  public reset(): void {
    this.cooldownUntil = 0;
    this.consecutive429s = 0;
  }
}

export const openMeteoRateLimiter = new OpenMeteoRateLimiter();
