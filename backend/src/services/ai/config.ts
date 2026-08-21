import { logger } from "../../utils/logger";
import { AIProviderCapabilities, AIProviderName } from "./types";

// ─── GreenGuard Intelligence Center — Provider Configuration ──────────────
// Single source of truth for provider/model metadata AND the Auto-mode
// fallback order, timeouts, and retry/cooldown policy.
// Nothing in the gateway, controller, or frontend selector hard-codes a
// model name, a fallback order, or a timeout — they all read it from here.
//
// Model names and API keys are 100% env-overridable on Render and local .env
// so operators can change configured models/keys without touching code.

export interface AIProviderConfig {
  name: AIProviderName;
  displayName: string;
  /** Model identifier sent to the provider's API. */
  model: string;
  /** Model name as shown in the UI selector. */
  modelDisplayName: string;
  /** Env var holding this provider's API key. */
  apiKeyEnvVar: string;
  capabilities: AIProviderCapabilities;
  /** Auto-mode fallback order — lower runs first. */
  priority: number;
  /** Per-provider request timeout override, in ms. Falls back to
   *  AI_REQUEST_TIMEOUT_MS when omitted. */
  timeoutMs?: number;
}

export function getProviderApiKey(name: AIProviderName): string | undefined {
  if (name === "gemini") {
    return process.env.GEMINI_GG_CENTER_API_KEY || process.env.INTELLIGENCE_GEMINI_API_KEY;
  }
  if (name === "groq") {
    return process.env.GROQ_API_KEY;
  }
  if (name === "openrouter") {
    return process.env.OPENROUTER_API_KEY;
  }
  return undefined;
}

export function getProviderModel(name: AIProviderName): string {
  if (name === "gemini") {
    return process.env.GEMINI_GG_CENTER_MODEL || process.env.INTELLIGENCE_GEMINI_MODEL || "gemini-3.6-flash";
  }
  if (name === "groq") {
    return process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }
  if (name === "openrouter") {
    return process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";
  }
  return "";
}

export const PROVIDER_REGISTRY: Record<AIProviderName, AIProviderConfig> = {
  gemini: {
    name: "gemini",
    displayName: "Gemini",
    get model(): string {
      return getProviderModel("gemini");
    },
    get modelDisplayName(): string {
      return process.env.GEMINI_GG_CENTER_MODEL_DISPLAY_NAME || process.env.INTELLIGENCE_GEMINI_MODEL_DISPLAY_NAME || "Gemini 3.6 Flash";
    },
    apiKeyEnvVar: "GEMINI_GG_CENTER_API_KEY",
    capabilities: { text: true, image: true, document: true },
    priority: 1,
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    get model(): string {
      return getProviderModel("groq");
    },
    get modelDisplayName(): string {
      return process.env.GROQ_MODEL_DISPLAY_NAME || "GPT OSS 120B";
    },
    apiKeyEnvVar: "GROQ_API_KEY",
    capabilities: { text: true, image: false, document: true },
    priority: 2,
  },
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    get model(): string {
      return getProviderModel("openrouter");
    },
    get modelDisplayName(): string {
      return process.env.OPENROUTER_MODEL_DISPLAY_NAME || "Llama 3.3 70B";
    },
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    capabilities: { text: true, image: false, document: true },
    priority: 3,
  },
};

export const ALLOWED_PROVIDER_NAMES: AIProviderName[] = ["gemini", "groq", "openrouter"];

/** Auto mode's fallback order, derived from PROVIDER_REGISTRY.priority */
export const AUTO_FALLBACK_ORDER: AIProviderName[] = [...ALLOWED_PROVIDER_NAMES].sort(
  (a, b) => PROVIDER_REGISTRY[a].priority - PROVIDER_REGISTRY[b].priority,
);

export function isValidProviderName(value: unknown): value is AIProviderName {
  return typeof value === "string" && (ALLOWED_PROVIDER_NAMES as string[]).includes(value);
}

export function isProviderConfigured(name: AIProviderName): boolean {
  return Boolean(getProviderApiKey(name));
}

export function getAvailableProviderConfigs(): AIProviderConfig[] {
  return ALLOWED_PROVIDER_NAMES.map((n) => PROVIDER_REGISTRY[n]).filter((c) =>
    isProviderConfigured(c.name),
  );
}

// ─── Website Gemini AI Configuration ──────────────────────────────────────────
export interface WebsiteAIConfig {
  apiKey?: string;
  model: string;
  modelDisplayName: string;
  isConfigured: boolean;
}

export function getWebsiteAIConfig(): WebsiteAIConfig {
  const apiKey = process.env.GEMINI_WEBSITE_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_WEBSITE_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const modelDisplayName = process.env.GEMINI_WEBSITE_MODEL_DISPLAY_NAME || "Gemini 2.5 Flash";
  return {
    apiKey,
    model,
    modelDisplayName,
    isConfigured: Boolean(apiKey),
  };
}

// ─── Safe Startup Logger (Never logs secret values) ───────────────────────────
export function logAIProvidersStatus(): void {
  const webConfig = getWebsiteAIConfig();
  logger.info(
    `[AI] Website Gemini: ${webConfig.isConfigured ? `✅ configured (${webConfig.model})` : "⚠️ unconfigured — set GEMINI_WEBSITE_API_KEY or GEMINI_API_KEY"}`,
  );

  const geminiGGCenterKey = getProviderApiKey("gemini");
  const geminiGGCenterModel = getProviderModel("gemini");
  logger.info(
    `[AI] GG Center Gemini: ${geminiGGCenterKey ? `✅ configured (${geminiGGCenterModel})` : "⚠️ unconfigured — set GEMINI_GG_CENTER_API_KEY or INTELLIGENCE_GEMINI_API_KEY"}`,
  );

  const groqKey = getProviderApiKey("groq");
  const groqModel = getProviderModel("groq");
  logger.info(
    `[AI] GG Center Groq: ${groqKey ? `✅ configured (${groqModel})` : "⚠️ unconfigured — set GROQ_API_KEY"}`,
  );

  const openRouterKey = getProviderApiKey("openrouter");
  const openRouterModel = getProviderModel("openrouter");
  logger.info(
    `[AI] GG Center OpenRouter: ${openRouterKey ? `✅ configured (${openRouterModel})` : "⚠️ unconfigured — set OPENROUTER_API_KEY"}`,
  );
}

// ─── Reliability Policy ───────────────────────────────────────────────────────
export const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 20_000;
export const AI_MAX_TRANSIENT_RETRIES = 1;
export const AI_COOLDOWN_FAILURE_THRESHOLD = Number(process.env.AI_PROVIDER_COOLDOWN_THRESHOLD) || 2;
export const AI_COOLDOWN_MS = Number(process.env.AI_PROVIDER_COOLDOWN_MS) || 60_000;

export function getProviderTimeoutMs(name: AIProviderName): number {
  return PROVIDER_REGISTRY[name].timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
}
