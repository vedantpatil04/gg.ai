import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Shield,
  AlertTriangle,
  MessageSquare,
  Activity,
  Sparkles,
  Loader2,
  RefreshCw,
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
  Leaf,
  TriangleAlert,
} from "lucide-react";
import {
  commandApi,
  type ExecutiveDashboardData,
} from "@/lib/api/command.api";
import { complaintApi, alertApi } from "@/lib/api/services.api";
import { EmptyState, Pill, WorkspaceHeader } from "@/components/ui-bits";
import {
  ISSUE_LABELS,
  SEVERITY_TONE,
  STATUS_TONE,
  STATUS_LABEL,
} from "@/components/command-center/investigation-workspace";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

// ─── Cross-tab navigation ─────────────────────────────────────────────────────
// Mission Control never implements the Work Queue / Monitoring modules itself —
// it only hands off to the existing tab-switching mechanism the Phase 1 shell
// already exposes (see command-center.tsx). Typed loosely here so this file
// has no dependency on that route's internal tab-id union.
type NavigateFn = (topTabId: string, subTabId?: string) => void;

// ─── Shared helpers ───────────────────────────────────────────────────────────
function ageLabel(d: string) {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
}

// Real, non-terminal statuses — a complaint still on the authority's active
// caseload. "closed" and "rejected" are end states and excluded from workload.
const ACTIVE_STATUSES = new Set([
  "pending",
  "in-progress",
  "awaiting_citizen_review",
  "resolved",
  "rework",
]);

function nextActionLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Start Investigation";
    case "in-progress":
      return "Continue Investigation";
    case "rework":
      return "Address Rework";
    case "awaiting_citizen_review":
      return "View Details";
    case "resolved":
      return "View Details";
    default:
      return "View Details";
  }
}

// ─── Real data shapes (from GET /complaints, already scoped server-side to
// the authenticated authority's own assignedTo — see complaint.controller.ts) ─
interface ComplaintEvent {
  type: string;
  message: string;
  timestamp: string;
  userName?: string;
}

interface ComplaintRow {
  _id: string;
  title: string;
  status: string;
  severity: string;
  issueType: string;
  cityId?: string;
  createdAt: string;
  updatedAt: string;
  location?: { address?: string };
  events?: ComplaintEvent[];
}

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

// ─── Priority stat tile — compact, no glow/gradient ───────────────────────────
function PriorityTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ElementType;
  tone?: "warning" | "info" | "destructive" | "success";
  onClick?: () => void;
}) {
  const toneVar: Record<string, string> = {
    warning: "var(--color-warning)",
    info: "var(--color-info)",
    destructive: "var(--color-destructive)",
    success: "var(--color-success)",
  };
  const accent = tone ? toneVar[tone] : undefined;

  const content = (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-left w-full h-full">
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

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-transform hover:-translate-y-0.5"
    >
      {content}
    </button>
  );
}

// ─── Needs Attention row ──────────────────────────────────────────────────────
function NeedsAttentionRow({ complaint, onNavigate }: { complaint: ComplaintRow; onNavigate?: NavigateFn }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card">
      <div
        className="size-2 rounded-full shrink-0"
        style={{
          background:
            complaint.severity === "critical" || complaint.severity === "high"
              ? "var(--color-destructive)"
              : "var(--color-warning)",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{complaint.title}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs text-muted-foreground">
            {ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}
          </span>
          {complaint.location?.address && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="size-2.5" />
              {complaint.location.address}
            </span>
          )}
          <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </Pill>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-[10px] text-muted-foreground">{ageLabel(complaint.updatedAt)}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onNavigate?.("work-queue", "complaints")}
        >
          {nextActionLabel(complaint.status)}
        </Button>
      </div>
    </div>
  );
}

