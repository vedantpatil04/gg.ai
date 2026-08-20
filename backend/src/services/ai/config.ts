import { AIProviderCapabilities, AIProviderName } from "./types";

// ─── GreenGuard Intelligence Center — Provider Configuration ──────────────
// Single source of truth for provider/model metadata AND the Auto-mode
// fallback order, timeouts, and retry/cooldown policy (Phase 3 §26).
// Nothing in the gateway, controller, or frontend selector hard-codes a
// model name, a fallback order, or a timeout — they all read it from here
// (or from GET /api/copilot/providers, which is just this registry
// filtered to what's actually configured).
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
  /** Auto-mode fallback order — lower runs first. This is the ONLY place
   *  that order is defined (Phase 3 §7, §26); nothing else may hard-code
   *  or re-derive it. */
  priority: number;
  /** Per-provider request timeout override, in ms. Falls back to
   *  AI_REQUEST_TIMEOUT_MS when omitted. */
  timeoutMs?: number;
}

export const PROVIDER_REGISTRY: Record<AIProviderName, AIProviderConfig> = {
  gemini: {
    name: "gemini",
    displayName: "Gemini",
    model: "gemini-3.6-flash",
    modelDisplayName: "Gemini 3.6 Flash",
    // Phase 3 — the Intelligence Center's Gemini Center Provider uses its
    // OWN dedicated key, separate from the existing GEMINI_API_KEY that
    // every other GreenGuard AI module (Forecast, Sustainability, Reports,
    // Policy Simulator, etc.) continues to use unchanged. See
    // providers/gemini.provider.ts.
    apiKeyEnvVar: "INTELLIGENCE_GEMINI_API_KEY",
    capabilities: { text: true, image: true, document: true },
    priority: 1,
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
    priority: 2,
  },
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
    modelDisplayName: process.env.OPENROUTER_MODEL_DISPLAY_NAME || "Llama 3.3 70B",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    capabilities: { text: true, image: false, document: true },
    priority: 3,
  },
};

export const ALLOWED_PROVIDER_NAMES: AIProviderName[] = ["gemini", "groq", "openrouter"];

/** Auto mode's fallback order, derived once from PROVIDER_REGISTRY.priority
 *  (Phase 3 §7: "Make this provider order configurable in one central
 *  location"). Today that's Gemini → Groq → OpenRouter. */
export const AUTO_FALLBACK_ORDER: AIProviderName[] = [...ALLOWED_PROVIDER_NAMES].sort(
  (a, b) => PROVIDER_REGISTRY[a].priority - PROVIDER_REGISTRY[b].priority,
);

/** Server-side allowlist check — never trust a provider value from the
 *  browser without this (Phase 2 §9, §23). Does NOT include "auto" —
 *  that's handled as an explicit sentinel by the controller/gateway. */
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

// ─── Phase 3 — Reliability policy (single central location, §26) ─────────
// All env-overridable with safe defaults so no deployment breaks by default.

/** Default per-request timeout for any provider call. */
export const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 20_000;

/** Exactly one same-provider retry for a transient failure before moving
 *  on (Phase 3 §11) — never more, to avoid excessive token/API spend. */
export const AI_MAX_TRANSIENT_RETRIES = 1;

/** Consecutive eligible failures before a provider is put into cooldown
 *  and skipped by Auto mode (Phase 3 §13). */
export const AI_COOLDOWN_FAILURE_THRESHOLD = Number(process.env.AI_PROVIDER_COOLDOWN_THRESHOLD) || 2;

/** How long a provider stays in cooldown before Auto mode gives it
 *  another chance (Phase 3 §13). */
export const AI_COOLDOWN_MS = Number(process.env.AI_PROVIDER_COOLDOWN_MS) || 60_000;

export function getProviderTimeoutMs(name: AIProviderName): number {
  return PROVIDER_REGISTRY[name].timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
}
