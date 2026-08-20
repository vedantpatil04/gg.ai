import {
  Content,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { logger } from "../../../utils/logger";
import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { PROVIDER_REGISTRY, isProviderConfigured, getProviderTimeoutMs } from "../config";
import {
  AIAuthenticationError,
  AIModelNotFoundError,
  AIInvalidRequestError,
  AIRateLimitError,
  AITimeoutError,
  AITransientError,
  AIUnavailableError,
} from "../errors";

// ─── Intelligence Center — Gemini Center Provider (Phase 3) ───────────────
// This is a SEPARATE Gemini client from the one in services/gemini.service.ts.
// It authenticates with its own dedicated INTELLIGENCE_GEMINI_API_KEY and is
// only ever reached through the Intelligence Center AI Gateway, for the
// /copilot Assistant. Every other Gemini-backed GreenGuard feature keeps
// using the existing GEMINI_API_KEY client in gemini.service.ts, untouched.

let client: GoogleGenerativeAI | null = null;
let clientKey: string | undefined;

function getClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.INTELLIGENCE_GEMINI_API_KEY;
  if (!apiKey) return null;
  // Rebuild only if the key actually changed (cheap guard, mainly useful
  // for tests / hot-reload rather than production).
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
    return PROVIDER_REGISTRY.gemini.model;
  }
  get capabilities() {
    return PROVIDER_REGISTRY.gemini.capabilities;
  }

  isConfigured(): boolean {
    return isProviderConfigured("gemini");
  }

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const genAI = getClient();
    if (!genAI) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const model = genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: request.systemInstruction,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    });

    try {
      const result = await model.generateContent(
        { contents: buildContents(request) },
        { timeout: getProviderTimeoutMs(this.name) },
      );
      const text = result.response.text().trim();
      if (!text) {
        throw new AIUnavailableError(this.name, "AI temporarily unavailable.");
      }
      return { text, provider: this.name, model: this.model };
    } catch (err: unknown) {
      // Structured SDK error — use its HTTP status rather than text
      // matching wherever possible (Phase 3 §9).
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
    }
  }
}
