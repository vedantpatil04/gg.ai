import { logger } from "../../utils/logger";
import {
  AIProvider,
  AIProviderName,
  AIGenerationRequest,
  GreenGuardAIResponse,
  ProviderSelection,
} from "./types";
import {
  AIProviderError,
  AIUnavailableError,
  AITimeoutError,
  AICapabilityError,
  isRetryable,
} from "./errors";
import { GeminiCenterProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { OpenRouterProvider } from "./providers/openrouter.provider";
import { AUTO_FALLBACK_ORDER, AI_COOLDOWN_FAILURE_THRESHOLD, AI_COOLDOWN_MS, getProviderTimeoutMs } from "./config";

// ─── Intelligence Center AI Gateway (Phase 3) ──────────────────────────────
// The production reliability layer for /copilot: Gemini Center, Groq, and
// OpenRouter all sit behind this one gateway. It is the ONLY thing the
// controller talks to — it never needs to know which underlying provider
// or SDK actually answered.
//
//   Manual mode  — call exactly the provider the user picked. On failure,
//                  never silently switch; surface one clean error (§6, §22).
//   Auto mode    — walk the configured priority order (Gemini → Groq →
//                  OpenRouter, from config.ts), skipping providers that
//                  aren't configured, don't support the requested
//                  capability, or are in cooldown. Stop at the first
//                  success (§7, §8, §16).
//
// Every attempt gets exactly one same-provider retry when the failure is
// transient (§11), a request timeout (§12), and a lightweight in-process
// health/cooldown so a provider that's clearly down stops being retried
// on every single request (§13).

interface ProviderHealth {
  consecutiveFailures: number;
  cooldownUntil: number | null;
}

function freshHealth(): ProviderHealth {
  return { consecutiveFailures: 0, cooldownUntil: null };
}

/** Wraps a provider call with a hard ceiling slightly above its own
 *  configured timeout — a safety net in case a provider/SDK doesn't
 *  actually honor its internal timeout (§12: "Do not allow requests to
 *  remain indefinitely in a loading state"). */
function withSafetyTimeout<T>(
  promise: Promise<T>,
  providerName: AIProviderName,
): Promise<T> {
  const ms = getProviderTimeoutMs(providerName) + 3_000;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AITimeoutError(
          providerName,
          "The selected AI provider took too long to respond. Try again or choose another provider.",
        ),
      );
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class IntelligenceCenterAIGateway {
  private readonly providers: Record<AIProviderName, AIProvider> = {
    gemini: new GeminiCenterProvider(),
    groq: new GroqProvider(),
    openrouter: new OpenRouterProvider(),
  };

  private readonly health: Record<AIProviderName, ProviderHealth> = {
    gemini: freshHealth(),
    groq: freshHealth(),
    openrouter: freshHealth(),
  };

  private isInCooldown(name: AIProviderName): boolean {
    const state = this.health[name];
    return state.cooldownUntil !== null && Date.now() < state.cooldownUntil;
  }

  private recordSuccess(name: AIProviderName): void {
    this.health[name] = freshHealth();
  }

  private recordFailure(name: AIProviderName): void {
    const state = this.health[name];
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= AI_COOLDOWN_FAILURE_THRESHOLD && state.cooldownUntil === null) {
      state.cooldownUntil = Date.now() + AI_COOLDOWN_MS;
      logger.warn(
        `Intelligence Center AI Gateway: ${name} entering cooldown for ${AI_COOLDOWN_MS}ms after ${state.consecutiveFailures} consecutive failures`,
      );
    }
  }

  /** One attempt against one provider, with its timeout enforced. Does
   *  NOT retry — callers decide whether to retry (§11). */
  private async attempt(
    name: AIProviderName,
    request: AIGenerationRequest,
    requestId?: string,
  ): Promise<GreenGuardAIResponse> {
    const provider = this.providers[name];
    const startedAt = Date.now();
    const tag = requestId ? ` [${requestId}]` : "";

    try {
      const response = await withSafetyTimeout(provider.generate(request), name);
      this.recordSuccess(name);
      logger.info(
        `Intelligence Center AI Gateway${tag}: ${name}/${response.model} succeeded in ${Date.now() - startedAt}ms`,
      );
      return response;
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      if (err instanceof AIProviderError) {
        // A capability mismatch is a routing decision, not a provider
        // health signal — don't count it toward cooldown.
        if (err.code !== "capability_error") this.recordFailure(name);
        logger.warn(
          `Intelligence Center AI Gateway${tag}: ${name} failed after ${latencyMs}ms (${err.code}): ${err.message}`,
        );
        throw err;
      }
      this.recordFailure(name);
      logger.error(
        `Intelligence Center AI Gateway${tag}: ${name} failed after ${latencyMs}ms with an unexpected error`,
      );
      throw new AIUnavailableError(name, "AI temporarily unavailable.");
    }
  }

  /** One attempt, plus exactly one same-provider retry if the failure was
   *  transient (§11). Never retries auth/capability/config errors. */
  private async attemptWithRetry(
    name: AIProviderName,
    request: AIGenerationRequest,
    requestId?: string,
  ): Promise<GreenGuardAIResponse> {
    try {
      return await this.attempt(name, request, requestId);
    } catch (err) {
      if (!isRetryable(err)) throw err;
      const tag = requestId ? ` [${requestId}]` : "";
      logger.info(`Intelligence Center AI Gateway${tag}: ${name} transient failure, retrying once`);
      return this.attempt(name, request, requestId);
    }
  }

  private canServe(name: AIProviderName, request: AIGenerationRequest): boolean {
    const provider = this.providers[name];
    const capability = request.capability ?? "text";
    return provider.isConfigured() && provider.capabilities[capability];
  }

  private async generateManual(
    name: AIProviderName,
    request: AIGenerationRequest,
    requestId?: string,
  ): Promise<GreenGuardAIResponse> {
    const provider = this.providers[name];
    const capability = request.capability ?? "text";

    if (!provider.isConfigured()) {
      logger.warn(`Intelligence Center AI Gateway: "${name}" is not configured`);
      throw new AIUnavailableError(name, "The selected AI provider is currently unavailable.");
    }
    if (!provider.capabilities[capability]) {
      throw new AICapabilityError(name, `${provider.displayName} doesn't support this type of request.`);
    }
    if (this.isInCooldown(name)) {
      logger.warn(`Intelligence Center AI Gateway: "${name}" is in cooldown, reporting unavailable`);
      throw new AIUnavailableError(name, "The selected AI provider is currently unavailable.");
    }

    // Manual mode never silently switches providers (§6, §22) — a
    // transient failure still gets its one retry, but a final failure is
    // reported cleanly rather than falling through to another provider.
    return this.attemptWithRetry(name, request, requestId);
  }

  private async generateAuto(
    request: AIGenerationRequest,
    requestId?: string,
  ): Promise<GreenGuardAIResponse> {
    const tag = requestId ? ` [${requestId}]` : "";
    const attempted: string[] = [];

    for (const name of AUTO_FALLBACK_ORDER) {
      const provider = this.providers[name];
      const capability = request.capability ?? "text";

      if (!provider.isConfigured()) continue;
      if (!provider.capabilities[capability]) {
        logger.info(`Intelligence Center AI Gateway${tag}: skipping ${name} (no ${capability} support)`);
        continue;
      }
      if (this.isInCooldown(name)) {
        logger.info(`Intelligence Center AI Gateway${tag}: skipping ${name} (in cooldown)`);
        continue;
      }

      try {
        const response = await this.attemptWithRetry(name, request, requestId);
        if (attempted.length > 0) {
          logger.info(
            `Intelligence Center AI Gateway${tag}: Auto fallback → ${name} succeeded after ${attempted.join(", ")} failed`,
          );
        }
        return response;
      } catch (err) {
        attempted.push(name);
        // Any provider-side failure moves Auto mode to the next
        // configured, capable provider (§9, §10) — request-level
        // validation errors never reach the gateway at all; those are
        // rejected by the controller before this is called.
        continue;
      }
    }

    logger.error(
      `Intelligence Center AI Gateway${tag}: Auto mode exhausted all providers (tried: ${attempted.join(", ") || "none configured/capable"})`,
    );
    throw new AIUnavailableError(
      "auto",
      "GreenGuard AI is temporarily unavailable. Please try again shortly.",
    );
  }

  /** Single entry point for the /copilot Assistant. `selection` is either
   *  a specific provider (Manual mode) or "auto" (Auto mode, §7-§8). */
  async generate(
    request: AIGenerationRequest,
    selection: ProviderSelection,
    requestId?: string,
  ): Promise<GreenGuardAIResponse> {
    if (selection === "auto") return this.generateAuto(request, requestId);
    return this.generateManual(selection, request, requestId);
  }
}

export const intelligenceCenterAIGateway = new IntelligenceCenterAIGateway();
