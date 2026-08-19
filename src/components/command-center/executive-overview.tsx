import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Shield,
  AlertTriangle,
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
import { Pill } from "@/components/ui-bits";
import {
  ISSUE_LABELS,
  SEVERITY_TONE,
  STATUS_TONE,
  STATUS_LABEL,
} from "@/components/command-center/investigation-workspace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BoardOperationalCard } from "./BoardOperationalCard";

// ─── Cross-tab navigation ─────────────────────────────────────────────────────
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
      return "Continue";
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

// ─── Real data shapes ─────────────────────────────────────────────────────────
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

// ─── Section Heading Component ───────────────────────────────────────────────
function SectionHeading({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {title}
        </h2>
        {count !== undefined && (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded bg-muted text-muted-foreground border border-border/50">
            {count}
          </span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Priority Stat Tile — Dense, High-Signal ──────────────────────────────────
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
  const toneStyle: Record<string, { bg: string; text: string }> = {
    warning: {
      bg: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
      text: "text-amber-600 dark:text-amber-400",
    },
    info: {
      bg: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400",
      text: "text-sky-600 dark:text-sky-400",
    },
    destructive: {
      bg: "bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400",
      text: "text-red-600 dark:text-red-400",
    },
    success: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
    },
  };

  const style = tone ? toneStyle[tone] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-lg border border-border/70 bg-card/60 p-3 text-left w-full transition-all flex flex-col justify-between group",
        onClick &&
          "hover:border-border hover:bg-card/90 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/40",
      )}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        <div
          className={cn(
            "size-6 rounded-md grid place-items-center shrink-0 transition-colors",
            style ? style.bg : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 w-full">
        <span
          className={cn(
            "text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums",
            style ? style.text : "text-foreground",
          )}
        >
          {value}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground truncate text-right">
            {hint}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Needs Attention Row ──────────────────────────────────────────────────────
function NeedsAttentionRow({
  complaint,
  onNavigate,
}: {
  complaint: ComplaintRow;
  onNavigate?: NavigateFn;
}) {
  const isCritical = complaint.severity === "critical" || complaint.severity === "high";
  const caseId = complaint._id ? `#${complaint._id.slice(-6).toUpperCase()}` : "";

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span
          className={cn(
            "size-2 rounded-full shrink-0",
            isCritical ? "bg-red-500 animate-pulse" : "bg-amber-500",
          )}
          title={`Severity: ${complaint.severity}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {caseId && (
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {caseId}
              </span>
            )}
            <span className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md md:max-w-lg">
              {complaint.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-muted/60 text-muted-foreground border border-border/40">
              {ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}
            </span>
            {complaint.location?.address && (
              <span className="flex items-center gap-1 truncate max-w-[200px] text-[10px]">
                <MapPin className="size-2.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{complaint.location.address}</span>
              </span>
            )}
            <Pill tone={STATUS_TONE[complaint.status] ?? "muted"} className="text-[10px] py-0 px-1.5 h-4">
              {STATUS_LABEL[complaint.status] ?? complaint.status}
            </Pill>
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap hidden sm:inline">
          {ageLabel(complaint.updatedAt)}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px] font-medium bg-muted/30 hover:bg-muted/80 border-border/70"
          onClick={() => onNavigate?.("work-queue", "complaints")}
        >
          {nextActionLabel(complaint.status)}
          <ArrowUpRight className="size-2.5 ml-1 opacity-70" />
        </Button>
      </div>
    </div>
  );
}

// ─── My Work Row ──────────────────────────────────────────────────────────────
function MyWorkRow({
  complaint,
  onNavigate,
}: {
  complaint: ComplaintRow;
  onNavigate?: NavigateFn;
}) {
  const caseId = complaint._id ? `#${complaint._id.slice(-6).toUpperCase()}` : "";
  const sevTone = SEVERITY_TONE[complaint.severity] ?? "muted";

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={cn(
            "size-1.5 rounded-full shrink-0",
            sevTone === "destructive"
              ? "bg-red-500"
              : sevTone === "warning"
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {caseId && (
              <span className="font-mono text-[10px] font-medium text-muted-foreground shrink-0">
                {caseId}
              </span>
            )}
            <p className="text-xs font-medium text-foreground truncate max-w-[180px] sm:max-w-xs">
              {complaint.title}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
            <span>{ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}</span>
            {complaint.location?.address && (
              <>
                <span>·</span>
                <span className="truncate max-w-[140px]">{complaint.location.address}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <Pill tone={STATUS_TONE[complaint.status] ?? "muted"} className="text-[10px] py-0 px-1.5 h-4">
          {STATUS_LABEL[complaint.status] ?? complaint.status}
        </Pill>
        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap hidden sm:inline">
          {ageLabel(complaint.updatedAt)}
        </span>
        <button
          type="button"
          onClick={() => onNavigate?.("work-queue", "complaints")}
          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Open in Work Queue"
        >
          <ArrowUpRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Recent Activity Log ──────────────────────────────────────────────────────
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

function RecentActivity({
  complaints,
  isLoading,
}: {
  complaints: ComplaintRow[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted/40 animate-pulse" />
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
    .slice(0, 7);

  if (items.length === 0) {
    return (
      <div className="px-3.5 py-3 text-xs text-muted-foreground flex items-center gap-2">
        <Activity className="size-3.5 text-muted-foreground/60 shrink-0" />
        <span>No recent activity recorded on assigned cases.</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {items.map((item) => {
        const Icon = EVENT_ICON[item.type] ?? Activity;
        return (
          <div key={item.key} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/20 transition-colors">
            <div className="size-5 rounded grid place-items-center shrink-0 bg-muted/60 text-muted-foreground">
              <Icon className="size-2.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">
                <span className="font-medium">{item.message}</span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{item.complaintTitle}</p>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">
              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Environmental Attention & Telemetry Context ──────────────────────────────
function EnvironmentalAttention({
  data,
  onNavigate,
}: {
  data: ExecutiveDashboardData | undefined;
  onNavigate?: NavigateFn;
}) {
  if (!data) {
    return (
      <div className="p-3.5 text-xs text-muted-foreground flex items-center gap-2">
        <Leaf className="size-3.5 text-muted-foreground/70 shrink-0" />
        <span>Environmental sensor telemetry currently synchronizing…</span>
      </div>
    );
  }

  const cities = data.highRiskCities.slice(0, 4);

  return (
    <div className="p-3.5 space-y-3">
      {/* 3 Telemetry Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-muted/30 border border-border/50 text-center">
          <div className="text-base font-bold font-mono text-foreground tabular-nums">
            {data.network.avgAqi}
          </div>
          <div className="text-[10px] uppercase font-medium text-muted-foreground mt-0.5">
            Avg AQI
          </div>
        </div>
        <div className="p-2 rounded bg-muted/30 border border-border/50 text-center">
          <div className="text-base font-bold font-mono text-foreground tabular-nums">
            {data.network.avgWater}
          </div>
          <div className="text-[10px] uppercase font-medium text-muted-foreground mt-0.5">
            Avg WQI
          </div>
        </div>
        <div className="p-2 rounded bg-muted/30 border border-border/50 text-center">
          <div
            className={cn(
              "text-base font-bold font-mono tabular-nums",
              data.alerts.active > 0 ? "text-red-500" : "text-emerald-500",
            )}
          >
            {data.alerts.active}
          </div>
          <div className="text-[10px] uppercase font-medium text-muted-foreground mt-0.5">
            Alerts Active
          </div>
        </div>
      </div>

      {/* High-risk Hotspots List */}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
          <span>Priority Risk Hotspots ({data.network.cityCount} Cities)</span>
          <button
            type="button"
            onClick={() => onNavigate?.("environmental", "environmental")}
            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 text-[10px]"
          >
            Telemetry <ArrowUpRight className="size-2.5" />
          </button>
        </div>
        {cities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {cities.map((c) => (
              <div
                key={c.cityId}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 border border-border/60 text-xs"
              >
                <MapPin className="size-2.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground text-xs">{c.cityName}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] px-1 py-0.2 rounded font-semibold",
                    c.aqi > 150
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  )}
                >
                  AQI {c.aqi}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">All monitored cities are within baseline tolerances.</p>
        )}
      </div>
    </div>
  );
}

// ─── Active Environmental Alerts Feed ─────────────────────────────────────────
function ActiveAlertsFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["executive-active-alerts"],
    queryFn: () => alertApi.getActive().then((r) => r.data.alerts as AlertRow[]),
    staleTime: 30_000,
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-9 rounded bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
        <span>Could not synchronize sensor alerts.</span>
      </div>
    );
  }

  const alerts = (data ?? []).slice(0, 5);

  if (alerts.length === 0) {
    return (
      <div className="px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
        <span>No active environmental threshold breaches detected across the sensor network.</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {alerts.map((a) => {
        const tone = SEVERITY_TONE[a.severity] ?? "muted";
        return (
          <div
            key={a._id}
            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={cn(
                  "size-5 rounded grid place-items-center shrink-0",
                  tone === "destructive"
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                )}
              >
                <TriangleAlert className="size-2.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {a.area && <span>{a.area}</span>}
                  {a.category && <span>· {a.category}</span>}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <Pill tone={tone} className="text-[10px] py-0 px-1.5 h-4">
                {a.severity}
              </Pill>
              <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                {ageLabel(a.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Gemini AI Operational Brief ──────────────────────────────────────────────
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
    { key: "environmental-assessment" as const, label: "Environmental Assessment" },
    { key: "risk-analysis" as const, label: "Risk Analysis" },
  ];

  return (
    <div className="rounded-lg border border-border/70 bg-card/60 overflow-hidden">
      <div className="px-3.5 py-2.5 bg-muted/20 border-b border-border/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded grid place-items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="size-3" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">AI Operational Intelligence</h3>
            <p className="text-[10px] text-muted-foreground">On-demand multi-source environmental synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {types.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={activeType === t.key ? "default" : "outline"}
              className={cn(
                "h-6 px-2 text-[11px] font-medium border-border/70",
                activeType === t.key && "bg-emerald-600 hover:bg-emerald-700 text-white",
              )}
              onClick={() => mutation.mutate(t.key)}
              disabled={mutation.isPending}
            >
              {mutation.isPending && activeType === t.key && (
                <Loader2 className="size-2.5 mr-1 animate-spin" />
              )}
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-3.5">
        {mutation.isPending && (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-emerald-500" />
            <span>Analyzing caseload telemetry and sensor readings with Gemini…</span>
          </div>
        )}

        {result && !mutation.isPending && (
          <div className="space-y-2">
            <div className="rounded-md bg-muted/40 p-3 text-xs leading-relaxed border border-border/60 text-foreground font-mono max-h-56 overflow-y-auto whitespace-pre-wrap">
              {result}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Synthesized with live database telemetry</span>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-muted-foreground hover:text-foreground underline"
              >
                Clear output
              </button>
            </div>
          </div>
        )}

        {!result && !mutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500/70" />
            <span>
              Select an analysis type above to synthesize authority caseload, citizen complaints, and real-time environmental metrics.
            </span>
          </div>
        )}
      </div>
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

  // Real, authority-scoped complaint data
  const {
    data: myComplaints,
    isLoading: complaintsLoading,
    isError: complaintsError,
    refetch: refetchComplaints,
    dataUpdatedAt: complaintsUpdatedAt,
  } = useQuery({
    queryKey: ["mission-control-my-complaints"],
    queryFn: () =>
      complaintApi.getAll({ limit: 200 }).then((r) => r.data.complaints as ComplaintRow[]),
    staleTime: 60_000,
    throwOnError: false,
  });

  // Real, network-wide environmental context
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

  // ── Derived, real metrics ──────────────────────────────────────────────
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
    .slice(0, 7);

  const lastUpdatedTimestamp = Math.max(complaintsUpdatedAt || 0, execUpdatedAt || 0);
  const lastRefreshed = lastUpdatedTimestamp
    ? formatDistanceToNow(lastUpdatedTimestamp, { addSuffix: true })
    : null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2.5">
        <Loader2 className="size-5 animate-spin text-emerald-500" />
        <p className="text-xs text-muted-foreground">Loading Mission Control dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 w-full">
      {/* ── 1. MISSION CONTROL PAGE HEADER ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Mission Control
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Real-time authority caseload, urgent actions, and environmental sensor intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {currentTimeStr && (
            <span className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/50 hidden md:inline-block">
              {currentTimeStr}
            </span>
          )}
          {lastRefreshed && (
            <span className="text-[11px] text-muted-foreground hidden lg:inline mr-1">
              Updated {lastRefreshed}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            className="h-7 px-2.5 text-xs bg-muted/20 hover:bg-muted/60 border-border/70"
          >
            <RefreshCw className="size-3 mr-1.5" />
            Refresh
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs bg-muted/20 hover:bg-muted/60 border-border/70"
          >
            <Link to="/map">
              <Globe className="size-3 mr-1.5 text-emerald-500" />
              Smart Map
              <ExternalLink className="size-2.5 ml-1 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 1.5 BOARD OPERATIONAL CONTEXT (Automation 4) ─────────── */}
      <BoardOperationalCard />

      {/* ── 2. PRIORITY STATS BAR ───────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <PriorityTile
            label="Assigned to me"
            value={assignedToMe}
            hint={assignedToMe > 0 ? "Active caseload" : "Queue clear"}
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
            hint={rework > 0 ? "Returned for action" : "None"}
            icon={RefreshCw}
            tone={rework > 0 ? "destructive" : undefined}
            onClick={() => onNavigate?.("work-queue", "complaints")}
          />
          <PriorityTile
            label="Awaiting review"
            value={awaitingReview}
            hint="Citizen review"
            icon={ClipboardCheck}
            tone={awaitingReview > 0 ? "warning" : undefined}
            onClick={() => onNavigate?.("work-queue", "complaints")}
          />
          <PriorityTile
            label="Critical"
            value={critical}
            hint={critical > 0 ? "Urgent response" : "None flagged"}
            icon={AlertTriangle}
            tone={critical > 0 ? "destructive" : undefined}
            onClick={() => onNavigate?.("work-queue", "complaints")}
          />
        </div>
      </section>

      {/* ── 3. NEEDS ATTENTION ──────────────────────────────────────────── */}
      <section className="space-y-2">
        <SectionHeading
          title="Needs Attention"
          count={needsAttention.length}
          action={
            needsAttention.length > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                {needsAttention.length} item{needsAttention.length === 1 ? "" : "s"} requiring immediate action
              </span>
            ) : null
          }
        />

        {complaintsError ? (
          <div className="p-3.5 rounded-lg border border-border/60 bg-card/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Could not load caseload from server.</span>
            <Button size="sm" variant="outline" onClick={refetchAll} className="h-6 text-xs px-2">
              Retry
            </Button>
          </div>
        ) : needsAttention.length > 0 ? (
          <div className="rounded-lg border border-border/70 bg-card/60 divide-y divide-border/50 overflow-hidden">
            {needsAttention.map((c) => (
              <NeedsAttentionRow key={c._id} complaint={c} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border/60 bg-card/30 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-foreground">All clear:</span>
            <span>No active complaints currently require urgent escalation or rework. Caseload is normal.</span>
          </div>
        )}
      </section>

      {/* ── 4. MY WORK & RECENT ACTIVITY (Balanced Grid) ───────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left: My Work Queue */}
        <div className="space-y-2">
          <SectionHeading
            title="My Work"
            count={activeComplaints.length}
            action={
              <button
                type="button"
                onClick={() => onNavigate?.("work-queue", "complaints")}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Work Queue <ArrowUpRight className="size-3" />
              </button>
            }
          />
          <div className="rounded-lg border border-border/70 bg-card/60 overflow-hidden">
            {myWorkList.length > 0 ? (
              <div className="divide-y divide-border/50">
                {myWorkList.map((c) => (
                  <MyWorkRow key={c._id} complaint={c} onNavigate={onNavigate} />
                ))}
              </div>
            ) : (
              <div className="px-3.5 py-3 text-xs text-muted-foreground flex items-center gap-2">
                <Inbox className="size-3.5 text-muted-foreground/60 shrink-0" />
                <span>No active complaints currently assigned to you.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity Audit */}
        <div className="space-y-2">
          <SectionHeading title="Recent Activity" />
          <div className="rounded-lg border border-border/70 bg-card/60 overflow-hidden">
            <RecentActivity complaints={complaints} isLoading={complaintsLoading} />
          </div>
        </div>
      </section>

      {/* ── 5. SMART MAP & ACTIVE ENVIRONMENTAL ALERTS (Balanced Grid) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left: Smart Map & Environmental Telemetry */}
        <div className="space-y-2">
          <SectionHeading
            title="Smart Map & Network Status"
            action={
              <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
                <Link to="/map">
                  Open Smart Map <ArrowUpRight className="size-3 ml-1" />
                </Link>
              </Button>
            }
          />
          <div className="rounded-lg border border-border/70 bg-card/60 overflow-hidden">
            <EnvironmentalAttention data={execData} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Right: Active Environmental Alerts */}
        <div className="space-y-2">
          <SectionHeading
            title="Active Environmental Alerts"
            count={execData?.alerts.active}
            action={
              <button
                type="button"
                onClick={() => onNavigate?.("environmental", "alerts")}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                All Alerts <ArrowUpRight className="size-3" />
              </button>
            }
          />
          <div className="rounded-lg border border-border/70 bg-card/60 overflow-hidden">
            <ActiveAlertsFeed />
          </div>
        </div>
      </section>

      {/* ── 6. AI OPERATIONAL BRIEF ─────────────────────────────────────── */}
      <section className="space-y-2">
        <SectionHeading title="AI Operational Brief" />
        <GeminiBriefPanel />
      </section>
    </div>
  );
}
