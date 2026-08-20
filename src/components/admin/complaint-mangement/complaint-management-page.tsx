import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight as RowChevron,
  MapPin,
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  SlidersHorizontal,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { complaintApi } from "@/lib/api/services.api";
import { useQuery } from "@tanstack/react-query";
import { ComplaintDetailPanel } from "@/components/admin/complaint-governance/complaint-detail-panel";
import { humanizeIssueType } from "@/components/admin/complaint-governance/issue-type";
import type { GovernedComplaint } from "@/components/admin/complaint-governance/complaint-governance-queries";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending Triage" },
  { value: "in-progress", label: "In Progress (Field Active)" },
  { value: "resolved", label: "Awaiting Verification" },
  { value: "rework", label: "Returned for Rework" },
  { value: "closed", label: "Closed & Archived" },
  { value: "rejected", label: "Rejected" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical Priority" },
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "low", label: "Low Priority" },
];

const ISSUE_OPTIONS = [
  { value: "", label: "All Incident Categories" },
  { value: "air_pollution", label: "Air Pollution" },
  { value: "water_contamination", label: "Water Contamination" },
  { value: "open_burning", label: "Open Burning" },
  { value: "noise", label: "Noise Pollution" },
  { value: "waste_dumping", label: "Illegal Waste Dumping" },
  { value: "chemical_spill", label: "Chemical / Hazardous Spill" },
  { value: "other", label: "Other Environmental Issues" },
];

