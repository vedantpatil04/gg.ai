/**
 * GreenGuard Intelligence Center — Phase 1 Simplified Workspace
 * Route: /copilot
 *
 * Dedicated AI-first environmental intelligence workspace designed to understand,
 * analyze, explain, compare, and interpret environmental information using AI.
 *
 * Architecture:
 *  - Three primary destinations: Assistant | Health | Insights
 *  - Compact single-line environmental context (AQI + temp) instead of a metric grid
 *  - Curated 5-suggestion empty state — no always-visible prompt/category toolbar
 *  - Insights absorbs the former "Intelligence" tab's trend/risk/sustainability/
 *    comparison signals so findings aren't split across two overlapping tabs
 *  - Wide, dominant conversation stream with anchored composer
 *  - Real data only — no fabricated fallback content; honest empty states instead
 *  - Preserves all existing APIs, authentication, Gemini integration, and city context
 */

import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Pill } from "@/components/ui-bits";
import {
  Sparkles, Leaf, Send, TrendingUp, Lightbulb,
  Loader2, Heart, Wind, AlertTriangle, ChevronRight,
  Activity, Copy, RefreshCw, CheckCircle,
  MessageSquare, ThumbsUp, ThumbsDown, ArrowDown,
  MapPin, RotateCcw, Globe2, FileText, Search, ShieldCheck,
  BarChart3, Layers,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { copilotApi } from "@/lib/api/services.api";
import { intelligenceApi } from "@/lib/api/environmental.api";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/intelligence/workspace-tabs";
import { DocumentWorkspace } from "@/components/intelligence/document-workspace";
import { ImageWorkspace }    from "@/components/intelligence/image-workspace";
import { DataWorkspace }     from "@/components/intelligence/data-workspace";
import { InsightCard, type InsightCardData } from "@/components/intelligence/insight-card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  EASE_OUT, DUR_SM, DUR_MD, DUR_XS,
} from "@/lib/motion";

// ─── Route Definition ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "GreenGuard Intelligence Center" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <IntelligenceCenterWorkspace />
      </ProtectedRoute>
    </AppLayout>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "health" | "insights";

type ChatMsg = {
  id:        string;
  role:      "user" | "ai";
  text:      string;
  timestamp: string;
  metrics?:  Record<string, unknown>;
  error?:    boolean;
};

type HealthAdvice = {
  riskLevel: "Low" | "Moderate" | "High" | "Severe";
  summary: string;
  outdoor: string;
  exercise: string;
  sensitiveGroups: string;
  masks: string;
  schools: string;
  elderly: string;
  children: string;
  generalPublic: string;
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function aqiLabel(aqi: number): string {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function aqiColor(aqi: number): string {
  if (aqi <= 50)  return "var(--color-success)";
  if (aqi <= 100) return "#A8C916";
  if (aqi <= 150) return "var(--color-warning)";
  if (aqi <= 200) return "#E07020";
  if (aqi <= 300) return "var(--color-destructive)";
  return "#8B008B";
}

function riskColor(r: number): string {
  if (r <= 30) return "var(--color-success)";
  if (r <= 60) return "var(--color-warning)";
  return "var(--color-destructive)";
}

function riskTone(lvl?: string): "destructive" | "warning" | "info" | "success" {
  return lvl === "Severe" ? "destructive" : lvl === "High" ? "warning" : lvl === "Moderate" ? "info" : "success";
}

// ─── Motion Variants ──────────────────────────────────────────────────────────

const MSG_IN = {
  hidden: { opacity: 0, y: 6, scale: 0.99 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: DUR_SM, ease: EASE_OUT } },
};

const TAB_IN = {
  hidden: { opacity: 0, y: 3 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_SM, ease: EASE_OUT } },
  exit:   { opacity: 0, y: -3, transition: { duration: DUR_XS } },
};

const CARD_STAGGER = (delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: delay } },
});

const CARD_IN = {
  hidden: { opacity: 0, y: 6, scale: 0.99 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: DUR_MD, ease: EASE_OUT } },
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="skeleton h-3.5 w-1/3 rounded-full" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn("skeleton h-2.5 rounded-full", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  loading,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: typeof TrendingUp;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2.5 border-b border-border/40">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary">{eyebrow}</div>
        <div className="flex items-center gap-2 mt-0.5 text-base sm:text-lg font-semibold text-foreground">
          {Icon && <Icon className="size-4 text-primary shrink-0" />}
          <span>{title}</span>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {action}
      </div>
    </div>
  );
}

// ─── AI Fallback & Thinking Indicator ─────────────────────────────────────────

function AIFallback({ onRetry, onExplore, onSwitchCity }: {
  onRetry: () => void;
  onExplore: () => void;
  onSwitchCity: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3.5 max-w-md mx-auto"
      role="status"
    >
      <div className="size-12 rounded-xl glass border border-border grid place-items-center">
        <Sparkles className="size-5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">AI Intelligence Service Offline</div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Environmental reasoning and contextual insights remain accessible while the AI assistant reconnects.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs aurora text-primary-foreground font-medium rounded-lg px-3.5 py-1.5 shadow-sm"
        >
          <RotateCcw className="size-3.5" /> Retry Connection
        </button>
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-1.5 text-xs glass text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 transition-colors border border-border/60"
        >
          <TrendingUp className="size-3.5" /> View Insights
        </button>
        <button
          onClick={onSwitchCity}
          className="inline-flex items-center gap-1.5 text-xs glass text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 transition-colors border border-border/60"
        >
          <Globe2 className="size-3.5" /> Switch City
        </button>
      </div>
    </motion.div>
  );
}

