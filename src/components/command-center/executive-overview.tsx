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
} from "recharts";
import {
  Shield,
  AlertTriangle,
  MessageSquare,
  Activity,
  Sparkles,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowUpRight,
  Globe,
  ExternalLink,
  FileText,
  Users,
  Inbox,
  PlayCircle,
  ClipboardCheck,
  XCircle,
  CalendarClock,
  Leaf,
  TriangleAlert,
} from "lucide-react";
import {
  commandApi,
  type ExecutiveDashboardData,
  type ComplaintIntelligenceData,
} from "@/lib/api/command.api";
import { complaintApi, alertApi } from "@/lib/api/services.api";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function ageLabel(d: string) {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    open: "#f59e0b",
    "in-progress": "#3b82f6",
    resolved: "#10b981",
    closed: "#6b7280",
    pending: "#f97316",
    rework: "#ef4444",
    assigned: "#8b5cf6",
  };
  return map[status] ?? "#6b7280";
}

function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "var(--color-destructive)",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#10b981",
  };
  return map[severity] ?? "#6b7280";
}

// ─── Stat tile — clean, no glow ──────────────────────────────────────────────
function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div
          className="size-7 rounded-lg grid place-items-center"
          style={{ background: accent ? `color-mix(in oklab, ${accent} 12%, transparent)` : "var(--color-muted)" }}
        >
          <Icon className="size-3.5" style={{ color: accent ?? "var(--color-muted-foreground)" }} />
        </div>
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    open: "Open",
    "in-progress": "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    pending: "Pending",
    rework: "Rework",
    assigned: "Assigned",
  };
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{
        color,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
      }}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Complaint Status Bar — from real complaint intelligence data ──────────────
