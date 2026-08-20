import { logger } from "../../../utils/logger";
import { AIConversationTurn, AIProviderName } from "../types";
import { getProviderTimeoutMs } from "../config";
import {
  AIAuthenticationError,
  AIModelNotFoundError,
  AIInvalidRequestError,
  AIRateLimitError,
  AITimeoutError,
  AITransientError,
  AIUnavailableError,
} from "../errors";

// ─── Shared OpenAI-compatible chat-completions caller ─────────────────────
// Both Groq and OpenRouter expose an OpenAI-style
// POST /chat/completions { model, messages, temperature, max_tokens }
// endpoint, so the request/response handling and error translation are
// shared here rather than duplicated per provider.
//
// Timeout comes from the central Phase 3 provider configuration
// (services/ai/config.ts) rather than a local constant, so it's editable
// in one place for every provider (§26, §27).

export interface OpenAICompatibleParams {
  providerName: AIProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction?: string;
  /** Prior conversation turns, oldest first (Phase 3 §15). */
  history?: AIConversationTurn[];
  prompt: string;
  extraHeaders?: Record<string, string>;
}

export async function callOpenAICompatibleChat(params: OpenAICompatibleParams): Promise<string> {
  const { providerName, baseUrl, apiKey, model, systemInstruction, history, prompt, extraHeaders } = params;

  const messages: { role: string; content: string }[] = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  for (const turn of history ?? []) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getProviderTimeoutMs(providerName));

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
    if (err instanceof Error && /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(err.message)) {
      throw new AITransientError(providerName, "AI service temporarily unavailable. Please try again.");
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
    if (res.status === 404) {
      logger.warn(`${providerName} model not found (HTTP 404): ${errBody}`);
      throw new AIModelNotFoundError(
        providerName,
        `The selected ${providerName === "openrouter" ? "OpenRouter" : "Groq"} model is currently unavailable. Please choose another AI provider or try again later.`,
      );
    }
    if (res.status === 400) {
      logger.warn(`${providerName} invalid request (HTTP 400): ${errBody}`);
      throw new AIInvalidRequestError(providerName, "Invalid request or configuration for this provider.");
    }
    if (res.status === 429) {
      logger.warn(`${providerName} rate limited (HTTP 429): ${errBody}`);
      throw new AIRateLimitError(providerName, "AI quota exceeded. Please try again shortly.");
    }
    if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
      logger.warn(`${providerName} transient upstream error (HTTP ${res.status}): ${errBody}`);
      throw new AITransientError(providerName, "AI service temporarily unavailable. Please try again.");
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
