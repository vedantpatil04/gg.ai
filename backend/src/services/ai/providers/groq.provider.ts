import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { PROVIDER_REGISTRY, isProviderConfigured } from "../config";
import { AIAuthenticationError } from "../errors";
import { callOpenAICompatibleChat } from "./_openai-compatible";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export class GroqProvider implements AIProvider {
  readonly name = "groq" as const;
  private readonly config = PROVIDER_REGISTRY.groq;
  readonly displayName = this.config.displayName;
  readonly model = this.config.model;
  readonly capabilities = this.config.capabilities;

  isConfigured(): boolean {
    return isProviderConfigured("groq");
  }

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const apiKey = process.env[this.config.apiKeyEnvVar];
    if (!apiKey) {
      throw new AIAuthenticationError(this.name, "This AI provider is currently unavailable.");
    }

    const text = await callOpenAICompatibleChat({
      providerName: this.name,
      baseUrl: GROQ_BASE_URL,
      apiKey,
      model: this.model,
      systemInstruction: request.systemInstruction,
      prompt: request.prompt,
    });

    return { text, provider: this.name, model: this.model };
  }
}