/* ── Badges ──────────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: {
      label: "Pending",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    "in-progress": {
      label: "In Progress",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/25",
    },
    resolved: {
      label: "Awaiting Review",
      classes: "bg-violet-500/10 text-violet-500 border-violet-500/25",
    },
    rework: {
      label: "Rework",
      classes: "bg-destructive/10 text-destructive border-destructive/25",
    },
    closed: {
      label: "Closed",
      classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    },
    rejected: {
      label: "Rejected",
      classes: "bg-muted/60 text-muted-foreground border-border/50",
    },
  }[status] ?? {
    label: status,
    classes: "bg-muted/60 text-muted-foreground border-border/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <span>{config.label}</span>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    critical: {
      label: "Critical",
      classes: "bg-destructive/10 text-destructive border-destructive/25 font-bold shadow-[0_0_6px_rgba(239,68,68,0.2)]",
    },
    high: {
      label: "High",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    medium: {
      label: "Medium",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    low: {
      label: "Low",
      classes: "bg-muted/60 text-muted-foreground border-border/50",
    },
  }[priority] ?? {
    label: priority,
    classes: "bg-muted/60 text-muted-foreground border-border/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 select-none capitalize",
        config.classes,
      )}
    >
      {priority === "critical" && <AlertTriangle className="size-3 shrink-0" />}
      {priority === "high" && <AlertCircle className="size-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}

type SortField = "createdAt" | "updatedAt" | "severity";

function SortTab({
  field,
  currentField,
  dir,
  onToggle,
  children,
}: {
  field: SortField;
  currentField: SortField;
  dir: "asc" | "desc";
  onToggle: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === currentField;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all select-none cursor-pointer outline-none",
        "focus-visible:ring-1 focus-visible:ring-primary",
        isActive
          ? "bg-card text-foreground shadow-2xs border border-border/50 font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
      )}
    >
      <span>{children}</span>
      {isActive ? (
        dir === "asc" ? (
          <ArrowUp className="size-3 text-primary" />
        ) : (
          <ArrowDown className="size-3 text-primary" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-30" />
      )}
    </button>
  );
}

export function ComplaintManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<GovernedComplaint | null>(null);

  const qc = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["complaint-management"] }) > 0;
  const { isApiConnected } = useCity();
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["complaint-management", page, statusFilter, severityFilter, issueFilter, limit],
    queryFn: () =>
      complaintApi
        .getAll({
          page,
          limit,
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
          issueType: issueFilter || undefined,
        })
        .then(
          (r) =>
            r.data as {
              complaints: GovernedComplaint[];
              pagination: { page: number; limit: number; total: number; pages: number };
            },
        ),
    staleTime: 20_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const complaints = useMemo(() => {
    let list = data?.complaints ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c._id.includes(q) ||
          (c.submittedBy as { name?: string }).name?.toLowerCase().includes(q) ||
          c.cityId?.toLowerCase().includes(q) ||
          "",
      );
    }
    return [...list].sort((a, b) => {
      const d = sortDir === "asc" ? 1 : -1;
      if (sortField === "severity") {
        const sv = { low: 0, medium: 1, high: 2, critical: 3 };
        return d * ((sv[a.severity] ?? 0) - (sv[b.severity] ?? 0));
      }
      return d * (new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime());
    });
  }, [data, search, sortField, sortDir]);

  function toggleSort(f: SortField) {
    if (f === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir("desc");
    }
  }

  const hasFilters = !!statusFilter || !!severityFilter || !!issueFilter || !!search.trim();

  const handleClearFilters = () => {
    setStatusFilter("");
    setSeverityFilter("");
    setIssueFilter("");
    setSearch("");
    setPage(1);
  };

  const activeFiltersCount = [statusFilter, severityFilter, issueFilter].filter(Boolean).length;

  return (
    <div className="px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      {/* ── 1. PAGE HEADER ────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Environmental Incident Governance
            </span>
            <span>&middot;</span>
            <span>Admin Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
            Complaint Management
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5 max-w-2xl leading-relaxed">
            Centralized environmental incident registry, multi-parameter triage, lifecycle tracking, and agency assignment oversight.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["complaint-management"] })}
            disabled={isFetching}
            className="h-8.5 text-xs font-medium border-border/70 hover:border-border hover:bg-muted/60 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5 text-primary", isFetching && "animate-spin")} />
            <span>{isFetching ? "Syncing..." : "Sync Cases"}</span>
          </Button>
        </div>
      </section>

      {/* ── 2. COMMAND TOOLBAR (SEARCH + FILTERS + SORTING) ──────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Search + Filter Button */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/80 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incident title, #ID, reporter, city…"
                className="pl-8 pr-7 h-9 text-xs sm:text-sm bg-card/60 border-border/60 focus-visible:border-primary/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground grid place-items-center cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Filters Toggle Button */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium shrink-0 cursor-pointer shadow-2xs border-border/60"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Sorting Control Group */}
          <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/50 shrink-0 self-start md:self-auto overflow-x-auto scrollbar-hide">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 px-2 select-none">
              Sort
            </span>
            <SortTab field="createdAt" currentField={sortField} dir={sortDir} onToggle={toggleSort}>
              Date
            </SortTab>
            <SortTab field="updatedAt" currentField={sortField} dir={sortDir} onToggle={toggleSort}>
              Updated
            </SortTab>
            <SortTab field="severity" currentField={sortField} dir={sortDir} onToggle={toggleSort}>
              Priority
            </SortTab>
          </div>
        </div>

        {/* Collapsible Filter Tray */}
        {showFilters && (
          <div className="rounded-2xl p-4 border border-border/60 bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in-50 duration-200">
            {/* Status Select */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 font-bold">
                Lifecycle Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Select */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 font-bold">
                Priority Tier
              </label>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 font-bold">
                Incident Category
              </label>
              <select
                value={issueFilter}
                onChange={(e) => {
                  setIssueFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                {ISSUE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. COMPLAINT CASE RECORDS LIST ──────────────────────────────── */}
      <section className="rounded-2xl border border-border/70 bg-card/60 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Failed to Load Complaints</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Unable to retrieve case records from the incident management service.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
              Retry Query
            </Button>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-4">
            <div className="size-11 rounded-2xl bg-muted/70 border border-border/60 grid place-items-center text-muted-foreground">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">No Complaints Found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                {hasFilters
                  ? "No incident records matched the current search query or applied filters."
                  : "No complaint records are currently logged in the system."}
              </p>
            </div>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs h-8 mt-1">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {complaints.map((c) => {
              const submitter = c.submittedBy as { name?: string } | undefined;
              const assignee = c.assignedTo as { name?: string } | null | undefined;

              return (
                <div
                  key={c._id}
                  onClick={() => setSelected(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(c);
                    }
                  }}
                  className={cn(
                    "group p-3.5 sm:p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer select-none",
                    "focus-visible:bg-muted/40 focus-visible:outline-none",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Metadata + Title + Workflow line */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Top row: ID + Issue Category */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-mono font-bold text-primary text-[11.5px]">
                          #{c._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-muted-foreground/40">&middot;</span>
                        <span className="text-[11px] font-medium px-2 py-0.2 rounded-md bg-muted/80 text-muted-foreground truncate">
                          {humanizeIssueType(c.issueType)}
                        </span>
                        {c.cityId && (
                          <>
                            <span className="text-muted-foreground/40">&middot;</span>
                            <span className="text-[11px] text-muted-foreground capitalize flex items-center gap-0.5">
                              <MapPin className="size-3 text-muted-foreground/60" />
                              {c.cityId}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Complaint Title */}
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-snug">
                        {c.title}
                      </div>

                      {/* Workflow Submitter → Assignee + Date */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 truncate pt-0.5">
                        <span className="truncate">Reporter: {submitter?.name ?? "Anonymous Citizen"}</span>
                        <span>&middot;</span>
                        <span className="truncate flex items-center gap-1">
                          <span>Officer:</span>
                          {assignee?.name ? (
                            <span className="font-medium text-foreground">{assignee.name}</span>
                          ) : (
                            <span className="text-amber-500 font-medium">Unassigned</span>
                          )}
                        </span>
                        <span>&middot;</span>
                        <span className="font-mono text-[11px] text-muted-foreground/70 shrink-0">
                          {format(new Date(c.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* Right: Badges + Action Chevron */}
                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                      <PriorityBadge priority={c.severity} />
                      <StatusBadge status={c.status} />
                      <RowChevron className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION & FOOTER ─────────────────────────────────────────── */}
        {data && data.pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border/50 bg-muted/10">
            <div className="text-xs text-muted-foreground font-mono">
              Showing Page <span className="font-semibold text-foreground">{data.pagination.page}</span> of{" "}
              <span className="font-semibold text-foreground">{data.pagination.pages}</span> &middot;{" "}
              <span className="font-semibold text-foreground">{data.pagination.total}</span> total cases
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 text-xs flex-1 sm:flex-none border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs flex-1 sm:flex-none border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. SLIDE-OVER INCIDENT DETAIL DRAWER ─────────────────────────── */}
      <ComplaintDetailPanel complaint={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

