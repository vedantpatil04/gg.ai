import { useState, useEffect, useMemo } from "react";
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
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  MapPin,
  RefreshCw,
  BarChart2,
  Settings2,
  Play,
  Clock,
  Shield,
  RotateCcw,
  Lock,
  ChevronRight,
  Inbox,
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  MessageSquare,
} from "lucide-react";
import { commandApi, type ComplaintIntelligenceData } from "@/lib/api/command.api";
import { complaintApi, messageApi } from "@/lib/api/services.api";
import { Panel, StatCard, Pill, SectionTitle, WorkspaceHeader, EmptyState } from "@/components/ui-bits";
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
    case "awaiting_citizen_review":
      return "View submission";
    case "resolved":
      return "View submission";
    case "closed":
      return "View details";
    default:
      return "View details";
  }
}
function refCode(id: string): string {
  return `GG-${id.slice(-6).toUpperCase()}`;
}
const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

// ─── Queue row — compact enterprise list row (no glass/glow) ─────────────────
function ComplaintQueueRow({
  complaint,
  unreadMessages = 0,
  onClick,
}: {
  complaint: ComplaintRecord;
  unreadMessages?: number;
  onClick: () => void;
}) {
  const age = ageLabel(complaint.updatedAt || complaint.createdAt);
  const isRework = complaint.status === "rework";
  const severityColor =
    SEVERITY_TONE[complaint.severity] === "destructive"
      ? "var(--color-destructive)"
      : SEVERITY_TONE[complaint.severity] === "warning"
        ? "var(--color-warning)"
        : "var(--color-success)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={cn(
        "group flex items-start sm:items-center gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-3 cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30",
        isRework && "border-destructive/30 bg-destructive/[0.03]",
      )}
    >
      <div
        className="size-2 rounded-full mt-1.5 sm:mt-0 shrink-0"
        style={{ background: severityColor }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors truncate max-w-full">
            {complaint.title}
          </p>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {refCode(complaint._id)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-xs text-muted-foreground">
          <span>{ISSUE_LABELS[complaint.issueType] ?? complaint.issueType}</span>
          <span className="opacity-50">·</span>
          <span className="flex items-center gap-1 capitalize">
            <MapPin className="size-3" />
            {complaint.location?.address || complaint.cityId}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Pill tone={SEVERITY_TONE[complaint.severity] ?? "muted"}>{complaint.severity}</Pill>
          <Pill tone={STATUS_TONE[complaint.status] ?? "muted"}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </Pill>
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
          {unreadMessages > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
              <MessageSquare className="size-2.5" />
              {unreadMessages} unread
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px]",
              age.critical ? "text-destructive font-medium" : age.urgent ? "text-warning" : "text-muted-foreground",
            )}
          >
            <Clock className="size-2.5" />
            {age.text}
            {age.critical && " — overdue"}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1 shrink-0 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
        {queueActionLabel(complaint.status)}
        <ChevronRight className="size-3.5" />
      </div>
    </motion.div>
  );
}

// ─── Compact, non-glow summary tile ───────────────────────────────────────────
function QueueStat({
  label,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: "warning" | "info" | "destructive" | "success";
  active?: boolean;
  onClick?: () => void;
}) {
  const toneVar: Record<string, string> = {
    warning: "var(--color-warning)",
    info: "var(--color-info)",
    destructive: "var(--color-destructive)",
    success: "var(--color-success)",
  };
  const accent = tone ? toneVar[tone] : "var(--color-muted-foreground)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-3.5 text-left transition-colors",
        active ? "border-primary/50 ring-1 ring-primary/30" : "border-border hover:border-primary/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <Icon className="size-3.5" style={{ color: accent }} />
      </div>
      <div className="text-xl font-semibold tabular-nums tracking-tight mt-1">{value}</div>
    </button>
  );
}

// ─── Assigned Workspace — Phase 3: enterprise Work Queue ──────────────────────
// Tabs:
//   My Queue  → everything not yet finalized (pending, in-progress, rework,
//               awaiting_citizen_review, resolved)
//   Active    → in-progress
//   Assigned  → pending
//   Rework    → rework
//   Completed → closed + rejected
//
// "Awaiting Citizen Review" and "Awaiting Verification" (resolved) are real,
// distinct workflow states, but the locked roadmap explicitly avoids adding
// Administrator-only verification concepts as their own tabs — they remain
// visible inside "My Queue" with a clear status pill, and the "Awaiting
// Citizen Review" summary tile filters directly to them without needing a
// dedicated tab.
type QueueTab = "all" | "active" | "assigned" | "rework" | "completed";
type SortKey = "priority" | "newest" | "oldest" | "updated" | "severity-desc" | "severity-asc";

