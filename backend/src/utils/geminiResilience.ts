import { logger } from "./logger";

export type GeminiErrorType =
  | "quota_exceeded"
  | "rate_limit_exceeded"
  | "transient_server"
  | "permanent_client"
  | "safety"
  | "unknown";

export interface ClassifiedGeminiError {
  type: GeminiErrorType;
  message: string;
  status?: number;
  retryDelayMs?: number;
  quotaMetric?: string;
  quotaValue?: number;
}

export function classifyGeminiError(err: unknown): ClassifiedGeminiError {
  const msg = err instanceof Error ? err.message : String(err);
  const errObj = err as any;
  const status = typeof errObj?.status === "number" ? errObj.status : undefined;

  // Check for daily/model quota exhaustion
  // Google API 429 quota_exceeded signatures:
  // "QUOTA_EXCEEDED", "quota_exceeded", "generate_content_free_tier_requests", "free_tier_requests", "quotaValue: 20", "exhausted your capacity or quota"
  const isQuotaExhausted =
    /quota_exceeded|QUOTA_EXCEEDED|free_tier_requests|generate_content_free_tier_requests|quotaValue|capacity or quota|daily limit/i.test(
      msg,
    ) ||
    (status === 429 && /quota/i.test(msg));

  if (isQuotaExhausted) {
    return {
      type: "quota_exceeded",
      message: msg,
      status: status ?? 429,
      quotaMetric: msg.includes("free_tier_requests")
        ? "generativelanguage.googleapis.com/generate_content_free_tier_requests"
        : undefined,
    };
  }

  // Check for transient rate limit (RPM/TPM burst)
  if (status === 429 || /rate_limit_exceeded|RATE_LIMIT_EXCEEDED|too many requests|rate limit/i.test(msg)) {
    return {
      type: "rate_limit_exceeded",
      message: msg,
      status: status ?? 429,
      retryDelayMs: 1000,
    };
  }

  // Safety filter block
  if (/safety|blocked by safety filters|SAFETY/i.test(msg)) {
    return {
      type: "safety",
      message: msg,
      status: status,
    };
  }

  // Transient server/network errors (5xx, timeouts, connection drops)
  if (
    (status !== undefined && (status === 500 || status === 502 || status === 503 || status === 504)) ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network timeout|timeout|AbortError/i.test(msg)
  ) {
    return {
      type: "transient_server",
      message: msg,
      status: status ?? 503,
      retryDelayMs: 500,
    };
  }

  // Permanent client errors (400, 401, 403, 404)
  if (status !== undefined && (status === 400 || status === 401 || status === 403 || status === 404)) {
    return {
      type: "permanent_client",
      message: msg,
      status,
    };
  }

  return {
    type: "unknown",
    message: msg,
    status,
  };
}

export interface GeminiCircuitState {
  isExhausted: boolean;
  exhaustedAt: number | null;
  cooldownUntil: number | null;
  reason: string | null;
  consecutiveFailures: number;
}

export class GeminiCircuitBreaker {
  private readonly name: string;
  private isExhausted = false;
  private exhaustedAt: number | null = null;
  private cooldownUntil: number | null = null;
  private reason: string | null = null;
  private consecutiveFailures = 0;
  private lastLoggedState: boolean | null = null;

  constructor(name: string) {
    this.name = name;
  }

  isAvailable(): boolean {
    if (!this.isExhausted) return true;
    if (this.cooldownUntil !== null && Date.now() >= this.cooldownUntil) {
      // Transition to half-open to test one call
      return true;
    }
    return false;
  }

  recordQuotaExhaustion(details?: {
    reason?: string;
    cooldownMs?: number;
    quotaMetric?: string;
  }): void {
    const cooldown = details?.cooldownMs ?? 30 * 60 * 1000; // 30 min cooldown by default
    this.isExhausted = true;
    this.exhaustedAt = Date.now();
    this.cooldownUntil = this.exhaustedAt + cooldown;
    this.reason = details?.reason ?? "Daily or model quota exhausted";
    this.consecutiveFailures++;

    if (this.lastLoggedState !== true) {
      logger.warn(
        `[gemini][${this.name}] quota exhausted — circuit opened until ${new Date(this.cooldownUntil).toISOString()}${details?.quotaMetric ? ` (${details.quotaMetric})` : ""}`,
      );
      this.lastLoggedState = true;
    }
  }

  recordFailure(reason?: string): void {
    this.consecutiveFailures++;
    this.reason = reason ?? "Provider failure";
    if (this.consecutiveFailures >= 2 && this.cooldownUntil === null) {
      this.isExhausted = true;
      this.exhaustedAt = Date.now();
      this.cooldownUntil = Date.now() + 60_000; // 1 min cooldown
      if (this.lastLoggedState !== true) {
        logger.warn(
          `[provider][${this.name}] entering cooldown for 60s after ${this.consecutiveFailures} failures (${this.reason})`,
        );
        this.lastLoggedState = true;
      }
    }
  }

  recordSuccess(): void {
    if (this.isExhausted && this.lastLoggedState === true) {
      logger.info(`[gemini][${this.name}] recovered — circuit closed`);
    }
    this.isExhausted = false;
    this.exhaustedAt = null;
    this.cooldownUntil = null;
    this.reason = null;
    this.consecutiveFailures = 0;
    this.lastLoggedState = false;
  }

  getState(): GeminiCircuitState {
    return {
      isExhausted: this.isExhausted && (this.cooldownUntil === null || Date.now() < this.cooldownUntil),
      exhaustedAt: this.exhaustedAt,
      cooldownUntil: this.cooldownUntil,
      reason: this.reason,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  reset(): void {
    this.isExhausted = false;
    this.exhaustedAt = null;
    this.cooldownUntil = null;
    this.reason = null;
    this.consecutiveFailures = 0;
    this.lastLoggedState = null;
  }
}

interface CacheEntry<T> {
  data: T;
  generatedAt: Date;
  expiresAt: number;
}

export class GeminiCache {
  private readonly namespace: string;
  private readonly store = new Map<string, CacheEntry<any>>();
  private readonly lastKnownGood = new Map<string, { data: any; generatedAt: Date }>();
  private readonly defaultTtlMs: number;

  constructor(namespace: string, defaultTtlMs: number = 20 * 60 * 1000) {
    this.namespace = namespace.endsWith(":") ? namespace : `${namespace}:`;
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): { data: T; generatedAt: Date; cached: true } | null {
    const fullKey = `${this.namespace}${key}`;
    const entry = this.store.get(fullKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      // Entry expired from active cache, but kept in lastKnownGood
      this.store.delete(fullKey);
      return null;
    }
    return {
      data: entry.data as T,
      generatedAt: entry.generatedAt,
      cached: true,
    };
  }

  getLastKnownGood<T>(key: string): { data: T; generatedAt: Date; cached: true } | null {
    const fullKey = `${this.namespace}${key}`;
    const entry = this.lastKnownGood.get(fullKey);
    if (!entry) return null;
    return {
      data: entry.data as T,
      generatedAt: entry.generatedAt,
      cached: true,
    };
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const fullKey = `${this.namespace}${key}`;
    const now = new Date();
    const ttl = ttlMs ?? this.defaultTtlMs;
    const entry: CacheEntry<T> = {
      data,
      generatedAt: now,
      expiresAt: Date.now() + ttl,
    };
    this.store.set(fullKey, entry);
    this.lastKnownGood.set(fullKey, { data, generatedAt: now });
  }

  clear(): void {
    this.store.clear();
    this.lastKnownGood.clear();
  }
}
