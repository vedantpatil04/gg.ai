import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  IdCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import { AdminEmptyState } from "@/components/admin/admin-dashboard-container";
import { cn } from "@/lib/utils";
import {
  useEnterpriseAuthorityList,
  useBulkOperation,
  APPROVAL_PILL,
  CAPACITY_META,
  AVAILABILITY_PILL,
  type EnterpriseAuthority,
  type CapacityLabel,
  type AuthorityAvailability,
} from "./authority-directory-queries";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "available"
  | "busy"
  | "on_leave"
  | "overloaded"
  | "underutilized";

export type SortField = "name" | "workload" | "resolutionRate" | "activeCases" | "joinedDate" | "lastActive";

interface AuthorityEnterpriseListProps {
  searchTerm: string;
  statusFilter: StatusFilter;
  approvalFilter: "all" | AuthorityApprovalStatus;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSelect: (a: EnterpriseAuthority) => void;
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortBtn({
  field,
  current,
  dir,
  onToggle,
  children,
}: {
  field: SortField;
  current: SortField;
  dir: "asc" | "desc";
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
        dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthorityEnterpriseList({
  searchTerm,
  statusFilter,
  approvalFilter,
  page,
  limit,
  onPageChange,
  onSelect,
}: AuthorityEnterpriseListProps) {
  const [sort, setSort] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bulk = useBulkOperation();

  // Build API params from UI state
  const apiParams = useMemo(() => {
    const p: Record<string, unknown> = {
      page,
      limit,
      search: searchTerm || undefined,
    };
    if (approvalFilter !== "all") p.approvalStatus = approvalFilter;

    // Map composite status filters
    if (statusFilter === "active") { p.isActive = true; p.approvalStatus = "approved"; }
    else if (statusFilter === "inactive") p.isActive = false;
    else if (statusFilter === "available") p.availability = "available";
    else if (statusFilter === "busy") p.availability = "busy";
    else if (statusFilter === "on_leave") p.availability = "on_leave";

    // Sort mapping
    const sortMap: Record<SortField, string> = {
      name: "name",
      workload: "name", // sorted client-side
      resolutionRate: "name",
      activeCases: "name",
      joinedDate: "joinedDate",
      lastActive: "lastActive",
    };
    p.sortBy = sortMap[sort] || "name";
    p.sortDir = sortDir;

    return p as Parameters<typeof useEnterpriseAuthorityList>[0];
  }, [page, limit, searchTerm, approvalFilter, statusFilter, sort, sortDir]);

  const { data, isLoading, isError } = useEnterpriseAuthorityList(apiParams);

  function toggleSort(field: SortField) {
    if (field === sort) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(field); setSortDir("asc"); }
  }

  // Client-side sort for computed fields
  const authorities = useMemo(() => {
    const arr = [...(data?.authorities ?? [])];
    if (statusFilter === "overloaded") return arr.filter((a) => a.workload?.capacity === "overloaded");
    if (statusFilter === "underutilized") return arr.filter((a) => (a.workload?.active ?? 0) <= 2 && a.isActive);

    if (sort === "workload") arr.sort((a, b) => (sortDir === "asc" ? (a.workload?.total ?? 0) - (b.workload?.total ?? 0) : (b.workload?.total ?? 0) - (a.workload?.total ?? 0)));
    else if (sort === "resolutionRate") arr.sort((a, b) => (sortDir === "asc" ? (a.workload?.resolutionRate ?? 0) - (b.workload?.resolutionRate ?? 0) : (b.workload?.resolutionRate ?? 0) - (a.workload?.resolutionRate ?? 0)));
    else if (sort === "activeCases") arr.sort((a, b) => (sortDir === "asc" ? (a.workload?.active ?? 0) - (b.workload?.active ?? 0) : (b.workload?.active ?? 0) - (a.workload?.active ?? 0)));
    return arr;
  }, [data, sort, sortDir, statusFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === authorities.length) setSelected(new Set());
    else setSelected(new Set(authorities.map((a) => a._id)));
  }

  function handleBulkActivate() {
    bulk.mutate({ action: "activate", ids: [...selected] }, { onSuccess: () => setSelected(new Set()) });
  }

  function handleBulkDeactivate() {
    bulk.mutate({ action: "deactivate", ids: [...selected] }, { onSuccess: () => setSelected(new Set()) });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive text-center py-12">
        Couldn't load authorities. Try refreshing.
      </p>
    );
  }

  if (authorities.length === 0) {
    return (
      <AdminEmptyState
        icon={IdCard}
        title="No authorities found."
        description={
          searchTerm
            ? `No authority matched "${searchTerm}" in the loaded results.`
            : "No authority accounts match the current filters."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/8 border border-primary/20">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bulk.isPending} onClick={handleBulkActivate}>
              {bulk.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
              Activate
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" disabled={bulk.isPending} onClick={handleBulkDeactivate}>
              Deactivate
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Table header ── */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-2 border-b text-xs">
        <button onClick={toggleAll} className="text-muted-foreground">
          {selected.size === authorities.length && selected.size > 0 ? (
            <CheckSquare className="size-3.5" />
          ) : (
            <Square className="size-3.5" />
          )}
        </button>
        <SortBtn field="name" current={sort} dir={sortDir} onToggle={toggleSort}>Name</SortBtn>
        <SortBtn field="joinedDate" current={sort} dir={sortDir} onToggle={toggleSort}>Joined</SortBtn>
        <SortBtn field="activeCases" current={sort} dir={sortDir} onToggle={toggleSort}>Active</SortBtn>
        <SortBtn field="resolutionRate" current={sort} dir={sortDir} onToggle={toggleSort}>Rate</SortBtn>
        <span className="text-muted-foreground">Capacity</span>
        <span className="text-muted-foreground">Status</span>
      </div>

      {/* ── Rows ── */}
      <div className="space-y-1.5">
        {authorities.map((a) => {
          const isSelected = selected.has(a._id);
          return (
            <div
              key={a._id}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3 rounded-xl border cursor-pointer transition-all",
                isSelected
                  ? "bg-primary/5 border-primary/25"
                  : "bg-card hover:bg-muted/40 border-border/60",
              )}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(a._id); }}
                className="text-muted-foreground"
              >
                {isSelected ? (
                  <CheckSquare className="size-3.5 text-primary" />
                ) : (
                  <Square className="size-3.5" />
                )}
              </button>

              {/* Identity */}
              <div
                className="min-w-0 cursor-pointer"
                onClick={() => onSelect(a)}
              >
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {(a.name || "AU").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                      {a.email}
                      {a.primaryCity && (
                        <>
                          <span>·</span>
                          <MapPin className="size-2.5" />
                          <span className="capitalize">{a.primaryCity}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Joined */}
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {a.createdAt ? format(new Date(a.createdAt), "MMM d, yyyy") : "—"}
              </div>

              {/* Active cases */}
              <div className="text-xs font-semibold text-center w-10">
                {a.workload?.active ?? 0}
              </div>

              {/* Resolution rate */}
              <div className="text-xs font-semibold text-center w-10">
                {a.workload?.resolutionRate ?? 0}%
              </div>

              {/* Capacity */}
              {a.workload && a.workload.capacity && CAPACITY_META[a.workload.capacity] ? (
                <Pill tone={CAPACITY_META[a.workload.capacity].tone}>
                  {CAPACITY_META[a.workload.capacity].label}
                </Pill>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}

              {/* Status */}
              <div className="flex flex-col gap-1 items-end">
                <Pill tone={a.approvalStatus && APPROVAL_PILL[a.approvalStatus] ? APPROVAL_PILL[a.approvalStatus] : "warning"}>
                  {a.approvalStatus || "pending"}
                </Pill>
                <Pill tone={a.availability && AVAILABILITY_PILL[a.availability] ? AVAILABILITY_PILL[a.availability] : "muted"}>
                  {a.availability ? a.availability.replace("_", " ") : "unknown"}
                </Pill>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => onPageChange(page + 1)}
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
