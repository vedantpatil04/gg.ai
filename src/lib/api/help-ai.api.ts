import client from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────
// These mirror the types exported from backend/src/services/gemini.service.ts
// (PHASE 7 — Help Center AI Intelligence section).

export interface HelpAIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HelpAIChatResponse {
  sessionId: string;
  answer: string;
  confidence: "high" | "medium" | "low";
  escalation: boolean;
  escalationReason?: string;
  suggestedQuestions: string[];
  sources: Array<{ type: "kb" | "tutorial" | "support"; title: string; id: string }>;
}

export interface HelpConversation {
  sessionId: string;
  messages: HelpAIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpInsights {
  topQuestions: string[];
  trendingIssues: string[];
  aiGeneratedInsight: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const helpAiApi = {
  // POST /api/help-ai/chat
  chat: (
    question: string,
    sessionId?: string,
    history: HelpAIMessage[] = [],
  ): Promise<HelpAIChatResponse> =>
    client
      .post<{ success: true; data: HelpAIChatResponse }>(
        "/help-ai/chat",
        { question, sessionId, history },
      )
      .then((r) => r.data.data),

  // GET /api/help-ai/history (auth required)
  getHistory: (): Promise<HelpConversation[]> =>
    client
      .get<{ success: true; data: { conversations: HelpConversation[] } }>("/help-ai/history")
      .then((r) => r.data.data.conversations),

  // DELETE /api/help-ai/history/:sessionId (auth required)
  deleteConversation: (sessionId: string): Promise<void> =>
    client.delete(`/help-ai/history/${sessionId}`).then(() => undefined),

  // POST /api/help-ai/draft-ticket
  draftTicket: (description: string): Promise<Record<string, string>> =>
    client
      .post<{ success: true; data: { draft: Record<string, string> } }>("/help-ai/draft-ticket", {
        description,
      })
      .then((r) => r.data.data.draft),

  // POST /api/help-ai/check-duplicate (auth required)
  checkDuplicate: (
    subject: string,
  ): Promise<{ isDuplicate: boolean; message: string; existingCount: number }> =>
    client
      .post<{
        success: true;
        data: { isDuplicate: boolean; message: string; existingCount: number };
      }>("/help-ai/check-duplicate", { subject })
      .then((r) => r.data.data),

  // POST /api/help-ai/summarize
  summarize: (title: string, content: string): Promise<Record<string, unknown>> =>
    client
      .post<{ success: true; data: { summary: Record<string, unknown> } }>("/help-ai/summarize", {
        title,
        content,
      })
      .then((r) => r.data.data.summary),

  // POST /api/help-ai/explain
  explain: (text: string, mode: "explain" | "simplify" | "expand"): Promise<string> =>
    client
      .post<{ success: true; data: { explanation: string; mode: string } }>("/help-ai/explain", {
        text,
        mode,
      })
      .then((r) => r.data.data.explanation),

  // POST /api/help-ai/search-expand
  searchExpand: (query: string): Promise<string[]> =>
    client
      .post<{ success: true; data: { terms: string[] } }>("/help-ai/search-expand", { query })
      .then((r) => r.data.data.terms),

  // GET /api/help-ai/insights (auth required)
  getInsights: (): Promise<HelpInsights> =>
    client
      .get<{ success: true; data: { insights: HelpInsights } }>("/help-ai/insights")
      .then((r) => r.data.data.insights),
};
