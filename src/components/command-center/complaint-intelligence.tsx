import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Line,
} from "recharts";
import {
  Loader2,
  ClipboardList,
  AlertOctagon,
  CheckCircle2,
  TrendingDown,
  MapPin,
  RefreshCw,
  BarChart2,
  Settings2,
  Play,
  Clock,
  CheckSquare,
  Shield,
  RotateCcw,
  Lock,
  ChevronRight,
} from "lucide-react";
import { commandApi, type ComplaintIntelligenceData } from "@/lib/api/command.api";
import { complaintApi } from "@/lib/api/services.api";
import { Panel, StatCard, Pill, SectionTitle, WorkspaceHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestigationWorkspace, type ComplaintRecord } from "./investigation-workspace";
import { ISSUE_LABELS, SEVERITY_TONE, STATUS_TONE, STATUS_LABEL } from "./investigation-workspace";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ageLabel(d: string) {
  const h = (Date.now() - new Date(d).getTime()) / 3_600_000;
  if (h < 1) return { text: "Just now", urgent: false, critical: false };
  if (h < 24) return { text: `${Math.floor(h)}h ago`, urgent: false, critical: false };
  const days = Math.floor(h / 24);
  return { text: `${days}d ago`, urgent: days >= 2, critical: days >= 5 };
}
function priorityScore(c: ComplaintRecord): number {
  const sev = { critical: 100, high: 75, medium: 50, low: 25 }[c.severity] ?? 25;
  const hrs = (Date.now() - new Date(c.createdAt).getTime()) / 3_600_000;
  return sev + Math.min(50, (hrs / 24) * 8);
}
function queueActionLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Start investigation";
    case "in-progress":
      return "Continue investigation";
    case "rework":
      return "Review & resubmit";
    case "resolved":
      return "View submission";
    default:
      return "View details";
  }
}