function ComplaintStatusBreakdown({ data }: { data: ComplaintIntelligenceData }) {
  const statusOrder = ["open", "assigned", "in-progress", "pending", "resolved", "closed"];
  const statusIcons: Record<string, React.ElementType> = {
    open: Inbox,
    assigned: Users,
    "in-progress": PlayCircle,
    pending: ClipboardCheck,
    resolved: CheckCircle2,
    closed: XCircle,
  };
  const statusLabels: Record<string, string> = {
    open: "New",
    assigned: "Assigned",
    "in-progress": "In Progress",
    pending: "Pending Verification",
    resolved: "Resolved",
    closed: "Closed",
  };

  const total = data.summary.total;

  const rows = statusOrder
    .map((s) => {
      const found = data.byStatus.find((b) => b.status === s);
      return { status: s, count: found?.count ?? 0 };
    })
    .filter((r) => r.count > 0 || ["open", "in-progress", "pending"].includes(r.status));

  if (total === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="size-4" />}
        title="No complaints yet"
        description="Complaints submitted by citizens will appear here once the system receives reports."
      />
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(({ status, count }) => {
        const Icon = statusIcons[status] ?? FileText;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const color = statusColor(status);
        return (
          <div key={status} className="flex items-center gap-3">
            <div
              className="size-7 rounded-lg grid place-items-center shrink-0"
              style={{ background: `color-mix(in oklab, ${color} 10%, transparent)` }}
            >
              <Icon className="size-3.5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{statusLabels[status]}</span>
                <span className="tabular-nums font-semibold" style={{ color }}>
                  {count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent Complaints Feed (real data) ──────────────────────────────────────
interface ComplaintRow {
  _id: string;
  title: string;
  status: string;
  severity: string;
  issueType: string;
  cityId?: string;
  createdAt: string;
  location?: { address?: string };
}

function RecentComplaintsFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["executive-recent-complaints"],
    queryFn: () => complaintApi.getAll({ limit: 8, page: 1 }).then((r) => r.data.complaints as ComplaintRow[]),
    staleTime: 30_000,
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-4" />}
        title="Could not load complaints"
        description="Check your connection or try refreshing."
      />
    );
  }

  const complaints = data ?? [];

  if (complaints.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="size-4" />}
        title="No complaints on record"
        description="When citizens file complaints they'll appear here in real time."
      />
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {complaints.map((c) => (
        <div key={c._id} className="flex items-start gap-3 py-3 first:pt-0">
          <div
            className="size-2 rounded-full mt-1.5 shrink-0"
            style={{ background: severityColor(c.severity) }}
          />
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{c.issueType}</span>
              {c.location?.address && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="size-2.5" />
                  {c.location.address}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge status={c.status} />
            <span className="text-[10px] text-muted-foreground">{ageLabel(c.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Active Alerts Feed (real data) ──────────────────────────────────────────
interface AlertRow {
  _id: string;
  title: string;
  severity: string;
  category?: string;
  cityId?: string;
  area?: string;
  createdAt: string;
  status?: string;
}

function ActiveAlertsFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["executive-active-alerts"],
    queryFn: () => alertApi.getActive().then((r) => r.data.alerts as AlertRow[]),
    staleTime: 30_000,
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-4" />}
        title="Could not load alerts"
        description="Check your connection or try refreshing."
      />
    );
  }

  const alerts = (data ?? []).slice(0, 6);

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="size-4" />}
        title="No active alerts"
        description="Active environmental alerts will appear here when the sensor network detects anomalies."
      />
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const color = severityColor(a.severity);
        return (
          <div
            key={a._id}
            className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card"
          >
            <div
              className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
              style={{ background: `color-mix(in oklab, ${color} 10%, transparent)` }}
            >
              <TriangleAlert className="size-3.5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                {a.area && <span>{a.area}</span>}
                {a.category && <span>· {a.category}</span>}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className="text-[10px] font-bold capitalize"
                style={{ color }}
              >
                {a.severity}
              </span>
              <div className="text-[10px] text-muted-foreground mt-0.5">{ageLabel(a.createdAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Environmental Monitoring Panel ──────────────────────────────────────────
function EnvironmentalMonitoringPanel({ data }: { data: ExecutiveDashboardData }) {
  const hasNetwork = data.network.cityCount > 0;
  const hasCityData = data.cityRankings.length > 0;

  const aqiChartData = data.cityRankings.slice(0, 8).map((c) => ({
    name: c.cityName.length > 10 ? c.cityName.slice(0, 9) + "…" : c.cityName,
    aqi: c.aqi,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Environmental Monitoring</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Latest readings across monitored cities</p>
        </div>
        {data.generatedAt && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            <span>Updated {ageLabel(data.generatedAt)}</span>
          </div>
        )}
      </div>

      {hasNetwork && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-lg font-semibold tabular-nums text-foreground">{data.network.cityCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Cities monitored</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-lg font-semibold tabular-nums text-foreground">{data.network.avgAqi}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Avg AQI</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="text-lg font-semibold tabular-nums text-foreground">{data.network.avgWater}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Avg WQI</div>
          </div>
        </div>
      )}

      {hasCityData ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">AQI by city</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={aqiChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: "var(--color-muted)" }}
              />
              <Bar dataKey="aqi" fill="#10b981" radius={[3, 3, 0, 0]} name="AQI" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon={<Leaf className="size-4" />}
          title="No environmental history available"
          description="Monitoring begins after sensors are connected and data is ingested."
        />
      )}
    </div>
  );
}

// ─── Gemini AI Brief (on-demand only) ────────────────────────────────────────
function GeminiBriefPanel() {
  const [result, setResult] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (type: "executive-summary" | "environmental-assessment" | "risk-analysis") =>
      commandApi.getGeminiIntelligence({ type }),
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
    { key: "environmental-assessment" as const, label: "Environmental" },
    { key: "risk-analysis" as const, label: "Risk Analysis" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-500/10 grid place-items-center border border-emerald-500/20">
            <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Operational Brief</h3>
            <p className="text-xs text-muted-foreground">Generate an on-demand analysis</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={activeType === t.key ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => mutation.mutate(t.key)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && activeType === t.key && (
              <Loader2 className="size-3 mr-1.5 animate-spin" />
            )}
            {t.label}
          </Button>
        ))}
      </div>

      {mutation.isPending && (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-emerald-500" />
          Generating AI analysis…
        </div>
      )}

      {result && !mutation.isPending && (
        <div className="rounded-lg bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap border border-border/60 text-foreground font-mono max-h-64 overflow-y-auto">
          {result}
        </div>
      )}

      {!result && !mutation.isPending && (
        <p className="text-xs text-muted-foreground">
          Select an analysis type above to generate a real-time Gemini AI report.
        </p>
      )}
    </div>
  );
}

// ─── Authority Workload (real data from complaint intelligence) ───────────────
function AuthorityWorkloadPanel({ complaintData }: { complaintData: ComplaintIntelligenceData | undefined }) {
  if (!complaintData) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Authority Workload</h3>
        <EmptyState
          icon={<Users className="size-4" />}
          title="No workload data available"
          description="Complaint assignment data will appear here once authorities are assigned cases."
        />
      </div>
    );
  }

  const openCount = complaintData.byStatus.find((s) => s.status === "open")?.count ?? 0;
  const inProgressCount = complaintData.byStatus.find((s) => s.status === "in-progress")?.count ?? 0;
  const pendingCount = complaintData.byStatus.find((s) => s.status === "pending")?.count ?? 0;
  const resolvedCount = complaintData.byStatus.find((s) => s.status === "resolved")?.count ?? 0;
  const total = complaintData.summary.total;

  const resRate = complaintData.summary.resolutionRate;

  const workloadItems = [
    { label: "Open cases", value: openCount, icon: Inbox, color: "#f59e0b" },
    { label: "Active investigations", value: inProgressCount, icon: Activity, color: "#3b82f6" },
    { label: "Pending approvals", value: pendingCount, icon: ClipboardCheck, color: "#f97316" },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "#10b981" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Authority Workload</h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">{total} total cases</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {workloadItems.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-1.5"
          >
            <div className="flex items-center gap-1.5">
              <Icon className="size-3.5" style={{ color }} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
            <div className="text-xl font-semibold tabular-nums" style={{ color: value > 0 ? color : undefined }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {resRate > 0 && (
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Resolution rate</span>
            <span className="font-semibold text-foreground">{resRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, resRate)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Timeline (real data: complaints + alerts) ───────────────────────
interface ActivityItem {
  id: string;
  icon: React.ElementType;
  label: string;
  detail: string;
  timestamp: number;
  color: string;
}

function ActivityTimeline() {
  const { data: recentComplaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ["executive-activity-complaints"],
    queryFn: () => complaintApi.getAll({ limit: 5 }).then((r) => r.data.complaints as ComplaintRow[]),
    staleTime: 30_000,
    throwOnError: false,
  });

  const { data: activeAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["executive-activity-alerts"],
    queryFn: () => alertApi.getActive().then((r) => r.data.alerts as AlertRow[]),
    staleTime: 30_000,
    throwOnError: false,
  });

  const isLoading = complaintsLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="size-7 rounded-lg bg-muted/50 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted/50 rounded animate-pulse w-1/2" />
              <div className="h-2.5 bg-muted/40 rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const complaintItems: ActivityItem[] = (recentComplaints ?? []).map((c) => ({
    id: `c-${c._id}`,
    icon: c.status === "resolved" ? CheckCircle2 : MessageSquare,
    label: c.status === "resolved" ? "Complaint resolved" : c.status === "in-progress" ? "Complaint in progress" : "Complaint submitted",
    detail: c.title,
    timestamp: new Date(c.createdAt).getTime(),
    color: statusColor(c.status),
  }));

  const alertItems: ActivityItem[] = (activeAlerts ?? []).slice(0, 3).map((a) => ({
    id: `a-${a._id}`,
    icon: TriangleAlert,
    label: "Environmental alert",
    detail: a.title,
    timestamp: new Date(a.createdAt).getTime(),
    color: severityColor(a.severity),
  }));

  const items = [...complaintItems, ...alertItems]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-4" />}
        title="No recent activity"
        description="Complaint submissions, assignments, and environmental alerts will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex items-start gap-3">
            <div
              className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
              style={{ background: `color-mix(in oklab, ${item.color} 10%, transparent)` }}
            >
              <Icon className="size-3.5" style={{ color: item.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── High-risk cities summary ─────────────────────────────────────────────────
function HighRiskCitiesPanel({ data }: { data: ExecutiveDashboardData }) {
  const cities = data.highRiskCities.slice(0, 5);

  if (cities.length === 0) {
    return (
      <EmptyState
        icon={<Globe className="size-4" />}
        title="No high-risk cities detected"
        description="Cities with elevated AQI or risk scores will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {cities.map((city) => {
        const aqiColor =
          city.aqi > 150
            ? "var(--color-destructive)"
            : city.aqi > 100
              ? "#f97316"
              : city.aqi > 50
                ? "#f59e0b"
                : "#10b981";

        return (
          <div
            key={city.cityId}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-card"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="size-2 rounded-full shrink-0"
                style={{ background: aqiColor }}
              />
              <span className="text-sm font-medium text-foreground truncate">{city.cityName}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">AQI</div>
                <div className="text-xs font-semibold tabular-nums" style={{ color: aqiColor }}>
                  {city.aqi}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Risk</div>
                <div
                  className="text-xs font-semibold tabular-nums"
                  style={{
                    color: city.risk > 65 ? "var(--color-destructive)" : city.risk > 40 ? "#f59e0b" : "#10b981",
                  }}
                >
                  {city.risk}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Mission Control Dashboard ──────────────────────────────────────────
export function ExecutiveOverview() {
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
          " · " +
          now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const {
    data: execRes,
    isLoading: execLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["command-executive-dashboard"],
    queryFn: () => commandApi.getExecutiveDashboard(),
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });

  const { data: complaintRes, isLoading: complaintLoading } = useQuery({
    queryKey: ["command-complaint-intelligence"],
    queryFn: () => commandApi.getComplaintIntelligence(),
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });

  const execData = execRes?.data as ExecutiveDashboardData | undefined;
  const complaintData = complaintRes?.data as ComplaintIntelligenceData | undefined;
  const isLoading = execLoading || complaintLoading;

  // Pull real counts from complaint intelligence, no invented fallbacks
  const openCount = complaintData?.byStatus.find((s) => s.status === "open")?.count;
  const inProgressCount = complaintData?.byStatus.find((s) => s.status === "in-progress")?.count;
  const pendingCount = complaintData?.byStatus.find((s) => s.status === "pending")?.count;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  const lastRefreshed = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true })
    : null;

  return (
    <div className="space-y-6 pb-10 max-w-screen-xl mx-auto">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground font-medium">{currentTimeStr}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Mission Control</h1>
          <p className="text-sm text-muted-foreground">
            Operational dashboard · {execData?.network.cityCount ?? "—"} cities monitored
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Refreshed {lastRefreshed}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link to="/map">
              <Globe className="size-3.5 mr-1.5" />
              Open Smart Map
              <ExternalLink className="size-3 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 1. WHAT NEEDS ATTENTION — top-level action stats ────────────────── */}
      {execData ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What needs attention
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Active alerts"
              value={execData.alerts.active > 0 ? execData.alerts.active : "—"}
              hint={execData.alerts.active > 0 ? "Require immediate response" : "No active alerts"}
              icon={AlertTriangle}
              accent={execData.alerts.active > 5 ? "var(--color-destructive)" : execData.alerts.active > 0 ? "#f97316" : undefined}
            />
            <StatTile
              label="Open complaints"
              value={openCount !== undefined ? openCount : "—"}
              hint={openCount !== undefined && openCount > 0 ? "Awaiting assignment" : openCount === 0 ? "Queue is clear" : "No data"}
              icon={Inbox}
              accent={openCount !== undefined && openCount > 0 ? "#f59e0b" : undefined}
            />
            <StatTile
              label="In progress"
              value={inProgressCount !== undefined ? inProgressCount : "—"}
              hint="Active investigations"
              icon={Activity}
              accent={inProgressCount !== undefined && inProgressCount > 0 ? "#3b82f6" : undefined}
            />
            <StatTile
              label="Pending verification"
              value={pendingCount !== undefined ? pendingCount : "—"}
              hint="Awaiting authority sign-off"
              icon={CalendarClock}
              accent={pendingCount !== undefined && pendingCount > 0 ? "#f97316" : undefined}
            />
          </div>
        </section>
      ) : (
        <section>
          <div className="rounded-xl border border-border bg-card p-6">
            <EmptyState
              icon={<Shield className="size-4" />}
              title="Operational data unavailable"
              description="Could not reach the backend. Make sure the server is running and try refreshing."
              action={
                <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-1">
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Try again
                </Button>
              }
            />
          </div>
        </section>
      )}

      {/* ── 2. COMPLAINT MANAGEMENT ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Complaint management
          </h2>
          <Link
            to="/command-center"
            className="text-xs font-medium text-foreground/70 hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Full work queue <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Status breakdown */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Status breakdown</h3>
            {complaintData ? (
              <ComplaintStatusBreakdown data={complaintData} />
            ) : (
              <EmptyState
                icon={<MessageSquare className="size-4" />}
                title="No complaint data"
                description="Complaint status breakdown will load from the backend."
              />
            )}
          </div>

          {/* Recent complaints feed */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Recent complaints</h3>
            <RecentComplaintsFeed />
          </div>
        </div>
      </section>

      {/* ── 3. AUTHORITY WORKLOAD + ACTIVITY ────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Authority workload & activity
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <AuthorityWorkloadPanel complaintData={complaintData} />

          {/* Activity timeline */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Activity timeline</h3>
            <ActivityTimeline />
          </div>
        </div>
      </section>

      {/* ── 4. ACTIVE ALERTS + HIGH-RISK CITIES ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active alerts & risk areas
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Active alerts</h3>
            <ActiveAlertsFeed />
          </div>

          {execData ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">High-risk cities</h3>
              <HighRiskCitiesPanel data={execData} />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <EmptyState
                icon={<Globe className="size-4" />}
                title="City risk data unavailable"
                description="City rankings will appear here once the backend is reachable."
              />
            </div>
          )}
        </div>
      </section>

      {/* ── 5. ENVIRONMENTAL MONITORING ─────────────────────────────────────── */}
      {execData ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Environmental monitoring
          </h2>
          <EnvironmentalMonitoringPanel data={execData} />
        </section>
      ) : null}

      {/* ── 6. GEOGRAPHIC INTELLIGENCE ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Geographic intelligence
        </h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">Smart Map</h3>
              <p className="text-xs text-muted-foreground">
                View monitored locations, sensor data, and complaint hotspots on the interactive map.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/map">
                Open Smart Map
                <ArrowUpRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
          {execData && execData.highRiskCities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-2">
                {execData.highRiskCities.length} high-risk location{execData.highRiskCities.length !== 1 ? "s" : ""} flagged on the network
              </p>
              <div className="flex flex-wrap gap-2">
                {execData.highRiskCities.slice(0, 6).map((c) => (
                  <div
                    key={c.cityId}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 text-xs"
                  >
                    <MapPin className="size-2.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{c.cityName}</span>
                    <span className="text-muted-foreground">AQI {c.aqi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. AI OPERATIONAL BRIEF ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI operational brief
        </h2>
        <GeminiBriefPanel />
      </section>
    </div>
  );
}
