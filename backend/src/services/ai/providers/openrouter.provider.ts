import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { PROVIDER_REGISTRY, isProviderConfigured } from "../config";
import { AIAuthenticationError } from "../errors";
import { callOpenAICompatibleChat } from "./_openai-compatible";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

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
    const apiKey = process.env[PROVIDER_REGISTRY.openrouter.apiKeyEnvVar];
    if (!apiKey) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const text = await callOpenAICompatibleChat({
      providerName: this.name,
      baseUrl: OPENROUTER_BASE_URL,
      apiKey,
      model: this.model,
      systemInstruction: request.systemInstruction,
      history: request.history,
      prompt: request.prompt,
      // OpenRouter-recommended attribution headers — optional but improves
      // routing/ranking visibility on their side. Safe to omit silently if
      // the env vars aren't set.
      extraHeaders: {
        ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
        "X-Title": "GreenGuard Intelligence Center",
      },
    });

    return { text, provider: this.name, model: this.model };
  }
}
