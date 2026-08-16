// ─── GreenGuard AI Errors ──────────────────────────────────────────────────
// Provider-independent error types. Providers translate their own SDK
// exceptions into one of these so callers (and, if ever needed, the
// frontend) never have to know which underlying provider or SDK failed.
// None of these expose API keys, stack traces, or other provider internals
// in their message — messages are the same safe, user-facing text the
// existing Gemini fallback strings already used.

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

/** Provider is not configured/authenticated (e.g. missing API key). */
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

/** Provider (or the selected provider name) is not available right now. */
export class AIUnavailableError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "unavailable_error", message);
    this.name = "AIUnavailableError";
  }
}

/** Provider responded, but the response was rejected/blocked/unusable
 *  (e.g. safety filters). */
export class AIResponseError extends AIProviderError {
  constructor(provider: string, message: string) {
    super(provider, "response_error", message);
    this.name = "AIResponseError";
  }
}
