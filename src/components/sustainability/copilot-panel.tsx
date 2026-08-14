/**
 * copilot-panel.tsx — GreenGuard Intelligence Center (Phase 5)
 *
 * The Sustainability page's single AI intelligence experience — previously
 * presented as the "AI Sustainability Copilot," now presented to users as
 * the "GreenGuard Intelligence Center." The component/file name and the
 * shared `copilotApi` object are left as-is (used by several other pages
 * too); only the user-facing presentation changed.
 *
 * Reuses:
 *   copilotApi.sustainabilityChat() — dedicated backend route/handler
 *     grounded in the same transparent EcoScore engine (Phase 2) and
 *     Phase 4 historical data the page itself renders from. NOT the
 *     generic copilotApi.chat() used by Dashboard/Map/Forecast/
 *     Intelligence/the standalone Copilot page — that stays untouched.
 *
 * No new backend endpoints beyond that one dedicated route. The `sessionId`
 * is scoped to this component's lifetime for the frontend; the backend
 * additionally persists it via the existing AIConversation model so
 * follow-up questions ("Why?") have real context.
 *
 * Architecture: three tabs — Chat | Insights | Actions
 *   Chat:      full conversation history, contextual prompt chips,
 *              streaming-style typing cursor, error / empty / loading states
 *   Insights:  explainability cards (expandable), grounded entirely in the
 *              real city/EcoScore-breakdown data already shown elsewhere
 *              on the page — no fabricated composite indices
 *   Actions:   2-3 recommendations ranked directly from the real EcoScore
 *              breakdown (weakest/strongest tracked metric) — no AI
 *              confidence score, since no validated confidence model exists
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles, Send, Loader2, MessageCircle, Lightbulb,
  BarChart3, ChevronDown, ChevronUp, AlertTriangle,
  Leaf, Wind, Droplets, Factory, Zap, TreePine,
  CheckCircle2, AlertCircle, Info, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { copilotApi } from "@/lib/api/services.api";
import { ecoGradeFallback } from "@/lib/mock-data";
import type { City, EcoScoreMetricKey } from "@/lib/mock-data";

// ─── types ───────────────────────────────────────────────────────────────────

type ChatMsg = { role: "user" | "ai"; text: string };
type Priority = "critical" | "high" | "medium" | "low";
type Tab = "chat" | "insights" | "actions";

interface ExplainCard {
  id: string;
  icon: typeof Leaf;
  label: string;
  color: string;
  summary: string;
  detail: string;
  priority: Priority;
}

// ─── priority helpers ─────────────────────────────────────────────────────────

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  critical: { label: "Critical",  color: "var(--color-destructive)" },
  high:     { label: "High",      color: "var(--color-warning)" },
  medium:   { label: "Medium",    color: "var(--color-info)" },
  low:      { label: "Low",       color: "var(--color-success)" },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide font-semibold"
      style={{ color: meta.color, background: `color-mix(in oklab, ${meta.color} 14%, transparent)` }}
    >
      {meta.label}
    </span>
  );
}

// ─── contextual prompt chips ──────────────────────────────────────────────────
// A small, focused set — not a wall of chips. Matches the GreenGuard
// Intelligence Center's EXPLAIN / ANALYZE / RECOMMEND categories.
function buildPrompts(city: City): string[] {
  return [
    `Why is the EcoScore ${city.eco}?`,
    "What changed this week?",
    "What needs attention?",
    "Which metric is strongest?",
    `What should ${city.name} improve first?`,
  ];
}

// ─── typing animation (mirrors Phase 2 ai-summary but scoped to one message) ──

function TypingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-3.5 bg-current ml-px animate-pulse align-middle"
      aria-hidden="true"
    />
  );
}

// ─── chat message bubble ──────────────────────────────────────────────────────

function Bubble({ msg, isLast, isPending }: { msg: ChatMsg; isLast: boolean; isPending: boolean }) {
  const isAi = msg.role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex gap-3", isAi ? "justify-start" : "justify-end")}
    >
      {isAi && (
        <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0 mt-0.5">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isAi ? "bg-muted/40 rounded-tl-sm" : "glass rounded-tr-sm",
        )}
      >
        {msg.text}
        {isAi && isLast && isPending && <TypingCursor />}
      </div>
    </motion.div>
  );
}

// ─── explainability card ──────────────────────────────────────────────────────

function ExplainCardRow({ card }: { card: ExplainCard }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-xl border border-border hover:border-primary/30 transition-colors duration-200 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={expanded}
      >
        <div
          className="size-7 rounded-lg grid place-items-center shrink-0"
          style={{ background: `color-mix(in oklab, ${card.color} 16%, transparent)`, color: card.color }}
        >
          <card.icon className="size-3.5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">{card.label}</span>
            <PriorityBadge priority={card.priority} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{card.summary}</p>
        </div>
        {expanded
          ? <ChevronUp className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          : <ChevronDown className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
        }
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
              {card.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── main copilot panel ───────────────────────────────────────────────────────

// ─── EcoScore breakdown helpers — reused, not recomputed ─────────────────────
// Reads the exact same Phase 2 breakdown shown in EcoScoreBreakdownPanel;
// never recalculates a score or grade of its own.
const METRIC_LABEL: Record<EcoScoreMetricKey, string> = {
  airQuality: "air quality",
  greenCover: "green cover",
  renewableEnergy: "renewable energy",
  waterQuality: "water quality",
  wasteDiversion: "waste diversion",
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function availableMetricsByScore(city: City): EcoScoreMetricKey[] {
  const breakdown = city.ecoScore?.breakdown;
  if (!breakdown) return [];
  return (Object.keys(breakdown) as EcoScoreMetricKey[])
    .filter((k) => breakdown[k].available)
    .sort((a, b) => breakdown[a].normalizedScore! - breakdown[b].normalizedScore!);
}

export function SustainabilityCopilot({
  city, isApiConnected, renewableShare, greenCover,
}: {
  city: City;
  isApiConnected: boolean;
  renewableShare: number;
  greenCover: number;
}) {
  const [tab, setTab]           = useState<Tab>("chat");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>(() => [{
    role: "ai",
    text: `Hello! I'm GreenGuard Intelligence. Ask me anything about ${city.name}'s environmental performance — EcoScore, carbon, water, renewables, or what to prioritise next.`,
  }]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Reset conversation when city changes — no stale AI memory from the
  // previous city carries over.
  useEffect(() => {
    setMessages([{
      role: "ai",
      text: `Switched to ${city.name}. Ask me about its EcoScore of ${city.eco}/100, AQI of ${city.aqi}, or any sustainability dimension.`,
    }]);
    setSessionId(undefined);
    setError(null);
  }, [city.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const prompts = useMemo(() => buildPrompts(city), [city]);

  // AI chat mutation — dedicated Sustainability-only route, grounded in the
  // same transparent EcoScore this page already displays (see
  // sustainabilityChat in copilot.controller.ts). Not the generic
  // copilotApi.chat() used by other pages.
  const chatMutation = useMutation({
    mutationFn: (q: string) => copilotApi.sustainabilityChat(q, city.id, sessionId),
    onSuccess: (resp) => {
      const data = resp?.data ?? resp as Record<string, unknown>;
      if (data?.sessionId) setSessionId(data.sessionId as string);
      const answer = (data?.answer ?? data?.text ?? "No response.") as string;
      setMessages(h => [...h, { role: "ai", text: answer }]);
      setError(null);
    },
    onError: () => {
      setError("GreenGuard Intelligence is temporarily unavailable. Your environmental dashboard is still using the latest available data.");
      setMessages(h => [...h, {
        role: "ai",
        text: "GreenGuard Intelligence is temporarily unavailable. Your environmental dashboard is still using the latest available data.",
      }]);
    },
  });

  const handleSend = useCallback(() => {
    const q = question.trim();
    if (!q) return;
    setMessages(h => [...h, { role: "user", text: q }]);
    setQuestion("");
    setError(null);
    if (!isApiConnected) {
      setMessages(h => [...h, {
        role: "ai",
        text: "GreenGuard Intelligence requires the backend API. Start the backend server and set GEMINI_API_KEY to enable live responses.",
      }]);
      return;
    }
    chatMutation.mutate(q);
  }, [question, isApiConnected, chatMutation]);

  const handlePrompt = useCallback((p: string) => {
    setQuestion(p);
  }, []);

  // Explainability cards — derived entirely from live city data (including
  // the real EcoScore breakdown), no separate API call and no invented
  // composite indices.
  const weakestFirst = useMemo(() => availableMetricsByScore(city), [city]);
  const primaryDragLabel = weakestFirst.length ? METRIC_LABEL[weakestFirst[0]] : "renewable energy";

  const explainCards: ExplainCard[] = useMemo(() => [
    {
      id: "ecoscore",
      icon: BarChart3, label: "EcoScore", color: "var(--color-primary)",
      priority: city.eco < 50 ? "critical" : city.eco < 70 ? "high" : "low",
      summary: `${city.eco}/100 — Grade ${city.ecoScore?.grade ?? ecoGradeFallback(city.eco)}`,
      detail:  `The EcoScore is a weighted composite of air quality (AQI ${city.aqi}), green cover (${greenCover}%), renewable energy share (${renewableShare}%), and water quality (${city.water}%)${city.ecoScore && !city.ecoScore.dataComplete ? " — waste diversion isn't included yet as no supported data source exists" : ""}. A score of ${city.eco} reflects ${city.eco >= 70 ? "strong" : city.eco >= 50 ? "moderate" : "weak"} overall environmental management. The primary drag is currently ${primaryDragLabel}.`,
    },
    {
      id: "carbon",
      icon: Factory, label: "Carbon Intelligence", color: "var(--color-destructive)",
      priority: city.carbon > 9 ? "critical" : city.carbon > 6 ? "high" : city.carbon > 4 ? "medium" : "low",
      summary:  `${city.carbon} tCO₂ per capita — ${city.carbon > 7 ? "above" : "below"} the 7 t high-risk threshold`,
      detail:   `Per-capita carbon intensity of ${city.carbon} tCO₂ is ${city.carbon > 7 ? `above the regional high-risk mark of 7 t.` : "within an acceptable range."} Current AQI (${city.aqi}) and PM2.5 (${city.pm25} µg/m³) readings are the closest related indicators GreenGuard tracks.`,
    },
    {
      id: "renewable",
      icon: Zap, label: "Renewable Energy", color: "var(--color-warning)",
      priority: renewableShare < 25 ? "critical" : renewableShare < 35 ? "high" : renewableShare < 40 ? "medium" : "low",
      summary:  `${renewableShare}% renewable mix — ${renewableShare >= 40 ? "target met" : `${40 - renewableShare}% below 40% target`}`,
      detail:   `The current generation mix is ${renewableShare}% renewable. ${renewableShare >= 40 ? "The 40% clean energy target has been achieved." : `Closing the ${40 - renewableShare}% gap is the fastest lever to raise renewable energy's contribution to the EcoScore.`}`,
    },
    {
      id: "water",
      icon: Droplets, label: "Water Intelligence", color: "var(--color-info)",
      priority: city.water < 50 ? "critical" : city.water < 65 ? "high" : city.water < 75 ? "medium" : "low",
      summary:  `Water quality index ${city.water}% — ${city.water >= 75 ? "excellent" : city.water >= 60 ? "moderate" : "poor"}`,
      detail:   `A water sustainability index of ${city.water}% ${city.water >= 75 ? "exceeds the 75% healthy threshold, indicating effective treatment and reuse infrastructure." : city.water >= 60 ? "is approaching the 75% target." : "is below the 60% sustainability floor and is the current priority for infrastructure investment."}`,
    },
    {
      id: "air",
      icon: Wind, label: "Air Quality", color: "var(--color-primary)",
      priority: city.aqi > 200 ? "critical" : city.aqi > 150 ? "high" : city.aqi > 100 ? "medium" : "low",
      summary:  `AQI ${city.aqi} · PM2.5 ${city.pm25} µg/m³`,
      detail:   `Current AQI of ${city.aqi} places ${city.name} in the "${city.aqi < 50 ? "Good" : city.aqi < 100 ? "Moderate" : city.aqi < 150 ? "Unhealthy for Sensitive Groups" : city.aqi < 200 ? "Unhealthy" : "Very Unhealthy"}" band. PM2.5 at ${city.pm25} µg/m³ is ${city.pm25 > 35 ? "above" : "within"} the WHO 24h advisory of 35 µg/m³.`,
    },
    {
      id: "green",
      icon: TreePine, label: "Green Cover", color: "var(--color-success)",
      priority: greenCover < 15 ? "critical" : greenCover < 25 ? "high" : greenCover < 30 ? "medium" : "low",
      summary:  `${greenCover}% urban canopy — ${greenCover >= 30 ? "target met" : `${30 - greenCover}% below 30% target`}`,
      detail:   `Urban green cover of ${greenCover}% ${greenCover >= 30 ? "meets the 30% canopy target." : `falls short of the 30% target by ${30 - greenCover} percentage points.`}`,
    },
  ], [city, renewableShare, greenCover, primaryDragLabel]);

  // Actions tab — 2-3 recommendations ranked directly from the real
  // EcoScore breakdown (weakest / next-weakest / strongest tracked
  // metric). Deterministic, not Gemini-generated: no confidence score is
  // shown because no validated confidence model exists for these.
  const priorities = useMemo(() => {
    if (weakestFirst.length < 2) return [];
    const strongest = weakestFirst[weakestFirst.length - 1];
    const items: { title: string; reason: string }[] = [
      {
        title: `Improve ${METRIC_LABEL[weakestFirst[0]]}`,
        reason: `${cap(METRIC_LABEL[weakestFirst[0]])} is currently the weakest tracked sustainability indicator for ${city.name}, scoring ${city.ecoScore!.breakdown[weakestFirst[0]].normalizedScore}/100 in the EcoScore breakdown.`,
      },
    ];
    if (weakestFirst.length > 2 && weakestFirst[1] !== strongest) {
      items.push({
        title: `Address ${METRIC_LABEL[weakestFirst[1]]}`,
        reason: `${cap(METRIC_LABEL[weakestFirst[1]])} is also below the other tracked dimensions, scoring ${city.ecoScore!.breakdown[weakestFirst[1]].normalizedScore}/100.`,
      });
    }
    items.push({
      title: `Maintain strong ${METRIC_LABEL[strongest]} performance`,
      reason: `${cap(METRIC_LABEL[strongest])} is currently ${city.name}'s strongest tracked dimension, scoring ${city.ecoScore!.breakdown[strongest].normalizedScore}/100.`,
    });
    return items.slice(0, 3);
  }, [city, weakestFirst]);

  // Priority-sort for insights tab
  const sortedCards = useMemo(() => {
    const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...explainCards].sort((a, b) => order[a.priority] - order[b.priority]);
  }, [explainCards]);

  const tabs: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
    { id: "chat",     label: "Chat",     icon: MessageCircle },
    { id: "insights", label: "Insights", icon: BarChart3 },
    { id: "actions",  label: "Actions",  icon: Lightbulb },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background/40 backdrop-blur-sm">
        <div className="size-9 rounded-xl aurora grid place-items-center text-primary-foreground shrink-0">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">GreenGuard Intelligence Center</div>
          <div className="text-[11px] text-muted-foreground truncate">
            Understand {city.name}'s environmental data, EcoScore and recent changes.
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] shrink-0">
          <span
            className="size-1.5 rounded-full inline-block"
            style={{ background: isApiConnected ? "var(--color-success)" : "var(--color-warning)" }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{isApiConnected ? "Gemini · live" : "Mock mode"}</span>
        </div>
      </div>

      {/* Source transparency — small, unobtrusive */}
      <div className="flex items-center gap-1.5 px-5 pt-3 text-[10px] text-muted-foreground">
        <ShieldCheck className="size-3 shrink-0" aria-hidden="true" />
        <span>Based on current GreenGuard environmental data for {city.name}.</span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-all duration-200 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              tab === t.id
                ? "border-primary text-primary bg-primary/8"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
            aria-selected={tab === t.id}
            role="tab"
          >
            <t.icon className="size-3.5" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="border-t border-border" />

      <div className="p-5">
        <AnimatePresence mode="wait">

          {/* ── CHAT TAB ──────────────────────────────────────────── */}
          {tab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Message list */}
              <div
                className="min-h-[300px] max-h-[420px] overflow-y-auto space-y-4 pr-1 scroll-smooth"
                role="log"
                aria-live="polite"
                aria-label="Conversation history"
              >
                {messages.map((m, i) => (
                  <Bubble
                    key={i}
                    msg={m}
                    isLast={i === messages.length - 1}
                    isPending={chatMutation.isPending}
                  />
                ))}
                {chatMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
                      <Sparkles className="size-3.5" aria-hidden="true" />
                    </div>
                    <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                      <span className="text-xs text-muted-foreground">Analysing environmental data…</span>
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="rounded-xl border border-input bg-background/40 p-1.5 flex items-center gap-2">
                <input
                  placeholder="Ask about sustainability, EcoScore, carbon, water…"
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none min-w-0"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  aria-label="Sustainability question"
                  disabled={chatMutation.isPending}
                />
                <button
                  onClick={handleSend}
                  disabled={chatMutation.isPending || !question.trim()}
                  className="aurora text-primary-foreground rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50 transition-opacity shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Send question"
                >
                  {chatMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Ask
                </button>
              </div>

              {/* Contextual prompt chips */}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested questions">
                {prompts.map(p => (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePrompt(p)}
                    className="text-xs px-2.5 py-1.5 rounded-full glass text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {p}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── INSIGHTS TAB ──────────────────────────────────────── */}
          {tab === "insights" && (
            <motion.div
              key="insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Priority summary row */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["critical","high","medium","low"] as Priority[]).map(p => {
                  const count = sortedCards.filter(c => c.priority === p).length;
                  const meta = PRIORITY_META[p];
                  const Icon = p === "critical" ? AlertCircle : p === "high" ? AlertTriangle : p === "medium" ? Info : CheckCircle2;
                  return (
                    <div key={p} className="rounded-xl bg-muted/30 p-2 border border-border">
                      <Icon className="size-3.5 mx-auto" style={{ color: meta.color }} aria-hidden="true" />
                      <div className="text-sm font-semibold tabular-nums mt-1" style={{ color: meta.color }}>{count}</div>
                      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{meta.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Explainability cards */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {sortedCards.map(card => (
                  <ExplainCardRow key={card.id} card={card} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ACTIONS TAB ──────────────────────────────────────── */}
          {tab === "actions" && (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <p className="text-xs text-muted-foreground">
                Ranked directly from {city.name}'s current EcoScore breakdown — no AI confidence score, since GreenGuard doesn't have a validated model for one.
              </p>

              {priorities.length === 0 ? (
                <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground">
                  Not enough live EcoScore data to generate grounded recommendations right now.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {priorities.map((p, i) => (
                    <motion.div
                      key={p.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      whileHover={{ y: -2 }}
                      className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors duration-200"
                    >
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Priority {i + 1}</span>
                      <p className="text-xs font-medium mt-1.5 leading-snug">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{p.reason}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