function AssignedWorkspace({
  complaints: all,
  isLoading,
  isError,
  refetch,
  onSelectComplaint,
}: {
  complaints: ComplaintRecord[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  onSelectComplaint: (id: string) => void;
}) {
  const [tab, setTab] = useState<QueueTab>("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [showFilters, setShowFilters] = useState(false);

  // Phase 6 §18 — unread-message badge per row. One bulk query for the
  // whole queue instead of one per complaint.
  const { data: unreadCountsData } = useQuery({
    queryKey: ["complaint-unread-counts"],
    queryFn: () => messageApi.getUnreadCounts(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const unreadCounts: Record<string, number> =
    (unreadCountsData as unknown as { data?: { counts?: Record<string, number> } })?.data
      ?.counts ?? {};

  const active = useMemo(() => all.filter((c) => c.status === "in-progress"), [all]);
  const assigned = useMemo(() => all.filter((c) => c.status === "pending"), [all]);
  const rework = useMemo(() => all.filter((c) => c.status === "rework"), [all]);
  const awaitingReview = useMemo(
    () => all.filter((c) => c.status === "awaiting_citizen_review"),
    [all],
  );
  const completed = useMemo(
    () => all.filter((c) => c.status === "closed" || c.status === "rejected"),
    [all],
  );
  // The full working set — everything still in flight, one way or another.
  const myQueue = useMemo(
    () =>
      all.filter(
        (c) =>
          c.status === "pending" ||
          c.status === "in-progress" ||
          c.status === "rework" ||
          c.status === "awaiting_citizen_review" ||
          c.status === "resolved",
      ),
    [all],
  );

  useEffect(() => {
    if (tab === "active" && active.length === 0 && assigned.length > 0) {
      setTab("assigned");
    }
  }, [active.length, assigned.length, tab]);

  const cityOptions = useMemo(
    () => Array.from(new Set(all.map((c) => c.cityId))).sort(),
    [all],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(all.map((c) => c.issueType))).sort(),
    [all],
  );

  const TABS: { key: QueueTab; label: string; icon: React.ElementType; count: number; urgent?: boolean }[] = [
    { key: "all", label: "My Queue", icon: Inbox, count: myQueue.length },
    { key: "active", label: "Active", icon: Play, count: active.length },
    { key: "assigned", label: "Assigned", icon: Shield, count: assigned.length },
    { key: "rework", label: "Rework", icon: RotateCcw, count: rework.length, urgent: rework.length > 0 },
    { key: "completed", label: "Completed", icon: Lock, count: completed.length },
  ];

  const baseList: ComplaintRecord[] =
    tab === "all"
      ? myQueue
      : tab === "active"
        ? active
        : tab === "assigned"
          ? assigned
          : tab === "rework"
            ? rework
            : completed;

  const filtered = useMemo(() => {
    let list = statusFilter ? baseList.filter((c) => c.status === statusFilter) : baseList;

    if (severityFilter !== "all") list = list.filter((c) => c.severity === severityFilter);
    if (categoryFilter !== "all") list = list.filter((c) => c.issueType === categoryFilter);
    if (cityFilter !== "all") list = list.filter((c) => c.cityId === cityFilter);
    if (sourceFilter !== "all") list = list.filter((c) => (c.assignmentSource ?? "manual") === sourceFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const haystack = [
          c.title,
          refCode(c._id),
          ISSUE_LABELS[c.issueType] ?? c.issueType,
          c.cityId,
          c.location?.address ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "updated":
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case "severity-desc":
        sorted.sort((a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0));
        break;
      case "severity-asc":
        sorted.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 0) - (SEVERITY_ORDER[b.severity] ?? 0));
        break;
      default:
        sorted.sort((a, b) => priorityScore(b) - priorityScore(a));
    }
    return sorted;
  }, [baseList, statusFilter, severityFilter, categoryFilter, cityFilter, sourceFilter, search, sort]);

  const filtersActive =
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    cityFilter !== "all" ||
    sourceFilter !== "all" ||
    statusFilter !== null ||
    search.trim() !== "";

  const clearFilters = () => {
    setSeverityFilter("all");
    setCategoryFilter("all");
    setCityFilter("all");
    setSourceFilter("all");
    setStatusFilter(null);
    setSearch("");
  };

  const selectTab = (key: QueueTab) => {
    setTab(key);
    setStatusFilter(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] rounded-xl" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <EmptyState
          icon={<AlertTriangle className="size-4" />}
          title="We couldn't load your work queue"
          description="Check your connection and try again."
          action={
            <Button size="sm" variant="outline" onClick={refetch} className="mt-1">
              <RefreshCw className="size-3.5 mr-1.5" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const emptyMessages: Record<QueueTab, string> = {
    all: "Your queue is empty. Complaint assignments are managed by your administrator.",
    assigned: "No complaints are waiting to be started.",
    active: "No active investigations.",
    rework: "No complaints have been returned for rework.",
    completed: "No completed complaints yet.",
  };

  return (
    <div className="space-y-4">
      {/* Summary — real, authority-scoped counts, act as filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <QueueStat
          label="Assigned"
          value={assigned.length}
          icon={Shield}
          tone={assigned.length > 0 ? "info" : undefined}
          active={tab === "assigned" && !statusFilter}
          onClick={() => selectTab("assigned")}
        />
        <QueueStat
          label="In Progress"
          value={active.length}
          icon={Play}
          tone={active.length > 0 ? "info" : undefined}
          active={tab === "active" && !statusFilter}
          onClick={() => selectTab("active")}
        />
        <QueueStat
          label="Rework"
          value={rework.length}
          icon={RotateCcw}
          tone={rework.length > 0 ? "destructive" : undefined}
          active={tab === "rework" && !statusFilter}
          onClick={() => selectTab("rework")}
        />
        <QueueStat
          label="Awaiting Citizen Review"
          value={awaitingReview.length}
          icon={Clock}
          tone={awaitingReview.length > 0 ? "warning" : undefined}
          active={tab === "all" && statusFilter === "awaiting_citizen_review"}
          onClick={() => {
            setTab("all");
            setStatusFilter("awaiting_citizen_review");
          }}
        />
        <QueueStat
          label="Completed"
          value={completed.length}
          icon={Lock}
          tone={undefined}
          active={tab === "completed" && !statusFilter}
          onClick={() => selectTab("completed")}
        />
      </div>

      {/* Rework alert banner */}
      {rework.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5 cursor-pointer"
          onClick={() => selectTab("rework")}
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
            onClick={() => selectTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === t.key && !statusFilter
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
                  tab === t.key && !statusFilter
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
      </div>

      {/* Search + sort + filter toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, ref, category, location…"
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <ArrowUpDown className="size-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="priority">Priority (default)</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="updated">Last updated</option>
            <option value="severity-desc">Highest severity</option>
            <option value="severity-asc">Lowest severity</option>
          </select>
        </div>

        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="size-3.5 mr-1.5" />
          Filters
        </Button>

        {filtersActive && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
            <X className="size-3.5 mr-1" />
            Clear filters
          </Button>
        )}

        <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => refetch()}>
          <RefreshCw className="size-3 mr-1" />
          Refresh
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {ISSUE_LABELS[c] ?? c}
              </option>
            ))}
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs capitalize"
          >
            <option value="all">All cities</option>
            {cityOptions.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
          >
            <option value="all">All assignment sources</option>
            <option value="automatic">Auto-assigned</option>
            <option value="manual">Manually assigned</option>
          </select>
        </div>
      )}

      {statusFilter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Showing:{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
            {STATUS_LABEL[statusFilter] ?? statusFilter}
            <button onClick={() => setStatusFilter(null)} aria-label="Clear status filter">
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}

      {/* Queue list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tab}-${statusFilter ?? ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="space-y-2"
        >
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8">
              <EmptyState
                icon={<CheckCircle2 className="size-4" />}
                title={
                  filtersActive
                    ? "No complaints match these filters"
                    : tab === "active" && assigned.length > 0
                      ? "Complaints waiting for investigation"
                      : emptyMessages[tab]
                }
                description={filtersActive ? "Try clearing filters or search." : undefined}
                action={
                  filtersActive ? (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1">
                      Clear filters
                    </Button>
                  ) : tab === "active" && assigned.length > 0 ? (
                    <Button variant="outline" size="sm" onClick={() => selectTab("assigned")} className="mt-1">
                      View Assigned Queue
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            filtered.map((c) => (
              <ComplaintQueueRow
                key={c._id}
                complaint={c}
                unreadMessages={unreadCounts[c._id] ?? 0}
                onClick={() => onSelectComplaint(c._id)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Analytics (unchanged — Phase 3 scope is the queue, not analytics) ───────
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

  // Real, authority-scoped complaint data — single source shared by the
  // summary tiles and the queue list. The backend hard-scopes this to the
  // authenticated authority's own assignedTo complaints.
  const {
    data: myComplaintsRes,
    isLoading: complaintsLoading,
    isError: complaintsError,
    refetch: refetchComplaints,
  } = useQuery({
    queryKey: ["my-assigned-complaints", user?._id],
    queryFn: () => complaintApi.getAssigned({ limit: 200 }),
    staleTime: 30_000,
    enabled: !!user,
  });
  const myComplaints: ComplaintRecord[] = myComplaintsRes?.data?.complaints ?? [];

  // Network-wide complaint intelligence — used only by the separate
  // Analytics tab, which is intentionally broader than "my queue".
  const {
    data: res,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["command-complaint-intelligence"],
    queryFn: () => commandApi.getComplaintIntelligence(),
    staleTime: 5 * 60 * 1000,
  });
  const d = res?.data as ComplaintIntelligenceData | undefined;

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
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (view === "operations" ? refetchComplaints() : refetchAnalytics())}
                  disabled={view === "operations" ? complaintsLoading : analyticsLoading}
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5 mr-1.5",
                      (view === "operations" ? complaintsLoading : analyticsLoading) && "animate-spin",
                    )}
                  />
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
            {view === "operations" && (
              <AssignedWorkspace
                complaints={myComplaints}
                isLoading={complaintsLoading}
                isError={complaintsError}
                refetch={refetchComplaints}
                onSelectComplaint={setSelectedId}
              />
            )}
            {view === "analytics" &&
              (analyticsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
                </div>
              ) : d ? (
                <ComplaintAnalytics d={d} refetch={refetchAnalytics} />
              ) : null)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
