import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { PROVIDER_REGISTRY, isProviderConfigured, getProviderApiKey } from "../config";
import { AIAuthenticationError, AIRateLimitError } from "../errors";
import { callOpenAICompatibleChat } from "./_openai-compatible";
import {
  GeminiCircuitBreaker,
  GeminiCache,
  GeminiCircuitState,
} from "../../../utils/geminiResilience";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// ─── Dedicated GG Center Groq Resilience State ──────────────────────────────
export const ggCenterGroqCircuit = new GeminiCircuitBreaker("gg-center-groq");
export const ggCenterGroqCache = new GeminiCache("gg-center:groq", 20 * 60 * 1000);
export const ggCenterGroqInFlight = new Map<string, Promise<GreenGuardAIResponse>>();

export function getGGCenterGroqCircuitState(): GeminiCircuitState {
  return ggCenterGroqCircuit.getState();
}

export function resetGGCenterGroqCircuit(): void {
  ggCenterGroqCircuit.reset();
  ggCenterGroqCache.clear();
  ggCenterGroqInFlight.clear();
}

export class GroqProvider implements AIProvider {
  readonly name = "groq" as const;
  get displayName(): string {
    return PROVIDER_REGISTRY.groq.displayName;
  }
  get model(): string {
    return PROVIDER_REGISTRY.groq.model;
  }
  get capabilities() {
    return PROVIDER_REGISTRY.groq.capabilities;
  }

  isConfigured(): boolean {
    return isProviderConfigured("groq");
  }

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const cacheKey = `copilot:${request.systemInstruction || "sys"}:${request.prompt}:${JSON.stringify(request.history || [])}`;

    // 1. Check Groq cache
    const cached = ggCenterGroqCache.get<GreenGuardAIResponse>(cacheKey);
    if (cached) {
      return { ...cached.data, cached: true, generatedAt: cached.generatedAt } as any;
    }

    // 2. Check in-flight deduplication
    if (ggCenterGroqInFlight.has(cacheKey)) {
      return ggCenterGroqInFlight.get(cacheKey)!;
    }

    // 3. Check Groq circuit breaker
    if (!ggCenterGroqCircuit.isAvailable()) {
      const lkg = ggCenterGroqCache.getLastKnownGood<GreenGuardAIResponse>(cacheKey);
      if (lkg) return { ...lkg.data, cached: true, generatedAt: lkg.generatedAt } as any;
      throw new AIRateLimitError(this.name, "Groq rate limit exceeded. Please try again shortly.");
    }

    const apiKey = getProviderApiKey(this.name);
    if (!apiKey) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const executionPromise = (async () => {
      try {
        const text = await callOpenAICompatibleChat({
          providerName: this.name,
          baseUrl: GROQ_BASE_URL,
          apiKey,
          model: this.model,
          systemInstruction: request.systemInstruction,
          history: request.history,
          prompt: request.prompt,
        });

        const response: GreenGuardAIResponse = { text, provider: this.name, model: this.model };
        ggCenterGroqCircuit.recordSuccess();
        ggCenterGroqCache.set(cacheKey, response);
        return response;
      } catch (err: unknown) {
        if (err instanceof AIRateLimitError) {
          ggCenterGroqCircuit.recordFailure("Rate limit exceeded");
        }
        const lkg = ggCenterGroqCache.getLastKnownGood<GreenGuardAIResponse>(cacheKey);
        if (lkg) return { ...lkg.data, cached: true, generatedAt: lkg.generatedAt } as any;
        throw err;
      } finally {
        ggCenterGroqInFlight.delete(cacheKey);
      }
    })();

    ggCenterGroqInFlight.set(cacheKey, executionPromise);
    return executionPromise;
  }
}
