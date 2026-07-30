import { useState } from "react";
import { format } from "date-fns";
import { Search, X, ChevronLeft, ChevronRight, ScrollText, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useAuditLog, type AuditEntry } from "./platform-admin-queries";

const ACTION_LABELS: Record<string, string> = {
  user_updated: "User Updated",
  account_locked: "Account Locked",
  account_unlocked: "Account Unlocked",
  city_created: "City Created",
  city_updated: "City Updated",
  city_activated: "City Activated",
  city_deactivated: "City Deactivated",
};

const ACTION_FILTERS = [
  { value: "", label: "All Actions" },
  { value: "user_updated", label: "User Updated" },
  { value: "account_locked", label: "Account Locked" },
  { value: "account_unlocked", label: "Account Unlocked" },
  { value: "city_created", label: "City Created" },
  { value: "city_updated", label: "City Updated" },
  { value: "city_activated", label: "City Activated" },
  { value: "city_deactivated", label: "City Deactivated" },
];

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <div className="flex items-start gap-4 p-3.5 rounded-xl border border-border/50 bg-card hover:bg-muted/20 transition-colors">
      <div className="size-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
        {entry.status === "success"
          ? <CheckCircle2 className="size-4 text-success" />
          : <XCircle className="size-4 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
          <Pill tone={entry.status === "success" ? "success" : "destructive"}>{entry.status}</Pill>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          <span className="font-medium text-foreground/70">{entry.who}</span>
          {" acted on "}
          <span className="font-medium text-foreground/70">{entry.target}</span>
        </div>
        {entry.detail && (
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-xs">{entry.detail}</p>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground shrink-0 text-right mt-0.5">
        {format(new Date(entry.at), "MMM d, yyyy")}
        <br />
        {format(new Date(entry.at), "h:mm:ss a")}
      </div>
    </div>
  );
}

export function AuditCenter() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading, isError } = useAuditLog({
    page, limit: 30,
    search: search || undefined,
    action: actionFilter || undefined,
  });

  const entries = data?.entries ?? [];
  const hasFilters = !!search.trim() || !!actionFilter;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by who, action, target…" className="pl-8 h-9" />
          {search && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="size-3.5" /></button>}
        </div>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 h-9"
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          {ACTION_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setActionFilter(""); setPage(1); }}>
            <X className="size-3 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Info note */}
      <div className="text-xs text-muted-foreground px-1">
        Audit entries are recorded for the current server session. A persistent audit log will be added in Phase 8.
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : isError ? (
        <p className="text-sm text-destructive text-center py-10">Couldn't load audit log.</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-4" />} title="No audit entries yet."
          description="Audit entries will appear here as administrators perform actions." />
      ) : (
        <div className="space-y-2">
          {entries.map(e => <AuditRow key={e.id} entry={e} />)}
        </div>
      )}

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="size-3.5 mr-1" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
