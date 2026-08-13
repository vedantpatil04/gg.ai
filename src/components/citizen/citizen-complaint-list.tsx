/**
 * Phase 8 — Citizen Complaint List (polished)
 *
 * Changes vs original:
 * - Replaced inline skeleton divs with shared TableSkeleton
 * - Replaced bare error text with QueryError component
 * - Replaced bare EmptyState with NoComplaintsEmpty / NoSearchResultsEmpty
 * - Improved mobile card layout (stacks pills on small screens)
 * - Improved accessibility: aria-labels, role=button, keyboard nav
 * - Filter bar collapses to a scrollable row on mobile
 * - Pagination shows total count on all screen sizes
 */

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useMyCitizenComplaints } from "./citizen-queries";
import {
  getStatusMeta,
  getSeverityMeta,
  humanizeIssueType,
} from "./citizen-status-utils";
import type { CitizenComplaint } from "./citizen-queries";
import { TableSkeleton } from "@/components/shared/skeletons";
import {
  NoComplaintsEmpty,
  NoSearchResultsEmpty,
} from "@/components/shared/empty-states";
import { QueryError } from "@/components/shared/error-states";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "awaiting_citizen_review", label: "Ready for Review" },
  { value: "resolved", label: "Awaiting Verification" },
  { value: "closed", label: "Closed" },
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
      className={cn(
        "flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={() => onToggle(field)}
      aria-label={`Sort by ${field}`}
    >
      {children}
      {active ? (
        dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Complaint row ────────────────────────────────────────────────────────────

function ComplaintRow({
  complaint,
  onClick,
}: {
  complaint: CitizenComplaint;
  onClick: () => void;
}) {
  const assignedAuth = complaint.assignedTo as { name?: string } | null;
  const statusMeta = getStatusMeta(complaint.status, !!assignedAuth);
  const severityMeta = getSeverityMeta(complaint.severity);

  return (
    <div
      className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 cursor-pointer transition-all group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open complaint: ${complaint.title}`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Icon */}
      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="size-4 text-primary" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            {complaint.title}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            #{complaint._id.slice(-6).toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          <span className="text-xs text-muted-foreground">
            {humanizeIssueType(complaint.issueType)}
          </span>
          {complaint.location?.address && (
            <>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:block">
                {complaint.location.address}
              </span>
            </>
          )}
          {assignedAuth?.name && (
            <>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {assignedAuth.name}
              </span>
            </>
          )}
        </div>

        {/* Mobile: pills inline with main info */}
        <div className="flex items-center gap-1.5 mt-2 sm:hidden">
          <Pill tone={severityMeta.tone}>{severityMeta.label}</Pill>
          <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>
        </div>
      </div>

      {/* Meta (desktop) */}
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <Pill tone={severityMeta.tone}>{severityMeta.label}</Pill>
          <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(complaint.createdAt), "MMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CitizenComplaintListProps {
  onOpenComplaint: (id: string) => void;
}

export function CitizenComplaintList({ onOpenComplaint }: CitizenComplaintListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);

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

  const complaints = useMemo(() => {
    let list = data?.complaints ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.issueType.toLowerCase().includes(q) ||
          c._id.includes(q) ||
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
    else { setSortField(field); setSortDir("desc"); }
  }

  const clearAll = () => {
    setStatusFilter(""); setIssueFilter(""); setSeverityFilter(""); setSearch(""); setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title, category, ID…"
            className="pl-8 h-9"
            aria-label="Search complaints"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          className="h-9 gap-1.5"
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
            className="h-9 text-muted-foreground text-xs"
            onClick={clearAll}
          >
            <X className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
          {[
            { label: "Status", value: statusFilter, options: STATUS_OPTIONS, onChange: (v: string) => { setStatusFilter(v); setPage(1); } },
            { label: "Category", value: issueFilter, options: ISSUE_OPTIONS, onChange: (v: string) => { setIssueFilter(v); setPage(1); } },
            { label: "Priority", value: severityFilter, options: SEVERITY_OPTIONS, onChange: (v: string) => { setSeverityFilter(v); setPage(1); } },
          ].map(({ label, value, options, onChange }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {label}
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={`Filter by ${label}`}
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ── Sort bar ── */}
      <div className="flex items-center gap-3 sm:gap-5 px-2 sm:px-4 py-2 text-xs border-b overflow-x-auto">
        <span className="text-muted-foreground whitespace-nowrap shrink-0">Sort:</span>
        <SortButton field="createdAt" current={sortField} dir={sortDir} onToggle={toggleSort}>Date</SortButton>
        <SortButton field="updatedAt" current={sortField} dir={sortDir} onToggle={toggleSort}>Updated</SortButton>
        <SortButton field="severity" current={sortField} dir={sortDir} onToggle={toggleSort}>Priority</SortButton>
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
        <div className="space-y-2">
          {complaints.map((c) => (
            <ComplaintRow key={c._id} complaint={c} onClick={() => onOpenComplaint(c._id)} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
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
