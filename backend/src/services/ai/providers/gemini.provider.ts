import {
  Content,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { logger } from "../../../utils/logger";
import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import {
  PROVIDER_REGISTRY,
  isProviderConfigured,
  getProviderTimeoutMs,
  getProviderApiKey,
  getProviderModel,
} from "../config";
import {
  AIAuthenticationError,
  AIModelNotFoundError,
  AIInvalidRequestError,
  AIRateLimitError,
  AITimeoutError,
  AITransientError,
  AIUnavailableError,
} from "../errors";
import {
  GeminiCircuitBreaker,
  GeminiCache,
  classifyGeminiError,
  GeminiCircuitState,
} from "../../../utils/geminiResilience";

// ─── Intelligence Center — Dedicated Gemini Center Resilience State ──────────
export const ggCenterGeminiCircuit = new GeminiCircuitBreaker("gg-center");
export const ggCenterGeminiCache = new GeminiCache("gg-center:gemini", 20 * 60 * 1000);
export const ggCenterGeminiInFlight = new Map<string, Promise<GreenGuardAIResponse>>();

export function getGGCenterGeminiCircuitState(): GeminiCircuitState {
  return ggCenterGeminiCircuit.getState();
}

export function resetGGCenterGeminiCircuit(): void {
  ggCenterGeminiCircuit.reset();
  ggCenterGeminiCache.clear();
  ggCenterGeminiInFlight.clear();
}

// ─── Dedicated GG Center Gemini Client ────────────────────────────────────────
let client: GoogleGenerativeAI | null = null;
let clientKey: string | undefined;

function getClient(): GoogleGenerativeAI | null {
  const apiKey = getProviderApiKey("gemini");
  if (!apiKey) return null;
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenerativeAI(apiKey);
    clientKey = apiKey;
  }
  return client;
}

function buildContents(request: AIGenerationRequest): Content[] {
  const contents: Content[] = [];
  for (const turn of request.history ?? []) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: request.prompt }] });
  return contents;
}

export class GeminiCenterProvider implements AIProvider {
  readonly name = "gemini" as const;
  get displayName(): string {
    return PROVIDER_REGISTRY.gemini.displayName;
  }
  get model(): string {
    return getProviderModel(this.name);
  }
  get capabilities() {
    return PROVIDER_REGISTRY.gemini.capabilities;
  }

  isConfigured(): boolean {
    return isProviderConfigured(this.name);
  }

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const cacheKey = `copilot:${request.systemInstruction || "sys"}:${request.prompt}:${JSON.stringify(request.history || [])}`;

    // 1. Check GG Center Gemini Cache
    const cached = ggCenterGeminiCache.get<GreenGuardAIResponse>(cacheKey);
    if (cached) {
      return { ...cached.data, cached: true, generatedAt: cached.generatedAt } as any;
    }

    // 2. Check GG Center Gemini In-Flight Deduplication
    if (ggCenterGeminiInFlight.has(cacheKey)) {
      return ggCenterGeminiInFlight.get(cacheKey)!;
    }

    // 3. Check GG Center Circuit Breaker
    if (!ggCenterGeminiCircuit.isAvailable()) {
      const lkg = ggCenterGeminiCache.getLastKnownGood<GreenGuardAIResponse>(cacheKey);
      if (lkg) {
        return { ...lkg.data, cached: true, generatedAt: lkg.generatedAt } as any;
      }
      throw new AIRateLimitError(this.name, "AI quota exceeded. Please try again shortly.");
    }

    const genAI = getClient();
    if (!genAI) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const model = genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: request.systemInstruction,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    });

    const executionPromise = (async () => {
      try {
        const result = await model.generateContent(
          { contents: buildContents(request) },
          { timeout: getProviderTimeoutMs(this.name) },
        );
        const text = result.response.text().trim();
        if (!text) {
          throw new AIUnavailableError(this.name, "AI temporarily unavailable.");
        }
        const response: GreenGuardAIResponse = { text, provider: this.name, model: this.model };
        ggCenterGeminiCircuit.recordSuccess();
        ggCenterGeminiCache.set(cacheKey, response);
        return response;
      } catch (err: unknown) {
        const classified = classifyGeminiError(err);

        if (classified.type === "quota_exceeded") {
          ggCenterGeminiCircuit.recordQuotaExhaustion({
            reason: classified.message,
            quotaMetric: classified.quotaMetric,
          });
          const lkg = ggCenterGeminiCache.getLastKnownGood<GreenGuardAIResponse>(cacheKey);
          if (lkg) return { ...lkg.data, cached: true, generatedAt: lkg.generatedAt } as any;
          throw new AIRateLimitError(this.name, "AI quota exceeded. Please try again shortly.");
        }

        if (err instanceof GoogleGenerativeAIFetchError) {
          const status = err.status;
          logger.warn(`Gemini Center request failed (HTTP ${status ?? "?"}): ${err.message}`);
          if (status === 401 || status === 403) {
            throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
          }
          if (status === 404 || /not found|no longer available|is not supported/i.test(err.message)) {
            throw new AIModelNotFoundError(
              this.name,
              "The selected Gemini model is currently unavailable. Please choose another AI provider or try again later.",
            );
          }
          if (status === 400) {
            throw new AIInvalidRequestError(
              this.name,
              "Invalid request or configuration for Gemini. Please try again or choose another provider.",
            );
          }
          if (status === 429) {
            throw new AIRateLimitError(this.name, "AI quota exceeded. Please try again shortly.");
          }
          if (status === 500 || status === 502 || status === 503 || status === 504) {
            throw new AITransientError(this.name, "AI service temporarily unavailable. Please try again.");
          }
          throw new AIUnavailableError(this.name, "AI temporarily unavailable.");
        }

        const msg = err instanceof Error ? err.message : String(err);
        if (/abort/i.test(msg) || (err instanceof Error && err.name === "AbortError")) {
          throw new AITimeoutError(
            this.name,
            "The selected AI provider took too long to respond. Try again or choose another provider.",
          );
        }
        if (/not found|no longer available|is not supported/i.test(msg)) {
          throw new AIModelNotFoundError(
            this.name,
            "The selected Gemini model is currently unavailable. Please choose another AI provider or try again later.",
          );
        }
        if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(msg)) {
          throw new AITransientError(this.name, "AI service temporarily unavailable. Please try again.");
        }
        logger.error(`Gemini Center request failed with an unexpected error: ${msg}`);
        throw new AIUnavailableError(this.name, "AI temporarily unavailable.");
      } finally {
        ggCenterGeminiInFlight.delete(cacheKey);
      }
    })();

    ggCenterGeminiInFlight.set(cacheKey, executionPromise);
    return executionPromise;
  }
}