function ThinkingBubble({ reduced }: { reduced: boolean }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Understanding environmental query",
    "Synthesizing atmospheric context & sensor signals",
    "Formulating AI environmental reasoning",
  ];

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setStep((s) => (s + 1) % steps.length), 950);
    return () => clearInterval(t);
  }, [reduced, steps.length]);

  return (
    <motion.div variants={MSG_IN} initial="hidden" animate="show" className="flex gap-3 max-w-3xl">
      <div className="size-7 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0 mt-0.5 shadow-sm">
        <motion.div animate={reduced ? {} : { rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
          <Sparkles className="size-3.5" />
        </motion.div>
      </div>
      <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 space-y-1.5 border border-primary/20 shadow-sm" role="status" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-foreground">GreenGuard Intelligence is analyzing</span>
        </div>
        <div className="space-y-1 pt-0.5">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              className="flex items-center gap-2 text-xs text-muted-foreground"
              animate={reduced ? {} : { opacity: i <= step ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
            >
              {i < step ? (
                <CheckCircle className="size-3 text-[var(--color-success)] shrink-0" />
              ) : i === step ? (
                <Loader2 className={cn("size-3 shrink-0 text-primary", !reduced && "animate-spin")} />
              ) : (
                <div className="size-3 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span>{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chat Bubble Component ───────────────────────────────────────────────────

function ChatBubble({
  msg,
  onCopy,
  onReact,
  onRegenerate,
  reduced,
}: {
  msg: ChatMsg;
  onCopy: (t: string) => void;
  onReact: (id: string, r: "like" | "dislike") => void;
  onRegenerate?: () => void;
  reduced: boolean;
}) {
  const isUser = msg.role === "user";
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);

  const react = (r: "like" | "dislike") => {
    setReaction((prev) => (prev === r ? null : r));
    onReact(msg.id, r);
  };

  return (
    <motion.div
      variants={MSG_IN}
      initial="hidden"
      animate="show"
      className={cn("flex gap-3 group w-full", isUser ? "justify-end" : "justify-start")}
      role="article"
      aria-label={isUser ? "Your question" : "GreenGuard Intelligence response"}
    >
      {!isUser && (
        <div
          className={cn(
            "size-7 rounded-lg grid place-items-center text-primary-foreground shrink-0 mt-0.5 shadow-sm",
            msg.error ? "bg-[var(--color-destructive)]" : "aurora",
          )}
        >
          <Sparkles className="size-3.5" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5", isUser ? "items-end max-w-[85%] sm:max-w-[75%]" : "items-start max-w-[95%] sm:max-w-[88%]")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-3.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm font-medium"
              : msg.error
                ? "bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 rounded-tl-sm text-foreground"
                : "glass rounded-tl-sm text-foreground border border-border/70 shadow-sm",
          )}
        >
          <div className="whitespace-pre-wrap">{msg.text}</div>

          {msg.metrics && (
            <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
              {Object.entries(msg.metrics as Record<string, number | string>).map(([k, v]) => (
                <span
                  key={k}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono border border-border/30"
                >
                  <span className="font-semibold text-foreground">{k}:</span> {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Message Action Strip */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs text-muted-foreground",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-[10px] tabular-nums opacity-60 mr-1">{msg.timestamp}</span>
          <button
            onClick={() => onCopy(msg.text)}
            className="p-1 rounded-md hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Copy message"
            aria-label="Copy message"
          >
            <Copy className="size-3" />
          </button>
          {!isUser && !msg.error && (
            <>
              <button
                onClick={() => react("like")}
                aria-pressed={reaction === "like"}
                aria-label="Helpful"
                className={cn(
                  "p-1 rounded-md transition-colors",
                  reaction === "like"
                    ? "text-[var(--color-success)] bg-[var(--color-success)]/10"
                    : "hover:text-foreground hover:bg-muted/60",
                )}
              >
                <ThumbsUp className="size-3" />
              </button>
              <button
                onClick={() => react("dislike")}
                aria-pressed={reaction === "dislike"}
                aria-label="Not helpful"
                className={cn(
                  "p-1 rounded-md transition-colors",
                  reaction === "dislike"
                    ? "text-[var(--color-destructive)] bg-[var(--color-destructive)]/10"
                    : "hover:text-foreground hover:bg-muted/60",
                )}
              >
                <ThumbsDown className="size-3" />
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded-md hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Regenerate response"
                  aria-label="Regenerate"
                >
                  <RefreshCw className="size-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compact High-Efficiency Prompt Launcher ──────────────────────────────────

function CompactPromptLauncher({
  cityName,
  onPrompt,
}: {
  cityName: string;
  onPrompt: (promptText: string) => void;
}) {
  const quickQuestions = [
    { label: "What does today's AQI mean?", icon: Wind, prompt: `What does today's AQI mean for ${cityName}? Break down the main pollutants and their severity.` },
    { label: "Explain PM2.5 risk", icon: Activity, prompt: `Explain the current PM2.5 levels in ${cityName} and why fine particulate matter poses a biological health risk.` },
    { label: "What's affecting air quality?", icon: Search, prompt: `What specific meteorological, industrial, or vehicular factors are affecting air quality in ${cityName} today?` },
    { label: "Compare cities", icon: Layers, prompt: `Compare the environmental conditions of ${cityName} with other major regional cities.` },
    { label: "Summarize today", icon: FileText, prompt: `Provide a concise executive summary of today's environmental and air quality status for ${cityName}.` },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center max-w-4xl mx-auto w-full my-auto">
      {/* Compact AI Identity */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
        <Sparkles className="size-3" /> GreenGuard Intelligence · Powered by Gemini
      </div>

      {/* Main Heading */}
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
        What would you like to understand?
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">
        Ask GreenGuard anything about environmental telemetry, pollution patterns, health interpretations, or historical comparisons for <span className="font-medium text-foreground">{cityName}</span>.
      </p>

      {/* Compact Suggestion Chips Launcher */}
      <div className="mt-5 w-full">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
          Suggested questions
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {quickQuestions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPrompt(item.prompt)}
                className="glass rounded-xl px-3.5 py-2 border border-border/70 hover:border-primary/50 hover:bg-card/70 text-xs text-foreground font-medium transition-all flex items-center gap-2 group shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon className="size-3.5 text-primary/80 group-hover:text-primary transition-colors shrink-0" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Health Advisory Workspace ─────────────────────────────────────────

function HealthDashboard({
  city,
  isApiConnected,
  onAskHealth,
}: {
  city: { id: string; name: string; aqi: number; pm25: number; temp: number; risk: number };
  isApiConnected: boolean;
  onAskHealth: (query: string) => void;
}) {
  const qc = useQueryClient();
  const { data: healthData, isFetching: loading, refetch } = useQuery({
    queryKey: ["health-advice", city.id],
    queryFn:  () => copilotApi.healthAdvice(city.id).then((r) => r.data),
    staleTime: 60 * 60_000,
    throwOnError: false,
  });
  const health = healthData?.advice as HealthAdvice | undefined;

  // Derived safety scores
  const outdoorSafety = Math.max(0, 100 - city.aqi);
  const exerciseSafety = Math.max(0, 100 - city.pm25 * 1.5);
  const overallRisk = city.risk;

  const scoreColor = (v: number) =>
    v >= 70 ? "var(--color-success)" : v >= 40 ? "var(--color-warning)" : "var(--color-destructive)";

  function ScoreGauge({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
    const color = scoreColor(value);
    return (
      <div className="glass rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-1 mt-2 mb-2">
          <span className="text-3xl sm:text-4xl font-bold tabular-nums" style={{ color }}>
            {value}
          </span>
          <span className="text-xs text-muted-foreground">/{max}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="AI Health Advisor"
        title={`Health Impact & Population Advisory · ${city.name}`}
        subtitle="AI-interpreted biological health risks, exposure limits, and sensitive-group recommendations based on live air quality."
        icon={Heart}
        action={
          <button
            onClick={() => {
              qc.removeQueries({ queryKey: ["health-advice", city.id] });
              refetch();
            }}
            disabled={loading || !isApiConnected}
            className="inline-flex items-center gap-1.5 text-xs glass px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 border border-border/60"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} /> Refresh Analysis
          </button>
        }
      />

      <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={CARD_IN}>
          <ScoreGauge label="Outdoor Safety Index" value={Math.round(outdoorSafety)} />
        </motion.div>
        <motion.div variants={CARD_IN}>
          <ScoreGauge label="Exercise & Exertion Safety" value={Math.round(Math.max(0, exerciseSafety))} />
        </motion.div>
        <motion.div variants={CARD_IN}>
          <div className="glass rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground">Overall Environmental Risk</div>
            <div className="flex items-baseline gap-1 mt-2 mb-2">
              <span className="text-3xl sm:text-4xl font-bold tabular-nums" style={{ color: riskColor(overallRisk) }}>
                {overallRisk}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: riskColor(overallRisk) }}
                initial={{ width: 0 }}
                animate={{ width: `${overallRisk}%` }}
                transition={{ duration: 0.8, ease: EASE_OUT }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {!health ? (
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 text-center max-w-md mx-auto my-6 shadow-sm">
          <Heart className="size-10 text-primary/80" />
          <div>
            <div className="text-sm font-semibold text-foreground">Generate AI Health Evaluation</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Synthesize biological risk guidelines based on current AQI ({city.aqi}), PM2.5 ({city.pm25} µg/m³), and temperature ({city.temp}°C).
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={loading || !isApiConnected}
            className="aurora text-primary-foreground font-medium rounded-lg px-5 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-60 shadow-sm"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {loading ? "Synthesizing Guidelines…" : "Analyze Health Impact"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 sm:p-5 border border-border/70 shadow-sm" style={{ borderTop: `2px solid ${riskColor(city.risk)}` }}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assessed Risk:</span>
                <span className="font-semibold text-foreground text-sm sm:text-base">{health.riskLevel} Risk</span>
              </div>
              <Pill tone={riskTone(health.riskLevel)}>{health.riskLevel}</Pill>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{health.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sensitive Groups Card */}
            <div className="glass rounded-xl p-4 sm:p-5 border border-border/70 shadow-sm" style={{ borderTop: "2px solid var(--color-warning)" }}>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Heart className="size-3.5 text-warning" /> Vulnerable & Sensitive Populations
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Children & Youth",       emoji: "👶", value: health.children },
                  { label: "Elderly Citizens",        emoji: "👴", value: health.elderly },
                  { label: "Respiratory Patients",    emoji: "🫁", value: health.sensitiveGroups },
                  { label: "Schools & Campuses",      emoji: "🏫", value: health.schools },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col justify-between">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      {item.emoji} {item.label}
                    </div>
                    <div className="text-xs text-foreground leading-relaxed">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations Card */}
            <div className="glass rounded-xl p-4 sm:p-5 border border-border/70 shadow-sm" style={{ borderTop: "2px solid var(--color-success)" }}>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" /> Activity & Exposure Precautions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Outdoor Exposure", emoji: "🌿", value: health.outdoor },
                  { label: "Exercise & Sports", emoji: "🏃", value: health.exercise },
                  { label: "Mask Guidance",    emoji: "😷", value: health.masks },
                  { label: "General Public",   emoji: "👥", value: health.generalPublic },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col justify-between">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      {item.emoji} {item.label}
                    </div>
                    <div className="text-xs text-foreground leading-relaxed">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt Assistant for Health Questions */}
          <div className="glass rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border border-primary/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0 shadow-sm">
                <Sparkles className="size-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-foreground">Need personalized health guidance?</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">Ask the AI assistant for tailored medical exposure or lifestyle recommendations.</div>
              </div>
            </div>
            <button
              onClick={() => onAskHealth(`What detailed health and air quality precautions should residents of ${city.name} take right now?`)}
              className="inline-flex items-center gap-1.5 text-xs aurora text-primary-foreground font-semibold rounded-lg px-3.5 py-1.5 whitespace-nowrap shadow-sm"
            >
              <Sparkles className="size-3.5" /> Ask Health Assistant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 3: Insights — Findings, Trends & Comparisons ─────────────────────────
// Absorbs the former standalone "Intelligence" tab (trend/risk/sustainability/
// hotspot/comparison signals) so the product has three primary destinations
// (Assistant · Health · Insights) instead of four. All API calls/queries below
// are unchanged from the prior Intelligence + Insights tabs — only the layout
// and fallback content changed. No fabricated data: every field only renders
// when the corresponding query actually returned it.

function InsightsWorkspace({
  city,
  isApiConnected,
  onExplainInsight,
}: {
  city: { id: string; name: string; aqi: number; pm25: number; temp: number; risk: number; eco: number };
  isApiConnected: boolean;
  onExplainInsight: (prompt: string) => void;
}) {
  const { cities } = useCity();
  const [compareA, setCompareA] = useState(city.id);
  const [compareB, setCompareB] = useState(cities.find((c) => c.id !== city.id)?.id ?? city.id);
  const opts = { enabled: isApiConnected, staleTime: 5 * 60_000, throwOnError: false as const };

  const { data: rawInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ["copilot-insights", city.id],
    queryFn: () => copilotApi.getInsights(city.id).then((r: any) => r?.data?.insights ?? r?.insights ?? []),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
  const aqiTrend  = useQuery({ queryKey: ["intel-aqi",     city.id], queryFn: () => intelligenceApi.getAQITrend(city.id).then((r: any) => r?.data?.data ?? r?.data),       ...opts });
  const hotspots  = useQuery({ queryKey: ["intel-hotspot", city.id], queryFn: () => intelligenceApi.getHotspotAnalysis(city.id).then((r: any) => r?.data?.data ?? r?.data),        ...opts });
  const risk      = useQuery({ queryKey: ["intel-risk",    city.id], queryFn: () => intelligenceApi.getRiskAnalysis(city.id).then((r: any) => r?.data?.data ?? r?.data),     ...opts });
  const sustain   = useQuery({ queryKey: ["intel-sustain", city.id], queryFn: () => intelligenceApi.getSustainabilityRecommendations(city.id).then((r: any) => r?.data?.data ?? r?.data),   ...opts });
  const executive = useQuery({ queryKey: ["intel-exec"],              queryFn: () => intelligenceApi.getExecutiveInsights().then((r: any) => r?.data?.data ?? r?.data),        ...opts });
  const compare   = useQuery({
    queryKey: ["intel-compare", compareA, compareB],
    queryFn:  () => intelligenceApi.getCityComparison([compareA, compareB]).then((r: any) => r?.data?.data ?? r?.data),
    enabled: isApiConnected && compareA !== compareB,
    staleTime: 5 * 60_000,
    throwOnError: false,
  });

  const explain = (label: string, data: unknown) =>
    onExplainInsight(`Explain the ${label} for ${city.name} with contextual reasoning: ${JSON.stringify(data).slice(0, 400)}`);

  // Only real, AI-returned insights are rendered — no invented findings.
  const insightCards: InsightCardData[] = useMemo(() => {
    if (Array.isArray(rawInsights) && rawInsights.length > 0) {
      return rawInsights.map((ins: any, idx: number) => ({
        type: (ins.type ?? (idx % 2 === 0 ? "finding" : "summary")) as InsightCardData["type"],
        title: ins.title ?? ins.headline ?? `Environmental Pattern #${idx + 1}`,
        body: ins.body ?? ins.description ?? ins.content ?? "",
        score: ins.confidence ? Math.round(ins.confidence * 100) : undefined,
      }));
    }
    return [];
  }, [rawInsights]);

  const loading = insightsLoading || aqiTrend.isLoading || risk.isLoading;
  const hasAnyFinding =
    insightCards.length > 0 || !!aqiTrend.data || !!hotspots.data || !!risk.data || !!sustain.data || !!executive.data;

  if (!isApiConnected) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 text-center max-w-md mx-auto my-8">
        <Sparkles className="size-8 text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold">Insights Engine Offline</div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Start the backend server and configure GEMINI_API_KEY to activate AI environmental reasoning.
          </p>
        </div>
      </div>
    );
  }

  const FindingCard = ({
    eyebrow, title, accent, icon: Icon, onExplainClick, loading: cardLoading, empty, children,
  }: {
    eyebrow: string; title: string; accent: string; icon?: typeof TrendingUp;
    onExplainClick?: () => void; loading?: boolean; empty?: boolean; children?: React.ReactNode;
  }) => (
    <motion.div variants={CARD_IN} className="rounded-xl border border-border/70 glass shadow-sm p-4 sm:p-5 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: accent }}>{eyebrow}</span>
          {Icon && <Icon className="size-4" style={{ color: accent }} />}
        </div>
        <div className="text-sm font-semibold text-foreground mb-2">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
          {cardLoading ? <SkeletonCard lines={2} /> : empty ? <p>No data available yet for this signal.</p> : children}
        </div>
      </div>
      {onExplainClick && !cardLoading && !empty && (
        <button onClick={onExplainClick} className="self-start inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          <Sparkles className="size-3" /> Explain with AI <ChevronRight className="size-3" />
        </button>
      )}
    </motion.div>
  );

  const priorityTitle = insightCards[0]?.title ?? (risk.data ? "Environmental Risk Analysis" : aqiTrend.data ? "AQI Trend & Trajectory" : null);
  const priorityBody =
    insightCards[0]?.body ??
    (risk.data as any)?.summary ?? (risk.data as any)?.riskSummary ??
    (aqiTrend.data as any)?.trendSummary ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="AI Insights"
        title={`Environmental Findings & Trends · ${city.name}`}
        subtitle="What's changing, why it matters, and how it compares."
        icon={Lightbulb}
        loading={loading}
      />

      {/* Priority finding */}
      {priorityTitle && priorityBody ? (
        <motion.div
          variants={CARD_IN} initial="hidden" animate="show"
          className="rounded-xl border border-primary/25 glass shadow-sm p-4 sm:p-5"
          style={{ borderTop: "2px solid var(--color-primary)" }}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-primary mb-1.5">
            <Sparkles className="size-3" /> Priority Finding
          </div>
          <div className="text-sm sm:text-base font-semibold text-foreground mb-1.5">{priorityTitle}</div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{priorityBody}</p>
          <button
            onClick={() => onExplainInsight(`Explain why this matters for ${city.name}: "${priorityTitle}" — ${priorityBody}`)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs aurora text-primary-foreground font-medium rounded-lg px-3.5 py-1.5 shadow-sm"
          >
            <Sparkles className="size-3" /> Explain with AI
          </button>
        </motion.div>
      ) : !hasAnyFinding && !loading ? (
        <div className="glass rounded-xl p-6 text-center text-xs text-muted-foreground border border-border/60">
          No environmental findings are available for {city.name} yet. Check back once today's analysis completes.
        </div>
      ) : null}

      {/* Supporting findings */}
      <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <FindingCard eyebrow="Trend" title="Air Quality Trend" accent="var(--color-primary)" icon={Wind} loading={aqiTrend.isLoading} empty={!aqiTrend.data} onExplainClick={() => explain("AQI trend trajectory", aqiTrend.data)}>
          {aqiTrend.data && (
            <>
              <div className="font-medium text-foreground">Direction: {(aqiTrend.data as any)?.trendDirection ?? "—"}</div>
              {((aqiTrend.data as any)?.keyObservations ?? []).slice(0, 2).map((o: string, i: number) => (
                <p key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span>{o}</span></p>
              ))}
            </>
          )}
        </FindingCard>

        <FindingCard eyebrow="Risk" title="Environmental Risk" accent="var(--color-warning)" icon={ShieldCheck} loading={risk.isLoading} empty={!risk.data} onExplainClick={() => explain("risk analysis", risk.data)}>
          {risk.data && <p className="font-medium text-foreground">{(risk.data as any)?.summary ?? (risk.data as any)?.riskSummary}</p>}
        </FindingCard>

        <FindingCard eyebrow="Sustainability" title="EcoScore & Sustainability" accent="var(--color-success)" icon={Leaf} loading={sustain.isLoading} empty={!sustain.data} onExplainClick={() => explain("sustainability index", sustain.data)}>
          {sustain.data && <p>{(sustain.data as any)?.summary ?? (sustain.data as any)?.aiExplanation}</p>}
        </FindingCard>

        <FindingCard eyebrow="Anomalies" title="Hotspots & High-Risk Zones" accent="var(--color-destructive)" icon={AlertTriangle} loading={hotspots.isLoading} empty={!hotspots.data} onExplainClick={() => explain("pollution hotspots", hotspots.data)}>
          {((hotspots.data as any)?.hotspots ?? (hotspots.data as any)?.highRiskZones ?? []).slice(0, 3).map((z: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
              <span className="font-medium text-foreground">{z.name ?? z.zone ?? `Zone ${i + 1}`}</span>
              {z.severity && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in oklab, var(--color-destructive) 12%, transparent)", color: "var(--color-destructive)" }}>
                  {z.severity}
                </span>
              )}
            </div>
          ))}
        </FindingCard>

        <FindingCard eyebrow="Priorities" title="City-Wide Focus Areas" accent="var(--color-primary)" icon={BarChart3} loading={executive.isLoading} empty={!executive.data} onExplainClick={() => explain("executive priorities", executive.data)}>
          {((executive.data as any)?.topPriorities ?? (executive.data as any)?.priorities ?? []).slice(0, 2).map((p: any, i: number) => (
            <p key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span>{p.priority ?? p.title}</span></p>
          ))}
        </FindingCard>

        {/* Comparison tool */}
        <div className="rounded-xl border border-border/70 glass shadow-sm p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-info)]">Compare</span>
              <Globe2 className="size-4 text-[var(--color-info)]" />
            </div>
            <div className="text-sm font-semibold text-foreground mb-2.5">City-to-City Comparison</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="bg-muted/40 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors">
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="bg-muted/40 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors">
                {cities.filter((c) => c.id !== compareA).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {compare.isLoading ? (
              <SkeletonCard lines={2} />
            ) : compare.data ? (
              <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                {["airQuality", "health", "sustainability"].map((k) => {
                  const d = (compare.data as any)[k] ?? (compare.data as any)[`${k}Comparison`];
                  if (!d) return null;
                  return (
                    <p key={k} className="flex items-start gap-1.5">
                      <span className="text-primary font-medium capitalize">{k}:</span>
                      <span>{typeof d === "string" ? d : d?.summary ?? ""}</span>
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select two different cities to compare.</p>
            )}
          </div>
          {compare.data && (
            <button
              onClick={() =>
                onExplainInsight(
                  `Explain the environmental comparison between ${cities.find((c) => c.id === compareA)?.name} and ${cities.find((c) => c.id === compareB)?.name}: ${JSON.stringify(compare.data).slice(0, 350)}`,
                )
              }
              className="self-start inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Sparkles className="size-3" /> Compare in Assistant <ChevronRight className="size-3" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Additional AI-authored findings, when the assistant returned more than one */}
      {insightCards.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insightCards.slice(1).map((card, index) => (
            <div key={card.title} className="flex flex-col justify-between space-y-3">
              <InsightCard card={card} index={index} />
              <button
                onClick={() => onExplainInsight(`Explain why this matters for ${city.name}: "${card.title}" — ${card.body}`)}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors px-1"
              >
                <Sparkles className="size-3" /> Explain with AI <ChevronRight className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Full-Viewport Workspace Component ───────────────────────────────────

function IntelligenceCenterWorkspace() {
  const { t } = useTranslation("copilot");
  const { city, cities, isApiConnected, setCityId } = useCity();
  const { user } = useAuth();
  const reduced = useReducedMotion() ?? false;

  const [tab, setTab] = useState<Tab>("chat");
  const [wsTab, setWsTab] = useState<WorkspaceTab>("chat");
  const [question, setQuestion] = useState("");
  const [inputFocused, setFocused] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [copyFeedback, setCopy] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [lastUserText, setLastUserText] = useState("");

  const msgIdRef = useRef(0);
  const nextId   = () => String(++msgIdRef.current);
  const now      = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const initMsg: ChatMsg = {
    id: "0",
    role: "ai",
    text: `Hello${user ? ` ${user.name.split(" ")[0]}` : ""}! I am GreenGuard Intelligence, your environmental reasoning assistant for ${city.name}. Ask me about air quality trends, health interpretations, or comparisons.`,
    timestamp: now(),
  };
  const [messages, setMessages] = useState<ChatMsg[]>([initMsg]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const hasMessages = messages.length > 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (near) {
      setAtBottom(true);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setAtBottom(false);
    }
  }, [messages]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  }, []);

  const chatMutation = useMutation({
    mutationFn: (q: string) => copilotApi.chat(q, city.id, sessionId).then((r) => r.data),
    onSuccess: (data) => {
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((h) => [
        ...h,
        {
          id: nextId(),
          role: "ai",
          text: data.answer || "No response received from environmental intelligence engine.",
          timestamp: now(),
          metrics: data.metrics,
        },
      ]);
      setQuestion("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    },
    onError: () => {
      setMessages((h) => [
        ...h,
        {
          id: nextId(),
          role: "ai",
          text: isApiConnected
            ? "AI service temporarily unavailable. Environmental telemetry and intelligence remain active."
            : "Backend API required. Please verify server connection and GEMINI_API_KEY.",
          timestamp: now(),
          error: true,
        },
      ]);
    },
  });

  const handleSend = useCallback(() => {
    const q = question.trim();
    if (!q || chatMutation.isPending) return;
    setLastUserText(q);
    setMessages((h) => [...h, { id: nextId(), role: "user", text: q, timestamp: now() }]);
    setAtBottom(true);
    chatMutation.mutate(q);
  }, [question, chatMutation]);

  const handleRegenerate = useCallback(() => {
    if (!lastUserText || chatMutation.isPending) return;
    setMessages((h) => {
      const i = [...h].reverse().findIndex((m) => m.role === "ai");
      return i === -1 ? h : h.slice(0, h.length - 1 - i);
    });
    chatMutation.mutate(lastUserText);
  }, [lastUserText, chatMutation]);

  const handlePrompt = useCallback((promptText: string) => {
    setQuestion(promptText);
    setTab("chat");
    setWsTab("chat");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopy(true);
    setTimeout(() => setCopy(false), 2000);
  }, []);

  return (
    <div className="w-full h-[calc(100dvh-4rem-2rem)] flex flex-col overflow-hidden bg-background">
      {/* Copy Toast */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 right-6 z-50 glass rounded-lg px-3.5 py-2 text-xs font-medium border border-primary/30 shadow-lg pointer-events-none"
            role="status"
            aria-live="polite"
          >
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. FULL-WIDTH CONTEXTUAL HEADER ─────────────────────────────────── */}
      <header className="w-full px-4 sm:px-6 py-2.5 border-b border-border/60 bg-background/80 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 z-10">
        {/* Left Identity */}
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl aurora grid place-items-center text-primary-foreground shadow-sm shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                <span>🌍</span>
                <span className="text-aurora">{t("title") || "GreenGuard Intelligence Center"}</span>
              </h1>
              <Pill tone={isApiConnected ? "success" : "warning"}>
                <span className="size-1.5 rounded-full bg-current animate-pulse mr-1" />
                {isApiConnected ? "Gemini 2.5 Flash" : "Offline"}
              </Pill>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Dedicated environmental AI workspace for analysis, reasoning, and interpretations.
            </p>
          </div>
        </div>

        {/* Right: Compact Environmental Context & City Selector */}
        <div className="flex items-center flex-wrap gap-2 justify-end">
          {/* Compact context line — full detail lives in Health/Insights, not repeated here */}
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 glass border border-border/60 text-xs shadow-none">
            <div className="size-2 rounded-full shrink-0" style={{ background: aqiColor(city.aqi) }} />
            <span className="font-semibold tabular-nums text-foreground">AQI {city.aqi}</span>
            <span className="text-muted-foreground">({aqiLabel(city.aqi)})</span>
            <span className="hidden sm:inline text-muted-foreground">·</span>
            <span className="hidden sm:inline text-muted-foreground tabular-nums">{city.temp}°C</span>
          </div>

          {/* City Switcher */}
          <div className="flex items-center gap-1.5 glass rounded-lg px-2.5 py-1 border border-border/70">
            <MapPin className="size-3 text-primary shrink-0" />
            <select
              value={city.id}
              onChange={(e) => setCityId(e.target.value)}
              className="text-xs bg-transparent text-foreground font-semibold outline-none cursor-pointer pr-1"
              aria-label="Select city for AI workspace"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id} className="bg-popover text-foreground">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ── 2. FULL-WIDTH WORKSPACE NAVIGATION & TOOLBAR ─────────────────────── */}
      <div className="w-full px-4 sm:px-6 py-1.5 border-b border-border/50 bg-muted/20 shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none z-10">
        {/* Main Workspace Navigation */}
        <div className="flex items-center gap-1 shrink-0" role="tablist" aria-label="Intelligence Center tabs">
          {([
            { id: "chat",     label: "Assistant", icon: MessageSquare },
            { id: "health",   label: "Health",    icon: Heart },
            { id: "insights", label: "Insights",  icon: Lightbulb },
          ] as const).map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tabItem.id}`}
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 shrink-0",
                  isActive
                    ? "text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={reduced ? undefined : "workspace-tab-active-pill"}
                    className="absolute inset-0 rounded-lg aurora"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className={cn("size-3.5 relative z-10", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="relative z-10">{tabItem.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side tools when on Assistant tab */}
        {tab === "chat" && (
          <div className="flex items-center gap-2 shrink-0">
            <WorkspaceTabs active={wsTab} onChange={setWsTab} />
            {wsTab === "chat" && hasMessages && (
              <button
                onClick={() => {
                  setMessages([{ ...initMsg, id: nextId() }]);
                  setSessionId(undefined);
                  setLastUserText("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-muted/60 transition-colors border border-border/40"
                title="Start new conversation"
              >
                <RefreshCw className="size-3" />
                <span className="hidden md:inline">New chat</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 3. FULL-VIEWPORT WORKSPACE CONTENT AREA ────────────────────────── */}
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* ── TAB 1: ASSISTANT WORKSPACE ── */}
          {tab === "chat" && (
            <motion.div
              key="chat-workspace"
              id="tabpanel-chat"
              role="tabpanel"
              variants={TAB_IN}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex-1 min-h-0 w-full flex flex-col overflow-hidden"
            >
              {/* Chat Mode */}
              {wsTab === "chat" && (
                <>
                  {/* Message Stream */}
                  <div
                    ref={scrollRef}
                    className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 lg:px-12 py-5 space-y-6"
                    aria-live="polite"
                    aria-label="Conversation with GreenGuard Intelligence"
                    onScroll={() => {
                      const el = scrollRef.current;
                      if (!el) return;
                      setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
                    }}
                  >
                    {!hasMessages && !chatMutation.isPending ? (
                      chatMutation.isError ? (
                        <AIFallback
                          onRetry={() => chatMutation.mutate(lastUserText)}
                          onExplore={() => setTab("insights")}
                          onSwitchCity={() => {}}
                        />
                      ) : (
                        <CompactPromptLauncher cityName={city.name} onPrompt={handlePrompt} />
                      )
                    ) : (
                      <div className="space-y-6 w-full max-w-[92%] sm:max-w-[88%] lg:max-w-[84%] mx-auto">
                        {messages.map((m, i) => {
                          const isLastAi = m.role === "ai" && i === messages.length - 1 && !chatMutation.isPending;
                          return (
                            <ChatBubble
                              key={m.id}
                              msg={m}
                              onCopy={handleCopy}
                              onReact={() => {}}
                              onRegenerate={isLastAi && lastUserText ? handleRegenerate : undefined}
                              reduced={reduced}
                            />
                          );
                        })}
                        {chatMutation.isPending && <ThinkingBubble reduced={reduced} />}
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Jump to latest floating pill */}
                  <AnimatePresence>
                    {!atBottom && hasMessages && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
                      >
                        <button
                          onClick={() => {
                            setAtBottom(true);
                            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs glass rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground transition-colors border border-border shadow-lg"
                        >
                          <ArrowDown className="size-3" /> Jump to latest
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Wide Anchored Bottom AI Composer (75-90% width) */}
                  <div className="w-full px-4 sm:px-8 lg:px-12 py-3 border-t border-border/60 bg-background/90 backdrop-blur-md shrink-0">
                    <div className="w-full max-w-[92%] sm:max-w-[88%] lg:max-w-[84%] mx-auto">
                      <div
                        className={cn(
                          "flex items-end gap-2 rounded-2xl border transition-all duration-200 bg-background/80 p-1.5 shadow-sm",
                          inputFocused
                            ? "border-primary shadow-[var(--shadow-glow)]"
                            : "border-border/80 hover:border-primary/40",
                        )}
                      >
                        <textarea
                          ref={inputRef}
                          rows={1}
                          placeholder={`Ask GreenGuard anything about air quality, health risks, or environmental trends in ${city.name}…`}
                          aria-label="Ask GreenGuard Intelligence"
                          className="flex-1 bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/60 px-3.5 py-2 leading-relaxed"
                          style={{ minHeight: "2.6rem", maxHeight: "180px" }}
                          value={question}
                          onChange={handleInput}
                          onFocus={() => setFocused(true)}
                          onBlur={() => setFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                        />
                        <button
                          onClick={handleSend}
                          disabled={chatMutation.isPending || !question.trim()}
                          aria-label="Send message"
                          className="aurora text-primary-foreground font-semibold rounded-xl p-2.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                        >
                          {chatMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 mt-1 px-2">
                        <span>Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Enter ↵</kbd> to ask · <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Shift + Enter</kbd> for newline</span>
                        <span className="hidden sm:inline">Active Context: {city.name}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Multimodal Sub-Workspaces (Docs, Images, Data) */}
              {wsTab === "documents" && (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6" id="ws-panel-documents" role="tabpanel">
                  <DocumentWorkspace
                    cityId={city.id}
                    onAskAI={(p) => {
                      setWsTab("chat");
                      handlePrompt(p);
                    }}
                  />
                </div>
              )}
              {wsTab === "images" && (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6" id="ws-panel-images" role="tabpanel">
                  <ImageWorkspace
                    cityId={city.id}
                    onAskAI={(p) => {
                      setWsTab("chat");
                      handlePrompt(p);
                    }}
                  />
                </div>
              )}
              {wsTab === "data" && (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6" id="ws-panel-data" role="tabpanel">
                  <DataWorkspace
                    cityId={city.id}
                    onAskAI={(p) => {
                      setWsTab("chat");
                      handlePrompt(p);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB 2: HEALTH ── */}
          {tab === "health" && (
            <motion.div
              key="health-workspace"
              id="tabpanel-health"
              role="tabpanel"
              variants={TAB_IN}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex-1 min-h-0 w-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-5"
            >
              <HealthDashboard city={city} isApiConnected={isApiConnected} onAskHealth={handlePrompt} />
            </motion.div>
          )}

          {/* ── TAB 3: INSIGHTS ── */}
          {tab === "insights" && (
            <motion.div
              key="insights-workspace"
              id="tabpanel-insights"
              role="tabpanel"
              variants={TAB_IN}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex-1 min-h-0 w-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-5"
            >
              <InsightsWorkspace city={city} isApiConnected={isApiConnected} onExplainInsight={handlePrompt} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
