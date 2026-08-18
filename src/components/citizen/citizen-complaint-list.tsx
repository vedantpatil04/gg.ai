/**
 * citizen-complaint-list.tsx
 *
 * Citizen Hub My Complaints List with search, filtering, sorting, and unread message indicators.
 * Fully clickable complaint rows/cards on desktop and responsive stacked mobile layout (320px–430px+).
 */

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  MessageSquare,
  MapPin,
  User,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useMyCitizenComplaints, useMyComplaintUnreadCounts, type CitizenComplaint } from "./citizen-queries";
import {
  getStatusMeta,
  getSeverityMeta,
  humanizeIssueType,
} from "./citizen-status-utils";
import { TableSkeleton } from "@/components/shared/skeletons";
import {
  NoComplaintsEmpty,
  NoSearchResultsEmpty,
} from "@/components/shared/empty-states";
import { QueryError } from "@/components/shared/error-states";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending Dispatch" },
  { value: "in-progress", label: "Under Investigation" },
  { value: "awaiting_citizen_review", label: "Ready for Your Review" },
  { value: "resolved", label: "Awaiting Verification" },
  { value: "closed", label: "Closed" },
  { value: "rework", label: "Rework Requested" },
  { value: "rejected", label: "Rejected" },
];

const ISSUE_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "air_pollution", label: "Air Pollution" },
  { value: "water_contamination", label: "Water Contamination" },
  { value: "open_burning", label: "Open Burning" },
  { value: "noise", label: "Noise" },
  { value: "waste_dumping", label: "Waste Dumping" },
  { value: "chemical_spill", label: "Chemical Spill" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

type SortField = "createdAt" | "updatedAt" | "severity";
type SortDir = "asc" | "desc";

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortButton({
  field,
  current,
  dir,
  onToggle,
  children,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onToggle: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const active = field === current;
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap",
        active ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={() => onToggle(field)}
      aria-label={`Sort by ${field}`}
    >
      {children}
      {active ? (
        dir === "asc" ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Complaint Card / Row ─────────────────────────────────────────────────────

function ComplaintItem({
  complaint,
  unreadCount = 0,
  onClick,
}: {
  complaint: CitizenComplaint;
  unreadCount?: number;
  onClick: () => void;
}) {
  const assignedAuth = complaint.assignedTo as { name?: string } | null;
  const statusMeta = getStatusMeta(complaint.status, !!assignedAuth);
  const severityMeta = getSeverityMeta(complaint.severity);

  return (
    <div
      className={cn(
        "w-full rounded-2xl border p-4 transition-all cursor-pointer group",
        "border-border/80 bg-card hover:bg-muted/30 hover:border-primary/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]",
        unreadCount > 0 && "border-primary/40 bg-primary/2",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open complaint: ${complaint.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* ── Desktop Layout (sm and up) ── */}
      <div className="hidden sm:flex items-center gap-4">
        {/* Icon */}
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="size-4 text-primary" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
              {complaint.title}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono font-medium shrink-0">
              #GG-{complaint._id.slice(-6).toUpperCase()}
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                <MessageSquare className="size-2.5" />
                New message
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{humanizeIssueType(complaint.issueType)}</span>
            {complaint.location?.address && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="truncate max-w-[220px] flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  {complaint.location.address}
                </span>
              </>
            )}
            {assignedAuth?.name && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1">
                  <User className="size-3 shrink-0" />
                  {assignedAuth.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status + Meta */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Pill tone={severityMeta.tone}>{severityMeta.label}</Pill>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                statusMeta.tone === "success" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
                statusMeta.tone === "warning" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                statusMeta.tone === "info" && "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5",
                statusMeta.tone === "primary" && "border-primary/30 text-primary bg-primary/5",
                statusMeta.tone === "destructive" && "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5",
                statusMeta.tone === "muted" && "border-border text-muted-foreground bg-muted/40",
              )}
            >
              <span>{statusMeta.symbol}</span>
              <span>{statusMeta.label}</span>
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Updated {format(new Date(complaint.updatedAt || complaint.createdAt), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* ── Mobile Layout (under sm: 320px–430px) ── */}
      <div className="sm:hidden space-y-2.5">
        {/* Row 1: ID, Unread Badge, Status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground">
            #GG-{complaint._id.slice(-6).toUpperCase()}
          </span>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                <MessageSquare className="size-2.5" />
                New message
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                statusMeta.tone === "success" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
                statusMeta.tone === "warning" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                statusMeta.tone === "info" && "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5",
                statusMeta.tone === "primary" && "border-primary/30 text-primary bg-primary/5",
                statusMeta.tone === "destructive" && "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5",
                statusMeta.tone === "muted" && "border-border text-muted-foreground bg-muted/40",
              )}
            >
              <span>{statusMeta.symbol}</span>
              <span>{statusMeta.label}</span>
            </span>
          </div>
        </div>

        {/* Row 2: Title */}
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {complaint.title}
        </h4>

        {/* Row 3: Category & Priority */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{humanizeIssueType(complaint.issueType)}</span>
          <span className="text-muted-foreground/40">·</span>
          <Pill tone={severityMeta.tone}>{severityMeta.label}</Pill>
        </div>

        {/* Row 4: Location (if present) */}
        {complaint.location?.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 text-muted-foreground shrink-0" />
            <span className="truncate">{complaint.location.address}</span>
          </div>
        )}

        {/* Row 5: Footer with Authority & Updated Time */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          {assignedAuth?.name ? (
            <span className="truncate">Auth: {assignedAuth.name}</span>
          ) : (
            <span>Unassigned</span>
          )}
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="size-2.5" />
            {format(new Date(complaint.updatedAt || complaint.createdAt), "MMM d")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main CitizenComplaintList Component ──────────────────────────────────────

interface CitizenComplaintListProps {
  initialStatusFilter?: string | null;
  onOpenComplaint: (id: string) => void;
}

export function CitizenComplaintList({
  initialStatusFilter,
  onOpenComplaint,
}: CitizenComplaintListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? "");
  const [issueFilter, setIssueFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(Boolean(initialStatusFilter));

  // Sync initialStatusFilter if prop changes
  useEffect(() => {
    if (initialStatusFilter !== undefined && initialStatusFilter !== null) {
      setStatusFilter(initialStatusFilter);
      setPage(1);
      if (initialStatusFilter) setShowFilters(true);
    }
  }, [initialStatusFilter]);

  const limit = 15;
  const hasFilters = !!statusFilter || !!issueFilter || !!severityFilter || !!search;
  const activeFilterCount = [statusFilter, issueFilter, severityFilter].filter(Boolean).length;

  const { data, isLoading, isError, refetch } = useMyCitizenComplaints({
    page,
    limit,
    status: statusFilter || undefined,
    issueType: issueFilter || undefined,
    severity: severityFilter || undefined,
  });

  const { data: unreadCounts = {} } = useMyComplaintUnreadCounts();

  const complaints = useMemo(() => {
    let list = data?.complaints ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.issueType.toLowerCase().includes(q) ||
          c._id.toLowerCase().includes(q) ||
          (c.location?.address ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "severity") {
        const sev = { low: 0, medium: 1, high: 2, critical: 3 };
        return dir * ((sev[a.severity as keyof typeof sev] ?? 0) - (sev[b.severity as keyof typeof sev] ?? 0));
      }
      return dir * (new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime());
    });
  }, [data, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const clearAll = () => {
    setStatusFilter("");
    setIssueFilter("");
    setSeverityFilter("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, category, ID, address..."
            className="pl-8.5 h-9 text-xs rounded-xl"
            aria-label="Search complaints"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-xl text-xs"
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
        >
          <Filter className="size-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground hover:text-foreground text-xs"
            onClick={clearAll}
          >
            <X className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
          {[
            {
              label: "Status",
              value: statusFilter,
              options: STATUS_OPTIONS,
              onChange: (v: string) => {
                setStatusFilter(v);
                setPage(1);
              },
            },
            {
              label: "Category",
              value: issueFilter,
              options: ISSUE_OPTIONS,
              onChange: (v: string) => {
                setIssueFilter(v);
                setPage(1);
              },
            },
            {
              label: "Priority",
              value: severityFilter,
              options: SEVERITY_OPTIONS,
              onChange: (v: string) => {
                setSeverityFilter(v);
                setPage(1);
              },
            },
          ].map(({ label, value, options, onChange }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {label}
              </label>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={`Filter by ${label}`}
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ── Sort bar ── */}
      <div className="flex items-center gap-3 sm:gap-5 px-2 sm:px-4 py-2 text-xs border-b border-border/60 overflow-x-auto">
        <span className="text-muted-foreground whitespace-nowrap shrink-0 font-medium">Sort:</span>
        <SortButton field="createdAt" current={sortField} dir={sortDir} onToggle={toggleSort}>
          Date Submitted
        </SortButton>
        <SortButton field="updatedAt" current={sortField} dir={sortDir} onToggle={toggleSort}>
          Last Updated
        </SortButton>
        <SortButton field="severity" current={sortField} dir={sortDir} onToggle={toggleSort}>
          Priority
        </SortButton>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : isError ? (
        <QueryError message="Couldn't load your complaints. Please try refreshing." onRetry={() => refetch()} />
      ) : complaints.length === 0 ? (
        search || hasFilters ? (
          <NoSearchResultsEmpty query={search} onClear={clearAll} />
        ) : (
          <NoComplaintsEmpty />
        )
      ) : (
        <div className="space-y-2.5">
          {complaints.map((c) => (
            <ComplaintItem
              key={c._id}
              complaint={c}
              unreadCount={unreadCounts[c._id] ?? 0}
              onClick={() => onOpenComplaint(c._id)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total reports
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              className="text-xs h-8"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="text-xs h-8"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