// ─── My Work row ───────────────────────────────────────────────────────────────
function MyWorkRow({ complaint, onNavigate }: { complaint: ComplaintRow; onNavigate?: NavigateFn }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0">
      <div
        className="size-2 rounded-full mt-1.5 shrink-0"
        style={{
          background:
            SEVERITY_TONE[complaint.severity] === "destructive"
              ? "var(--color-destructive)"
              : SEVERITY_TONE[complaint.severity] === "warning"
                ? "var(--color-warning)"
                : "var(--color-success)",
        }}
      />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground truncate">{complaint.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}
          </span>
          {complaint.location?.address && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="size-2.5" />
              {complaint.location.address}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
          {STATUS_LABEL[complaint.status] ?? complaint.status}
        </Pill>
        <span className="text-[10px] text-muted-foreground">{ageLabel(complaint.updatedAt)}</span>
        <button
          type="button"
          onClick={() => onNavigate?.("work-queue", "complaints")}
          className="text-[10px] font-medium text-foreground/70 hover:text-foreground flex items-center gap-0.5"
        >
          {nextActionLabel(complaint.status)}
          <ArrowUpRight className="size-2.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Active Alerts Feed (real data) ──────────────────────────────────────────
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

  const alerts = (data ?? []).slice(0, 5);

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
        const tone = SEVERITY_TONE[a.severity] ?? "muted";
        return (
          <div
            key={a._id}
            className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card"
          >
            <div className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5 bg-muted">
              <TriangleAlert className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                {a.area && <span>{a.area}</span>}
                {a.category && <span>· {a.category}</span>}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <Pill tone={tone}>{a.severity}</Pill>
              <span className="text-[10px] text-muted-foreground">{ageLabel(a.createdAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent Activity — real complaint event log, not fabricated ──────────────
interface FlatEvent {
  key: string;
  type: string;
  message: string;
  timestamp: number;
  complaintTitle: string;
}

const EVENT_ICON: Record<string, React.ElementType> = {
  created: FileText,
  assigned: Users,
  reassigned: Users,
  status_change: Activity,
  image_added: FileText,
  image_removed: FileText,
  note_updated: FileText,
  resolved: CheckCircle2,
  rejected: XCircle,
  verified: CheckCircle2,
  closed: CheckCircle2,
  rework_requested: TriangleAlert,
  resubmitted: RefreshCw,
  citizen_accepted: CheckCircle2,
};

function RecentActivity({ complaints, isLoading }: { complaints: ComplaintRow[]; isLoading: boolean }) {
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

  const items: FlatEvent[] = complaints
    .flatMap((c) =>
      (c.events ?? []).map((e, i) => ({
        key: `${c._id}-${i}`,
        type: e.type,
        message: e.message,
        timestamp: new Date(e.timestamp).getTime(),
        complaintTitle: c.title,
      })),
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-4" />}
        title="No recent activity"
        description="Assignment, investigation, and resolution events on your cases will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = EVENT_ICON[item.type] ?? Activity;
        return (
          <div key={item.key} className="flex items-start gap-3">
            <div className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5 bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{item.message}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.complaintTitle}</p>
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

// ─── Environmental Attention — compact, network-wide real context ────────────
function EnvironmentalAttention({
  data,
  onNavigate,
}: {
  data: ExecutiveDashboardData | undefined;
  onNavigate?: NavigateFn;
}) {
  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <EmptyState
          icon={<Leaf className="size-4" />}
          title="Environmental data unavailable"
          description="Could not reach the backend. Try refreshing."
        />
      </div>
    );
  }

  const topRisk = data.highRiskCities[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Environmental Attention</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Network-wide conditions across {data.network.cityCount} monitored{" "}
            {data.network.cityCount === 1 ? "city" : "cities"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("environmental", "environmental")}
          className="text-xs font-medium text-foreground/70 hover:text-foreground flex items-center gap-1 shrink-0"
        >
          Open Monitoring <ArrowUpRight className="size-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/60">
          <div className="text-lg font-semibold tabular-nums text-foreground">{data.network.avgAqi}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Avg AQI</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/60">
          <div className="text-lg font-semibold tabular-nums text-foreground">{data.network.avgWater}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Avg WQI</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/60">
          <div
            className="text-lg font-semibold tabular-nums"
            style={{ color: data.alerts.active > 0 ? "var(--color-destructive)" : "var(--color-foreground)" }}
          >
            {data.alerts.active}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Active alerts</div>
        </div>
      </div>

      {topRisk ? (
        <div className="flex items-center gap-2 pt-1 text-xs">
          <MapPin className="size-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Highest risk right now:</span>
          <span className="font-medium text-foreground">{topRisk.cityName}</span>
          <span className="text-muted-foreground">AQI {topRisk.aqi}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No cities currently flagged as high-risk.</p>
      )}
    </div>
  );
}

// ─── Smart Map Preview ─────────────────────────────────────────────────────────
function SmartMapPreview({ data }: { data: ExecutiveDashboardData | undefined }) {
  const cities = data?.highRiskCities.slice(0, 5) ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Smart Map</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Where is the current risk?</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/map">
            Open Smart Map
            <ArrowUpRight className="size-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>

      {cities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {cities.map((c) => (
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
      ) : (
        <p className="text-xs text-muted-foreground">No complaint hotspots or risk locations flagged right now.</p>
      )}
    </div>
  );
}

// ─── Gemini AI Brief (on-demand only, real backend call) ─────────────────────
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

// ─── Main Mission Control Dashboard ──────────────────────────────────────────
export function ExecutiveOverview({ onNavigate }: { onNavigate?: NavigateFn }) {
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

  // Real, authority-scoped complaint data. The backend hard-scopes this to
  // the authenticated authority's own assignedTo complaints (see
  // complaint.controller.ts getComplaints) — this is genuinely "my" caseload,
  // not a network-wide aggregate.
  const {
    data: myComplaints,
    isLoading: complaintsLoading,
    isError: complaintsError,
    refetch: refetchComplaints,
    dataUpdatedAt: complaintsUpdatedAt,
  } = useQuery({
    queryKey: ["mission-control-my-complaints"],
    queryFn: () => complaintApi.getAll({ limit: 200 }).then((r) => r.data.complaints as ComplaintRow[]),
    staleTime: 60_000,
    throwOnError: false,
  });

  // Real, network-wide environmental context (cities, AQI, active alerts,
  // high-risk locations) — appropriate for the environmental section, since
  // an authority's environmental responsibility spans the monitored network,
  // not just their assigned complaints.
  const {
    data: execRes,
    isLoading: execLoading,
    refetch: refetchExec,
    dataUpdatedAt: execUpdatedAt,
  } = useQuery({
    queryKey: ["command-executive-dashboard"],
    queryFn: () => commandApi.getExecutiveDashboard(),
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });

  const execData = execRes?.data as ExecutiveDashboardData | undefined;
  const complaints = myComplaints ?? [];
  const isLoading = complaintsLoading || execLoading;

  const refetchAll = () => {
    refetchComplaints();
    refetchExec();
  };

  // ── Derived, real metrics — no invented counts ──────────────────────────
  const activeComplaints = complaints.filter((c) => ACTIVE_STATUSES.has(c.status));
  const countByStatus = (status: string) => complaints.filter((c) => c.status === status).length;

  const assignedToMe = activeComplaints.length;
  const inProgress = countByStatus("in-progress");
  const rework = countByStatus("rework");
  const awaitingReview = countByStatus("awaiting_citizen_review");
  const critical = activeComplaints.filter((c) => c.severity === "critical").length;

  const needsAttention = activeComplaints
    .filter(
      (c) =>
        c.status === "pending" ||
        c.status === "rework" ||
        (c.severity === "critical" && c.status !== "awaiting_citizen_review"),
    )
    .sort((a, b) => {
      const rank = (c: ComplaintRow) =>
        c.severity === "critical" ? 0 : c.status === "rework" ? 1 : 2;
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    })
    .slice(0, 6);

  const myWorkList = [...activeComplaints]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const lastUpdatedTimestamp = Math.max(complaintsUpdatedAt || 0, execUpdatedAt || 0);
  const lastRefreshed = lastUpdatedTimestamp
    ? formatDistanceToNow(lastUpdatedTimestamp, { addSuffix: true })
    : null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 w-full">
      {/* ── 1. PAGE HEADER ───────────────────────────────────────────────── */}
      <WorkspaceHeader
        eyebrow={currentTimeStr}
        title="Mission Control"
        description="Your active caseload, what needs action next, and current environmental context."
        action={
          <>
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground hidden sm:inline mr-1">
                Refreshed {lastRefreshed}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={refetchAll} className="h-8 text-xs">
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
          </>
        }
      />

      {/* ── 2. PRIORITY / NEEDS ATTENTION STATS ─────────────────────────── */}
      {complaintsError ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <EmptyState
            icon={<Shield className="size-4" />}
            title="Could not load your caseload"
            description="Make sure the server is running and try refreshing."
            action={
              <Button size="sm" variant="outline" onClick={refetchAll} className="mt-1">
                <RefreshCw className="size-3.5 mr-1.5" />
                Try again
              </Button>
            }
          />
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Priority
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <PriorityTile
              label="Assigned to me"
              value={assignedToMe}
              hint={assignedToMe > 0 ? "Active caseload" : "Queue is clear"}
              icon={Inbox}
              tone={assignedToMe > 0 ? "info" : undefined}
              onClick={() => onNavigate?.("work-queue", "complaints")}
            />
            <PriorityTile
              label="In progress"
              value={inProgress}
              hint="Active investigations"
              icon={PlayCircle}
              tone={inProgress > 0 ? "info" : undefined}
              onClick={() => onNavigate?.("work-queue", "complaints")}
            />
            <PriorityTile
              label="Rework"
              value={rework}
              hint="Returned for rework"
              icon={RefreshCw}
              tone={rework > 0 ? "destructive" : undefined}
              onClick={() => onNavigate?.("work-queue", "complaints")}
            />
            <PriorityTile
              label="Awaiting citizen review"
              value={awaitingReview}
              hint="Waiting on citizen"
              icon={ClipboardCheck}
              tone={awaitingReview > 0 ? "warning" : undefined}
              onClick={() => onNavigate?.("work-queue", "complaints")}
            />
            <PriorityTile
              label="Critical"
              value={critical}
              hint={critical > 0 ? "Requires immediate response" : "None flagged"}
              icon={AlertTriangle}
              tone={critical > 0 ? "destructive" : undefined}
              onClick={() => onNavigate?.("work-queue", "complaints")}
            />
          </div>
        </section>
      )}

      {/* ── 3. NEEDS ATTENTION ──────────────────────────────────────────── */}
      {!complaintsError && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Needs attention
          </h2>
          {needsAttention.length > 0 ? (
            <div className="space-y-2">
              {needsAttention.map((c) => (
                <NeedsAttentionRow key={c._id} complaint={c} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6">
              <EmptyState
                icon={<CheckCircle2 className="size-4" />}
                title="Nothing urgent right now"
                description="New assignments, critical complaints, and rework requests will appear here."
              />
            </div>
          )}
        </section>
      )}

      {/* ── 4. MY WORK + 5. RECENT ACTIVITY ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My work &amp; recent activity
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">My work</h3>
              <button
                type="button"
                onClick={() => onNavigate?.("work-queue", "complaints")}
                className="text-xs font-medium text-foreground/70 hover:text-foreground flex items-center gap-1"
              >
                Full work queue <ArrowUpRight className="size-3" />
              </button>
            </div>
            {complaintsError ? (
              <EmptyState
                icon={<MessageSquare className="size-4" />}
                title="Could not load complaints"
                description="Check your connection or try refreshing."
              />
            ) : myWorkList.length > 0 ? (
              <div className="divide-y divide-border/60">
                {myWorkList.map((c) => (
                  <MyWorkRow key={c._id} complaint={c} onNavigate={onNavigate} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MessageSquare className="size-4" />}
                title="No active complaints assigned"
                description="Complaints assigned to you will appear here."
              />
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            <RecentActivity complaints={complaints} isLoading={complaintsLoading} />
          </div>
        </div>
      </section>

      {/* ── 6. ENVIRONMENTAL ATTENTION + 7. SMART MAP PREVIEW ───────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Environmental &amp; geographic context
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <EnvironmentalAttention data={execData} onNavigate={onNavigate} />
          <SmartMapPreview data={execData} />
        </div>
      </section>

      {/* ── Active alerts (supporting detail for Environmental Attention) ─ */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active environmental alerts
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <ActiveAlertsFeed />
        </div>
      </section>

      {/* ── AI OPERATIONAL BRIEF (existing real functionality, preserved) ─ */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI operational brief
        </h2>
        <GeminiBriefPanel />
      </section>
    </div>
  );
}
