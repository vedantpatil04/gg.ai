import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { PROVIDER_REGISTRY, isProviderConfigured } from "../config";
import { AIAuthenticationError } from "../errors";
import { callOpenAICompatibleChat } from "./_openai-compatible";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

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
    const apiKey = process.env[PROVIDER_REGISTRY.groq.apiKeyEnvVar];
    if (!apiKey) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const text = await callOpenAICompatibleChat({
      providerName: this.name,
      baseUrl: GROQ_BASE_URL,
      apiKey,
      model: this.model,
      systemInstruction: request.systemInstruction,
      history: request.history,
      prompt: request.prompt,
    });

    return { text, provider: this.name, model: this.model };
  }
}
