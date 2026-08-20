import { useState } from "react";
import {
  RefreshCw,
  Search,
  LayoutDashboard,
  List,
  Filter,
  X,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useApproveAuthorityRequest,
  useRejectAuthorityRequest,
} from "@/components/admin/authority-requests/authority-request-queries";
import {
  AuthorityRequestActionDialog,
  type PendingAction,
} from "@/components/admin/authority-requests/authority-request-action-dialog";
import {
  AuthorityLifecycleDialog,
  type PendingLifecycleAction,
} from "./authority-lifecycle-dialog";
import {
  useActivateAuthority,
  useDeactivateAuthority,
  type EnterpriseAuthority,
} from "./authority-directory-queries";
import { AuthorityEnterpriseList, type StatusFilter } from "./authority-enterprise-list";
import { AuthorityProfileDrawer } from "./authority-profile-drawer";
import { AuthorityIntelligenceDashboard } from "./authority-intelligence-dashboard";
import type { AuthorityApprovalStatus } from "@/components/admin/authority-requests/authority-request-queries";

// ─── Filter config ────────────────────────────────────────────────────────────

const APPROVAL_FILTERS: { value: "all" | AuthorityApprovalStatus; label: string }[] = [
  { value: "all", label: "All Approvals" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Workforce" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "on_leave", label: "On Leave" },
  { value: "overloaded", label: "Overloaded" },
  { value: "underutilized", label: "Under-utilized" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "directory" | "dashboard";

export function AuthorityDirectoryPage() {
  // Directory is the primary / default view per specification
  const [view, setView] = useState<ViewMode>("directory");
  const [approvalFilter, setApprovalFilter] = useState<"all" | AuthorityApprovalStatus>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<EnterpriseAuthority | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingAction | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycleAction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const qc = useQueryClient();
  const isFetching =
    useIsFetching({ queryKey: ["p4-authority-list"] }) > 0 ||
    useIsFetching({ queryKey: ["p4-authority-dashboard"] }) > 0;

  const approve = useApproveAuthorityRequest();
  const reject = useRejectAuthorityRequest();
  const activate = useActivateAuthority();
  const deactivate = useDeactivateAuthority();

  const limit = searchTerm.trim() ? 100 : 20;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["p4-authority-list"] });
    qc.invalidateQueries({ queryKey: ["p4-authority-dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin-authority-directory"] });
    qc.invalidateQueries({ queryKey: ["admin-authority-requests"] });
  };

  const handleConfirmApproval = () => {
    if (!pendingApproval) return;
    const mutation = pendingApproval.action === "approve" ? approve : reject;
    mutation.mutate(pendingApproval.request._id, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["p4-authority-list"] });
        qc.invalidateQueries({ queryKey: ["p4-authority-dashboard"] });
        setPendingApproval(null);
        setSelected(null);
      },
    });
  };

  const handleConfirmLifecycle = () => {
    if (!pendingLifecycle) return;
    const mutation = pendingLifecycle.action === "activate" ? activate : deactivate;
    mutation.mutate(pendingLifecycle.authority._id, {
      onSuccess: () => {
        setPendingLifecycle(null);
        setSelected(null);
      },
    });
  };

  const hasActiveFilters =
    approvalFilter !== "all" || statusFilter !== "all" || searchTerm.trim() !== "";

  const activeFiltersCount =
    (approvalFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const handleClearFilters = () => {
    setApprovalFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  return (
    <div className="px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      {/* ── 1. PAGE HEADER ────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Authority Governance &amp; Dispatch
            </span>
            <span>&middot;</span>
            <span>Admin Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
            Authority Directory
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5 max-w-2xl leading-relaxed">
            Manage and monitor registered authorities, operational capacities, and city assignments across the platform.
          </p>
        </div>

        {/* View Switch + Refresh Action */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {/* Segmented View Switch: Overview | Directory */}
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer outline-none",
                "focus-visible:ring-1 focus-visible:ring-primary",
                view === "dashboard"
                  ? "bg-card text-foreground shadow-2xs border border-border/50 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
              )}
            >
              <LayoutDashboard className="size-3.5" />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setView("directory")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer outline-none",
                "focus-visible:ring-1 focus-visible:ring-primary",
                view === "directory"
                  ? "bg-card text-foreground shadow-2xs border border-border/50 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
              )}
            >
              <List className="size-3.5" />
              <span>Directory</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isFetching}
            className="h-8.5 text-xs font-medium border-border/70 hover:border-border hover:bg-muted/60 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5 text-primary", isFetching && "animate-spin")} />
            <span>{isFetching ? "Syncing..." : "Refresh"}</span>
          </Button>
        </div>
      </section>

      {/* ── 2. OVERVIEW MODE (SECONDARY) ─────────────────────────────────── */}
      {view === "dashboard" && (
        <section className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs">
          <AuthorityIntelligenceDashboard />
        </section>
      )}

      {/* ── 3. DIRECTORY MODE (PRIMARY / DEFAULT) ────────────────────────── */}
      {view === "directory" && (
        <>
          {/* Search + Filter Toolbar */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/80 pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search officer name, email, city, dept…"
                  className="pl-8 pr-7 h-9 text-xs sm:text-sm bg-card/60 border-border/60 focus-visible:border-primary/50"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground grid place-items-center cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Filters Toggle + Clear */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-medium cursor-pointer shadow-2xs border-border/60"
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

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                    onClick={handleClearFilters}
                  >
                    <X className="size-3 mr-1" />
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Collapsible Filter Panel */}
            {showFilters && (
              <div className="rounded-2xl p-4 border border-border/60 bg-muted/20 space-y-3.5 animate-in fade-in-50 duration-200">
                {/* Approval Status Filter */}
                <div className="space-y-1.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 font-bold">
                    Approval Status
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {APPROVAL_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          setApprovalFilter(f.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none",
                          approvalFilter === f.value
                            ? "bg-card text-foreground shadow-2xs border-primary/50 ring-1 ring-primary font-semibold"
                            : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-card",
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workforce Status Filter */}
                <div className="space-y-1.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 font-bold">
                    Workforce &amp; Operational Status
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(f.value);
                          setPage(1);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none",
                          statusFilter === f.value
                            ? "bg-card text-foreground shadow-2xs border-primary/50 ring-1 ring-primary font-semibold"
                            : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-card",
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Directory List Container */}
          <section className="rounded-2xl border border-border/70 bg-card/60 shadow-2xs overflow-hidden">
            <AuthorityEnterpriseList
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              approvalFilter={approvalFilter}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onSelect={setSelected}
            />
          </section>
        </>
      )}

      {/* ── 4. PROFILE DRAWER & ACTION DIALOGS ────────────────────────────── */}
      <AuthorityProfileDrawer
        authority={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onApprove={(a) =>
          setPendingApproval({ request: a, action: "approve" })
        }
        onReject={(a) =>
          setPendingApproval({ request: a, action: "reject" })
        }
      />

      <AuthorityRequestActionDialog
        pending={pendingApproval}
        onOpenChange={(open) => !open && setPendingApproval(null)}
        onConfirm={handleConfirmApproval}
        isSubmitting={approve.isPending || reject.isPending}
      />

      <AuthorityLifecycleDialog
        pending={pendingLifecycle}
        onOpenChange={(open) => !open && setPendingLifecycle(null)}
        onConfirm={handleConfirmLifecycle}
        isSubmitting={activate.isPending || deactivate.isPending}
      />
    </div>
  );
}

