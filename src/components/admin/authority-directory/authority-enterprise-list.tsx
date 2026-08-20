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
  AlertCircle,
  ChevronRight as RowChevron,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  approvalFilter: "all" | "approved" | "pending" | "rejected";
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSelect: (a: EnterpriseAuthority) => void;
}

/* ── Badges ──────────────────────────────────────────────────────────────── */

function ApprovalBadge({ status }: { status: string }) {
  const config = {
    approved: {
      label: "Approved",
      classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    },
    pending: {
      label: "Pending Approval",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    },
    rejected: {
      label: "Rejected",
      classes: "bg-destructive/10 text-destructive border-destructive/25",
    },
  }[status] ?? {
    label: status,
    classes: "bg-muted/60 text-muted-foreground border-border/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shrink-0 select-none",
        config.classes,
      )}
    >
      <span>{config.label}</span>
    </span>
  );
}

function AvailabilityBadge({ availability }: { availability?: string }) {
  const normalized = availability ?? "unknown";
  const config = {
    available: {
      label: "Available",
      classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    busy: {
      label: "Busy",
      classes: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    on_leave: {
      label: "On Leave",
      classes: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    unknown: {
      label: "Inactive",
      classes: "bg-muted/60 text-muted-foreground border-border/50",
    },
  }[normalized] ?? {
    label: normalized.replace("_", " "),
    classes: "bg-muted/60 text-muted-foreground border-border/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shrink-0 select-none capitalize",
        config.classes,
      )}
    >
      <span>{config.label}</span>
    </span>
  );
}

function CapacityBadge({ capacity }: { capacity?: CapacityLabel }) {
  if (!capacity || !CAPACITY_META[capacity]) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const meta = CAPACITY_META[capacity];
  const classes = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    info: "bg-sky-500/10 text-sky-500 border-sky-500/25",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    destructive: "bg-destructive/10 text-destructive border-destructive/25 font-bold",
    muted: "bg-muted/60 text-muted-foreground border-border/50",
  }[meta.tone];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shrink-0 select-none",
        classes,
      )}
    >
      <span>{meta.label}</span>
    </span>
  );
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
      type="button"
      className={cn(
        "flex items-center gap-1 text-[10.5px] uppercase font-bold tracking-[0.14em] transition-colors cursor-pointer select-none outline-none",
        active ? "text-foreground font-extrabold" : "text-muted-foreground/80 hover:text-foreground",
      )}
      onClick={() => onToggle(field)}
    >
      <span>{children}</span>
      {active ? (
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
    if (statusFilter === "active") {
      p.isActive = true;
      p.approvalStatus = "approved";
    } else if (statusFilter === "inactive") {
      p.isActive = false;
    } else if (statusFilter === "available") {
      p.availability = "available";
    } else if (statusFilter === "busy") {
      p.availability = "busy";
    } else if (statusFilter === "on_leave") {
      p.availability = "on_leave";
    }

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

  const { data, isLoading, isError, refetch } = useEnterpriseAuthorityList(apiParams);

  function toggleSort(field: SortField) {
    if (field === sort) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setSortDir("asc");
    }
  }

  // Client-side sort for computed fields
  const authorities = useMemo(() => {
    const arr = [...(data?.authorities ?? [])];
    if (statusFilter === "overloaded")
      return arr.filter((a) => a.workload?.capacity === "overloaded");
    if (statusFilter === "underutilized")
      return arr.filter((a) => (a.workload?.active ?? 0) <= 2 && a.isActive);

    if (sort === "workload")
      arr.sort((a, b) =>
        sortDir === "asc"
          ? (a.workload?.total ?? 0) - (b.workload?.total ?? 0)
          : (b.workload?.total ?? 0) - (a.workload?.total ?? 0),
      );
    else if (sort === "resolutionRate")
      arr.sort((a, b) =>
        sortDir === "asc"
          ? (a.workload?.resolutionRate ?? 0) - (b.workload?.resolutionRate ?? 0)
          : (b.workload?.resolutionRate ?? 0) - (a.workload?.resolutionRate ?? 0),
      );
    else if (sort === "activeCases")
      arr.sort((a, b) =>
        sortDir === "asc"
          ? (a.workload?.active ?? 0) - (b.workload?.active ?? 0)
          : (b.workload?.active ?? 0) - (a.workload?.active ?? 0),
      );
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
    bulk.mutate(
      { action: "activate", ids: [...selected] },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  function handleBulkDeactivate() {
    bulk.mutate(
      { action: "deactivate", ids: [...selected] },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-3">
        <div className="flex items-center justify-center h-48 gap-2.5 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-xs font-medium">Loading authority records…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 sm:p-12 text-center space-y-3">
        <div className="size-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
          <AlertCircle className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Failed to Load Authority Directory</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Unable to communicate with the authority governance service.
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
          Retry Query
        </Button>
      </div>
    );
  }

  if (authorities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-14 px-4">
        <div className="size-11 rounded-2xl bg-muted/70 border border-border/60 grid place-items-center text-muted-foreground">
          <IdCard className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">No Authorities Found</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
            {searchTerm
              ? `No authority record matched "${searchTerm}".`
              : "No authority accounts match the selected status or approval filters."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── BULK ACTION BAR ─────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-primary/10 border-b border-primary/20 select-none">
          <span className="text-xs font-semibold text-foreground">
            <span className="text-primary font-bold tabular-nums">{selected.size}</span> officer
            {selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-medium border-primary/30 hover:bg-primary/20 cursor-pointer shadow-2xs"
              disabled={bulk.isPending}
              onClick={handleBulkActivate}
            >
              {bulk.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
              Activate Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer shadow-2xs"
              disabled={bulk.isPending}
              onClick={handleBulkDeactivate}
            >
              Deactivate Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setSelected(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* ── MOBILE STACKED CARDS (< lg) ─────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-border/40">
        {authorities.map((a) => {
          const isSelected = selected.has(a._id);
          return (
            <div
              key={a._id}
              onClick={() => onSelect(a)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(a);
                }
              }}
              className={cn(
                "group p-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer select-none space-y-2.5",
                isSelected && "bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(a._id);
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0"
                    aria-label="Select authority"
                  >
                    {isSelected ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 opacity-50" />
                    )}
                  </button>

                  {/* Avatar */}
                  <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-xs font-bold text-primary shrink-0">
                    {(a.name || "AU").slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {a.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end shrink-0">
                  <ApprovalBadge status={a.approvalStatus || "pending"} />
                  <AvailabilityBadge availability={a.availability} />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-border/30 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <strong className="text-foreground font-semibold tabular-nums">{a.workload?.active ?? 0}</strong>
                    <span>active</span>
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <strong className="text-foreground font-semibold tabular-nums">{a.workload?.resolutionRate ?? 0}%</strong>
                    <span>rate</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CapacityBadge capacity={a.workload?.capacity} />
                  <RowChevron className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP ENTERPRISE TABLE (lg+) ──────────────────────────────── */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/60 bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-10 py-3 px-4">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-muted-foreground hover:text-foreground cursor-pointer grid place-items-center"
                  aria-label="Select all"
                >
                  {selected.size === authorities.length && selected.size > 0 ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead className="py-3 px-4">
                <SortBtn field="name" current={sort} dir={sortDir} onToggle={toggleSort}>
                  Officer / Identity
                </SortBtn>
              </TableHead>
              <TableHead className="py-3 px-4">
                <SortBtn field="joinedDate" current={sort} dir={sortDir} onToggle={toggleSort}>
                  Joined
                </SortBtn>
              </TableHead>
              <TableHead className="py-3 px-4 text-center">
                <SortBtn field="activeCases" current={sort} dir={sortDir} onToggle={toggleSort}>
                  Active
                </SortBtn>
              </TableHead>
              <TableHead className="py-3 px-4 text-center">
                <SortBtn field="resolutionRate" current={sort} dir={sortDir} onToggle={toggleSort}>
                  Rate
                </SortBtn>
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Capacity
              </TableHead>
              <TableHead className="py-3 px-4 text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Status / Availability
              </TableHead>
              <TableHead className="py-3 px-4 text-right text-[10.5px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/40">
            {authorities.map((a) => {
              const isSelected = selected.has(a._id);
              return (
                <TableRow
                  key={a._id}
                  onClick={() => onSelect(a)}
                  className={cn(
                    "group cursor-pointer hover:bg-muted/30 transition-colors select-none",
                    isSelected && "bg-primary/5",
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(a._id);
                      }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer grid place-items-center"
                    >
                      {isSelected ? (
                        <CheckSquare className="size-4 text-primary" />
                      ) : (
                        <Square className="size-4 opacity-50" />
                      )}
                    </button>
                  </TableCell>

                  {/* Officer Identity */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold grid place-items-center shrink-0">
                        {(a.name || "AU").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 max-w-xs xl:max-w-sm">
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {a.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                          <span className="truncate">{a.email}</span>
                          {a.primaryCity && (
                            <>
                              <span>&middot;</span>
                              <span className="flex items-center gap-0.5 capitalize shrink-0">
                                <MapPin className="size-2.5 text-muted-foreground/60" />
                                {a.primaryCity}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Joined Date */}
                  <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                    {a.createdAt ? format(new Date(a.createdAt), "MMM d, yyyy") : "—"}
                  </TableCell>

                  {/* Active Cases */}
                  <TableCell className="py-3 px-4 text-center">
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {a.workload?.active ?? 0}
                    </span>
                  </TableCell>

                  {/* Resolution Rate */}
                  <TableCell className="py-3 px-4 text-center">
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {a.workload?.resolutionRate ?? 0}%
                    </span>
                  </TableCell>

                  {/* Capacity */}
                  <TableCell className="py-3 px-4">
                    <CapacityBadge capacity={a.workload?.capacity} />
                  </TableCell>

                  {/* Status / Availability */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ApprovalBadge status={a.approvalStatus || "pending"} />
                      <AvailabilityBadge availability={a.availability} />
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end">
                      <RowChevron className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── PAGINATION & FOOTER ─────────────────────────────────────────── */}
      {data && data.pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border/50 bg-muted/10">
          <div className="text-xs text-muted-foreground font-mono">
            Showing Page <span className="font-semibold text-foreground">{data.pagination.page}</span> of{" "}
            <span className="font-semibold text-foreground">{data.pagination.pages}</span> &middot;{" "}
            <span className="font-semibold text-foreground">{data.pagination.total}</span> registered authorities
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 text-xs flex-1 sm:flex-none border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 text-xs flex-1 sm:flex-none border-border/70 hover:bg-muted/60 cursor-pointer shadow-2xs"
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

