import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Copy, Share2, Bookmark, RefreshCw,
  ChevronDown, ChevronRight, AlertTriangle, Shield,
  BookOpen, GraduationCap, TicketIcon, Loader2,
  ThumbsUp, ThumbsDown, MessageSquare, Trash2,
  History, Pin, Circle, ArrowRight, Lightbulb,
  TrendingUp, Clock, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE_UP, STAGGER, DUR_SM, EASE_OUT, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { helpAiApi, type HelpAIMessage, type HelpAIChatResponse, type HelpConversation } from "@/lib/api/help-ai.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Constants ────────────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  "Why is my complaint not updating?",
  "How do I report illegal dumping?",
  "Why is AQI unavailable on the map?",
  "How can I reset my password?",
  "How do I export an environmental report?",
  "What does AQI 150 mean for my health?",
];

const CONFIDENCE_STYLE = {
  high:   { label: "High confidence",   color: "var(--color-success)"  },
  medium: { label: "Medium confidence", color: "var(--color-warning)"  },
  low:    { label: "Low confidence",    color: "var(--color-destructive)" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceChip({ source }: { source: HelpAIChatResponse["sources"][number] }) {
  const Icon = source.type === "kb" ? BookOpen : source.type === "tutorial" ? GraduationCap : TicketIcon;
  const color = source.type === "kb"
    ? "var(--color-info)"
    : source.type === "tutorial"
    ? "var(--color-primary)"
    : "var(--color-warning)";

  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: `color-mix(in oklab, ${color} 30%, transparent)`, background: `color-mix(in oklab, ${color} 8%, transparent)` }}
    >
      <Icon className="size-2.5" />
      {source.title.length > 30 ? source.title.slice(0, 30) + "…" : source.title}
    </span>
  );
}

