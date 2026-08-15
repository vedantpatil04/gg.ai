/**
 * GreenGuard Intelligence Center v2.0 — Phase 6
 * Advanced Command Center UI + Hierarchy
 *
 * Layout hierarchy:
 *  1. Live telemetry header
 *  2. Recommendation chips
 *  3. Main navigation tabs (Assistant / Intelligence / Health / Actions)
 *  4. Context panel (city, AQI, temp, risk)
 *  5. Workspace content  (70%)
 *  6. Side intelligence rail (30%)
 *
 * Phase 6 upgrades:
 *  - Full layout hierarchy restructure
 *  - Graceful AI fallback: quota/error → "temporarily unavailable" + retry
 *  - Intelligence tab dashboard: 3-row card grid with skeleton loaders
 *  - Health tab: risk score, safety scores, sensitive groups, recommendations
 *  - Actions tab: citizen + government expandable action cards
 *  - Right sidebar: AI status, alerts, quick actions, weather, city ranking
 *  - Glassmorphism, aurora gradients, animated borders, glow effects throughout
 *
 * No backend changes. All APIs preserved. No new dependencies.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Pill } from "@/components/ui-bits";
import { RECOMMENDATIONS, ALERTS, CITIES } from "@/lib/mock-data";
import {
  Sparkles, ShieldAlert, Leaf, Send, TrendingUp, Lightbulb,
  Loader2, Heart, Wind, Droplets, AlertTriangle, ChevronRight,
  Activity, Thermometer, Eye, Copy, RefreshCw, CheckCircle,
  MessageSquare, Zap, ThumbsUp, ThumbsDown, ArrowDown,
  ChevronDown, ChevronUp, MapPin, RotateCcw, Globe2,
  Car, Factory, Megaphone, Waves, Users, Shield,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { copilotApi, alertApi } from "@/lib/api/services.api";
import { intelligenceApi } from "@/lib/api/environmental.api";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/intelligence/workspace-tabs";
import { DocumentWorkspace } from "@/components/intelligence/document-workspace";
import { ImageWorkspace }    from "@/components/intelligence/image-workspace";
import { DataWorkspace }     from "@/components/intelligence/data-workspace";
import { RecentWorkspace }   from "@/components/intelligence/recent-workspace";
import { AnalysisHistory, type WorkspaceHistoryEntry } from "@/components/intelligence/analysis-history";
import { WorkspaceStats }    from "@/components/intelligence/workspace-stats";
import { InsightCard, deriveInsightCards } from "@/components/intelligence/insight-card";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FADE_UP, STAGGER, HOVER_LIFT_SM, TAP_PRESS,
  EASE_OUT, DUR_SM, DUR_MD, DUR_LG, DUR_XS,
} from "@/lib/motion";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "GreenGuard Intelligence Center" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <IntelligenceCenter />
      </ProtectedRoute>
    </AppLayout>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "chat" | "intelligence" | "health" | "actions";

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
  outdoor: string; exercise: string; sensitiveGroups: string;
  masks: string; schools: string; elderly: string;
  children: string; generalPublic: string;
};

// ─── AQI helpers ─────────────────────────────────────────────────────────────

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

// ─── Prompt categories ────────────────────────────────────────────────────────

const PROMPT_CATEGORIES = [
  { label: "Explain",     color: "var(--color-primary)",     prompts: ["What does AQI mean?", "Explain PM2.5 health risks", "What is the EcoScore?"] },
  { label: "Investigate", color: "var(--color-destructive)", prompts: ["Why did AQI worsen today?", "What's causing pollution here?", "What may affect water quality?"] },
  { label: "Compare",     color: "var(--color-info)",        prompts: ["Compare AQI vs WHO limits", "Is air quality better than yesterday?", "How does our city rank?"] },
  { label: "Summarize",   color: "var(--color-success)",     prompts: ["Summarize today's status", "Give me a weekly air brief", "What are the key risks today?"] },
  { label: "Recommend",   color: "var(--color-warning)",     prompts: ["What should children do today?", "Is it safe to exercise outside?", "What actions reduce AQI fastest?"] },
] as const;

const QUICK_ACTIONS = [
  { id: "summary",  emoji: "🌍", label: "Env. Summary",  prompt: (c: string) => `Give me an environmental summary for ${c} right now.` },
  { id: "aqi",      emoji: "💨", label: "AQI Insights",  prompt: (c: string) => `Explain today's AQI of ${c} and health implications.` },
  { id: "health",   emoji: "🩺", label: "Health Advice", prompt: (c: string) => `What health precautions should residents of ${c} take today?` },
  { id: "compare",  emoji: "📊", label: "Compare Cities",prompt: () => "Compare environmental conditions of major Indian cities." },
  { id: "sustain",  emoji: "🌱", label: "Sustainability", prompt: (c: string) => `What sustainability actions would reduce pollution in ${c}?` },
] as const;

// ─── Motion variants ──────────────────────────────────────────────────────────

const MSG_IN = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: DUR_SM, ease: EASE_OUT } },
};
const TAB_IN = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_SM, ease: EASE_OUT } },
  exit:   { opacity: 0, y: -4, transition: { duration: DUR_XS } },
};
const CARD_STAGGER = (delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
});
const CARD_IN = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: DUR_MD, ease: EASE_OUT } },
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function GlassCard({ children, className, accent, ...props }: {
  children: React.ReactNode; className?: string; accent?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass rounded-2xl overflow-hidden", className)}
      style={accent ? { borderTop: `2px solid ${accent}` } : {}}
      {...props}
    >
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title, icon: Icon, loading }: {
  eyebrow: string; title: string; icon?: typeof TrendingUp; loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
        <div className={cn("flex items-center gap-2 mt-0.5 text-base font-semibold", Icon && "mt-1")}>
          {Icon && <Icon className="size-4 text-primary" />}
          {title}
        </div>
      </div>
      {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="skeleton h-3 w-1/3 rounded-full" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn("skeleton h-2.5 rounded-full", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2 glass border border-border/50">
      <div className="size-2 rounded-full shrink-0" style={{ background: color }} />
      <div className="text-xs">
        <span className="text-muted-foreground">{label} </span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
    </div>
  );
}

// AI Fallback — shown when API is offline or quota exceeded
function AIFallback({ onRetry, onExplore, onSwitchCity }: {
  onRetry: () => void; onExplore: () => void; onSwitchCity: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 px-6 text-center gap-4"
      role="status"
    >
      <div className="size-12 rounded-2xl glass border border-border grid place-items-center">
        <Sparkles className="size-5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-semibold">AI service temporarily unavailable</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          Environmental insights and intelligence data remain accessible while the AI assistant reconnects.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs aurora text-primary-foreground rounded-lg px-3 py-2">
          <RotateCcw className="size-3" /> Retry
        </button>
        <button onClick={onExplore} className="inline-flex items-center gap-1.5 text-xs glass text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 transition-colors">
          <TrendingUp className="size-3" /> Explore Intelligence
        </button>
        <button onClick={onSwitchCity} className="inline-flex items-center gap-1.5 text-xs glass text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 transition-colors">
          <Globe2 className="size-3" /> Switch City
        </button>
      </div>
    </motion.div>
  );
}

// Typing animation bubble
function ThinkingBubble({ reduced }: { reduced: boolean }) {
  const [step, setStep] = useState(0);
  const steps = ["Understanding your question", "Reviewing environmental context", "Preparing response"];
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 900);
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <motion.div variants={MSG_IN} initial="hidden" animate="show" className="flex gap-3">
      <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
        <motion.div animate={reduced ? {} : { rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
          <Sparkles className="size-3.5" />
        </motion.div>
      </div>
      <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3 space-y-1.5" role="status" aria-live="polite">
        <div className="text-xs font-medium text-muted-foreground">GreenGuard Intelligence is analyzing</div>
        {steps.map((s, i) => (
          <motion.div key={s} className="flex items-center gap-2 text-xs text-muted-foreground"
            animate={reduced ? {} : { opacity: i <= step ? 1 : 0.3 }} transition={{ duration: 0.3 }}>
            {i < step  ? <CheckCircle className="size-3 text-[var(--color-success)] shrink-0" />
            : i === step ? <Loader2 className={cn("size-3 shrink-0", !reduced && "animate-spin")} />
            : <div className="size-3 rounded-full border border-muted-foreground/30 shrink-0" />}
            {s}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Chat bubble with copy / like / dislike / regenerate
function ChatBubble({ msg, onCopy, onReact, onRegenerate, reduced }: {
  msg: ChatMsg; onCopy: (t: string) => void;
  onReact: (id: string, r: "like" | "dislike") => void;
  onRegenerate?: () => void; reduced: boolean;
}) {
  const isUser = msg.role === "user";
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const react = (r: "like" | "dislike") => { setReaction(prev => prev === r ? null : r); onReact(msg.id, r); };
  return (
    <motion.div variants={MSG_IN} initial="hidden" animate="show"
      className={cn("flex gap-3 group", isUser ? "justify-end" : "justify-start")}
      role="article" aria-label={isUser ? "Your message" : "GreenGuard Intelligence response"}
    >
      {!isUser && (
        <div className={cn("size-8 rounded-lg grid place-items-center text-primary-foreground shrink-0 mt-0.5",
          msg.error ? "bg-[var(--color-destructive)]" : "aurora")}>
          <Sparkles className="size-3.5" />
        </div>
      )}
      <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start", "max-w-[85%]")}>
        <div className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "glass rounded-tr-sm"
          : msg.error ? "bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 rounded-tl-sm text-muted-foreground"
          : "bg-muted/40 rounded-tl-sm text-muted-foreground")}>
          {msg.text}
          {msg.metrics && (
            <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
              {Object.entries(msg.metrics as Record<string, number>).map(([k, v]) => (
                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{k}: {v}</span>
              ))}
            </div>
          )}
        </div>
        <div className={cn("flex items-center gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          isUser ? "flex-row-reverse" : "flex-row")}>
          <button onClick={() => onCopy(msg.text)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Copy"><Copy className="size-3" /></button>
          {!isUser && !msg.error && (
            <>
              <button onClick={() => react("like")} aria-pressed={reaction === "like"} aria-label="Like"
                className={cn("p-1 rounded-md transition-colors", reaction === "like" ? "text-[var(--color-success)] bg-[var(--color-success)]/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
                <ThumbsUp className="size-3" />
              </button>
              <button onClick={() => react("dislike")} aria-pressed={reaction === "dislike"} aria-label="Dislike"
                className={cn("p-1 rounded-md transition-colors", reaction === "dislike" ? "text-[var(--color-destructive)] bg-[var(--color-destructive)]/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
                <ThumbsDown className="size-3" />
              </button>
              {onRegenerate && (
                <button onClick={onRegenerate} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Regenerate">
                  <RefreshCw className="size-3" />
                </button>
              )}
            </>
          )}
          <span className="text-[10px] text-muted-foreground/50 ml-1">{msg.timestamp}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Empty chat state
function EmptyChat({ onPrompt }: { onPrompt: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-14 rounded-2xl aurora grid place-items-center text-primary-foreground mb-4">
        <Sparkles className="size-6" />
      </div>
      <h3 className="text-sm font-semibold">Your workspace is ready</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">Ask about air quality, health risks, sustainability, or policy actions.</p>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
        {["What does today's AQI mean for my health?", "Summarize this city's environmental status", "What actions would reduce pollution fastest?", "Is it safe to exercise outside today?"].map(p => (
          <button key={p} onClick={() => onPrompt(p)}
            className="text-left text-xs px-3 py-2.5 rounded-xl glass text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Intelligence Dashboard (Phase 3 logic, Phase 6 visual) ──────────────────

function IntelligenceDashboard({ city, isApiConnected, onExplain }: {
  city: { id: string; name: string; aqi: number; pm25: number; water: number; risk: number; eco: number };
  isApiConnected: boolean; onExplain: (p: string) => void;
}) {
  const { cities } = useCity();
  const [compareA, setCompareA] = useState(city.id);
  const [compareB, setCompareB] = useState(cities.find(c => c.id !== city.id)?.id ?? city.id);
  const opts = { enabled: isApiConnected, staleTime: 5 * 60_000, throwOnError: false as const };

  const aqiTrend  = useQuery({ queryKey: ["intel-aqi",     city.id], queryFn: () => intelligenceApi.getAQITrend(city.id).then((r: any) => r?.data?.data ?? r?.data),       ...opts });
  const hotspots  = useQuery({ queryKey: ["intel-hotspot", city.id], queryFn: () => intelligenceApi.getHotspotAnalysis(city.id).then((r: any) => r?.data?.data ?? r?.data),        ...opts });
  const health    = useQuery({ queryKey: ["intel-health",  city.id], queryFn: () => intelligenceApi.getHealthImpact(city.id).then((r: any) => r?.data?.data ?? r?.data),     ...opts });
  const risk      = useQuery({ queryKey: ["intel-risk",    city.id], queryFn: () => intelligenceApi.getRiskAnalysis(city.id).then((r: any) => r?.data?.data ?? r?.data),     ...opts });
  const sustain   = useQuery({ queryKey: ["intel-sustain", city.id], queryFn: () => intelligenceApi.getSustainabilityRecommendations(city.id).then((r: any) => r?.data?.data ?? r?.data),   ...opts });
  const executive = useQuery({ queryKey: ["intel-exec"],              queryFn: () => intelligenceApi.getExecutiveInsights().then((r: any) => r?.data?.data ?? r?.data),        ...opts });
  const compare   = useQuery({
    queryKey: ["intel-compare", compareA, compareB],
    queryFn:  () => intelligenceApi.getCityComparison([compareA, compareB]).then((r: any) => r?.data?.data ?? r?.data),
    enabled: isApiConnected && compareA !== compareB, staleTime: 5 * 60_000, throwOnError: false,
  });

  const explainSection = (label: string, data: unknown) =>
    onExplain(`Explain the ${label} intelligence for ${city.name}: ${JSON.stringify(data).slice(0, 400)}`);

  if (!isApiConnected) {
    return (
      <GlassCard className="p-8 flex flex-col items-center gap-4 text-center">
        <Sparkles className="size-8 text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold">Intelligence Engine offline</div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Start the backend server and set GEMINI_API_KEY to unlock intelligence insights.</p>
        </div>
      </GlassCard>
    );
  }

  const IntelCard = ({ eyebrow, title, accent, onExplainClick, loading, children }: {
    eyebrow: string; title: string; accent: string; onExplainClick?: () => void; loading?: boolean; children: React.ReactNode;
  }) => (
    <motion.div variants={CARD_IN} whileHover={{ y: -2 }} className="rounded-xl border overflow-hidden"
      style={{ borderColor: `color-mix(in oklab, ${accent} 25%, var(--border))`, background: `color-mix(in oklab, ${accent} 4%, var(--background))` }}>
      <div className="h-0.5" style={{ background: accent }} />
      <div className="p-4">
        {loading ? <SkeletonCard lines={3} /> : (
          <>
            <div className="text-[10px] uppercase tracking-[0.16em] mb-0.5" style={{ color: accent }}>{eyebrow}</div>
            <div className="text-sm font-semibold mb-2">{title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1">{children}</div>
            {onExplainClick && (
              <button onClick={onExplainClick} className="mt-3 inline-flex items-center gap-1.5 text-xs aurora text-primary-foreground rounded-lg px-2.5 py-1.5">
                <Sparkles className="size-3" /> Explain with AI
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Intelligence Engine" title={`Dashboard · ${city.name}`} icon={TrendingUp} />

      {/* Row 1: AQI Trend + Hotspots */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Trend & Hotspots</div>
        <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-3">
          <IntelCard eyebrow="AQI Trend" title={aqiTrend.data?.trendSummary ?? "AQI Trend Analysis"} accent="var(--color-primary)" loading={aqiTrend.isLoading} onExplainClick={() => explainSection("AQI trend", aqiTrend.data)}>
            <p>{aqiTrend.data?.trendDirection}</p>
            {(aqiTrend.data?.keyObservations ?? []).slice(0, 2).map((o: string, i: number) => <p key={i}>• {o}</p>)}
          </IntelCard>
          <IntelCard eyebrow="Pollution Hotspots" title="High-risk zones" accent="var(--color-destructive)" loading={hotspots.isLoading} onExplainClick={() => explainSection("hotspots", hotspots.data)}>
            {(hotspots.data?.hotspots ?? hotspots.data?.highRiskZones ?? []).slice(0, 3).map((z: { name?: string; zone?: string; severity?: string }, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span>{z.name ?? z.zone ?? `Zone ${i + 1}`}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in oklab, var(--color-destructive) 12%, transparent)", color: "var(--color-destructive)" }}>{z.severity ?? "High"}</span>
              </div>
            ))}
          </IntelCard>
        </motion.div>
      </div>

      {/* Row 2: Sustainability + Executive */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Insights</div>
        <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-3">
          <IntelCard eyebrow={`EcoScore · ${sustain.data?.sustainabilityScore ?? city.eco}/100`} title="Sustainability" accent="var(--color-success)" loading={sustain.isLoading} onExplainClick={() => explainSection("sustainability", sustain.data)}>
            <p>{sustain.data?.summary ?? sustain.data?.aiExplanation}</p>
          </IntelCard>
          <IntelCard eyebrow="Executive Summary" title="City-wide priorities" accent="var(--color-primary)" loading={executive.isLoading} onExplainClick={() => explainSection("executive insights", executive.data)}>
            {(executive.data?.topPriorities ?? executive.data?.priorities ?? []).slice(0, 2).map((p: { priority?: string; title?: string }, i: number) => (
              <p key={i}>• {p.priority ?? p.title}</p>
            ))}
            {(executive.data?.criticalObservations ?? []).slice(0, 1).map((o: string, i: number) => <p key={i} className="mt-1 text-[var(--color-warning)]">⚠ {o}</p>)}
          </IntelCard>
        </motion.div>
      </div>

      {/* Row 3: City Comparison + Risk */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Comparison & Risk</div>
        <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-3">
          <IntelCard eyebrow={`Risk · ${risk.data?.riskLevel ?? "—"}`} title="Risk Analysis" accent="var(--color-destructive)" loading={risk.isLoading} onExplainClick={() => explainSection("risk analysis", risk.data)}>
            <p>{risk.data?.summary ?? risk.data?.riskSummary}</p>
            {(risk.data?.majorRisks ?? risk.data?.risks ?? []).slice(0, 2).map((r: { risk?: string; name?: string }, i: number) => <p key={i}>• {r.risk ?? r.name}</p>)}
          </IntelCard>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="h-0.5" style={{ background: "var(--color-info)" }} />
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--color-info)" }}>City Comparison</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select value={compareA} onChange={e => setCompareA(e.target.value)} className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors">
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={compareB} onChange={e => setCompareB(e.target.value)} className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors">
                  {cities.filter(c => c.id !== compareA).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {compare.isLoading ? <SkeletonCard lines={2} />
              : compare.data ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  {["airQuality", "health", "sustainability"].map(k => {
                    const d = compare.data[k] ?? compare.data[`${k}Comparison`];
                    if (!d) return null;
                    return <p key={k}>• <span className="font-medium text-foreground capitalize">{k}:</span> {typeof d === "string" ? d : d?.summary ?? ""}</p>;
                  })}
                  {compare.data.conclusion && <p className="mt-1.5 text-primary text-[10px]">{compare.data.conclusion}</p>}
                </div>
              ) : <p className="text-xs text-muted-foreground">Select two different cities to compare.</p>}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Health tab ───────────────────────────────────────────────────────────────

function HealthDashboard({ city, isApiConnected }: {
  city: { id: string; name: string; aqi: number; pm25: number; temp: number; risk: number };
  isApiConnected: boolean;
}) {
  const qc = useQueryClient();
  const { data: healthData, isFetching: loading, refetch } = useQuery({
    queryKey: ["health-advice", city.id],
    queryFn:  () => copilotApi.healthAdvice(city.id).then(r => r.data),
    enabled: false, staleTime: 60 * 60_000, throwOnError: false,
  });
  const health = healthData?.advice as HealthAdvice | undefined;

  // Derived safety scores
  const outdoorSafety = Math.max(0, 100 - city.aqi);
  const exerciseSafety = Math.max(0, 100 - city.pm25 * 1.5);
  const overallRisk = city.risk;

  const scoreColor = (v: number) => v >= 70 ? "var(--color-success)" : v >= 40 ? "var(--color-warning)" : "var(--color-destructive)";

  function ScoreGauge({ label, value }: { label: string; value: number }) {
    const color = scoreColor(value);
    return (
      <div className="glass rounded-xl p-4 flex flex-col gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>{value}</span>
          <span className="text-xs text-muted-foreground mb-1">/100</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: color }}
            initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: EASE_OUT }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="AI Health Advisor" title={`Health advisory · ${city.name}`} icon={Heart} />

      {/* Score grid */}
      <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
        <motion.div variants={CARD_IN}><ScoreGauge label="Outdoor Safety" value={Math.round(outdoorSafety)} /></motion.div>
        <motion.div variants={CARD_IN}><ScoreGauge label="Exercise Safety" value={Math.round(Math.max(0, exerciseSafety))} /></motion.div>
        <motion.div variants={CARD_IN}>
          <div className="glass rounded-xl p-4 flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">Overall Risk</div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold tabular-nums" style={{ color: riskColor(overallRisk) }}>{overallRisk}</span>
              <span className="text-xs text-muted-foreground mb-1">/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: riskColor(overallRisk) }}
                initial={{ width: 0 }} animate={{ width: `${overallRisk}%` }} transition={{ duration: 0.8, ease: EASE_OUT }} />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Health advice */}
      {!health ? (
        <GlassCard className="p-6 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">Get AI-powered health recommendations based on current AQI ({city.aqi}), PM2.5 ({city.pm25} µg/m³), and temperature ({city.temp}°C).</p>
          <button onClick={() => refetch()} disabled={loading || !isApiConnected}
            className="aurora text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Heart className="size-3.5" />}
            {loading ? "Generating…" : "Generate health advice"}
          </button>
          {!isApiConnected && <p className="text-xs text-muted-foreground">Backend required for AI health advice</p>}
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <GlassCard className="p-4" accent={riskColor(city.risk)}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Risk Level: {health.riskLevel}</div>
              <Pill tone={riskTone(health.riskLevel)}>{health.riskLevel}</Pill>
            </div>
            <p className="text-sm text-muted-foreground">{health.summary}</p>
          </GlassCard>

          {/* Sensitive groups */}
          <GlassCard className="p-4" accent="var(--color-warning)">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sensitive Groups</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { label: "Children",        emoji: "👶", value: health.children },
                { label: "Elderly",         emoji: "👴", value: health.elderly },
                { label: "Sensitive groups",emoji: "🫁", value: health.sensitiveGroups },
                { label: "Schools",         emoji: "🏫", value: health.schools },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.emoji} {item.label}</div>
                  <div className="text-xs mt-1 leading-relaxed">{item.value}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Recommendations */}
          <GlassCard className="p-4" accent="var(--color-success)">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recommendations</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { label: "Outdoor",  emoji: "🌿", value: health.outdoor },
                { label: "Exercise", emoji: "🏃", value: health.exercise },
                { label: "Masks",    emoji: "😷", value: health.masks },
                { label: "General",  emoji: "👥", value: health.generalPublic },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.emoji} {item.label}</div>
                  <div className="text-xs mt-1 leading-relaxed">{item.value}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <button onClick={() => { qc.removeQueries({ queryKey: ["health-advice", city.id] }); refetch(); }}
            className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:border-primary/40 transition-colors">
            <RefreshCw className="size-3" /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Actions tab ──────────────────────────────────────────────────────────────