// ─── Queue card ───────────────────────────────────────────────────────────────
function ComplaintQueueCard({
  complaint,
  onClick,
}: {
  complaint: ComplaintRecord;
  onClick: () => void;
}) {
  const age = ageLabel(complaint.createdAt);
  const isRework = complaint.status === "rework";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "group glass rounded-xl p-4 cursor-pointer border transition-all hover:shadow-[var(--shadow-elev)] hover:border-primary/30",
        complaint.severity === "critical" && "border-destructive/20",
        isRework && "border-destructive/30 bg-destructive/4",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="size-2.5 rounded-full mt-1.5 shrink-0"
          style={{
            background: isRework
              ? "var(--color-destructive)"
              : complaint.severity === "critical"
                ? "var(--color-destructive)"
                : complaint.severity === "high"
                  ? "#f97316"
                  : complaint.severity === "medium"
                    ? "var(--color-warning)"
                    : "var(--color-success)",
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
            {complaint.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 capitalize">
              <MapPin className="size-3" />
              {complaint.cityId}
            </span>
            <span className="flex items-center gap-1">
              <Clock
                className={cn(
                  "size-3",
                  age.critical && "text-destructive",
                  age.urgent && !age.critical && "text-warning",
                )}
              />
              <span
                className={cn(
                  age.critical ? "text-destructive font-medium" : age.urgent ? "text-warning" : "",
                )}
              >
                {age.text}
                {age.critical && " — overdue"}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>{complaint.severity}</Pill>
            <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
              {STATUS_LABEL[complaint.status] ?? complaint.status}
            </Pill>
            <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
              {ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}
            </span>
            {complaint.assignmentSource && (
              <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                {complaint.assignmentSource === "automatic" ? "Auto-assigned" : "Manually assigned"}
              </span>
            )}
            {complaint.images?.length > 0 && (
              <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                {complaint.images.length} image{complaint.images.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors mt-1">
          {queueActionLabel(complaint.status)}
          <ChevronRight className="size-3.5" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Phase 3C: Assigned Workspace — 5-tab queue ───────────────────────────────
// Tabs:
//   Active       → in-progress   (actively investigating)
//   Assigned     → pending       (assigned but not started)
//   Rework       → rework        (Phase 3C: returned by admin — needs resubmission)
//   Verification → resolved      (submitted, awaiting admin approval)
//   Completed    → closed + rejected
function AssignedWorkspace({
  currentUser,
  onSelectComplaint,
}: {
  currentUser: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onSelectComplaint: (id: string) => void;
}) {
  const [tab, setTab] = useState<"active" | "assigned" | "rework" | "verification" | "completed">(
    "active",
  );

  const {
    data: res,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-assigned-complaints", currentUser._id],
    queryFn: () => complaintApi.getAssigned({ limit: 200 }),
    staleTime: 30_000,
  });

  const all: ComplaintRecord[] =
    (res as unknown as { data?: { complaints?: ComplaintRecord[] } })?.data?.complaints ?? [];

  const active = all
    .filter((c) => c.status === "in-progress")
    .sort((a, b) => priorityScore(b) - priorityScore(a));
  const assigned = all
    .filter((c) => c.status === "pending")
    .sort((a, b) => priorityScore(b) - priorityScore(a));
  const rework = all
    .filter((c) => c.status === "rework")
    .sort((a, b) => priorityScore(b) - priorityScore(a));
  const verification = all.filter((c) => c.status === "resolved");
  const completed = all.filter((c) => c.status === "closed" || c.status === "rejected");

  useEffect(() => {
    if (active.length === 0 && assigned.length > 0 && tab === "active") {
      setTab("assigned");
    }
  }, [active.length, assigned.length, tab]);

  const criticalActive = [...active, ...assigned, ...rework].filter(
    (c) => c.severity === "critical",
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const TABS = [
    { key: "active" as const, label: "Active", icon: Play, count: active.length, urgent: false },
    {
      key: "assigned" as const,
      label: "Assigned",
      icon: Shield,
      count: assigned.length,
      urgent: false,
    },
    {
      key: "rework" as const,
      label: "Rework",
      icon: RotateCcw,
      count: rework.length,
      urgent: rework.length > 0,
    },
    {
      key: "verification" as const,
      label: "Verification",
      icon: CheckSquare,
      count: verification.length,
      urgent: false,
    },
    {
      key: "completed" as const,
      label: "Completed",
      icon: Lock,
      count: completed.length,
      urgent: false,
    },
  ];

  const currentList: ComplaintRecord[] =
    tab === "active"
      ? active
      : tab === "assigned"
        ? assigned
        : tab === "rework"
          ? rework
          : tab === "verification"
            ? verification
            : completed;

  const emptyMessages: Record<typeof tab, string> = {
    active: "No active investigations — open an assigned complaint to start.",
    assigned: "No complaints awaiting your attention.",
    rework: "No complaints returned for rework.",
    verification: "No complaints awaiting administrator verification.",
    completed: "No completed complaints yet.",
  };

  return (
    <div className="space-y-5">
      {/* Workload summary — Phase 3C adds Rework and Closed */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Assigned to Me"
          value={assigned.length}
          accent="primary"
          icon={<ClipboardList className="size-4" />}
          hint="Waiting for investigation"
        />
        <StatCard
          label="In Progress"
          value={active.length}
          accent="info"
          icon={<Play className="size-4" />}
          hint="Active investigations"
        />
        <StatCard
          label="Rework"
          value={rework.length}
          accent={rework.length > 0 ? "destructive" : "success"}
          icon={<RotateCcw className="size-4" />}
          hint="Returned by administrator"
        />
        <StatCard
          label="Closed"
          value={completed.filter((c) => c.status === "closed").length}
          accent="success"
          icon={<Lock className="size-4" />}
          hint="Verified and closed"
        />
      </div>

      {/* Rework alert banner */}
      {rework.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5 cursor-pointer"
          onClick={() => setTab("rework")}
        >
          <RotateCcw className="size-4 text-destructive shrink-0" />
          <p className="text-sm font-medium">
            <span className="text-destructive">{rework.length}</span> complaint
            {rework.length !== 1 ? "s" : ""} returned for rework — review and resubmit
          </p>
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === t.key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className={cn("size-3.5", t.urgent && tab !== t.key && "text-destructive")} />
            {t.label}
            {t.count > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold",
                  tab === t.key
                    ? "bg-primary/15 text-primary"
                    : t.urgent
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="ml-1 h-7 text-xs" onClick={() => refetch()}>
          <RefreshCw className="size-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Queue list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="space-y-3"
        >
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground glass rounded-2xl">
              <CheckCircle2 className="size-8 opacity-40" />
              <p className="text-sm font-medium">
                {tab === "active" && assigned.length > 0
                  ? "Complaints waiting for investigation"
                  : emptyMessages[tab]}
              </p>
              {tab === "active" && assigned.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setTab("assigned")}>
                  View Assigned Queue
                </Button>
              )}
            </div>
          ) : (
            currentList.map((c) => (
              <ComplaintQueueCard
                key={c._id}
                complaint={c}
                onClick={() => onSelectComplaint(c._id)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {all.length === 0 && (
        <div className="glass rounded-xl p-4 flex items-start gap-3 border border-border/60">
          <Shield className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Your queue is empty. Complaint assignments are managed by your administrator.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function ComplaintAnalytics({ d, refetch }: { d: ComplaintIntelligenceData; refetch: () => void }) {
  const tooltipStyle = {
    contentStyle: {
      background: "var(--color-card)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      fontSize: 12,
    },
  };
  const ISSUE_COLORS: Record<string, string> = {
    air_pollution: "var(--color-destructive)",
    water_contamination: "var(--color-info)",
    open_burning: "var(--color-warning)",
    noise: "var(--color-primary)",
    waste_dumping: "var(--color-success)",
    chemical_spill: "#a855f7",
    other: "var(--color-muted-foreground)",
  };
  const categoryData = d.byCategory.map((c) => ({
    name: ISSUE_LABELS[c.issueType] ?? c.issueType,
    value: c.count,
    fill: ISSUE_COLORS[c.issueType] ?? "var(--color-muted-foreground)",
  }));
  const severityData = d.bySeverity.map((s) => ({
    name: s.severity.charAt(0).toUpperCase() + s.severity.slice(1),
    value: s.count,
    fill:
      s.severity === "critical"
        ? "var(--color-destructive)"
        : s.severity === "high"
          ? "#f97316"
          : s.severity === "medium"
            ? "var(--color-warning)"
            : "var(--color-success)",
  }));
  const cityBarData = d.cityStats.slice(0, 8).map((c) => ({
    city: (c.cityId.charAt(0).toUpperCase() + c.cityId.slice(1)).slice(0, 10),
    Total: c.total,
    Resolved: c.resolved,
    Pending: c.pending,
    Critical: c.critical,
  }));
  const trendData = d.trend.map((t) => ({
    date: t.date.slice(5),
    Total: t.total,
    Resolved: t.resolved,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle
          eyebrow="Complaint Intelligence"
          title={
            <span className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Complaint Analytics
            </span>
          }
        />
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="size-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={d.summary.total}
          accent="info"
          icon={<ClipboardList className="size-4" />}
          hint="All time"
        />
        <StatCard
          label="Resolved"
          value={d.summary.resolved}
          accent="success"
          icon={<CheckCircle2 className="size-4" />}
          hint={`${d.summary.resolutionRate}% rate`}
        />
        <StatCard
          label="High-Risk"
          value={d.highRiskAreas.length}
          accent={d.highRiskAreas.length > 3 ? "destructive" : "warning"}
          icon={<AlertOctagon className="size-4" />}
          hint="Cities with clusters"
        />
        <StatCard
          label="Repeated"
          value={d.repeatedIssues.length}
          accent="warning"
          icon={<TrendingDown className="size-4" />}
          hint="Issue types ≥ 3×"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel eyebrow="Category Breakdown" title="By Issue Type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {categoryData.map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v) => (
                  <span style={{ color: "var(--color-muted-foreground)" }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel eyebrow="Severity Distribution" title="By Severity">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {severityData.map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v) => (
                  <span style={{ color: "var(--color-muted-foreground)" }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel eyebrow="Location Analysis" title="Volume by City">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cityBarData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="city" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Total" fill="var(--color-info)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Resolved" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Pending" fill="var(--color-warning)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Critical" fill="var(--color-destructive)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel eyebrow="30-Day Trend" title="Complaint Activity">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
            <defs>
              <linearGradient id="complaint-total" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="Total"
              name="Filed"
              stroke="var(--color-warning)"
              fill="url(#complaint-total)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Resolved"
              name="Resolved"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel eyebrow="High-Risk Areas" title="Priority Cities">
          {d.highRiskAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No high-risk areas detected
            </p>
          ) : (
            <div className="space-y-2">
              {d.highRiskAreas.map((a, i) => (
                <div
                  key={a.cityId}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold tabular-nums text-muted-foreground w-5">
                      #{i + 1}
                    </span>
                    <MapPin className="size-3.5 text-destructive shrink-0" />
                    <span className="text-sm font-medium capitalize truncate">{a.cityId}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.critical > 0 && <Pill tone="destructive">{a.critical} critical</Pill>}
                    <Pill tone="warning">{a.pending} pending</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel eyebrow="Repeated Issues" title="Recurring Patterns">
          {d.repeatedIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No repeated patterns detected
            </p>
          ) : (
            <div className="space-y-3">
              {d.repeatedIssues.map((issue) => {
                const color =
                  (
                    {
                      air_pollution: "var(--color-destructive)",
                      water_contamination: "var(--color-info)",
                      open_burning: "var(--color-warning)",
                      noise: "var(--color-primary)",
                      waste_dumping: "var(--color-success)",
                      chemical_spill: "#a855f7",
                    } as Record<string, string>
                  )[issue.issueType] ?? "var(--color-muted-foreground)";
                const pct =
                  d.summary.total > 0 ? Math.round((issue.count / d.summary.total) * 100) : 0;
                return (
                  <div key={issue.issueType}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {ISSUE_LABELS[issue.issueType] ?? issue.issueType}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {issue.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(pct * 2.5, 100)}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
type View = "operations" | "analytics";
export function ComplaintIntelligence() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("operations");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: res,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["command-complaint-intelligence"],
    queryFn: () => commandApi.getComplaintIntelligence(),
    staleTime: 5 * 60 * 1000,
  });
  const d = res?.data as ComplaintIntelligenceData | undefined;

  const pendingCount = d?.byStatus?.find((s) => s.status === "pending")?.count ?? 0;
  const inProgressCount = d?.byStatus?.find((s) => s.status === "in-progress")?.count ?? 0;
  const criticalCount = d?.bySeverity?.find((s) => s.severity === "critical")?.count ?? 0;
  const reworkCount = d?.byStatus?.find((s) => s.status === "rework")?.count ?? 0;

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {selectedId && user ? (
          <InvestigationWorkspace
            key={selectedId}
            complaintId={selectedId}
            currentUser={user}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <motion.div
            key="queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="space-y-5"
          >
            <WorkspaceHeader
              eyebrow="WORK QUEUE · COMPLAINT OPERATIONS"
              title="Complaint Operations"
              description="Manage and resolve environmental complaints assigned to you."
              stats={
                d
                  ? [
                      {
                        label: "Pending",
                        value: pendingCount,
                        tone: pendingCount > 0 ? "warning" : "muted",
                      },
                      {
                        label: "In Progress",
                        value: inProgressCount,
                        tone: inProgressCount > 0 ? "info" : "muted",
                      },
                      {
                        label: "Critical",
                        value: criticalCount,
                        tone: criticalCount > 0 ? "destructive" : "muted",
                      },
                      {
                        label: "Rework",
                        value: reworkCount,
                        tone: reworkCount > 0 ? "destructive" : "muted",
                      },
                    ]
                  : undefined
              }
              action={
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={cn("size-3.5 mr-1.5", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              }
            />
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
              <button
                onClick={() => setView("operations")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  view === "operations"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Settings2 className="size-3.5" />
                My Queue
              </button>
              <button
                onClick={() => setView("analytics")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  view === "analytics"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart2 className="size-3.5" />
                Analytics
              </button>
            </div>
            {view === "operations" && user && (
              <AssignedWorkspace currentUser={user} onSelectComplaint={setSelectedId} />
            )}
            {view === "analytics" &&
              (isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
                </div>
              ) : d ? (
                <ComplaintAnalytics d={d} refetch={refetch} />
              ) : null)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
