// ─── GreenGuard Intelligence Center — Multi-Provider AI Contract ─────────────
// Phase 2. Scoped ONLY to the /copilot Assistant's optional provider
// switching (Groq, OpenRouter). Gemini's existing behavior — used here and
// by every other Gemini-backed GreenGuard feature (Reports, Policy
// Simulator, Sustainability, admin summaries, etc.) — is untouched; it
// keeps calling services/gemini.service.ts directly. This contract exists
// so Groq/OpenRouter can plug into the Assistant without copilot.controller.ts
// depending on either SDK directly.

export type AIProviderName = "gemini" | "groq" | "openrouter";

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

export interface AIGenerationRequest {
  /** The fully-assembled prompt — identical semantics to the existing
   *  Gemini prompt built in gemini.service.ts. */
  prompt: string;
  /** System-level instruction / persona for the model. */
  systemInstruction?: string;
}

export interface GreenGuardAIResponse {
  text: string;
  provider: AIProviderName;
  /** Human-readable model identifier for display/logging. */
  model: string;
}

/** Contract every non-Gemini Intelligence Center provider must implement.
 *  The gateway depends only on this — never on a specific provider's SDK. */
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