function ActionsDashboard({ city, onPrompt, recData, recLoading }: {
  city: { name: string }; onPrompt: (s: string) => void;
  recData: unknown; recLoading: boolean;
}) {
  const [openCitizenIdx, setOpenCitizenIdx] = useState<number | null>(null);
  const [openGovIdx,     setOpenGovIdx]     = useState<number | null>(null);

  const citizenActions = [
    { icon: Shield,  label: "Avoid outdoor activity", desc: "Limit time outside, especially during peak pollution hours (06:00–10:00, 17:00–20:00).", color: "var(--color-destructive)" },
    { icon: Users,   label: "Wear masks",             desc: "N95 or equivalent masks recommended for outdoor activity when AQI exceeds 150.",         color: "var(--color-warning)" },
    { icon: Zap,     label: "Save energy",            desc: "Reduce electricity use during peak hours to lower grid-related emissions.",              color: "var(--color-success)" },
    { icon: Megaphone,label: "Report pollution",     desc: "Use the Citizen Hub to file reports about visible pollution, illegal dumping, or smoke.", color: "var(--color-info)" },
  ];
  const govActions = [
    { icon: Car,     label: "Traffic restrictions",  desc: "Implement odd-even vehicle rationing and restrict heavy trucks during peak hours.",      color: "var(--color-destructive)" },
    { icon: Factory, label: "Factory control",       desc: "Issue directives to high-emission industrial clusters to reduce output during alerts.",   color: "var(--color-warning)" },
    { icon: Megaphone,label:"Emergency notices",    desc: "Broadcast public health advisories via all city communication channels.",               color: "var(--color-info)" },
    { icon: Waves,   label: "Water management",      desc: "Increase monitoring frequency at river intakes; deploy turbidity alerts.",               color: "var(--color-success)" },
  ];

  function ExpandableAction({ action, index, openIdx, setOpen, side }: {
    action: typeof citizenActions[0]; index: number;
    openIdx: number | null; setOpen: (i: number | null) => void; side: string;
  }) {
    const isOpen = openIdx === index;
    const Icon = action.icon;
    return (
      <motion.div variants={CARD_IN} className="rounded-xl border border-border overflow-hidden"
        style={{ borderColor: isOpen ? `color-mix(in oklab, ${action.color} 30%, var(--border))` : undefined }}>
        <button
          onClick={() => setOpen(isOpen ? null : index)}
          className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-muted/30 transition-colors"
          aria-expanded={isOpen}
        >
          <div className="size-8 rounded-lg grid place-items-center shrink-0"
            style={{ background: `color-mix(in oklab, ${action.color} 12%, transparent)` }}>
            <Icon className="size-4" style={{ color: action.color }} />
          </div>
          <span className="flex-1 text-sm font-medium">{action.label}</span>
          {isOpen ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden">
              <div className="px-4 pb-3.5 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2.5">
                {action.desc}
                <button onClick={() => onPrompt(`Tell me more about: ${action.label} for ${city.name}`)}
                  className="mt-2.5 inline-flex items-center gap-1.5 aurora text-primary-foreground rounded-lg px-2.5 py-1.5 text-[11px]">
                  <Sparkles className="size-3" /> Ask AI
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* AI recommendations */}
      <div>
        <SectionHeader eyebrow="AI Recommendations" title="Suggested actions" icon={Lightbulb} loading={recLoading} />
        {recLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">{[1,2,3,4].map(i => <SkeletonCard key={i} lines={3} />)}</div>
        ) : (
          <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-3">
            {(Array.isArray(recData) ? recData : RECOMMENDATIONS).map((r: { title: string; impact: string; effort: string; confidence: number }) => (
              <motion.div key={r.title} variants={CARD_IN} whileHover={{ y: -2 }}
                className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <Pill tone="primary">Action</Pill>
                  <span className="text-[11px] text-muted-foreground tabular-nums">conf. {Math.round(r.confidence * 100)}%</span>
                </div>
                <div className="text-sm font-medium">{r.title}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/50 p-2"><div className="text-muted-foreground">Impact</div><div className="font-semibold mt-0.5">{r.impact}</div></div>
                  <div className="rounded-lg bg-muted/50 p-2"><div className="text-muted-foreground">Effort</div><div className="font-semibold mt-0.5">{r.effort}</div></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onPrompt(`Help implement: ${r.title}`)} className="text-xs aurora text-primary-foreground rounded-md px-2.5 py-1.5">Ask AI</button>
                  <Link to="/simulator" className="text-xs glass rounded-md px-2.5 py-1.5 hover:border-primary/30 transition-colors">Simulate</Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Citizen actions */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Citizen Actions</div>
        <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="space-y-2">
          {citizenActions.map((a, i) => (
            <ExpandableAction key={a.label} action={a} index={i} openIdx={openCitizenIdx} setOpen={setOpenCitizenIdx} side="citizen" />
          ))}
        </motion.div>
      </div>

      {/* Government actions */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Government Actions</div>
        <motion.div variants={CARD_STAGGER()} initial="hidden" animate="show" className="space-y-2">
          {govActions.map((a, i) => (
            <ExpandableAction key={a.label} action={a} index={i} openIdx={openGovIdx} setOpen={setOpenGovIdx} side="gov" />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

function IntelligenceRail({ city, isApiConnected, alerts, criticalCount, chatPending, chatSuccess, chatError, onPrompt }: {
  city: { id: string; name: string; aqi: number; temp: number; humidity?: number; windSpeed?: number; risk: number; alerts: number };
  isApiConnected: boolean; alerts: unknown[]; criticalCount: number;
  chatPending: boolean; chatSuccess: boolean; chatError: boolean;
  onPrompt: (s: string) => void;
}) {
  const reduced = useReducedMotion();
  const cityRanking = useMemo(() => {
    return [...CITIES].sort((a, b) => a.aqi - b.aqi).findIndex(c => c.id === city.id) + 1;
  }, [city.id]);

  return (
    <div className="space-y-4">
      {/* AI status */}
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.42, ease: EASE_OUT }}>
        <GlassCard className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">AI Status</div>
          <div className="space-y-2">
            {[
              { label: "AI service",    status: isApiConnected ? "Available" : "Offline",  tone: isApiConnected ? "text-[var(--color-success)]" : "text-[var(--color-warning)]",     icon: isApiConnected ? CheckCircle : AlertTriangle },
              { label: "Last response", status: chatPending ? "Processing…" : chatSuccess ? "Success" : chatError ? "Error" : "—", tone: chatError ? "text-[var(--color-destructive)]" : "text-muted-foreground", icon: chatPending ? Loader2 : chatSuccess ? CheckCircle : chatError ? AlertTriangle : Zap },
              { label: "Model",         status: isApiConnected ? "Gemini 2.5 Flash" : "Not connected", tone: "text-muted-foreground", icon: Sparkles },
            ].map(({ label, status, tone, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn("flex items-center gap-1 font-medium", tone)}>
                  <Icon className={cn("size-3", chatPending && label === "Last response" && !reduced && "animate-spin")} />
                  {status}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Active alerts */}
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.48, ease: EASE_OUT }}>
        <GlassCard className="p-4" accent={criticalCount > 0 ? "var(--color-destructive)" : undefined}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Risk feed</div>
              <div className="flex items-center gap-2 mt-0.5 text-sm font-semibold">
                <ShieldAlert className="size-4 text-[var(--color-destructive)]" /> Active alerts
              </div>
            </div>
            {criticalCount > 0 && <Pill tone="destructive"><AlertTriangle className="size-3" /> {criticalCount}</Pill>}
          </div>
          <div className="space-y-2">
            {(alerts as { id?: string; _id?: string; severity: string; title: string; area: string; time?: string }[])
              .slice(0, 4).map(a => (
              <div key={a.id ?? a._id} className="rounded-xl border border-border p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <Pill tone={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "warning" : "info"}>{a.severity}</Pill>
                  <span className="text-[10px] text-muted-foreground">{a.time ?? "live"}</span>
                </div>
                <div className="text-xs font-medium">{a.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{a.area}</div>
                {isApiConnected && (
                  <button className="mt-1 text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    onClick={() => onPrompt(`Explain this alert: ${a.title}`)}>
                    Ask AI <ChevronRight className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.54, ease: EASE_OUT }}>
        <GlassCard className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map(a => (
              <button key={a.id} onClick={() => onPrompt(a.prompt(city.name))}
                className="flex items-center gap-1.5 rounded-xl glass px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                <span>{a.emoji}</span> {a.label}
              </button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Weather snapshot */}
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.60, ease: EASE_OUT }}>
        <GlassCard className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Weather Snapshot</div>
          <div className="grid grid-cols-2 gap-2">
            <MetricBadge label="Temp" value={`${city.temp}°C`} color="var(--color-warning)" />
            <MetricBadge label="AQI"  value={city.aqi}         color={aqiColor(city.aqi)} />
            {city.humidity  != null && <MetricBadge label="Humidity" value={`${city.humidity}%`}       color="var(--color-info)" />}
            {city.windSpeed != null && <MetricBadge label="Wind"     value={`${city.windSpeed} km/h`}  color="var(--color-primary)" />}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3" /> {city.name}
          </div>
        </GlassCard>
      </motion.div>

      {/* City ranking */}
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.66, ease: EASE_OUT }}>
        <GlassCard className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">City Ranking · Air Quality</div>
          <div className="space-y-1.5">
            {[...CITIES].sort((a, b) => a.aqi - b.aqi).slice(0, 5).map((c, i) => (
              <div key={c.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                c.id === city.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30")}>
                <span className="tabular-nums text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <span className={cn("flex-1 font-medium", c.id === city.id && "text-primary")}>{c.name}</span>
                <span className="tabular-nums font-semibold" style={{ color: aqiColor(c.aqi) }}>{c.aqi}</span>
              </div>
            ))}
            {cityRanking > 5 && (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs bg-primary/10 border border-primary/20">
                <span className="tabular-nums text-muted-foreground w-4 shrink-0">{cityRanking}</span>
                <span className="flex-1 font-medium text-primary">{city.name}</span>
                <span className="tabular-nums font-semibold" style={{ color: aqiColor(city.aqi) }}>{city.aqi}</span>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Sustainability suggestions */}
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.72, ease: EASE_OUT }}>
        <GlassCard className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Sustainability</div>
          <ul className="space-y-2.5 text-xs">
            {[
              "Retrofit 12 buildings with rooftop solar (−1,240 tCO₂/yr).",
              "Expand BRT corridor on A-19 — projected −22 NO₂ peak.",
              "Mandate dust covers in Wards 4, 7, 12.",
              "Audit 3 industrial clusters (anomaly score > 0.82).",
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <CheckCircle className="size-3.5 mt-0.5 text-[var(--color-success)] shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function IntelligenceCenter() {
  const { t } = useTranslation("copilot");
  const { city, cities, isApiConnected, setCityId } = useCity();
  const { user }  = useAuth();
  const reduced   = useReducedMotion() ?? false;

  const [tab, setTab]           = useState<Tab>("chat");
  const [wsTab, setWsTab]       = useState<WorkspaceTab>("chat");
  const [question, setQuestion] = useState("");
  const [inputFocused, setFocused] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [copyFeedback, setCopy] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [lastUserText, setLastUserText] = useState("");
  const msgIdRef = useRef(0);
  const nextId   = () => String(++msgIdRef.current);
  const now      = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Phase 5 history
  const [wsHistory, setWsHistory] = useState<WorkspaceHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const initMsg: ChatMsg = {
    id: "0", role: "ai",
    text: `Hello${user ? ` ${user.name.split(" ")[0]}` : ""}! I'm GreenGuard Intelligence, your AI environmental advisor for ${city.name}. Ask me anything about air quality, health risks, or policy actions.`,
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
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (near) { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }
    else setAtBottom(false);
  }, [messages]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }, []);

  // Queries
  const { data: recData, isLoading: recLoading } = useQuery({
    queryKey: ["recommendations", city.id],
    queryFn:  () => copilotApi.getRecommendations(city.id).then(r => r.data.recommendations),
    staleTime: 5 * 60_000, enabled: isApiConnected, throwOnError: false,
  });
  const { data: alertData } = useQuery({
    queryKey: ["alerts-active", city.id],
    queryFn:  () => alertApi.getActive(city.id).then(r => r.data.alerts),
    staleTime: 30_000, enabled: isApiConnected, throwOnError: false,
  });

  const chatMutation = useMutation({
    mutationFn: (q: string) => copilotApi.chat(q, city.id, sessionId).then(r => r.data),
    onSuccess: (data) => {
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages(h => [...h, { id: nextId(), role: "ai", text: data.answer || "No response received.", timestamp: now(), metrics: data.metrics }]);
      setQuestion("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    },
    onError: () => {
      setMessages(h => [...h, { id: nextId(), role: "ai",
        text: isApiConnected
          ? "AI service temporarily unavailable. Environmental insights remain accessible."
          : "Backend API required. Start the server and set GEMINI_API_KEY.",
        timestamp: now(), error: true }]);
    },
  });

  const handleSend = useCallback(() => {
    const q = question.trim();
    if (!q || chatMutation.isPending) return;
    setLastUserText(q);
    setMessages(h => [...h, { id: nextId(), role: "user", text: q, timestamp: now() }]);
    setAtBottom(true);
    chatMutation.mutate(q);
  }, [question, chatMutation]);

  const handleRegenerate = useCallback(() => {
    if (!lastUserText || chatMutation.isPending) return;
    setMessages(h => { const i = [...h].reverse().findIndex(m => m.role === "ai"); return i === -1 ? h : h.slice(0, h.length - 1 - i); });
    chatMutation.mutate(lastUserText);
  }, [lastUserText, chatMutation]);

  const handleReact = useCallback(() => {}, []);

  const handlePrompt = useCallback((s: string) => {
    setQuestion(s); setTab("chat"); setWsTab("chat");
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopy(true); setTimeout(() => setCopy(false), 2000);
  }, []);

  const handleWsComplete = useCallback((fileName: string, mode: string, result: string, durationMs: number) => {
    const entry: WorkspaceHistoryEntry = {
      id: crypto.randomUUID(), type: wsTab as Exclude<WorkspaceTab, "chat">,
      fileName, mode, resultSnippet: result.slice(0, 120),
      analyzedAt: new Date().toISOString(), durationMs, pinned: false,
    };
    setWsHistory(h => [entry, ...h]);
  }, [wsTab]);

  const alerts       = alertData ?? ALERTS;
  const criticalCount = (alerts as { severity: string }[]).filter(a => a.severity === "critical").length;

  // ── Recommendation chips derived from recData ─────────────────────────────
  const recChips = useMemo(() => {
    const list = Array.isArray(recData) ? recData : RECOMMENDATIONS;
    return list.slice(0, 3).map((r: { title: string }) => r.title);
  }, [recData]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">

      {/* Copy toast */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 right-4 z-50 glass rounded-lg px-3 py-2 text-xs font-medium pointer-events-none"
            role="status" aria-live="polite">
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. LIVE TELEMETRY HEADER ───────────────────────────────────────── */}
      <section className="relative mx-4 mt-4 md:mx-6 md:mt-6 rounded-2xl overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 radial-spot opacity-70" />
          <div className="absolute inset-0 grid-bg opacity-[0.35]" />
          {!reduced && (
            <motion.div className="absolute -top-16 -left-16 w-64 h-64 rounded-full"
              style={{ background: "color-mix(in oklab, var(--color-primary) 16%, transparent)", filter: "blur(48px)" }}
              animate={{ x: [0, 16, 0], y: [0, -10, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/60 to-transparent" />
        </div>

        <div className="relative px-6 pt-8 pb-6 md:px-10 md:pt-12 md:pb-8">
          {/* Status row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR_SM }}
            className="flex flex-wrap items-center gap-2 mb-5">
            <Pill tone={isApiConnected ? "success" : "warning"}><Sparkles className="size-3" /> {isApiConnected ? "Gemini · live" : "Mock mode"}</Pill>
            {criticalCount > 0 && <Pill tone="destructive"><AlertTriangle className="size-3" /> {criticalCount} critical</Pill>}
            <Pill tone="muted"><Eye className="size-3" /> {city.name}</Pill>
            {/* City switcher */}
            <div className="ml-auto">
              <select value={city.id} onChange={e => setCityId(e.target.value)}
                className="text-xs bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-primary/50 transition-colors"
                aria-label="Switch city">
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </motion.div>

          {/* Hero title */}
          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="mb-6 max-w-2xl">
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: DUR_LG, ease: EASE_OUT } } }}
              className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{t("contextPanel")}</motion.div>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: DUR_LG, ease: EASE_OUT } } }}
              className="text-3xl sm:text-4xl font-bold tracking-tight text-aurora leading-tight">
              🌍 {t("title")}
            </motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } } }}
              className="mt-1.5 text-sm text-muted-foreground">
              {t("subtitle")} · {city.name}
            </motion.p>
          </motion.div>

          {/* Telemetry strip */}
          <motion.div variants={STAGGER(0.05, 0.2)} initial="hidden" animate="show"
            className="grid grid-cols-3 md:grid-cols-6 gap-2.5 mb-5">
            {[
              { icon: Wind,        label: "AQI",      value: city.aqi,         unit: "",      warn: city.aqi > 100,    color: aqiColor(city.aqi) },
              { icon: Activity,    label: "PM2.5",    value: city.pm25,        unit: " µg",   warn: city.pm25 > 35,    color: city.pm25 > 35 ? "var(--color-destructive)" : "var(--color-success)" },
              { icon: Droplets,    label: "Water QI", value: city.water,       unit: "/100",  warn: city.water < 70,   color: city.water < 70 ? "var(--color-warning)" : "var(--color-success)" },
              { icon: Thermometer, label: "Temp",     value: `${city.temp}°C`, unit: "",      warn: city.temp > 38,    color: city.temp > 38 ? "var(--color-destructive)" : "var(--color-info)" },
              { icon: Eye,         label: "Risk",     value: city.risk,        unit: "/100",  warn: city.risk > 60,    color: riskColor(city.risk) },
              { icon: Leaf,        label: "EcoScore", value: city.eco,         unit: "/100",  warn: city.eco < 50,     color: city.eco < 50 ? "var(--color-warning)" : "var(--color-success)" },
            ].map(m => (
              <motion.div key={m.label} variants={FADE_UP}
                className={cn("rounded-xl border p-3 flex flex-col gap-1 relative overflow-hidden",
                  m.warn ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5" : "border-border bg-card/40")}>
                {m.warn && <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: "var(--color-warning)" }} />}
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><m.icon className="size-3" />{m.label}</div>
                <div className="text-xl font-semibold tabular-nums leading-none" style={{ color: m.color }}>
                  {m.value}<span className="text-xs text-muted-foreground font-normal">{m.unit}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── 2. RECOMMENDATION CHIPS ── */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR_MD, delay: 0.35 }}
            className="flex flex-wrap gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground self-center">{t("intelligence.recommendations")}:</span>
            {recChips.map(chip => (
              <button key={chip} onClick={() => handlePrompt(`Tell me more about: ${chip}`)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                <Lightbulb className="size-3 text-[var(--color-warning)]" /> {chip}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 3. MAIN NAV TABS ──────────────────────────────────────────────── */}
      <section className="px-4 pt-4 md:px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR_SM, delay: 0.38 }}
          className="flex glass rounded-xl p-1 gap-0.5 overflow-x-auto scrollbar-none"
          role="tablist" aria-label="Intelligence Center navigation">
          {([
            { id: "chat",          label: `💬 ${t("tabs.chat")}` },
            { id: "intelligence",  label: `🧠 ${t("tabs.intelligence")}` },
            { id: "health",        label: `🩺 ${t("tabs.health")}` },
            { id: "actions",       label: `⚡ ${t("tabs.actions")}` },
          ] as const).map(tItem => (
            <button key={tItem.id} role="tab" aria-selected={tab === tItem.id} aria-controls={`tabpanel-${tItem.id}`}
              onClick={() => setTab(tItem.id)}
              className={cn("relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                tab === tItem.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {tab === tItem.id && (
                <motion.div layoutId={reduced ? undefined : "nav-pill"}
                  className="absolute inset-0 rounded-lg aurora shadow-[var(--shadow-glow)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }} />
              )}
              <span className="relative">{tItem.label}</span>
            </button>
          ))}
        </motion.div>
      </section>

      {/* ── 4. CONTEXT PANEL ──────────────────────────────────────────────── */}
      <section className="px-4 pt-3 md:px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR_SM, delay: 0.4 }}
          className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">{city.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <MetricBadge label="AQI" value={`${city.aqi} · ${aqiLabel(city.aqi)}`} color={aqiColor(city.aqi)} />
            <MetricBadge label="Temp" value={`${city.temp}°C`} color="var(--color-warning)" />
            <MetricBadge label="Risk" value={`${city.risk}/100`} color={riskColor(city.risk)} />
          </div>
        </motion.div>
      </section>

      {/* ── 5. WORKSPACE CONTENT + 6. SIDEBAR ────────────────────────────── */}
      <section className="flex-1 px-4 pt-4 pb-8 md:px-6">
        <div className="grid lg:grid-cols-12 gap-5">

          {/* Content pane (70%) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">

              {/* ASSISTANT TAB */}
              {tab === "chat" && (
                <motion.div key="chat" id="tabpanel-chat" role="tabpanel"
                  variants={TAB_IN} initial="hidden" animate="show" exit="exit"
                  className="glass rounded-2xl flex flex-col" style={{ minHeight: 520 }}>

                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-border/50 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg aurora grid place-items-center text-primary-foreground"><Sparkles className="size-3.5" /></div>
                        <div>
                          <div className="text-sm font-semibold">Intelligence Assistant</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {isApiConnected ? "Powered by Gemini 2.5 Flash" : "Mock mode"}
                          </div>
                        </div>
                      </div>
                      {wsTab === "chat" && hasMessages && (
                        <button onClick={() => { setMessages([{ ...initMsg, id: nextId() }]); setSessionId(undefined); setLastUserText(""); }}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors" aria-label="New chat">
                          <RefreshCw className="size-3.5" /><span className="hidden sm:inline">New chat</span>
                        </button>
                      )}
                    </div>
                    <WorkspaceTabs active={wsTab} onChange={setWsTab} />
                  </div>

                  {/* Prompt chips */}
                  {wsTab === "chat" && (
                    <div className="px-4 py-2 border-b border-border/30 flex flex-wrap gap-1.5">
                      {PROMPT_CATEGORIES.map(cat => cat.prompts.map(p => (
                        <button key={p} onClick={() => handlePrompt(p)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full glass text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                          <span className="font-medium" style={{ color: cat.color }}>{cat.label}</span>
                          <span className="hidden sm:inline"> · {p}</span>
                        </button>
                      )))}
                    </div>
                  )}

                  {/* Chat messages */}
                  {wsTab === "chat" && (
                    <>
                      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 relative"
                        style={{ maxHeight: "clamp(320px, 50vh, 560px)" }}
                        aria-live="polite" aria-label="Conversation"
                        onScroll={() => {
                          const el = scrollRef.current;
                          if (!el) return;
                          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
                        }}>
                        {!hasMessages && !chatMutation.isPending
                          ? (chatMutation.isError
                            ? <AIFallback onRetry={() => chatMutation.mutate(lastUserText)} onExplore={() => setTab("intelligence")} onSwitchCity={() => {}} />
                            : <EmptyChat onPrompt={handlePrompt} />)
                          : (
                            <div className="space-y-5">
                              {messages.map((m, i) => {
                                const isLastAi = m.role === "ai" && i === messages.length - 1 && !chatMutation.isPending;
                                return <ChatBubble key={m.id} msg={m} onCopy={handleCopy} onReact={handleReact} onRegenerate={isLastAi && lastUserText ? handleRegenerate : undefined} reduced={reduced} />;
                              })}
                              {chatMutation.isPending && <ThinkingBubble reduced={reduced} />}
                            </div>
                          )}
                        <div ref={bottomRef} />
                      </div>

                      <AnimatePresence>
                        {!atBottom && hasMessages && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                            className="flex justify-center py-2 shrink-0">
                            <button onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                              className="inline-flex items-center gap-1.5 text-xs glass rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                              <ArrowDown className="size-3" /> Jump to latest
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Sticky composer */}
                      <div className="px-5 py-4 border-t border-border/50 shrink-0 sticky bottom-0 bg-background/80 backdrop-blur-sm rounded-b-2xl"
                        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                        <div className={cn("flex items-end gap-2 rounded-xl border transition-all duration-200 bg-background/40",
                          inputFocused ? "border-primary/50 shadow-[var(--shadow-glow)]" : "border-border/50")}>
                          <textarea ref={inputRef} rows={1}
                            placeholder="Ask about air quality, health, or environmental policy…"
                            aria-label="Ask GreenGuard Intelligence"
                            className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/50 px-3 py-2.5 leading-relaxed"
                            style={{ minHeight: "2.5rem", maxHeight: "160px" }}
                            value={question} onChange={handleInput}
                            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                          <button onClick={handleSend} disabled={chatMutation.isPending || !question.trim()} aria-label="Send message"
                            className="m-1.5 aurora text-primary-foreground rounded-lg p-2 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            {chatMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">↵ to send · ⇧↵ for new line</p>
                      </div>
                    </>
                  )}

                  {/* Workspace sub-panels */}
                  {wsTab === "documents" && <div className="flex-1 overflow-y-auto" id="ws-panel-documents" role="tabpanel"><DocumentWorkspace cityId={city.id} onAskAI={p => { setWsTab("chat"); handlePrompt(p); }} /></div>}
                  {wsTab === "images"    && <div className="flex-1 overflow-y-auto" id="ws-panel-images"    role="tabpanel"><ImageWorkspace    cityId={city.id} onAskAI={p => { setWsTab("chat"); handlePrompt(p); }} /></div>}
                  {wsTab === "data"      && <div className="flex-1 overflow-y-auto" id="ws-panel-data"      role="tabpanel"><DataWorkspace      cityId={city.id} onAskAI={p => { setWsTab("chat"); handlePrompt(p); }} /></div>}
                </motion.div>
              )}

              {/* INTELLIGENCE TAB */}
              {tab === "intelligence" && (
                <motion.div key="intelligence" id="tabpanel-intelligence" role="tabpanel"
                  variants={TAB_IN} initial="hidden" animate="show" exit="exit" className="space-y-4">
                  <GlassCard className="p-5">
                    <IntelligenceDashboard city={city} isApiConnected={isApiConnected} onExplain={handlePrompt} />
                  </GlassCard>
                </motion.div>
              )}

              {/* HEALTH TAB */}
              {tab === "health" && (
                <motion.div key="health" id="tabpanel-health" role="tabpanel"
                  variants={TAB_IN} initial="hidden" animate="show" exit="exit">
                  <GlassCard className="p-5">
                    <HealthDashboard city={city} isApiConnected={isApiConnected} />
                  </GlassCard>
                </motion.div>
              )}

              {/* ACTIONS TAB */}
              {tab === "actions" && (
                <motion.div key="actions" id="tabpanel-actions" role="tabpanel"
                  variants={TAB_IN} initial="hidden" animate="show" exit="exit">
                  <GlassCard className="p-5">
                    <ActionsDashboard city={city} onPrompt={handlePrompt} recData={recData} recLoading={recLoading} />
                  </GlassCard>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Recent conversations (chat tab only) */}
            {tab === "chat" && wsTab === "chat" && hasMessages && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR_MD, delay: 0.1 }}
                className="mt-4 glass rounded-2xl p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Recent · this session</div>
                <div className="space-y-1.5">
                  {messages.filter(m => m.role === "user").slice(-4).map((m, i) => (
                    <button key={i} onClick={() => setTab("chat")}
                      className="w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                      <MessageSquare className="size-3.5 shrink-0 group-hover:text-primary transition-colors" />
                      <span className="truncate">{m.text.slice(0, 80)}{m.text.length > 80 ? "…" : ""}</span>
                      <span className="ml-auto shrink-0 text-[10px] opacity-60">{m.timestamp}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase 5: workspace history in content area */}
            {tab === "chat" && wsTab !== "chat" && wsHistory.length > 0 && (
              <div className="mt-4 glass rounded-2xl overflow-hidden">
                <button onClick={() => setShowHistory(h => !h)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Analysis History ({wsHistory.length})
                  <span className="text-[10px]">{showHistory ? "▲" : "▼"}</span>
                </button>
                {showHistory && <div className="px-4 pb-4"><AnalysisHistory history={wsHistory} onDelete={id => setWsHistory(h => h.filter(e => e.id !== id))} onPin={id => setWsHistory(h => h.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e))} onReopen={e => { setWsTab(e.type); setShowHistory(false); }} /></div>}
              </div>
            )}
          </div>

          {/* ── 6. SIDE INTELLIGENCE RAIL (30%) ─────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Phase 5: workspace stats + recent when on workspace */}
            {tab === "chat" && wsTab !== "chat" && (
              <>
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR_MD, delay: 0.38 }}>
                  <GlassCard className="p-4"><WorkspaceStats history={wsHistory} /></GlassCard>
                </motion.div>
                <RecentWorkspace history={wsHistory} onReopen={e => setWsTab(e.type)} />
              </>
            )}
            <IntelligenceRail
              city={city}
              isApiConnected={isApiConnected}
              alerts={alerts as { id?: string; _id?: string; severity: string; title: string; area: string; time?: string }[]}
              criticalCount={criticalCount}
              chatPending={chatMutation.isPending}
              chatSuccess={chatMutation.isSuccess}
              chatError={chatMutation.isError}
              onPrompt={handlePrompt}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
