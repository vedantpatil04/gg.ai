// ─── GreenGuard Intelligence Center — Multi-Provider AI Contract ─────────────
// Phase 2 introduced this contract for Groq/OpenRouter. Phase 3 registers
// Gemini itself as a third provider behind the same contract (via its own
// dedicated INTELLIGENCE_GEMINI_API_KEY — see providers/gemini.provider.ts)
// so all three can participate in Auto-mode fallback through one gateway.
//
// This is still scoped ONLY to the /copilot Assistant (chat/askCopilot).
// Every other Gemini-backed GreenGuard feature (Forecast, Sustainability,
// Reports, Policy Simulator, admin summaries, etc.) keeps calling
// services/gemini.service.ts directly with the existing GEMINI_API_KEY —
// completely untouched by this contract.

export type AIProviderName = "gemini" | "groq" | "openrouter";

/** A caller asks for one specific provider, or "auto" to let the gateway
 *  pick using the configured priority + fallback rules (Phase 3 §7-§8). */
export type ProviderSelection = AIProviderName | "auto";

/** What an operation actually needs. Kept intentionally small — only the
 *  capabilities the Assistant's existing "+" menu (Document/Image/Data)
 *  can ask about today. */
export interface AIProviderCapabilities {
  /** Plain conversational text — every provider supports this. */
  text: boolean;
  /** Native image (vision) understanding. */
  image: boolean;
  /** Long-form text extracted from an uploaded document/dataset. Purely
   *  text-based (GreenGuard extracts the text client-side before sending),
   *  so any text-capable provider supports it. */
  document: boolean;
}

export type AICapability = keyof AIProviderCapabilities;

/** One prior turn of a conversation, for providers/models that support
 *  multi-turn context (Phase 3 §15 — Conversation Continuity). */
export interface AIConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AIGenerationRequest {
  /** The fully-assembled prompt — identical semantics to the existing
   *  Gemini prompt built in gemini.service.ts. */
  prompt: string;
  /** System-level instruction / persona for the model. */
  systemInstruction?: string;
  /** Prior turns of the current conversation (oldest first), so a
   *  fallback to a different provider mid-conversation doesn't lose
   *  context the user already gave (Phase 3 §15). Omit/empty for a
   *  fresh conversation. */
  history?: AIConversationTurn[];
  /** What kind of request this is, for capability-aware provider
   *  selection (Phase 3 §16). Defaults to "text" when omitted — the
   *  only capability that actually flows through the Assistant today. */
  capability?: AICapability;
  /** Correlates every attempt in one fallback chain back to a single
   *  logical request in the logs (Phase 3 §19). */
  requestId?: string;
}

export interface GreenGuardAIResponse {
  text: string;
  provider: AIProviderName;
  /** Human-readable model identifier for display/logging. */
  model: string;
}

/** Contract every Intelligence Center provider (Gemini Center, Groq,
 *  OpenRouter) must implement. The gateway depends only on this — never
 *  on a specific provider's SDK. */
export interface AIProvider {
  readonly name: AIProviderName;
  readonly displayName: string;
  readonly model: string;
  readonly capabilities: AIProviderCapabilities;
  /** Whether this provider has everything it needs (e.g. an API key) to
   *  actually be called right now. */
  isConfigured(): boolean;
  generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse>;
}