function EscalationBanner({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/5 mt-3">
      <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-destructive mb-1">Urgent Issue Detected</p>
        <p className="text-[10px] text-muted-foreground">{reason ?? "This may require immediate attention."}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            { label: "Emergency Line",   icon: Shield      },
            { label: "Authority Dir.",   icon: Shield      },
            { label: "Create Ticket",    icon: TicketIcon  },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Icon className="size-2.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  response,
  onRegenerate,
  onSuggestedQuestion,
}: {
  response: HelpAIChatResponse;
  onRegenerate: () => void;
  onSuggestedQuestion: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [voted, setVoted]   = useState<"up" | "down" | null>(null);
  const conf = CONFIDENCE_STYLE[response.confidence];

  const handleCopy = () => {
    navigator.clipboard.writeText(response.answer).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_SM, ease: EASE_OUT }}
      className="space-y-3"
    >
      {/* Answer */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2 mb-3">
          <div className="size-6 rounded-lg aurora flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="size-3 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">GreenGuard AI</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ color: conf.color, background: `color-mix(in oklab, ${conf.color} 10%, transparent)` }}
              >
                {conf.label}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{response.answer}</p>
          </div>
        </div>

        {/* Sources */}
        {response.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {response.sources.map((s, i) => <SourceChip key={i} source={s} />)}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
          <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
            {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={onRegenerate} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
            <RefreshCw className="size-3" /> Regenerate
          </button>
          <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
            <Bookmark className="size-3" /> Save
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setVoted("up")} className={cn("p-1 rounded hover:bg-muted transition-colors", voted === "up" && "text-success")}>
              <ThumbsUp className="size-3" />
            </button>
            <button onClick={() => setVoted("down")} className={cn("p-1 rounded hover:bg-muted transition-colors", voted === "down" && "text-destructive")}>
              <ThumbsDown className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Escalation */}
      {response.escalation && <EscalationBanner reason={response.escalationReason} />}

      {/* Suggested questions */}
      {response.suggestedQuestions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Related Questions</p>
          <div className="space-y-1">
            {response.suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onSuggestedQuestion(q)}
                className="w-full flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors group"
              >
                <ArrowRight className="size-3 shrink-0 group-hover:text-primary transition-colors" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Conversation History Panel ───────────────────────────────────────────────

function ConversationHistory({
  onSelect,
  onClose,
}: {
  onSelect: (sessionId: string, messages: HelpAIMessage[]) => void;
  onClose: () => void;
}) {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["help-ai", "history"],
    queryFn:  helpAiApi.getHistory,
  });
  const qc = useQueryClient();

  const handleDelete = async (sessionId: string) => {
    await helpAiApi.deleteConversation(sessionId);
    qc.invalidateQueries({ queryKey: ["help-ai", "history"] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute inset-0 bg-card rounded-xl border border-border z-10 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Conversation History</span>
        </div>
        <button onClick={onClose} className="size-7 grid place-items-center rounded hover:bg-muted transition-colors">
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No conversation history yet</div>
        ) : (
          conversations.map((conv: HelpConversation) => {
            const firstUserMsg = conv.messages.find(m => m.role === "user")?.content ?? "Conversation";
            return (
              <div key={conv.sessionId} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-muted/30 transition-all group">
                <button
                  onClick={() => onSelect(conv.sessionId, conv.messages)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs font-medium truncate">{firstUserMsg}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(conv.sessionId)}
                  className="shrink-0 size-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─── AI Insights Panel ────────────────────────────────────────────────────────

function AIInsightsPanel() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["help-ai", "insights"],
    queryFn:  helpAiApi.getInsights,
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights?.aiGeneratedInsight && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">AI Insight</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{insights.aiGeneratedInsight}</p>
        </div>
      )}

      {insights?.topQuestions && insights.topQuestions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Top Questions</div>
          <div className="space-y-1.5">
            {insights.topQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-[10px] font-bold text-primary/50 w-3">{i + 1}</span>
                {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {insights?.trendingIssues && insights.trendingIssues.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
            <TrendingUp className="size-3" /> Trending Issues
          </div>
          <div className="space-y-1.5">
            {insights.trendingIssues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-warning/5 border border-warning/20 text-warning">
                <Circle className="size-1.5 fill-warning text-warning animate-pulse" />
                {issue}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AI Assistant Panel ──────────────────────────────────────────────────

interface HelpAIPanelProps {
  onCreateTicket?: (draft?: Record<string, string>) => void;
}

type PanelTab = "chat" | "insights" | "history";

export function HelpAIPanel({ onCreateTicket }: HelpAIPanelProps) {
  const [tab,        setTab]        = useState<PanelTab>("chat");
  const [messages,   setMessages]   = useState<HelpAIMessage[]>([]);
  const [responses,  setResponses]  = useState<HelpAIChatResponse[]>([]);
  const [input,      setInput]      = useState("");
  const [sessionId,  setSessionId]  = useState<string | undefined>();
  const [isLoading,  setIsLoading]  = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, responses, isLoading]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;
    setLastQuestion(question);
    setInput("");
    setIsLoading(true);

    const userMsg: HelpAIMessage = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await helpAiApi.chat(question, sessionId, [...messages, userMsg]);
      setSessionId(result.sessionId);
      setResponses(prev => [...prev, result]);
      setMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
    } catch {
      setResponses(prev => [...prev, {
        sessionId:          sessionId ?? "",
        answer:             "I'm having trouble connecting right now. Please try again or contact support directly.",
        confidence:         "low",
        escalation:         false,
        suggestedQuestions: [],
        sources:            [],
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, sessionId]);

  const handleRegenerate = useCallback(() => {
    if (!lastQuestion) return;
    setMessages(prev => prev.slice(0, -1));
    setResponses(prev => prev.slice(0, -1));
    sendMessage(lastQuestion);
  }, [lastQuestion, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleHistorySelect = (sid: string, msgs: HelpAIMessage[]) => {
    setSessionId(sid);
    setMessages(msgs);
    setResponses([]);
    setTab("chat");
  };

  const handleNewChat = () => {
    setMessages([]);
    setResponses([]);
    setSessionId(undefined);
    setLastQuestion("");
    setInput("");
  };

  // Pair user messages with responses for rendering
  const pairs: Array<{ user: string; response?: HelpAIChatResponse }> = [];
  let respIdx = 0;
  for (const msg of messages) {
    if (msg.role === "user") {
      pairs.push({ user: msg.content, response: responses[respIdx] });
      if (responses[respIdx]) respIdx++;
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[500px] max-h-[800px] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg aurora grid place-items-center">
            <Sparkles className="size-3.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">GreenGuard Help AI</p>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Circle className="size-1.5 fill-success text-success animate-pulse" />
              Online · Powered by Gemini
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleNewChat} className="text-[10px] px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            New Chat
          </button>
          {/* Tab switcher */}
          <div className="flex gap-0.5 p-0.5 rounded-lg border border-border bg-muted/30 ml-1">
            {(["chat", "insights", "history"] as PanelTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded font-medium transition-all duration-150 capitalize",
                  tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "history" ? <History className="size-3" /> : t === "insights" ? <Lightbulb className="size-3" /> : <MessageSquare className="size-3" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {tab === "insights" ? (
            <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              <AIInsightsPanel />
            </motion.div>
          ) : tab === "history" ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ConversationHistory onSelect={handleHistorySelect} onClose={() => setTab("chat")} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-6">
              {/* Welcome / starters */}
              {pairs.length === 0 && !isLoading && (
                <motion.div
                  variants={STAGGER(0.06, 0.1)}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  <motion.div variants={FADE_UP} className="text-center py-4">
                    <div className="size-14 rounded-2xl aurora mx-auto flex items-center justify-center mb-3">
                      <Sparkles className="size-6 text-primary-foreground" />
                    </div>
                    <p className="text-sm font-semibold mb-1">How can I help you today?</p>
                    <p className="text-xs text-muted-foreground">Ask me anything about GreenGuard — I'll answer instantly.</p>
                  </motion.div>
                  <motion.div variants={FADE_UP} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STARTER_PROMPTS.map(p => (
                      <motion.button
                        key={p}
                        whileHover={HOVER_LIFT_SM}
                        whileTap={TAP_PRESS_SM}
                        onClick={() => sendMessage(p)}
                        className="text-left text-xs text-muted-foreground px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 hover:text-foreground transition-all duration-200"
                      >
                        {p}
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {/* Message pairs */}
              {pairs.map((pair, i) => (
                <div key={i} className="space-y-3">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                      {pair.user}
                    </div>
                  </div>
                  {/* AI response */}
                  {pair.response ? (
                    <AssistantMessage
                      response={pair.response}
                      onRegenerate={i === pairs.length - 1 ? handleRegenerate : () => {}}
                      onSuggestedQuestion={sendMessage}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator for in-flight response */}
              {isLoading && pairs.length > 0 && !pairs[pairs.length - 1].response && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Thinking…</span>
                </div>
              )}

              <div ref={bottomRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input — only for chat tab */}
      {tab === "chat" && (
        <div className="p-3 border-t border-border shrink-0">
          <div className={cn(
            "flex items-end gap-2 rounded-xl border bg-background px-3 py-2.5",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all",
          )}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about GreenGuard…"
              rows={1}
              className="flex-1 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 max-h-32"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </motion.button>
          </div>
          <p className="text-[9px] text-muted-foreground/60 text-center mt-1.5">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Ticket Draft UI ──────────────────────────────────────────────────────────

export function AITicketDrafter({
  onApplyDraft,
}: {
  onApplyDraft: (draft: Record<string, string>) => void;
}) {
  const [input,      setInput]      = useState("");
  const [isLoading,  setIsLoading]  = useState(false);
  const [draft,      setDraft]      = useState<Record<string, string> | null>(null);

  const handleGenerate = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const result = await helpAiApi.draftTicket(input);
      setDraft(result as Record<string, string>);
    } catch {
      // silent — user can still type manually
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary shrink-0" />
        <span className="text-xs font-semibold text-primary">AI Ticket Drafter</span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Describe your issue in plain language and AI will fill in the ticket form.
      </p>
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. My dashboard is buffering and the AQI widget won't load…"
          rows={2}
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/60"
        />
        <motion.button
          whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
          onClick={handleGenerate}
          disabled={!input.trim() || isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0 self-end"
        >
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {isLoading ? "…" : "Draft"}
        </motion.button>
      </div>

      {draft && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 pt-2 border-t border-border/50"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">AI Draft Preview</div>
            {Object.entries(draft).slice(0, 5).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="font-medium capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <span className="ml-1 text-foreground">{String(value).slice(0, 80)}{String(value).length > 80 ? "…" : ""}</span>
              </div>
            ))}
            <motion.button
              whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
              onClick={() => onApplyDraft(draft)}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity mt-2"
            >
              <Check className="size-3.5" /> Apply Draft to Form
            </motion.button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Duplicate Ticket Warning ─────────────────────────────────────────────────

export function DuplicateTicketWarning({ subject }: { subject: string }) {
  const [result, setResult] = useState<{ isDuplicate: boolean; message: string; existingCount: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (subject.length < 10) { setResult(null); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await helpAiApi.checkDuplicate(subject);
        setResult(r);
      } catch { /* silent */ }
    }, 800);
    return () => clearTimeout(timerRef.current);
  }, [subject]);

  if (!result?.isDuplicate) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 p-3 rounded-xl border border-warning/30 bg-warning/5"
    >
      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-warning">
          {result.existingCount > 1
            ? `${result.existingCount} users already reported this issue`
            : "Similar ticket exists"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{result.message}</p>
      </div>
    </motion.div>
  );
}

// ─── AI Article Summary Button + Panel ───────────────────────────────────────

export function AIArticleSummary({ title, content }: { title: string; content: string }) {
  const [open,      setOpen]    = useState(false);
  const [summary,   setSummary] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (summary) { setOpen(!open); return; }
    setOpen(true);
    setLoading(true);
    try {
      const result = await helpAiApi.summarize(title, content);
      setSummary(result as Record<string, unknown>);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <motion.button
        whileHover={HOVER_LIFT_SM}
        whileTap={TAP_PRESS_SM}
        onClick={handleSummarize}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
      >
        <Sparkles className="size-3.5" />
        AI Summary
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Summary</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="size-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Summarising article…</span>
                </div>
              ) : summary ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/90 leading-relaxed">{summary.summary as string}</p>
                  {Array.isArray(summary.keyTakeaways) && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Key Takeaways</div>
                      <ul className="space-y-1">
                        {(summary.keyTakeaways as string[]).map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <div className="size-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1"><Clock className="size-3" />{summary.estimatedReadingTime as string}</span>
                    <span>{summary.difficulty as string}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Explain Selection ─────────────────────────────────────────────────────

export function AIExplainSelection({ selectedText, onClose }: { selectedText: string; onClose: () => void }) {
  const [mode,       setMode]    = useState<"explain" | "simplify" | "expand">("explain");
  const [result,    setResult]  = useState("");
  const [isLoading, setLoading] = useState(false);

  const handleExplain = async (m: typeof mode) => {
    setMode(m);
    setLoading(true);
    setResult("");
    try {
      const r = await helpAiApi.explain(selectedText, m);
      setResult(r);
    } catch {
      setResult("Unable to explain right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleExplain("explain"); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border border-border bg-card shadow-lg p-4 w-72 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs font-bold">AI Explain</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-2 py-1.5 line-clamp-2 italic">
        "{selectedText}"
      </div>

      <div className="flex gap-1">
        {(["explain", "simplify", "expand"] as const).map(m => (
          <button
            key={m}
            onClick={() => handleExplain(m)}
            className={cn(
              "flex-1 text-[10px] py-1.5 rounded-lg font-medium capitalize transition-all duration-150",
              mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="min-h-[60px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Generating…</span>
          </div>
        ) : (
          <p className="text-xs text-foreground/90 leading-relaxed">{result}</p>
        )}
      </div>

      <button
        onClick={() => { navigator.clipboard.writeText(result).catch(() => {}); }}
        className="w-full flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Copy className="size-3" /> Copy explanation
      </button>
    </motion.div>
  );
}
