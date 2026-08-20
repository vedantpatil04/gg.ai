// ─── GreenGuard Intelligence Center — AI Provider Errors ──────────────────
// Provider-independent error types. Each provider translates its own SDK/
// HTTP exception into one of these so the controller never needs to know
// which underlying provider or SDK failed. None of these expose API keys,
// stack traces, or other provider internals — messages are safe, user-
// facing text only (see Phase 2 spec §17).

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/** Provider is not configured (e.g. missing API key) or authentication failed (401/403). */
export class AIAuthenticationError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "authentication_error", message);
    this.name = "AIAuthenticationError";
  }
}

/** Provider model not found, decommissioned, or invalid model name (404). */
export class AIModelNotFoundError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "model_not_found", message);
    this.name = "AIModelNotFoundError";
  }
}

/** Provider rejected request due to bad configuration or parameters (400). */
export class AIInvalidRequestError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "invalid_request", message);
    this.name = "AIInvalidRequestError";
  }
}

/** Provider quota/rate limit exceeded (429). */
export class AIRateLimitError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "rate_limit_error", message);
    this.name = "AIRateLimitError";
  }
}

/** Provider call took too long / timed out. */
export class AITimeoutError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "timeout_error", message);
    this.name = "AITimeoutError";
  }
}

/** Transient network/upstream/server error (502, 503, 504, connection reset). */
export class AITransientError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "transient_error", message);
    this.name = "AITransientError";
  }
}

/** Provider is not available right now (unknown/unregistered/unreachable). */
export class AIUnavailableError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "unavailable_error", message);
    this.name = "AIUnavailableError";
  }
}

/** Requested operation isn't supported by this provider's capabilities. */
export class AICapabilityError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "capability_error", message);
    this.name = "AICapabilityError";
  }
}

// ─── Phase 3 — Failure classification (§9, §10, §11) ──────────────────────
// Two separate questions, deliberately kept apart:
//   1. isRetryable    — should we try the SAME provider one more time?
//   2. isFallbackEligible — should Auto mode move on to the NEXT provider?
//
// Truly transient errors (rate limit 429, timeout, upstream 502/503/504 / network)
// are retryable once on the same provider.
//
// Permanent / configuration errors (400, 401, 403, 404, invalid model, capability)
// must NEVER be retried in place — they will not succeed on attempt two.
// Both categories are fallback-eligible in Auto mode (skip to the next provider).

const RETRYABLE_CODES = new Set([
  "rate_limit_error",
  "timeout_error",
  "transient_error",
]);

const FALLBACK_ELIGIBLE_CODES = new Set([
  "rate_limit_error",
  "timeout_error",
  "transient_error",
  "model_not_found",
  "invalid_request",
  "unavailable_error",
  "authentication_error",
  "capability_error",
]);

/** Whether one same-provider retry should be attempted before giving up
 *  on this provider (Phase 3 §11). Configuration/auth/capability/404 errors
 *  are never retried in place — they won't succeed on attempt two. */
export function isRetryable(err: unknown): boolean {
  return err instanceof AIProviderError && RETRYABLE_CODES.has(err.code);
}

/** Whether Auto mode should move on to the next configured provider
 *  rather than failing the whole request (Phase 3 §9, §10). */
export function isFallbackEligible(err: unknown): boolean {
  return err instanceof AIProviderError && FALLBACK_ELIGIBLE_CODES.has(err.code);
}
