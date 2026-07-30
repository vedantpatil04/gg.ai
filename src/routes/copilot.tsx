import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Panel, Pill } from "@/components/ui-bits";
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
  Activity,
  Thermometer,
  Eye,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { copilotApi, alertApi } from "@/lib/api/services.api";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <Copilot />
      </ProtectedRoute>
    </AppLayout>
  ),
});

const SUGGESTIONS = [
  "Is it safe to exercise outside today?",
  "What precautions should children take?",
  "Which actions can reduce AQI by 20 points?",
  "How does current pollution affect health?",
  "Is Belagavi pollution increasing this week?",
  "What should authorities do to reduce PM2.5?",
];

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

function Copilot() {
  const { city, isApiConnected } = useCity();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"chat" | "health" | "insights" | "actions">("chat");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      text: `Hello${user ? ` ${user.name.split(" ")[0]}` : ""}! I'm your GreenGuard AI environmental copilot. Ask me anything about ${city.name}'s air quality, health risks, or policy actions.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          text: "AI Copilot requires the backend API. Start the backend server and set GEMINI_API_KEY to enable live responses.",
        },
      ]);
      setQuestion("");
      return;
    }
    chatMutation.mutate(question);
  };

  const recommendations = recData ?? RECOMMENDATIONS;
  const insights = insightData ?? INSIGHTS;
  const alerts = alertData ?? ALERTS;
  const health = healthData?.advice as HealthAdvice | undefined;

  const riskColor = (lvl?: string) =>
    lvl === "Severe"
      ? "destructive"
      : lvl === "High"
        ? "warning"
        : lvl === "Moderate"
          ? "info"
          : "success";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Environmental Intelligence Panel
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">AI Copilot · {city.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by Gemini 1.5 Flash · grounded in live telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={isApiConnected ? "success" : "warning"}>
            <Sparkles className="size-3" /> {isApiConnected ? "Gemini · live" : "Mock mode"}
          </Pill>
          {alerts &&
            Array.isArray(alerts) &&
            alerts.filter((a: { severity: string }) => a.severity === "critical").length > 0 && (
              <Pill tone="destructive">
                <AlertTriangle className="size-3" />{" "}
                {alerts.filter((a: { severity: string }) => a.severity === "critical").length}{" "}
                critical
              </Pill>
            )}
        </div>
      </header>

      {/* Live metrics strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { icon: Wind, label: "AQI", v: city.aqi, unit: "", warn: city.aqi > 100 },
          { icon: Activity, label: "PM2.5", v: city.pm25, unit: "µg", warn: city.pm25 > 35 },
          { icon: Droplets, label: "Water QI", v: city.water, unit: "/100", warn: city.water < 70 },
          { icon: Thermometer, label: "Temp", v: `${city.temp}°C`, unit: "", warn: city.temp > 38 },
          { icon: Eye, label: "Risk", v: city.risk, unit: "/100", warn: city.risk > 60 },
          { icon: Leaf, label: "EcoScore", v: city.eco, unit: "/100", warn: city.eco < 50 },
        ].map((m) => (
          <div
            key={m.label}
            className={cn(
              "rounded-xl border p-3",
              m.warn
                ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5"
                : "border-border",
            )}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <m.icon className="size-3" />
              {m.label}
            </div>
            <div className="text-xl font-semibold tabular-nums mt-1">
              {m.v}
              <span className="text-xs text-muted-foreground">{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex glass rounded-xl p-1 gap-1 w-fit">
        {(["chat", "health", "insights", "actions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm capitalize transition-all",
              tab === t
                ? "aurora text-primary-foreground shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "chat"
              ? "💬 Chat"
              : t === "health"
                ? "🩺 Health"
                : t === "insights"
                  ? "📊 Insights"
                  : "⚡ Actions"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* ── CHAT TAB ── */}
          {tab === "chat" && (
            <>
              <Panel
                eyebrow="Conversation"
                title={
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Environmental Copilot
                  </div>
                }
              >
                <div className="min-h-[360px] max-h-[480px] overflow-y-auto space-y-4 pr-1">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {m.role === "ai" && (
                        <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0 mt-0.5">
                          <Sparkles className="size-3.5" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          m.role === "user"
                            ? "glass rounded-tr-sm"
                            : "bg-muted/40 rounded-tl-sm text-muted-foreground",
                        )}
                      >
                        {m.text}
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
                  {chatMutation.isPending && (
                    <div className="flex gap-3">
                      <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
                        <Sparkles className="size-3.5" />
                      </div>
                      <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Analysing environmental data…
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <div className="rounded-xl border border-input bg-background/40 p-1.5 flex items-center gap-2">
                    <input
                      placeholder="Ask about air quality, health risks, or policy actions…"
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    />
                    <button
                      onClick={handleSend}
                      disabled={chatMutation.isPending || !question.trim()}
                      className="aurora text-primary-foreground rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {chatMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                      Ask
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuestion(s)}
                        className="text-xs px-2.5 py-1 rounded-full glass text-muted-foreground hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>
            </>
          )}

          {/* ── HEALTH TAB ── */}
          {tab === "health" && (
            <Panel
              eyebrow="AI Health Advisor"
              title={
                <div className="flex items-center gap-2">
                  <Heart className="size-4 text-[var(--color-destructive)]" />
                  Health advisory · {city.name}
                </div>
              }
            >
              {!health ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Get Gemini-powered health recommendations based on current AQI ({city.aqi}),
                    PM2.5 ({city.pm25} µg/m³), temperature ({city.temp}°C).
                  </p>
                  <button
                    onClick={() => fetchHealth()}
                    disabled={healthLoading || !isApiConnected}
                    className="aurora text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {healthLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Heart className="size-3.5" />
                    )}
                    Generate health advice
                  </button>
                  {!isApiConnected && (
                    <p className="text-xs text-muted-foreground">
                      Backend required for AI health advice
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "rounded-xl p-4 border",
                      riskColor(health.riskLevel) === "destructive"
                        ? "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/8"
                        : riskColor(health.riskLevel) === "warning"
                          ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8"
                          : "border-[var(--color-success)]/30 bg-[var(--color-success)]/8",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Risk Level: {health.riskLevel}</div>
                      <Pill
                        tone={
                          riskColor(health.riskLevel) as
                            "success" | "warning" | "destructive" | "info"
                        }
                      >
                        {health.riskLevel}
                      </Pill>
                    </div>
                    <p className="text-sm mt-2">{health.summary}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: "Outdoor activities", icon: "🌿", value: health.outdoor },
                      { label: "Exercise", icon: "🏃", value: health.exercise },
                      { label: "Sensitive groups", icon: "🫁", value: health.sensitiveGroups },
                      { label: "Masks", icon: "😷", value: health.masks },
                      { label: "Schools", icon: "🏫", value: health.schools },
                      { label: "Elderly care", icon: "👴", value: health.elderly },
                      { label: "Children", icon: "👶", value: health.children },
                      { label: "General public", icon: "👥", value: health.generalPublic },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border p-3">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {item.icon} {item.label}
                        </div>
                        <div className="text-sm mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      qc.removeQueries({ queryKey: ["health-advice", city.id] });
                      fetchHealth();
                    }}
                    className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5"
                  >
                    <Loader2 className="size-3" /> Refresh
                  </button>
                </div>
              )}
            </Panel>
          )}

          {/* ── INSIGHTS TAB ── */}
          {tab === "insights" && (
            <Panel
              eyebrow="AI Intelligence"
              title={
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Pattern intelligence · {city.name}
                </div>
              }
            >
              <div className="grid sm:grid-cols-2 gap-3">
                {(Array.isArray(insights) ? insights : INSIGHTS).map(
                  (item: { title: string; body: string; tag: string }) => (
                    <div
                      key={item.title}
                      className="rounded-xl bg-muted/30 p-4 border border-border hover:border-primary/40 transition-colors"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {item.tag}
                      </div>
                      <div className="text-sm font-medium mt-1">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {item.body}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Panel>
          )}

          {/* ── ACTIONS TAB ── */}
          {tab === "actions" && (
            <Panel
              eyebrow="AI Recommendations"
              title={
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-primary" />
                  Suggested actions · {city.name}
                </div>
              }
            >
              <div className="grid md:grid-cols-2 gap-3">
                {(Array.isArray(recommendations) ? recommendations : RECOMMENDATIONS).map(
                  (r: { title: string; impact: string; effort: string; confidence: number }) => (
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
                        <button className="text-xs glass rounded-md px-2.5 py-1.5">Simulate</button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Panel
            eyebrow="Risk feed"
            title={
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-[var(--color-destructive)]" />
                Active alerts
              </div>
            }
          >
            <div className="space-y-2">
              {(Array.isArray(alerts) ? alerts.slice(0, 5) : ALERTS.slice(0, 5)).map(
                (a: {
                  id?: string;
                  _id?: string;
                  severity: string;
                  title: string;
                  area: string;
                  time?: string;
                  createdAt?: string;
                }) => (
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
                      <button className="mt-1.5 text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                        AI explanation <ChevronRight className="size-3" />
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="Sustainability"
            title={
              <div className="flex items-center gap-2">
                <Leaf className="size-4 text-[var(--color-success)]" />
                AI suggestions
              </div>
            }
          >
            <ul className="space-y-3 text-sm">
              {[
                "Retrofit 12 municipal buildings with rooftop solar (−1,240 tCO₂/yr).",
                "Expand BRT corridor on A-19 — projected −22 NO₂ peak.",
                "Mandate construction dust covers in Wards 4, 7, 12.",
                "Audit 3 industrial clusters with anomaly score > 0.82.",
              ].map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
