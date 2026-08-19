import { logger } from "../../utils/logger";
import { AIProvider, AIProviderName, AIGenerationRequest, GreenGuardAIResponse } from "./types";
import { AIProviderError, AIUnavailableError } from "./errors";
import { GroqProvider } from "./providers/groq.provider";
import { OpenRouterProvider } from "./providers/openrouter.provider";

// ─── Intelligence Center AI Gateway (Phase 2) ─────────────────────────────
// Handles ONLY the providers that are new in Phase 2 — Groq and OpenRouter.
// Gemini deliberately is NOT registered here: the default/"gemini" path in
// copilot.controller.ts continues to call generateCopilotResponse() in
// gemini.service.ts directly, completely unchanged, so every other surface
// that shares that function (Dashboard, Map, Forecast, Intelligence legacy,
// and Copilot itself when no provider is switched) keeps its exact
// pre-Phase-2 behavior. This gateway is only ever reached when a user has
// explicitly switched the Assistant to Groq or OpenRouter.
export class IntelligenceCenterAIGateway {
  private readonly providers: Partial<Record<AIProviderName, AIProvider>> = {
    groq: new GroqProvider(),
    openrouter: new OpenRouterProvider(),
  };

  async generate(
    request: AIGenerationRequest,
    providerName: "groq" | "openrouter",
  ): Promise<GreenGuardAIResponse> {
    const provider = this.providers[providerName];
    const startedAt = Date.now();

    if (!provider || !provider.isConfigured()) {
      logger.warn(`Intelligence Center AI Gateway: "${providerName}" is not configured`);
      throw new AIUnavailableError(providerName, "This AI provider is currently unavailable.");
    }

    try {
      const response = await provider.generate(request);
      logger.info(
        `Intelligence Center AI Gateway: ${providerName}/${response.model} succeeded in ${Date.now() - startedAt}ms`,
      );
      return response;
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      if (err instanceof AIProviderError) {
        logger.warn(
          `Intelligence Center AI Gateway: ${providerName} failed after ${latencyMs}ms (${err.code}): ${err.message}`,
        );
        throw err;
      }
      logger.error(`Intelligence Center AI Gateway: ${providerName} failed after ${latencyMs}ms with an unexpected error`);
      throw new AIUnavailableError(providerName, "AI temporarily unavailable.");
    }
  }
}

export const intelligenceCenterAIGateway = new IntelligenceCenterAIGateway();
