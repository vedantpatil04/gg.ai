import axios from "axios";
import { logger } from "./logger";

export interface RetryOptions {
  serviceName: string;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitterMs?: number;
  maxAllowedRetryAfterMs?: number;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export interface RetryResult<T> {
  data: T;
  attempts: number;
  durationMs: number;
  recovered: boolean;
}

export class RateLimitExceededError extends Error {
  public retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "RateLimitExceededError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Identify if an error is transient (eligible for retry) or permanent (must fail immediately).
 */
export function isTransientHttpError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status) {
      // 500, 502, 503, 504 are transient upstream issues
      if (status === 500 || status === 502 || status === 503 || status === 504) {
        return true;
      }
      // 429 is rate limit (transient upstream pressure)
      if (status === 429) {
        return true;
      }
      // Permanent client errors (400 Bad Request, 404 Not Found, 422 Unprocessable, etc.) should NOT be retried
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // Network / connection / socket / timeout errors
    const code = err.code;
    if (
      code === "ECONNABORTED" ||
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN" ||
      code === "ERR_NETWORK" ||
      code === "ECONNREFUSED"
    ) {
      return true;
    }

    const message = err.message || "";
    if (
      message.includes("timeout") ||
      message.includes("Network Error") ||
      message.includes("socket hang up") ||
      message.includes("EAI_AGAIN")
    ) {
      return true;
    }
  } else if (err instanceof Error) {
    const message = err.message || "";
    if (
      message.includes("timeout") ||
      message.includes("Network Error") ||
      message.includes("socket hang up") ||
      message.includes("ECONNRESET")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Parse Retry-After header from an HTTP response in ms.
 */
export function parseRetryAfterHeader(err: unknown): number | null {
  if (axios.isAxiosError(err) && err.response?.headers) {
    const retryAfter =
      err.response.headers["retry-after"] ||
      err.response.headers["Retry-After"] ||
      err.response.headers["retry_after"];

    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.round(seconds * 1000);
      }
      const parsedDate = Date.parse(String(retryAfter));
      if (!Number.isNaN(parsedDate) && parsedDate > Date.now()) {
        return parsedDate - Date.now();
      }
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an asynchronous request function with bounded exponential backoff + jitter retries.
 */
export async function executeWithRetry<T>(
  requestFn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<RetryResult<T>> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 600;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const backoffFactor = options.backoffFactor ?? 2;
  const jitterMs = options.jitterMs ?? 300;
  const maxAllowedRetryAfterMs = options.maxAllowedRetryAfterMs ?? 3000;

  const startTime = Date.now();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await requestFn(attempt);
      const durationMs = Date.now() - startTime;
      return {
        data,
        attempts: attempt,
        durationMs,
        recovered: attempt > 1,
      };
    } catch (err: unknown) {
      lastError = err;
      const isTransient = isTransientHttpError(err);

      if (!isTransient || attempt >= maxAttempts) {
        throw err;
      }

      // Check for 429 Retry-After header
      const retryAfterMs = parseRetryAfterHeader(err);
      if (retryAfterMs !== null && retryAfterMs > maxAllowedRetryAfterMs) {
        // Upstream requested a longer cooldown — fail early so rate-limiter circuit breaker can activate
        throw new RateLimitExceededError(
          `Upstream rate limit requested ${Math.round(retryAfterMs / 1000)}s cooldown`,
          retryAfterMs,
        );
      }

      // Calculate exponential backoff delay with random jitter
      let delayMs =
        retryAfterMs !== null
          ? retryAfterMs
          : Math.min(
              maxDelayMs,
              baseDelayMs * Math.pow(backoffFactor, attempt - 1) + Math.random() * jitterMs,
            );
      delayMs = Math.round(delayMs);

      if (options.onRetry) {
        options.onRetry(attempt, delayMs, err);
      } else {
        const status = axios.isAxiosError(err) ? err.response?.status : null;
        const code = axios.isAxiosError(err) ? err.code : null;
        logger.debug(
          `[${options.serviceName}] Transient failure (attempt ${attempt}/${maxAttempts}: ${status ? `HTTP ${status}` : code || "network error"}). Retrying in ${delayMs}ms...`,
        );
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}
