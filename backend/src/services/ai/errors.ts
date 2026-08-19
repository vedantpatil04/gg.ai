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

/** Provider is not configured (e.g. missing API key). */
export class AIAuthenticationError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "authentication_error", message);
    this.name = "AIAuthenticationError";
  }
}

/** Provider quota/rate limit exceeded. */
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
