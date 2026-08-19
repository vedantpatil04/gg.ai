import { logger } from "../../../utils/logger";
import { AIProviderName } from "../types";
import {
  AIAuthenticationError,
  AIRateLimitError,
  AITimeoutError,
  AIUnavailableError,
} from "../errors";

// ─── Shared OpenAI-compatible chat-completions caller ─────────────────────
// Both Groq and OpenRouter expose an OpenAI-style
// POST /chat/completions { model, messages, temperature, max_tokens }
// endpoint, so the request/response handling and error translation are
// shared here rather than duplicated per provider.

const REQUEST_TIMEOUT_MS = 30_000;

export interface OpenAICompatibleParams {
  providerName: AIProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction?: string;
  prompt: string;
  extraHeaders?: Record<string, string>;
}

export async function callOpenAICompatibleChat(params: OpenAICompatibleParams): Promise<string> {
  const { providerName, baseUrl, apiKey, model, systemInstruction, prompt, extraHeaders } = params;

  const messages: { role: string; content: string }[] = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AITimeoutError(
        providerName,
        "The selected AI provider took too long to respond. Try again or choose another provider.",
      );
    }
    logger.error(`${providerName} request failed: ${err instanceof Error ? err.message : String(err)}`);
    throw new AIUnavailableError(providerName, "This AI provider is currently unavailable.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      logger.warn(`${providerName} authentication failed (HTTP ${res.status}): ${errBody}`);
      throw new AIAuthenticationError(providerName, "This AI provider is currently unavailable.");
    }
    if (res.status === 429) {
      logger.warn(`${providerName} rate limited (HTTP 429): ${errBody}`);
      throw new AIRateLimitError(providerName, "AI quota exceeded. Please try again shortly.");
    }
    logger.error(`${providerName} responded with HTTP ${res.status}: ${errBody}`);
    throw new AIUnavailableError(providerName, "AI temporarily unavailable.");
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AIUnavailableError(providerName, "AI temporarily unavailable.");
  }
  return text;
}
