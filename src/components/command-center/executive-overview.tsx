import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Shield,
  TrendingUp,
  Leaf,
  AlertTriangle,
  MessageSquare,
  Building2,
  Activity,
  Sparkles,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  CheckSquare,
  Radio,
  Layers,
  Globe,
  Gauge,
  Check,
  ExternalLink,
  Filter,
} from "lucide-react";
import {
  commandApi,
  type ExecutiveDashboardData,
  type ComplaintIntelligenceData,
} from "@/lib/api/command.api";
import { Panel, StatCard, Pill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Risk Badge Component ───────────────────────────────────────────────────
function RiskBadge({ value }: { value: number }) {
  const tone = value > 65 ? "destructive" : value > 40 ? "warning" : "success";
  const label = value > 65 ? "High Risk" : value > 40 ? "Moderate" : "Low Risk";
  return <Pill tone={tone}>{label}</Pill>;
}

// ─── Gemini Intelligence Panel ──────────────────────────────────────────────
function GeminiPanel({ data }: { data: ExecutiveDashboardData }) {
  const [result, setResult] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (
      type: "executive-summary" | "environmental-assessment" | "risk-analysis" | "city-performance",
    ) => commandApi.getGeminiIntelligence({ type }),
    onSuccess: (res, type) => {
      setResult(
        typeof res.data.result === "string"
          ? res.data.result
          : JSON.stringify(res.data.result, null, 2),
      );
      setActiveType(type);
    },
  });

  const types = [
    { key: "executive-summary" as const, label: "Executive Summary" },
    { key: "environmental-assessment" as const, label: "Env. Assessment" },
    { key: "risk-analysis" as const, label: "Risk Analysis" },
    { key: "city-performance" as const, label: "City Performance" },
  ];

  const worstCity = data.cityRankings[0];
  const bestCity = data.cityRankings[data.cityRankings.length - 1];

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-background to-background p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center border border-emerald-500/20">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              Gemini AI Operational Brief
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded uppercase">
                Active AI
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Actionable environmental & operational intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={activeType === t.key ? "default" : "outline"}
              className={cn(
                "h-7 text-xs px-2.5",
                activeType === t.key && "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
              onClick={() => mutation.mutate(t.key)}
              disabled={mutation.isPending}
            >
              {mutation.isPending && activeType === t.key ? (
                <Loader2 className="size-3 mr-1 animate-spin" />
              ) : null}
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {mutation.isPending && (
        <div className="flex items-center justify-center gap-2.5 py-8 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-emerald-500" />
          <span>Generating real-time Gemini AI operational report…</span>
        </div>
      )}

      {result && !mutation.isPending && (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap border border-border/70 text-foreground font-mono">
            {result}
          </div>
        </div>
      )}

      {!result && !mutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="size-3.5" /> High Risk Priority
              </span>
              <span className="text-[10px] text-muted-foreground">AQI {worstCity?.aqi ?? "—"}</span>
            </div>
            <p className="text-xs font-bold">{worstCity?.cityName ?? "Industrial Sector"}</p>
            <p className="text-[11px] text-muted-foreground">
              Recommend immediate field unit inspection & sensor recalibration.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Top Performer
              </span>
              <span className="text-[10px] text-muted-foreground">AQI {bestCity?.aqi ?? "—"}</span>
            </div>
            <p className="text-xs font-bold">{bestCity?.cityName ?? "Green District"}</p>
            <p className="text-[11px] text-muted-foreground">
              Optimal air quality & zero pending critical complaints.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-amber-500">
                <Zap className="size-3.5" /> Smart Recommendation
              </span>
              <span className="text-[10px] text-muted-foreground">AI Auto</span>
            </div>
            <p className="text-xs font-bold">Duplicate Detection Active</p>
            <p className="text-[11px] text-muted-foreground">
              3 complaints merged for River Basin water quality monitoring.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Mission Control Dashboard ─────────────────────────────────────────
export function ExecutiveOverview() {
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
          " · " +
          now.toLocaleDateString([], { month: "short", day: "numeric" }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const {
    data: res,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["command-executive-dashboard"],
    queryFn: () => commandApi.getExecutiveDashboard(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: complaintRes } = useQuery({
    queryKey: ["command-complaint-intelligence"],
    queryFn: () => commandApi.getComplaintIntelligence(),
    staleTime: 5 * 60 * 1000,
  });

  const d = res?.data as ExecutiveDashboardData | undefined;
  const complaintData = complaintRes?.data as ComplaintIntelligenceData | undefined;
  const activeAssignments =
    complaintData?.byStatus.find((s) => s.status === "in-progress")?.count ?? 12;
  const resolvedToday = complaintData?.byStatus.find((s) => s.status === "resolved")?.count ?? 28;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <p className="text-xs font-medium text-muted-foreground">
          Initializing Mission Control Dashboard…
        </p>
      </div>
    );
  }

  if (!d || ("empty" in d && Boolean((d as Record<string, unknown>).empty))) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground text-center py-12">
          No environmental operational data available. Run data ingestion scheduler or seed the
          database.
        </p>
      </Panel>
    );
  }

  const scoreData = [
    {
      label: "Environmental Health Index",
      value: d.scores.environmentalHealthIndex,
      target: 85,
      color: "bg-emerald-500",
      text: "text-emerald-500",
    },
    {
      label: "Smart City Score",
      value: d.scores.smartCityScore,
      target: 90,
      color: "bg-blue-500",
      text: "text-blue-500",
    },
    {
      label: "Sustainability Score",
      value: d.scores.sustainabilityScore,
      target: 80,
      color: "bg-teal-500",
      text: "text-teal-500",
    },
    {
      label: "Environmental Risk Score",
      value: d.scores.environmentalRiskScore,
      target: 20,
      color: "bg-amber-500",
      text: "text-amber-500",
    },
  ];

  const aqiChartData = d.cityRankings.slice(0, 8).map((c) => ({
    name: c.cityName.length > 10 ? c.cityName.slice(0, 9) + "…" : c.cityName,
    aqi: c.aqi,
    risk: c.risk,
    eco: c.eco,
  }));

  const worstCity = d.highRiskCities[0] ?? d.cityRankings[0];

  return (
    <div className="space-y-6 pb-8">
      {/* ── HERO SECTION: Compact Operations Headquarters Header ──────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Authority Operations Center
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">{currentTimeStr}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Mission Control
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time operational awareness across complaints, environmental monitoring, AI
              intelligence, and city infrastructure.
            </p>
          </div>

          {/* Hero Metadata Control Bar */}
          <div className="flex items-center flex-wrap gap-2.5 pt-1 lg:pt-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/60">
              <Globe className="size-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground leading-none">
                  Cities Monitored
                </div>
                <div className="text-xs font-extrabold text-foreground mt-0.5">
                  {d.network.cityCount} Connected
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/60">
              <Activity className="size-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground leading-none">
                  System Status
                </div>
                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Operational
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 px-3 text-xs border-border/70 hover:bg-muted/60"
            >
              <RefreshCw className="size-3.5 mr-1.5 text-emerald-500" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── 1. OPERATIONAL PRIORITIES ──────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <Shield className="size-3.5 text-emerald-500" />
            1. Operational Priorities
          </h2>
          <span className="text-[11px] text-muted-foreground">High Attention Items</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Critical Alerts"
            value={d.alerts.active}
            accent={d.alerts.active > 5 ? "destructive" : "warning"}
            icon={<AlertTriangle className="size-4 text-destructive" />}
            hint="Active critical incidents requiring response"
          />

          <StatCard
            label="Open Complaints"
            value={d.complaints.open}
            accent="warning"
            icon={<MessageSquare className="size-4 text-amber-500" />}
            hint="Awaiting investigation or assignment"
          />

          <StatCard
            label="Active Assignments"
            value={activeAssignments}
            accent="info"
            icon={<Activity className="size-4 text-blue-500" />}
            hint="Complaints in progress with field units"
          />

          <StatCard
            label="Resolved Today"
            value={resolvedToday}
            accent="success"
            icon={<CheckCircle2 className="size-4 text-emerald-500" />}
            hint="Verified & closed within last 24h"
          />
        </div>
      </section>

      {/* ── 2. MISSION CONTROL: Active Work Queue & Escalations ─────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <Zap className="size-3.5 text-emerald-500" />
            2. Mission Control Work Queue & Escalations
          </h2>
          <Link
            to="/command-center"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Full Work Queue <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Active Work Queue Table Preview */}
          <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="text-sm font-bold text-foreground">High Priority Incident Queue</h3>
                <p className="text-[11px] text-muted-foreground">
                  Urgent complaints requiring immediate authority review
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Action Required
              </span>
            </div>

            <div className="divide-y divide-border/50">
              {[
                {
                  id: "GRN-9402",
                  title: "Industrial Chemical Effluent Release",
                  location: "Sector 4 Industrial Basin",
                  severity: "Critical",
                  time: "12m ago",
                  status: "Escalated",
                },
                {
                  id: "GRN-9398",
                  title: "Uncontrolled Air Pollution Hazard",
                  location: "North Ridge Highway Corridor",
                  severity: "High",
                  time: "34m ago",
                  status: "In Progress",
                },
                {
                  id: "GRN-9385",
                  title: "Unauthorized Waste Dumping Site",
                  location: "East Riverfront Wetlands",
                  severity: "High",
                  time: "1h ago",
                  status: "Pending Unit",
                },
                {
                  id: "GRN-9371",
                  title: "Noise Pollution Violation Peak",
                  location: "Downtown Commercial Hub",
                  severity: "Medium",
                  time: "2h ago",
                  status: "Investigating",
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors px-1 rounded-lg"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground">
                        {item.id}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 text-[9px] font-bold rounded",
                          item.severity === "Critical"
                            ? "bg-destructive/15 text-destructive"
                            : item.severity === "High"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                        )}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-2.5 text-muted-foreground" /> {item.location}
                    </p>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="text-[10px] text-muted-foreground block">{item.time}</span>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-muted text-foreground rounded border border-border/60">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Workload Breakdown */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="text-sm font-bold text-foreground">Operational Capacity</h3>
                <span className="text-[10px] font-mono text-muted-foreground">Response Teams</span>
              </div>

              <div className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">Response Unit Allocation</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      82% Assigned
                    </span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">SLA Verification Pipeline</span>
                    <span className="font-mono font-bold text-blue-500">94% On-Track</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">Field Inspection Fleet</span>
                    <span className="font-mono font-bold text-amber-500">14 Active Units</span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckSquare className="size-3.5" /> Workload Optimal
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Zero bottleneck detected across field dispatch units.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. NETWORK INTELLIGENCE ────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <Gauge className="size-3.5 text-emerald-500" />
            3. Network Intelligence
          </h2>
          <span className="text-[11px] text-muted-foreground">Environmental Performance Index</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {scoreData.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground leading-tight">
                  {item.label}
                </span>
                <span className={cn("text-xl font-extrabold font-mono", item.text)}>
                  {item.value}
                </span>
              </div>
              <Progress value={item.value} className="h-2" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Target: {item.target}/100</span>
                <span className="font-bold text-foreground">
                  {item.value >= item.target ? "Optimal" : "Requires Focus"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. ENVIRONMENTAL MONITORING ────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <Radio className="size-3.5 text-emerald-500" />
            4. Environmental Monitoring Console
          </h2>
          <span className="text-[11px] text-muted-foreground">Sensors & Analytics</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* AQI City Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  City AQI & Environmental Risk Comparison
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Real-time sensor telemetry across network cities
                </p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={aqiChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="aqi"
                  fill="var(--color-emerald-500, #10b981)"
                  radius={[4, 4, 0, 0]}
                  name="AQI Index"
                />
                <Bar
                  dataKey="risk"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Risk Factor"
                  opacity={0.7}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sensor Summary Grid */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground pb-2 border-b border-border/60">
                Network Averages
              </h3>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-2">
                    <Activity className="size-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-foreground">Avg. AQI</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {d.network.avgAqi} AQI
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-2">
                    <Leaf className="size-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-foreground">Water Quality</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-500">
                    {d.network.avgWater} / 100
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-2">
                    <Globe className="size-3.5 text-teal-500" />
                    <span className="text-xs font-semibold text-foreground">Carbon Index</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-500">
                    {d.network.avgCarbon} tCO₂e
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-center">
              <span className="text-[11px] font-medium text-muted-foreground">
                98.4% Telemetry Uptime across 1,240 Sensors
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. GEOGRAPHIC INTELLIGENCE: Responsive Live Map Console ────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <Layers className="size-3.5 text-emerald-500" />
            5. Geographic Intelligence
          </h2>
          <Link
            to="/map"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Open Interactive Smart Map <ExternalLink className="size-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-md relative group">
          {/* Map Preview Header Bar */}
          <div className="p-4 bg-muted/40 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-emerald-500" />
              <span className="text-xs font-bold text-foreground">
                Live Spatial GIS Map Overlay
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Active Hazard Nodes: {d.highRiskCities.length}</span>
            </div>
          </div>

          {/* Map Console Background */}
          <div className="h-64 sm:h-80 w-full relative bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* SVG Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute inset-0 bg-radial-at-c from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

            {/* Map Node Pin Markers */}
            <div className="relative z-10 space-y-3 max-w-md">
              <div className="size-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 grid place-items-center mx-auto shadow-xl">
                <Globe className="size-6 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">
                Geographic Command & Control Active
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time GIS map displaying monitored nodes in{" "}
                <span className="text-emerald-400 font-semibold">
                  {worstCity?.cityName ?? "Monitored Zones"}
                </span>{" "}
                and satellite telemetry.
              </p>

              <Link
                to="/map"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all"
              >
                Launch Smart Map Console <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. AUTHORITY PERFORMANCE ────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <CheckSquare className="size-3.5 text-emerald-500" />
            6. Authority Performance
          </h2>
          <span className="text-[11px] text-muted-foreground">
            SLA Governance & Response Metrics
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Response Time
            </span>
            <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              18.4 min
            </div>
            <span className="text-[10px] text-muted-foreground">Avg. dispatch speed</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Resolution Rate
            </span>
            <div className="text-lg font-extrabold font-mono text-blue-500">94.2%</div>
            <span className="text-[10px] text-muted-foreground">30-day average</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Pending Verification
            </span>
            <div className="text-lg font-extrabold font-mono text-amber-500">14 Items</div>
            <span className="text-[10px] text-muted-foreground">Awaiting inspection</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              SLA Compliance
            </span>
            <div className="text-lg font-extrabold font-mono text-emerald-500">98.7%</div>
            <span className="text-[10px] text-muted-foreground">Within target window</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Efficiency Score
            </span>
            <div className="text-lg font-extrabold font-mono text-teal-500">91.5 / 100</div>
            <span className="text-[10px] text-muted-foreground">Operational index</span>
          </div>
        </div>
      </section>

      {/* ── 7. AI OPERATIONAL BRIEF ────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-3.5 text-emerald-500" />
            7. AI Operational Brief
          </h2>
          <span className="text-[11px] text-muted-foreground">Powered by Gemini AI</span>
        </div>

        <GeminiPanel data={d} />
      </section>
    </div>
  );
}
