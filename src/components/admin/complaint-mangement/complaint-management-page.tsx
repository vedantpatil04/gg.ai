import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search, X, Filter, ChevronLeft, ChevronRight, ClipboardList, RefreshCw,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle, EmptyState, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { complaintApi } from "@/lib/api/services.api";
import { useQuery } from "@tanstack/react-query";
import { ComplaintDetailPanel } from "@/components/admin/complaint-governance/complaint-detail-panel";
import type { GovernedComplaint } from "@/components/admin/complaint-governance/complaint-governance-queries";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Awaiting Verification" },
  { value: "rework", label: "Rework" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
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

const STATUS_TONE: Record<string, "warning" | "info" | "primary" | "success" | "destructive" | "muted"> = {
  pending: "warning", "in-progress": "info", resolved: "primary",
  rework: "info", closed: "success", rejected: "destructive",
};

const SEV_TONE: Record<string, "destructive" | "warning" | "info" | "muted"> = {
  critical: "destructive", high: "warning", medium: "info", low: "muted",
};

type SortField = "createdAt" | "updatedAt" | "severity";

function SortBtn({ field, cur, dir, onToggle, children }: { field: SortField; cur: SortField; dir: "asc" | "desc"; onToggle: (f: SortField) => void; children: React.ReactNode }) {
  const active = field === cur;
  return (
    <button className={cn("flex items-center gap-1 text-xs font-medium", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => onToggle(field)}>
      {children}
      {active ? (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
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
  const { isApiConnected, city } = useCity();
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["complaint-management", page, statusFilter, severityFilter, issueFilter, limit],
    queryFn: () => complaintApi.getAll({
      page, limit,
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
      issueType: issueFilter || undefined,
    }).then(r => r.data as { complaints: GovernedComplaint[]; pagination: { page: number; limit: number; total: number; pages: number } }),
    staleTime: 20_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const complaints = useMemo(() => {
    let list = data?.complaints ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c._id.includes(q) || (c.submittedBy as { name?: string }).name?.toLowerCase().includes(q) || "");
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
    if (f === sortField) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  }

  const hasFilters = !!statusFilter || !!severityFilter || !!issueFilter || !!search.trim();

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Governance"
        title="Complaint Management"
        action={
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["complaint-management"] })} className="h-8 text-xs">
            <RefreshCw className="size-3.5 mr-1.5" />Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); }} placeholder="Search title, ID, submitter…" className="pl-8 h-9 text-xs sm:text-sm" />
          {search && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="size-3.5" /></button>}
        </div>
        <Button variant={showFilters ? "default" : "outline"} size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setShowFilters(v => !v)}>
          <Filter className="size-3.5" />Filters
          {hasFilters && <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">{[statusFilter, severityFilter, issueFilter].filter(Boolean).length}</span>}
        </Button>
        {hasFilters && <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setStatusFilter(""); setSeverityFilter(""); setIssueFilter(""); setSearch(""); setPage(1); }}><X className="size-3 mr-1" />Clear</Button>}
      </div>

      {showFilters && (
        <div className="glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 animate-in slide-in-from-top-2 duration-200">
          {[
            { label: "Status", value: statusFilter, onChange: (v: string) => { setStatusFilter(v); setPage(1); }, options: STATUS_OPTIONS },
            { label: "Priority", value: severityFilter, onChange: (v: string) => { setSeverityFilter(v); setPage(1); }, options: SEVERITY_OPTIONS },
            { label: "Category", value: issueFilter, onChange: (v: string) => { setIssueFilter(v); setPage(1); }, options: ISSUE_OPTIONS },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/30">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 sm:gap-5 px-3 sm:px-4 py-2 border-b text-xs overflow-x-auto scrollbar-hide">
        <span className="text-muted-foreground shrink-0">Sort:</span>
        <SortBtn field="createdAt" cur={sortField} dir={sortDir} onToggle={toggleSort}>Date</SortBtn>
        <SortBtn field="updatedAt" cur={sortField} dir={sortDir} onToggle={toggleSort}>Updated</SortBtn>
        <SortBtn field="severity" cur={sortField} dir={sortDir} onToggle={toggleSort}>Priority</SortBtn>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-12">Couldn't load complaints.</p>
        ) : complaints.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-4" />} title="No complaints found." description={hasFilters ? "Try adjusting filters." : "No complaints yet."} />
        ) : (
          <div className="space-y-2">
            {complaints.map(c => {
              const submitter = c.submittedBy as { name?: string };
              const assignee = c.assignedTo as { name?: string } | null;
              return (
                <div key={c._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelected(c)}>
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{c.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">#{c._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {submitter.name ?? "Unknown"}{assignee?.name ? ` → ${assignee.name}` : ""} · {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <Pill tone={SEV_TONE[c.severity] ?? "muted"}>{c.severity}</Pill>
                    <Pill tone={STATUS_TONE[c.status] ?? "muted"}>{c.status}</Pill>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total</span>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 text-xs flex-1 sm:flex-none"><ChevronLeft className="size-3.5 mr-1" />Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="h-8 text-xs flex-1 sm:flex-none">Next<ChevronRight className="size-3.5 ml-1" /></Button>
            </div>
          </div>
        )}
      </div>

      <ComplaintDetailPanel complaint={selected} onOpenChange={open => !open && setSelected(null)} />
    </div>
  );
}
