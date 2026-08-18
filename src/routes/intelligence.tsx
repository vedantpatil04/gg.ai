import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute, AUTHORITY_ROLES } from "@/components/protected-route";
import { Panel, Pill, EmptyState } from "@/components/ui-bits";
import { RECOMMENDATIONS, INSIGHTS, ALERTS } from "@/lib/mock-data";
import {
  Sparkles,
  ShieldAlert,
  Leaf,
  Send,
  TrendingUp,
  Lightbulb,
  Loader2,
  Heart,
  Wind,
  Droplets,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Thermometer,
  MessageCircle,
  Users,
  RefreshCw,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { copilotApi, alertApi } from "@/lib/api/services.api";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/render-markdown";
import { aqiPill } from "@/components/admin/city-directory/aqi-pill";
import {
  INTELLIGENCE_MODULE_NAME,
  INTELLIGENCE_PAGE_TITLE,
  INTELLIGENCE_DESCRIPTION,
  INTELLIGENCE_CHAT_LABEL,
} from "@/lib/brand";

export const Route = createFileRoute("/intelligence")({
  head: () => ({ meta: [{ title: INTELLIGENCE_PAGE_TITLE }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <IntelligenceCenter />
      </ProtectedRoute>
    </AppLayout>
  ),
});

// roles={AUTHORITY_ROLES}

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
type ChatMsg = { role: "user" | "ai"; text: string; metrics?: Record<string, unknown> };
type Tab = "assistant" | "health" | "insights";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "assistant", label: "Assistant", icon: MessageCircle },
  { id: "health", label: "Health", icon: Heart },
  { id: "insights", label: "Insights", icon: TrendingUp },
];

function riskTone(lvl?: string): "destructive" | "warning" | "info" | "success" {
  return lvl === "Severe"
    ? "destructive"
    : lvl === "High"
      ? "warning"
      : lvl === "Moderate"
        ? "info"
        : "success";
}

function IntelligenceCenter() {
  const { city, isApiConnected } = useCity();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("assistant");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      text: `Hello${user ? ` ${user.name.split(" ")[0]}` : ""}! I'm GreenGuard Intelligence, your AI environmental advisor. Ask me anything about ${city.name}'s air quality, health risks, or policy actions.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasConversation = messages.length > 1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { data: recData } = useQuery({
    queryKey: ["recommendations", city.id],
    queryFn: () => copilotApi.getRecommendations(city.id).then((r) => r.data.recommendations),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: insightData } = useQuery({
    queryKey: ["insights", city.id],
    queryFn: () => copilotApi.getInsights(city.id).then((r) => r.data.insights),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: alertData } = useQuery({
    queryKey: ["alerts-active", city.id],
    queryFn: () => alertApi.getActive(city.id).then((r) => r.data.alerts),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const {
    data: healthData,
    isFetching: healthLoading,
    isError: healthErrored,
    refetch: fetchHealth,
  } = useQuery({
    queryKey: ["health-advice", city.id],
    queryFn: () => copilotApi.healthAdvice(city.id).then((r) => r.data),
    enabled: false,
    staleTime: 60 * 60_000,
    throwOnError: false,
  });

  const chatMutation = useMutation({
    mutationFn: (q: string) => copilotApi.chat(q, city.id, sessionId).then((r) => r.data),
    onSuccess: (data) => {
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((h) => [...h, { role: "ai", text: data.answer, metrics: data.metrics }]);
      setQuestion("");
    },
    onError: () => {
      setMessages((h) => [
        ...h,
        {
          role: "ai",
          text: "Failed to reach the AI service. Please check your backend connection.",
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!question.trim()) return;
    setMessages((h) => [...h, { role: "user", text: question }]);
    if (!isApiConnected) {
      setMessages((h) => [
        ...h,
        {
          role: "ai",
          text: "GreenGuard Intelligence requires the backend API. Start the backend server and set GEMINI_API_KEY to enable live responses.",
        },
      ]);
      setQuestion("");
      return;
    }
    chatMutation.mutate(question);
  };

  /** Shared entry point from Health/Insights back into the conversational
   * Assistant — prefills the composer with a relevant question and hands
   * focus back to the user rather than sending automatically. */
  const askAssistant = (prompt: string) => {
    setQuestion(prompt);
    setTab("assistant");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const recommendations = (Array.isArray(recData) ? recData : RECOMMENDATIONS) as {
    title: string;
    impact: string;
    effort: string;
    confidence: number;
  }[];
  const insights = (Array.isArray(insightData) ? insightData : INSIGHTS) as {
    title: string;
    body: string;
    tag: string;
  }[];
  const alerts = (Array.isArray(alertData) ? alertData : ALERTS) as {
    id?: string;
    _id?: string;
    severity: string;
    title: string;
    area: string;
    time?: string;
    createdAt?: string;
  }[];
  const health = healthData?.advice as HealthAdvice | undefined;
  const condition = aqiPill(city.aqi);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;

  const suggestions = [
    { label: "Air quality", prompt: `Is ${city.name}'s air quality improving this week?` },
    { label: "Weather", prompt: "How could today's weather affect air quality?" },
    { label: "Health impact", prompt: "How does current pollution affect my health?" },
    { label: "Trends", prompt: "What should authorities do to reduce PM2.5?" },
    { label: "Compare cities", prompt: `How does ${city.name} compare to nearby cities?` },
  ];

  const whoMayBeAffected = health
    ? [
        { label: "Sensitive groups", icon: "🫁", value: health.sensitiveGroups },
        { label: "Elderly", icon: "👴", value: health.elderly },
        { label: "Children", icon: "👶", value: health.children },
        { label: "General public", icon: "👥", value: health.generalPublic },
      ]
    : [];
  const practicalGuidance = health
    ? [
        { label: "Outdoor activities", icon: "🌿", value: health.outdoor },
        { label: "Exercise", icon: "🏃", value: health.exercise },
        { label: "Masks", icon: "😷", value: health.masks },
        { label: "Schools", icon: "🏫", value: health.schools },
      ]
    : [];

  return (
    <div className="p-4 md:p-8 space-y-5 w-full">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Environmental Intelligence Panel
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
            {INTELLIGENCE_MODULE_NAME}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {INTELLIGENCE_DESCRIPTION}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Pill tone={isApiConnected ? "success" : "warning"}>
            <Sparkles className="size-3" /> {isApiConnected ? "Gemini · live" : "Mock mode"}
          </Pill>
          {criticalAlerts > 0 && (
            <Pill tone="destructive">
              <AlertTriangle className="size-3" /> {criticalAlerts} critical
            </Pill>
          )}
        </div>
      </header>

      {/* Compact environmental context */}
      <div className="rounded-xl border border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <span className="font-medium">{city.name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            AQI <span className="font-medium text-foreground tabular-nums">{city.aqi}</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Thermometer className="size-3.5" />
            <span className="tabular-nums">{city.temp}°C</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <Pill tone={condition.tone}>{condition.label}</Pill>

          <button
            onClick={() => setShowMoreMetrics((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={showMoreMetrics}
          >
            {showMoreMetrics ? "Fewer metrics" : "More metrics"}
            <ChevronDown className={cn("size-3.5 transition-transform", showMoreMetrics && "rotate-180")} />
          </button>
        </div>

        {showMoreMetrics && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Wind className="size-3.5" /> PM2.5{" "}
              <span className="font-medium text-foreground tabular-nums">{city.pm25} µg/m³</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="size-3.5" /> Water QI{" "}
              <span className="font-medium text-foreground tabular-nums">{city.water}/100</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="size-3.5" /> Risk index{" "}
              <span className="font-medium text-foreground tabular-nums">{city.risk}/100</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Leaf className="size-3.5" /> EcoScore{" "}
              <span className="font-medium text-foreground tabular-nums">{city.eco}/100</span>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex w-full sm:w-fit bg-muted/40 rounded-lg p-1 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "assistant" ? (
        <AssistantPanel
          messages={messages}
          hasConversation={hasConversation}
          question={question}
          setQuestion={setQuestion}
          handleSend={handleSend}
          isPending={chatMutation.isPending}
          suggestions={suggestions}
          bottomRef={bottomRef}
          inputRef={inputRef}
        />
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {tab === "health" && (
              <HealthPanel
                city={city}
                health={health}
                healthLoading={healthLoading}
                healthErrored={healthErrored}
                isApiConnected={isApiConnected}
                fetchHealth={fetchHealth}
                whoMayBeAffected={whoMayBeAffected}
                practicalGuidance={practicalGuidance}
                onRefresh={() => {
                  qc.removeQueries({ queryKey: ["health-advice", city.id] });
                  fetchHealth();
                }}
                onAskAssistant={askAssistant}
              />
            )}

            {tab === "insights" && (
              <InsightsPanel
                cityName={city.name}
                insights={insights}
                recommendations={recommendations}
                onAskAssistant={askAssistant}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Panel
              surface="card"
              eyebrow="Risk feed"
              title={
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-[var(--color-destructive)]" />
                  Active alerts
                </div>
              }
            >
              {alerts.length === 0 ? (
                <EmptyState
                  icon={<ShieldAlert className="size-4" />}
                  title="No active alerts"
                  description={`No environmental alerts are currently active for ${city.name}.`}
                />
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((a) => (
                    <div
                      key={a.id ?? a._id}
                      className="rounded-xl border border-border p-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Pill
                          tone={
                            a.severity === "critical"
                              ? "destructive"
                              : a.severity === "warning"
                                ? "warning"
                                : "info"
                          }
                        >
                          {a.severity}
                        </Pill>
                        <span className="text-[10px] text-muted-foreground">{a.time ?? "live"}</span>
                      </div>
                      <div className="mt-1.5 text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.area}</div>
                      {isApiConnected && (
                        <button
                          onClick={() => askAssistant(`Explain the "${a.title}" alert in ${a.area}.`)}
                          className="mt-1.5 text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                        >
                          AI explanation <ChevronRight className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assistant tab ───────────────────────────────────────────────────────────

function AssistantPanel({
  messages,
  hasConversation,
  question,
  setQuestion,
  handleSend,
  isPending,
  suggestions,
  bottomRef,
  inputRef,
}: {
  messages: ChatMsg[];
  hasConversation: boolean;
  question: string;
  setQuestion: (v: string) => void;
  handleSend: () => void;
  isPending: boolean;
  suggestions: { label: string; prompt: string }[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Panel
      surface="card"
      eyebrow="Conversation"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          {INTELLIGENCE_CHAT_LABEL}
        </div>
      }
    >
      {!hasConversation && (
        <p className="text-sm text-muted-foreground mb-4 max-w-xl">
          Ask about air quality, weather, health impact, environmental trends, or how your city
          compares to others — GreenGuard Intelligence answers using live environmental data.
        </p>
      )}

      <div className="min-h-[360px] max-h-[480px] overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "ai" && (
              <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0 mt-0.5">
                <Sparkles className="size-3.5" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-secondary/70 border border-border rounded-tr-sm"
                  : "bg-muted/40 rounded-tl-sm text-foreground",
              )}
            >
              {m.role === "ai" ? renderMarkdown(m.text) : m.text}
              {m.metrics && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(m.metrics as Record<string, number>).map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono"
                    >
                      {k}:{v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex gap-3">
            <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
              <Sparkles className="size-3.5" />
            </div>
            <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Analysing environmental data…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="rounded-xl border border-input bg-background/40 p-1.5 flex items-center gap-2">
          <input
            ref={inputRef}
            placeholder="Ask GreenGuard Intelligence about air quality, health risks, or policy actions…"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            aria-label="Ask GreenGuard Intelligence"
          />
          <button
            onClick={handleSend}
            disabled={isPending || !question.trim()}
            className="aurora text-primary-foreground rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Ask
          </button>
        </div>

        {!hasConversation && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => setQuestion(s.prompt)}
                className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {s.prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Health tab ──────────────────────────────────────────────────────────────

function HealthPanel({
  city,
  health,
  healthLoading,
  healthErrored,
  isApiConnected,
  fetchHealth,
  whoMayBeAffected,
  practicalGuidance,
  onRefresh,
  onAskAssistant,
}: {
  city: { name: string; aqi: number; pm25: number; temp: number };
  health?: HealthAdvice;
  healthLoading: boolean;
  healthErrored: boolean;
  isApiConnected: boolean;
  fetchHealth: () => void;
  whoMayBeAffected: { label: string; icon: string; value: string }[];
  practicalGuidance: { label: string; icon: string; value: string }[];
  onRefresh: () => void;
  onAskAssistant: (prompt: string) => void;
}) {
  return (
    <Panel
      surface="card"
      eyebrow="AI Health Advisor"
      title={
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-[var(--color-destructive)]" />
          Health advisory · {city.name}
        </div>
      }
    >
      {healthLoading ? (
        <div className="space-y-3 py-2">
          <div className="skeleton h-16 rounded-xl" />
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        </div>
      ) : !health ? (
        <div className="py-12 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Get Gemini-powered health guidance based on current AQI ({city.aqi}), PM2.5 ({city.pm25}{" "}
            µg/m³), and temperature ({city.temp}°C).
          </p>
          <button
            onClick={() => fetchHealth()}
            disabled={!isApiConnected}
            className="aurora text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Heart className="size-3.5" />
            Generate health guidance
          </button>
          {healthErrored && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-[var(--color-destructive)]">
                Couldn't generate health guidance. Please try again.
              </p>
              <button
                onClick={() => fetchHealth()}
                className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
              >
                <RefreshCw className="size-3" /> Retry
              </button>
            </div>
          )}
          {!isApiConnected && (
            <p className="text-xs text-muted-foreground">Backend required for AI health advice</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Current condition + what it means */}
          <div>
            <SectionLabel>Current condition</SectionLabel>
            <div
              className={cn(
                "rounded-xl p-4 border mt-1.5",
                riskTone(health.riskLevel) === "destructive"
                  ? "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/8"
                  : riskTone(health.riskLevel) === "warning"
                    ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8"
                    : riskTone(health.riskLevel) === "info"
                      ? "border-[var(--color-info)]/30 bg-[var(--color-info)]/8"
                      : "border-[var(--color-success)]/30 bg-[var(--color-success)]/8",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">Risk level: {health.riskLevel}</div>
                <Pill tone={riskTone(health.riskLevel)}>{health.riskLevel}</Pill>
              </div>
              <p className="text-sm mt-2 text-muted-foreground">
                <span className="text-foreground font-medium">What it means — </span>
                {health.summary}
              </p>
            </div>
          </div>

          {/* Who may be affected */}
          <div>
            <SectionLabel icon={Users}>Who may be affected</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
              {whoMayBeAffected.map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {item.icon} {item.label}
                  </div>
                  <div className="text-sm mt-1">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Practical guidance */}
          <div>
            <SectionLabel>Practical guidance</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
              {practicalGuidance.map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {item.icon} {item.label}
                  </div>
                  <div className="text-sm mt-1">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() =>
                onAskAssistant(`Can you explain more about health precautions for ${city.name} right now?`)
              }
              className="aurora text-primary-foreground rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <MessageCircle className="size-3.5" /> Ask Health AI
            </button>
            <button
              onClick={onRefresh}
              className="border border-border rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3" /> Refresh
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium inline-flex items-center gap-1.5">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </div>
  );
}

// ─── Insights tab ────────────────────────────────────────────────────────────

function InsightsPanel({
  cityName,
  insights,
  recommendations,
  onAskAssistant,
}: {
  cityName: string;
  insights: { title: string; body: string; tag: string }[];
  recommendations: { title: string; impact: string; effort: string; confidence: number }[];
  onAskAssistant: (prompt: string) => void;
}) {
  const [priority, ...supporting] = insights;

  return (
    <Panel
      surface="card"
      eyebrow="AI Intelligence"
      title={
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          Environmental intelligence · {cityName}
        </div>
      }
    >
      {!priority ? (
        <EmptyState
          icon={<TrendingUp className="size-4" />}
          title="No insights available yet"
          description="Insights will appear here once environmental data has been analysed."
        />
      ) : (
        <div className="space-y-6">
          {/* Priority finding */}
          <div>
            <SectionLabel>Priority finding</SectionLabel>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mt-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {priority.tag}
              </div>
              <div className="text-base font-semibold mt-1">{priority.title}</div>
              <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{priority.body}</div>
              <button
                onClick={() => onAskAssistant(`Explain this insight: "${priority.title}"`)}
                className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Explain this insight <ChevronRight className="size-3" />
              </button>
            </div>
          </div>

          {/* Supporting findings */}
          {supporting.length > 0 && (
            <div>
              <SectionLabel>Supporting findings</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
                {supporting.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl bg-muted/30 p-4 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.tag}
                    </div>
                    <div className="text-sm font-medium mt-1">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.body}</div>
                    <button
                      onClick={() => onAskAssistant(`Explain this insight: "${item.title}"`)}
                      className="mt-2 text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Explain this insight <ChevronRight className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended actions */}
          {recommendations.length > 0 && (
            <div>
              <SectionLabel icon={Lightbulb}>Recommended actions</SectionLabel>
              <div className="grid md:grid-cols-2 gap-3 mt-1.5">
                {recommendations.map((r) => (
                  <div
                    key={r.title}
                    className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Pill tone="primary">Action</Pill>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        conf. {Math.round(r.confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{r.title}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <div className="text-muted-foreground">Impact</div>
                        <div className="font-semibold mt-0.5">{r.impact}</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2">
                        <div className="text-muted-foreground">Effort</div>
                        <div className="font-semibold mt-0.5">{r.effort}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="text-xs aurora text-primary-foreground rounded-md px-2.5 py-1.5">
                        Apply
                      </button>
                      <button className="text-xs border border-border rounded-md px-2.5 py-1.5">
                        Simulate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
