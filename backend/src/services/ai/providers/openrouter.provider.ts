import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { PROVIDER_REGISTRY, isProviderConfigured, getProviderApiKey } from "../config";
import { AIAuthenticationError, AIRateLimitError } from "../errors";
import { callOpenAICompatibleChat } from "./_openai-compatible";
import {
  GeminiCircuitBreaker,
  GeminiCache,
  GeminiCircuitState,
} from "../../../utils/geminiResilience";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ─── Dedicated GG Center OpenRouter Resilience State ────────────────────────
export const ggCenterOpenRouterCircuit = new GeminiCircuitBreaker("gg-center-openrouter");
export const ggCenterOpenRouterCache = new GeminiCache("gg-center:openrouter", 20 * 60 * 1000);
export const ggCenterOpenRouterInFlight = new Map<string, Promise<GreenGuardAIResponse>>();

export function getGGCenterOpenRouterCircuitState(): GeminiCircuitState {
  return ggCenterOpenRouterCircuit.getState();
}

export function resetGGCenterOpenRouterCircuit(): void {
  ggCenterOpenRouterCircuit.reset();
  ggCenterOpenRouterCache.clear();
  ggCenterOpenRouterInFlight.clear();
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter" as const;
  get displayName(): string {
    return PROVIDER_REGISTRY.openrouter.displayName;
  }
  get model(): string {
    return PROVIDER_REGISTRY.openrouter.model;
  }
  get capabilities() {
    return PROVIDER_REGISTRY.openrouter.capabilities;
  }

  isConfigured(): boolean {
    return isProviderConfigured("openrouter");
  }

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const cacheKey = `copilot:${request.systemInstruction || "sys"}:${request.prompt}:${JSON.stringify(request.history || [])}`;

    // 1. Check OpenRouter cache
    const cached = ggCenterOpenRouterCache.get<GreenGuardAIResponse>(cacheKey);
    if (cached) {
      return { ...cached.data, cached: true, generatedAt: cached.generatedAt } as any;
    }

    // 2. Check in-flight deduplication
    if (ggCenterOpenRouterInFlight.has(cacheKey)) {
      return ggCenterOpenRouterInFlight.get(cacheKey)!;
    }

    // 3. Check OpenRouter circuit breaker
    if (!ggCenterOpenRouterCircuit.isAvailable()) {
      const lkg = ggCenterOpenRouterCache.getLastKnownGood<GreenGuardAIResponse>(cacheKey);
      if (lkg) return { ...lkg.data, cached: true, generatedAt: lkg.generatedAt } as any;
      throw new AIRateLimitError(this.name, "OpenRouter rate limit exceeded. Please try again shortly.");
    }

    const apiKey = getProviderApiKey(this.name);
    if (!apiKey) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const executionPromise = (async () => {
      try {
        const text = await callOpenAICompatibleChat({
          providerName: this.name,
          baseUrl: OPENROUTER_BASE_URL,
          apiKey,
          model: this.model,
          systemInstruction: request.systemInstruction,
          history: request.history,
          prompt: request.prompt,
          extraHeaders: {
            ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
            "X-Title": "GreenGuard Intelligence Center",
          },
        });

        const response: GreenGuardAIResponse = { text, provider: this.name, model: this.model };
        ggCenterOpenRouterCircuit.recordSuccess();
        ggCenterOpenRouterCache.set(cacheKey, response);
        return response;
      } catch (err: unknown) {
        if (err instanceof AIRateLimitError) {
          ggCenterOpenRouterCircuit.recordFailure("Rate limit exceeded");
        }
        const lkg = ggCenterOpenRouterCache.getLastKnownGood<GreenGuardAIResponse>(cacheKey);
        if (lkg) return { ...lkg.data, cached: true, generatedAt: lkg.generatedAt } as any;
        throw err;
      } finally {
        ggCenterOpenRouterInFlight.delete(cacheKey);
      }
    })();

    ggCenterOpenRouterInFlight.set(cacheKey, executionPromise);
    return executionPromise;
  }
}
