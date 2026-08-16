import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { logger } from "../../../utils/logger";
import { AIProvider, AIGenerationRequest, GreenGuardAIResponse } from "../types";
import { AIAuthenticationError, AIRateLimitError, AIResponseError, AIUnavailableError } from "../errors";

// Preserve the project's currently configured Gemini model exactly as it
// was before Phase 1 — not upgraded, not downgraded, not env-driven (no new
// environment variable is introduced for this).
const GEMINI_MODEL = "gemini-2.5-flash";

// ─── Client singleton — unchanged from the pre-Phase-1 implementation ────────
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not set — AI features disabled");
    return null;
  }
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

function getModel(systemInstruction: string | undefined, config?: { temperature?: number; maxOutputTokens?: number }): GenerativeModel | null {
  const client = getClient();
  if (!client) return null;
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: config?.temperature ?? 0.4,
      maxOutputTokens: config?.maxOutputTokens ?? 1024,
    },
  });
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  async generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse> {
    const model = getModel(request.systemInstruction, request.generationConfig);
    if (!model) {
      throw new AIAuthenticationError(
        this.name,
        "AI service not configured. Set GEMINI_API_KEY to enable.",
      );
    }

    try {
      const result = await model.generateContent(request.prompt);
      const response = result.response;
      const usageMeta = response.usageMetadata;

      return {
        text: response.text().trim(),
        provider: this.name,
        model: GEMINI_MODEL,
        finishReason: response.candidates?.[0]?.finishReason,
        usage: usageMeta
          ? {
              promptTokens: usageMeta.promptTokenCount,
              completionTokens: usageMeta.candidatesTokenCount,
              totalTokens: usageMeta.totalTokenCount,
            }
          : undefined,
      };
    } catch (err: unknown) {
      console.error("GEMINI FULL ERROR:", err);
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Gemini error: ${msg}`);
      if (msg.includes("quota")) {
        throw new AIRateLimitError(this.name, "AI quota exceeded. Please try again shortly.");
      }
      if (msg.includes("safety")) {
        throw new AIResponseError(this.name, "Response blocked by safety filters.");
      }
      throw new AIUnavailableError(this.name, "AI temporarily unavailable.");
    }
  }
}
