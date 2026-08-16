import { logger } from "../../utils/logger";
import { getConfiguredAIProvider, AIProviderName } from "../../config/ai.config";
import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "./types";
import { AIProviderError, AIUnavailableError } from "./errors";
import { GeminiProvider } from "./providers/gemini.provider";

// ─── GreenGuard AI Gateway ─────────────────────────────────────────────────
// The single application-level entry point for AI generation. Callers
// (currently the Intelligence Center's Gemini-backed features, via
// gemini.service.ts) depend only on this Gateway and the AIProvider
// contract — never on a specific provider's SDK.
//
// Only "gemini" is registered/implemented in Phase 1. "ggmodel" is a valid
// configuration value (see config/ai.config.ts) that a future
// GGModelProvider can register here without any change to callers.
export class AIGateway {
  private readonly providers: Partial<Record<AIProviderName, AIProvider>> = {
    gemini: new GeminiProvider(),
    // ggmodel: not implemented in Phase 1 — see roadmap.
  };

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const providerName = getConfiguredAIProvider();
    const provider = this.providers[providerName];
    const startedAt = Date.now();

    if (!provider) {
      logger.error(`AI Gateway: provider "${providerName}" is configured but not yet implemented`);
      throw new AIUnavailableError(providerName, "AI temporarily unavailable.");
    }

    try {
      const response = await provider.generate(request);
      logger.info(
        `AI Gateway: ${providerName}/${response.model} succeeded in ${Date.now() - startedAt}ms`,
      );
      return response;
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      if (err instanceof AIProviderError) {
        logger.warn(
          `AI Gateway: ${providerName} failed after ${latencyMs}ms (${err.code}): ${err.message}`,
        );
        throw err;
      }
      logger.error(`AI Gateway: ${providerName} failed after ${latencyMs}ms with an unexpected error`);
      throw new AIUnavailableError(providerName, "AI temporarily unavailable.");
    }
  }
}

export const aiGateway = new AIGateway();
