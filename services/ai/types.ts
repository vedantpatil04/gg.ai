// ─── GreenGuard AI Provider Contract ──────────────────────────────────────────
// Common interface implemented by every AI provider (Gemini today, GGModel and
// others in the future). Kept intentionally minimal — only the fields the
// current Gemini implementation actually uses, plus the handful the roadmap
// explicitly calls out as needed for a future provider to slot in cleanly.

/** Optional per-request generation tuning. Only used if a provider/caller
 *  needs to override its own defaults — none of the current callers do. */
export interface AIGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
}

/** A single prior turn, for providers/features that pass conversation
 *  history as part of the prompt context (e.g. the Sustainability
 *  Intelligence chat). Optional — most callers only send a prompt. */
export interface AIConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** Normalized request sent into the Gateway, independent of provider. */
export interface AIGenerationRequest {
  /** The fully-assembled user/task prompt (unchanged from today's usage). */
  prompt: string;
  /** System-level instruction / persona for the model. */
  systemInstruction?: string;
  /** Prior conversation turns, when relevant to the prompt. */
  history?: AIConversationTurn[];
  /** Optional generation tuning override. */
  generationConfig?: AIGenerationConfig;
}

/** Token/usage accounting, when the provider reports it. */
export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Normalized GreenGuard-level AI response — what the Gateway returns to
 *  callers, regardless of which provider generated it. */
export interface GreenGuardAIResponse {
  text: string;
  provider: string;
  model: string;
  usage?: AIUsage;
  finishReason?: string;
}

/** Contract every AI provider (GeminiProvider, future GGModelProvider, ...)
 *  must implement. The Gateway depends only on this — never on a specific
 *  provider's SDK types. */
export interface AIProvider {
  readonly name: string;
  generate(request: AIGenerationRequest): Promise<GreenGuardAIResponse>;
}
