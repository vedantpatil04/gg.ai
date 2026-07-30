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
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useMyCitizenComplaints } from "./citizen-queries";
import {
  getStatusMeta,
  getSeverityMeta,
  humanizeIssueType,
} from "./citizen-status-utils";
import type { CitizenComplaint } from "./citizen-queries";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        "flex items-center gap-1 text-xs font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={() => onToggle(field)}
    >
      {children}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

function ComplaintRow({
  complaint,
  onClick,
}: {
  complaint: CitizenComplaint;
  onClick: () => void;
}) {
  const statusMeta = getStatusMeta(complaint.status);
  const severityMeta = getSeverityMeta(complaint.severity);
  const assignedAuth = complaint.assignedTo as { name?: string } | null;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 cursor-pointer transition-all group"
      onClick={onClick}
    >
      {/* Icon */}
      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="size-4 text-primary" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {complaint.title}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            #{complaint._id.slice(-6).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {humanizeIssueType(complaint.issueType)}
          </span>
          {complaint.location?.address && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {complaint.location.address}
              </span>
            </>
          )}
          {assignedAuth?.name && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground">
                {assignedAuth.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
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

  const { data, isLoading, isError } = useMyCitizenComplaints({
    page,
    limit,
    status: statusFilter || undefined,
    issueType: issueFilter || undefined,
    severity: severityFilter || undefined,
  });

  // Client-side search and sort (for fields not indexed server-side)
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
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "severity") {
        const sev = { low: 0, medium: 1, high: 2, critical: 3 };
        return dir * ((sev[a.severity] ?? 0) - (sev[b.severity] ?? 0));
      }
      return (
        dir *
        (new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime())
      );
    });
    return list;
  }, [data, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const hasFilters = !!statusFilter || !!issueFilter || !!severityFilter || !!search;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title, category, ID, location…"
            className="pl-8 h-9"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
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
        >
          <Filter className="size-3.5" />
          Filters
          {hasFilters && (
            <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
              {(statusFilter ? 1 : 0) + (issueFilter ? 1 : 0) + (severityFilter ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground text-xs"
            onClick={() => {
              setStatusFilter(""); setIssueFilter(""); setSeverityFilter(""); setSearch(""); setPage(1);
            }}
          >
            <X className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Category
            </label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={issueFilter}
              onChange={(e) => { setIssueFilter(e.target.value); setPage(1); }}
            >
              {ISSUE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Priority
            </label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Sort bar ── */}
      <div className="flex items-center gap-5 px-4 py-2 text-xs border-b">
        <span className="text-muted-foreground">Sort by:</span>
        <SortButton field="createdAt" current={sortField} dir={sortDir} onToggle={toggleSort}>
          Date
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive text-center py-12">
          Couldn't load complaints. Please try refreshing.
        </p>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-4" />}
          title={search || hasFilters ? "No complaints match your filters." : "No complaints yet."}
          description={
            search || hasFilters
              ? "Try adjusting your search or filters."
              : "Submit your first complaint to start tracking environmental issues."
          }
        />
      ) : (
        <div className="space-y-2">
          {complaints.map((c) => (
            <ComplaintRow key={c._id} complaint={c} onClick={() => onOpenComplaint(c._id)} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((p) => p + 1)}
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
