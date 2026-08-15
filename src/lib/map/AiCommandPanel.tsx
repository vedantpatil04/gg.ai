/**
 * AiCommandPanel.tsx — Phase 8: AI Command Center & Decision Intelligence
 *
 * Renders as the "AI" tab in the intelligence drawer.
 * Combines all phase data (air quality, weather, hazard) into one
 * operational command view, with an embedded copilot mini-chat that
 * reuses the existing copilotApi.chat endpoint.
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Brain,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Loader2,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";
import { useQuery, useMutation } from "@tanstack/react-query";
import { copilotApi } from "@/lib/api/services.api";
import { useCity } from "@/lib/city-context";
import {
  generateAiCommandData,
  type AiCommandData,
  type OperationalKpi,
  type AiInsight,
  type TimelineEvent,
  type DecisionAction,
  type ExecutiveSummary,
} from "@/components/map/ai-command-data";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMsg = { role: "user" | "ai"; text: string };

// ─── Executive summary card ───────────────────────────────────────────────────
function ExecutiveSummaryCard({ exec }: { exec: ExecutiveSummary }) {
  const color = exec.statusColor;
  const statusLabels: Record<string, string> = {
    nominal: "NOMINAL",
    elevated: "ELEVATED",
    critical: "CRITICAL",
  };
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 18%, var(--card-bg)) 0%, var(--card-bg) 100%)`,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <motion.div
          className="size-8 rounded-xl grid place-items-center shrink-0"
          style={{ background: `color-mix(in oklab, ${color} 20%, transparent)` }}
          animate={{
            boxShadow: [`0 0 0px ${color}00`, `0 0 12px ${color}55`, `0 0 0px ${color}00`],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Brain className="size-4" style={{ color }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              AI Executive Summary
            </span>
            <span
              className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
            >
              {statusLabels[exec.overallStatus]}
            </span>
          </div>
          <p className="text-[10px] font-semibold mt-0.5 leading-snug">{exec.headline}</p>
        </div>
      </div>

      {/* SITREP */}
      <div
        className="mx-4 mb-3 rounded-xl px-3 py-2.5"
        style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
      >
        <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground/70 mb-1.5 font-semibold">
          Situation Report
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed">{exec.sitrep}</p>
      </div>

      {/* Detail rows */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 pb-3 text-[8.5px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
      >
        <span>{expanded ? "Less detail" : "More detail"}</span>
        {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {[
                { label: "Highest Concern", value: exec.highestConcern, icon: AlertTriangle },
                { label: "Positive Trend", value: exec.positiveTrend, icon: TrendingUp },
                { label: "Recommended Focus", value: exec.recommendedFocus, icon: Zap },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="size-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                  <div>
                    <div className="text-[7.5px] uppercase tracking-wide text-muted-foreground/60 font-semibold">
                      {label}
                    </div>
                    <div className="text-[8.5px] text-muted-foreground/80 leading-snug mt-0.5">
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Operational KPI grid ─────────────────────────────────────────────────────
function KpiGrid({ kpis }: { kpis: OperationalKpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {kpis.map((kpi, i) => {
        const TrendIcon =
          kpi.trend === "improving" ? TrendingUp : kpi.trend === "degrading" ? TrendingDown : Minus;
        const trendColor =
          kpi.trend === "improving"
            ? "var(--color-success)"
            : kpi.trend === "degrading"
              ? "var(--color-destructive)"
              : "var(--color-muted-foreground)";
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl px-2.5 py-2.5 relative overflow-hidden"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            {/* Hairline accent */}
            <span
              className="absolute inset-x-3 top-0 h-px rounded-full opacity-60"
              style={{ background: kpi.color }}
            />
            <div className="flex items-start justify-between gap-1">
              <div className="text-[8px] text-muted-foreground/70 uppercase tracking-wide font-medium leading-tight flex-1">
                {kpi.label}
              </div>
              <TrendIcon className="size-2.5 shrink-0 mt-0.5" style={{ color: trendColor }} />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className="text-[16px] font-bold tabular-nums leading-none"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </span>
              {kpi.unit && <span className="text-[8px] text-muted-foreground">{kpi.unit}</span>}
            </div>
            <div
              className="h-1 rounded-full overflow-hidden mt-1.5"
              style={{ background: "oklch(1 0 0 / 0.08)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: kpi.color }}
                initial={{ width: 0 }}
                animate={{ width: `${kpi.value}%` }}
                transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="text-[7.5px] text-muted-foreground/55 mt-1 truncate">
              {kpi.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── AI Insights ──────────────────────────────────────────────────────────────
function InsightsSection({ insights }: { insights: AiInsight[] }) {
  const sevColor: Record<string, string> = {
    positive: "var(--color-success)",
    neutral: "var(--color-info)",
    warning: "var(--color-warning)",
    critical: "var(--color-destructive)",
  };
  const sevBg: Record<string, string> = {
    positive: "color-mix(in oklab, var(--color-success) 8%, transparent)",
    neutral: "color-mix(in oklab, var(--color-info) 8%, transparent)",
    warning: "color-mix(in oklab, var(--color-warning) 8%, transparent)",
    critical: "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
  };

  return (
    <div className="space-y-1.5">
      {insights.map((ins, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl px-3 py-2.5"
          style={{
            background: sevBg[ins.severity],
            border: `1px solid color-mix(in oklab, ${sevColor[ins.severity]} 20%, transparent)`,
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span
              className="text-[9.5px] font-semibold leading-tight"
              style={{ color: sevColor[ins.severity] }}
            >
              {ins.title}
            </span>
            <span
              className="text-[7.5px] font-bold px-1 py-0.5 rounded shrink-0"
              style={{
                background: `color-mix(in oklab, ${sevColor[ins.severity]} 18%, transparent)`,
                color: sevColor[ins.severity],
              }}
            >
              {Math.round(ins.confidence * 100)}%
            </span>
          </div>
          <p className="text-[8.5px] text-muted-foreground/80 leading-snug">{ins.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function UnifiedTimeline({ events }: { events: TimelineEvent[] }) {
  const catIcon: Record<TimelineEvent["category"], React.ElementType> = {
    air: Activity,
    weather: Activity,
    hazard: AlertTriangle,
    sensor: BarChart3,
    alert: AlertTriangle,
  };

  return (
    <div className="space-y-0">
      {events.map((ev, i) => {
        const Icon = catIcon[ev.category];
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-2.5 pb-3 relative"
          >
            {/* Vertical line */}
            {i < events.length - 1 && (
              <div
                className="absolute left-[11px] top-5 bottom-0 w-px"
                style={{ background: "var(--card-border)" }}
              />
            )}
            {/* Icon dot */}
            <div
              className="size-5.5 rounded-full grid place-items-center shrink-0 mt-0.5 z-10"
              style={{
                background: `color-mix(in oklab, ${ev.color} 18%, var(--card-bg))`,
                border: `1px solid color-mix(in oklab, ${ev.color} 30%, transparent)`,
              }}
            >
              <Icon className="size-2.5" style={{ color: ev.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-semibold truncate">{ev.title}</span>
                <span className="flex items-center gap-0.5 text-[7.5px] text-muted-foreground/60 shrink-0">
                  <Clock className="size-2" />
                  {ev.time}
                </span>
              </div>
              <p className="text-[8px] text-muted-foreground/70 leading-snug mt-0.5 line-clamp-2">
                {ev.detail}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Decision support ─────────────────────────────────────────────────────────
function DecisionPanel({ decisions }: { decisions: DecisionAction[] }) {
  const priorityColor: Record<string, string> = {
    immediate: "var(--color-destructive)",
    soon: "var(--color-warning)",
    monitor: "var(--color-info)",
  };
  const priorityLabel: Record<string, string> = {
    immediate: "Immediate",
    soon: "Soon",
    monitor: "Monitor",
  };

  return (
    <div className="space-y-1.5">
      {decisions.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl p-3"
          style={{
            background: "var(--card-bg)",
            border: `1px solid var(--card-border)`,
            borderLeft: `3px solid ${priorityColor[d.priority]}`,
          }}
        >
          <div className="flex items-start gap-2">
            <span
              className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
              style={{
                background: `color-mix(in oklab, ${priorityColor[d.priority]} 16%, transparent)`,
                color: priorityColor[d.priority],
              }}
            >
              {priorityLabel[d.priority].toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] font-semibold leading-tight">{d.title}</div>
              <p className="text-[8px] text-muted-foreground/70 mt-0.5 leading-snug">
                {d.rationale}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="size-2.5 text-muted-foreground/50 shrink-0" />
                <span className="text-[7.5px] text-muted-foreground/60">{d.impact}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── City rank ────────────────────────────────────────────────────────────────
function CityRankCard({ cityRank }: { cityRank: AiCommandData["cityRank"] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {cityRank.map(
        ({ label, value, note }: { label: string; value: string | number; note: string }) => (
          <div
            key={label}
            className="rounded-xl px-2.5 py-2"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="text-[8px] text-muted-foreground/70 uppercase tracking-wide font-medium">
              {label}
            </div>
            <div className="text-[14px] font-bold tabular-nums mt-0.5">{value}</div>
            <div className="text-[7.5px] text-muted-foreground/55 mt-0.5 leading-tight">{note}</div>
          </div>
        ),
      )}
    </div>
  );
}

// ─── Embedded copilot mini-chat ───────────────────────────────────────────────
function CopilotMiniChat({ city, suggestedPrompts }: { city: City; suggestedPrompts: string[] }) {
  const { isApiConnected } = useCity();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      text: `I'm your GreenGuard AI assistant. Ask me about ${city.name}'s environmental conditions, hazards, or recommended actions.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (q: string) => copilotApi.chat(q, city.id, sessionId).then((r) => r.data),
    onSuccess: (data) => {
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: data.response ?? data.answer ?? "I couldn't generate a response. Please try again.",
        },
      ]);
    },
    onError: () => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Unable to reach the AI service right now. Please check your connection.",
        },
      ]);
    },
  });

  const send = (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    mutation.mutate(q);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Message thread */}
      <div
        className="rounded-xl overflow-y-auto max-h-52 p-3 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          scrollbarWidth: "none",
        }}
      >
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[88%] rounded-xl px-2.5 py-1.5 text-[8.5px] leading-snug",
              m.role === "user" ? "self-end" : "self-start",
            )}
            style={{
              background:
                m.role === "user"
                  ? "color-mix(in oklab, var(--color-primary) 20%, transparent)"
                  : "oklch(1 0 0 / 0.05)",
              border:
                m.role === "user"
                  ? "1px solid color-mix(in oklab, var(--color-primary) 30%, transparent)"
                  : "1px solid oklch(1 0 0 / 0.08)",
              color: m.role === "user" ? "var(--color-primary)" : "var(--color-foreground)",
            }}
          >
            {m.text}
          </motion.div>
        ))}
        {mutation.isPending && (
          <div className="self-start flex items-center gap-1.5 text-[8.5px] text-muted-foreground px-2.5 py-1.5">
            <Loader2 className="size-2.5 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <div
        className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {suggestedPrompts.slice(0, 4).map((p, i) => (
          <button
            key={i}
            onClick={() => send(p)}
            disabled={mutation.isPending || !isApiConnected}
            className="shrink-0 text-[8px] px-2 py-1 rounded-lg transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            {p.length > 32 ? p.slice(0, 32) + "…" : p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder={
            isApiConnected ? "Ask the AI about current conditions…" : "AI offline — connect to API"
          }
          disabled={mutation.isPending || !isApiConnected}
          className="flex-1 rounded-xl px-3 py-2 text-[9px] bg-transparent outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || mutation.isPending || !isApiConnected}
          className="size-9 rounded-xl grid place-items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40"
          style={{
            background: "color-mix(in oklab, var(--color-primary) 18%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-primary) 28%, transparent)",
          }}
        >
          {mutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <Send className="size-3.5 text-primary" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function AiCommandPanel({ city }: { city: City }) {
  const data: AiCommandData = useMemo(
    () => generateAiCommandData(city),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city.id, city.aqi, city.risk, city.alerts, city.temp, city.humidity],
  );

  return (
    <div
      className="flex flex-col gap-4 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* 1. Executive summary */}
      <ExecutiveSummaryCard exec={data.executive} />

      {/* 2. Operational KPIs */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Activity className="size-3" /> Operational Dashboard
        </div>
        <KpiGrid kpis={data.kpis} />
      </div>

      {/* 3. City rank */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <MapPin className="size-3" /> City Standing
        </div>
        <CityRankCard cityRank={data.cityRank} />
      </div>

      {/* 4. AI insights */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Sparkles className="size-3" /> AI Insights
        </div>
        <InsightsSection insights={data.insights} />
      </div>

      {/* 5. Decision support */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Zap className="size-3" /> Decision Support
        </div>
        <DecisionPanel decisions={data.decisions} />
      </div>

      {/* 6. Unified timeline */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Clock className="size-3" /> Environmental Timeline
        </div>
        <UnifiedTimeline events={data.timeline} />
      </div>

      {/* 7. Copilot mini-chat (reuses existing copilotApi.chat) */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Brain className="size-3" /> GreenGuard Intelligence Center
        </div>
        <CopilotMiniChat city={city} suggestedPrompts={data.suggestedPrompts} />
      </div>
    </div>
  );
}
