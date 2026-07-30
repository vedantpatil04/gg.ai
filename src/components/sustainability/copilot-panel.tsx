/**
 * copilot-panel.tsx — Phase 5 AI Sustainability Copilot
 *
 * Self-contained copilot panel embedded in the Sustainability page.
 * Reuses:
 *   copilotApi.chat()            — Gemini backend (same as /copilot route)
 *   copilotApi.getRecommendations()
 *   RECOMMENDATIONS / INSIGHTS  — existing mock fallbacks
 *
 * No new backend endpoints are added. The `sessionId` is scoped to this
 * component's lifetime (session memory), not persisted to the backend.
 *
 * Architecture: three tabs — Chat | Insights | Actions
 *   Chat:    full conversation history, contextual prompt chips,
 *            streaming-style typing cursor, error / empty / loading states
 *   Insights: explainability cards (expandable), AI priority classification
 *   Actions:  recommendations with confidence bars and priority badges
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sparkles, Send, Loader2, MessageCircle, Lightbulb,
  BarChart3, ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
  Leaf, Wind, Droplets, Factory, Zap, TreePine, Bug,
  CheckCircle2, AlertCircle, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { copilotApi } from "@/lib/api/services.api";
import { RECOMMENDATIONS, INSIGHTS } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";

// ─── types ───────────────────────────────────────────────────────────────────

type ChatMsg = { role: "user" | "ai"; text: string; metrics?: Record<string, unknown> };
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

function buildPrompts(city: City, renewableShare: number, greenCover: number): string[] {
  const base = [
    `Summarise ${city.name}'s sustainability performance.`,
    `Explain today's EcoScore of ${city.eco}/100.`,
    `Why is the AQI at ${city.aqi}?`,
    `What should ${city.name} improve first?`,
  ];
  if (city.carbon > 6) base.push(`Explain the carbon intensity of ${city.carbon} tCO₂/cap.`);
  if (city.water < 70) base.push("How can water quality be improved?");
  if (renewableShare < 35) base.push(`How can ${city.name} close the renewable energy gap?`);
  if (greenCover < 30)    base.push("What are the fastest ways to increase green cover?");
  if (city.aqi > 100)    base.unshift("Is it safe to exercise outside today?");
  return base.slice(0, 6);
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
        {msg.metrics && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(msg.metrics as Record<string, number>).map(([k, v]) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                {k}:{v}
              </span>
            ))}
          </div>
        )}
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
    text: `Hello! I'm your GreenGuard Sustainability Copilot. Ask me anything about ${city.name}'s environmental performance — EcoScore, carbon, water, renewables, or what to prioritise next.`,
  }]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Reset conversation when city changes
  useEffect(() => {
    setMessages([{
      role: "ai",
      text: `Switched to ${city.name}. Ask me about its EcoScore of ${city.eco}/100, AQI of ${city.aqi}, or any sustainability dimension.`,
    }]);
    setSessionId(undefined);
    setError(null);
  }, [city.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const prompts = useMemo(
    () => buildPrompts(city, renewableShare, greenCover),
    [city, renewableShare, greenCover],
  );

  // AI chat mutation — same API call as /copilot route
  const chatMutation = useMutation({
    mutationFn: (q: string) => copilotApi.chat(q, city.id, sessionId),
    onSuccess: (resp) => {
      const data = resp?.data ?? resp as Record<string, unknown>;
      if (data?.sessionId) setSessionId(data.sessionId as string);
      const answer = (data?.answer ?? data?.text ?? "No response.") as string;
      const metrics = data?.metrics as Record<string, unknown> | undefined;
      setMessages(h => [...h, { role: "ai", text: answer, metrics }]);
      setError(null);
    },
    onError: () => {
      setError("AI service unavailable. Check that the backend is running and GEMINI_API_KEY is set.");
      setMessages(h => [...h, {
        role: "ai",
        text: "I couldn't reach the AI service. Please check your backend connection.",
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
        text: "AI Copilot requires the backend API. Start the backend server and set GEMINI_API_KEY to enable live responses.",
      }]);
      return;
    }
    chatMutation.mutate(q);
  }, [question, isApiConnected, chatMutation]);

  const handlePrompt = useCallback((p: string) => {
    setQuestion(p);
  }, []);

  // Recommendations query — same as /copilot route
  const { data: recData, isLoading: recLoading, refetch: refetchRec } = useQuery({
    queryKey:  ["recommendations", city.id],
    queryFn:   () => copilotApi.getRecommendations(city.id).then(r => r.data?.recommendations ?? r.data),
    staleTime: 5 * 60_000,
    enabled:   isApiConnected,
    throwOnError: false,
  });

  const recommendations = (Array.isArray(recData) ? recData : null) ?? RECOMMENDATIONS;

  // Explainability cards — derived from live city data, no new API
  const explainCards: ExplainCard[] = useMemo(() => [
    {
      id: "ecoscore",
      icon: BarChart3, label: "EcoScore", color: "var(--color-primary)",
      priority: city.eco < 50 ? "critical" : city.eco < 70 ? "high" : "low",
      summary: `${city.eco}/100 — Grade ${city.eco >= 85 ? "A+" : city.eco >= 75 ? "A" : city.eco >= 65 ? "B+" : city.eco >= 55 ? "B" : "C"}`,
      detail:  `The EcoScore is a composite index blending air quality (AQI ${city.aqi}), water sustainability (${city.water}%), renewable energy share (${renewableShare}%), green cover (${greenCover}%), and carbon intensity (${city.carbon} tCO₂/cap). A score of ${city.eco} reflects ${city.eco >= 70 ? "strong" : city.eco >= 50 ? "moderate" : "weak"} overall environmental management. The primary drag is ${city.aqi > 130 ? "air quality" : city.water < 65 ? "water quality" : city.carbon > 7 ? "carbon intensity" : "renewable energy gap"}.`,
    },
    {
      id: "carbon",
      icon: Factory, label: "Carbon Intelligence", color: "var(--color-destructive)",
      priority: city.carbon > 9 ? "critical" : city.carbon > 6 ? "high" : city.carbon > 4 ? "medium" : "low",
      summary:  `${city.carbon} tCO₂ per capita — ${city.carbon > 7 ? "above" : "below"} the 7 t high-risk threshold`,
      detail:   `Per-capita carbon intensity of ${city.carbon} tCO₂ is ${city.carbon > 7 ? `${((city.carbon / 7 - 1) * 100).toFixed(0)}% above the regional high-risk mark of 7 t. Transport and industrial sectors are the primary contributors based on current AQI (${city.aqi}) and PM2.5 (${city.pm25} µg/m³) readings.` : "within an acceptable range. Continued monitoring of industrial clusters and transport corridors is recommended to maintain this position."}`,
    },
    {
      id: "renewable",
      icon: Zap, label: "Renewable Energy", color: "var(--color-warning)",
      priority: renewableShare < 25 ? "critical" : renewableShare < 35 ? "high" : renewableShare < 40 ? "medium" : "low",
      summary:  `${renewableShare}% renewable mix — ${renewableShare >= 40 ? "target met" : `${40 - renewableShare}% below 40% target`}`,
      detail:   `The current generation mix is ${renewableShare}% renewable (solar + wind + hydro). ${renewableShare >= 40 ? "The 40% clean energy target has been achieved." : `Closing the ${40 - renewableShare}% gap requires accelerating solar rooftop installation and grid-scale wind procurement. The estimated grid carbon intensity is ~${Math.round(city.carbon * 82)} gCO₂/kWh.`}`,
    },
    {
      id: "water",
      icon: Droplets, label: "Water Intelligence", color: "var(--color-info)",
      priority: city.water < 50 ? "critical" : city.water < 65 ? "high" : city.water < 75 ? "medium" : "low",
      summary:  `Water quality index ${city.water}% — ${city.water >= 75 ? "excellent" : city.water >= 60 ? "moderate" : "poor"}`,
      detail:   `A water sustainability index of ${city.water}% ${city.water >= 75 ? "exceeds the 75% healthy threshold, indicating effective treatment and reuse infrastructure." : city.water >= 60 ? "is approaching the 75% target. Scaling decentralised grey-water reuse and auditing treatment capacity are the recommended next steps." : "is below the 60% sustainability floor. Urgent infrastructure investment in water treatment and distribution is required."} Estimated reuse rate: ~${Math.round(city.water * 0.56)}%.`,
    },
    {
      id: "air",
      icon: Wind, label: "Air Quality", color: "var(--color-primary)",
      priority: city.aqi > 200 ? "critical" : city.aqi > 150 ? "high" : city.aqi > 100 ? "medium" : "low",
      summary:  `AQI ${city.aqi} · PM2.5 ${city.pm25} µg/m³`,
      detail:   `Current AQI of ${city.aqi} places ${city.name} in the "${city.aqi < 50 ? "Good" : city.aqi < 100 ? "Moderate" : city.aqi < 150 ? "Unhealthy for Sensitive Groups" : city.aqi < 200 ? "Unhealthy" : "Very Unhealthy"}" band. PM2.5 at ${city.pm25} µg/m³ is ${city.pm25 > 35 ? "above" : "within"} the WHO 24h advisory of 35 µg/m³. Humidity at ${city.humidity}% ${city.humidity > 70 ? "is amplifying particulate binding, worsening effective exposure." : "has a neutral effect on dispersion."}`,
    },
    {
      id: "green",
      icon: TreePine, label: "Green Cover", color: "var(--color-success)",
      priority: greenCover < 15 ? "critical" : greenCover < 25 ? "high" : greenCover < 30 ? "medium" : "low",
      summary:  `${greenCover}% urban canopy — ${greenCover >= 30 ? "target met" : `${30 - greenCover}% below 30% target`}`,
      detail:   `Urban green cover of ${greenCover}% ${greenCover >= 30 ? "meets the 30% canopy target" : `falls short of the 30% target by ${30 - greenCover}%`}. Current sequestration capacity: ~${Math.round(greenCover * 3)} ktCO₂/yr. Vegetation health score: ${Math.min(100, Math.round(city.eco * 0.7 + (40 - city.temp) * 0.6))}%. Each percentage point of canopy added sequesters an estimated ${Math.round(greenCover * 0.09)} ktCO₂/yr additional.`,
    },
    {
      id: "biodiversity",
      icon: Bug, label: "Biodiversity", color: "oklch(0.62 0.17 145)",
      priority: greenCover < 20 ? "high" : city.eco < 55 ? "medium" : "low",
      summary:  `Ecological health: ${Math.min(100, Math.round(city.eco * 0.5 + city.water * 0.3 + (100 - city.aqi * 0.15) * 0.2))}%`,
      detail:   `Ecological health is a composite of green cover density (${greenCover}%), water quality (${city.water}%), and air quality pressure (AQI ${city.aqi}). Tree density index: ~${Math.min(100, Math.round(greenCover * 1.9))}%. Habitat score: ~${Math.min(100, Math.round(greenCover * 1.2 + city.water * 0.25))}%. Urban biodiversity is most sensitive to green cover loss and water quality degradation.`,
    },
  ], [city, renewableShare, greenCover]);

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
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">GreenGuard AI</div>
          <div className="text-sm font-semibold">Sustainability Copilot · {city.name}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span
            className="size-1.5 rounded-full inline-block"
            style={{ background: isApiConnected ? "var(--color-success)" : "var(--color-warning)" }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{isApiConnected ? "Gemini · live" : "Mock mode"}</span>
        </div>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isApiConnected ? "Gemini-generated recommendations" : "Rule-based fallback recommendations"}
                </p>
                {isApiConnected && (
                  <button
                    onClick={() => refetchRec()}
                    disabled={recLoading}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Refresh recommendations"
                  >
                    <RefreshCw className={cn("size-3", recLoading && "animate-spin")} aria-hidden="true" />
                    Refresh
                  </button>
                )}
              </div>

              {recLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="glass rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute inset-0 shimmer" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {recommendations.map((r: { title: string; impact: string; effort: string; confidence: number }, i: number) => {
                    const conf = Math.round((r.confidence ?? 0.75) * 100);
                    const confColor = conf >= 85 ? "var(--color-success)" : conf >= 70 ? "var(--color-warning)" : "var(--color-muted-foreground)";
                    return (
                      <motion.div
                        key={r.title}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                        className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors duration-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Action</span>
                          <span className="text-[10px] tabular-nums" style={{ color: confColor }}>
                            {conf}% conf.
                          </span>
                        </div>
                        <p className="text-xs font-medium mt-1.5 leading-snug">{r.title}</p>
                        {/* Confidence bar */}
                        <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: confColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${conf}%` }}
                            transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                            <div className="text-muted-foreground">Impact</div>
                            <div className="font-semibold mt-0.5">{r.impact}</div>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                            <div className="text-muted-foreground">Effort</div>
                            <div className="font-semibold mt-0.5">{r.effort}</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
