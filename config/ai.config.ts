import { logger } from "../utils/logger";

// ─── GreenGuard AI Configuration ──────────────────────────────────────────
// Backend-controlled provider selection. Phase 1 only implements "gemini" —
// "ggmodel" is a recognized value (so the config layer, and any future
// AI_PROVIDER=ggmodel deployment, doesn't need frontend or Intelligence
// Center changes) but has no provider registered yet; the Gateway reports
// that clearly rather than pretending it works.

export type AIProviderName = "gemini" | "ggmodel";

const KNOWN_PROVIDERS: AIProviderName[] = ["gemini", "ggmodel"];

/** Resolves the configured AI provider from AI_PROVIDER, defaulting to the
 *  existing "gemini" behavior. Unknown values fall back to "gemini" with a
 *  warning rather than crashing the app. */
export function getConfiguredAIProvider(): AIProviderName {
  const raw = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if ((KNOWN_PROVIDERS as string[]).includes(raw)) {
    return raw as AIProviderName;
  }
  logger.warn(`Unknown AI_PROVIDER "${raw}" — falling back to "gemini"`);
  return "gemini";
}
