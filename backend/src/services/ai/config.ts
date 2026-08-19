import { AIProviderCapabilities, AIProviderName } from "./types";

// ─── GreenGuard Intelligence Center — Provider Configuration ──────────────
// Single source of truth for provider/model metadata (Phase 2 §11). Nothing
// in the controller, gateway, or frontend selector hard-codes a model name —
// they all read it from here (or from GET /api/copilot/providers, which is
// just this registry filtered to what's actually configured).
//
// Model names are env-overridable so an admin can change the configured
// model without touching any chat UI or provider code.

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
}

export const PROVIDER_REGISTRY: Record<AIProviderName, AIProviderConfig> = {
  gemini: {
    name: "gemini",
    displayName: "Gemini",
    // Matches the model already used by generateCopilotResponse — the
    // default/Gemini path in copilot.controller.ts calls that function
    // directly and never reads this value, so it's documentation here,
    // not a second source of truth that could drift.
    model: "gemini-2.5-flash",
    modelDisplayName: "Gemini 2.5 Flash",
    apiKeyEnvVar: "GEMINI_API_KEY",
    capabilities: { text: true, image: true, document: true },
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    modelDisplayName: process.env.GROQ_MODEL_DISPLAY_NAME || "GPT OSS 120B",
    apiKeyEnvVar: "GROQ_API_KEY",
    // Groq's hosted text models don't take image input through this
    // integration — do not offer image analysis for it (Phase 2 §13).
    capabilities: { text: true, image: false, document: true },
  },
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
    modelDisplayName: process.env.OPENROUTER_MODEL_DISPLAY_NAME || "Llama 3.3 70B",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    capabilities: { text: true, image: false, document: true },
  },
};

export const ALLOWED_PROVIDER_NAMES: AIProviderName[] = ["gemini", "groq", "openrouter"];

/** Server-side allowlist check — never trust a provider value from the
 *  browser without this (Phase 2 §9, §23). */
export function isValidProviderName(value: unknown): value is AIProviderName {
  return typeof value === "string" && (ALLOWED_PROVIDER_NAMES as string[]).includes(value);
}

export function isProviderConfigured(name: AIProviderName): boolean {
  return Boolean(process.env[PROVIDER_REGISTRY[name].apiKeyEnvVar]);
}

/** Providers that are both known-good and actually usable right now (have
 *  a key set). Missing keys never crash the app — they just don't appear
 *  here (Phase 2 §12). */
export function getAvailableProviderConfigs(): AIProviderConfig[] {
  return ALLOWED_PROVIDER_NAMES.map((n) => PROVIDER_REGISTRY[n]).filter((c) =>
    isProviderConfigured(c.name),
  );
}
