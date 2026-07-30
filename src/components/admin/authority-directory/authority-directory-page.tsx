import { useState } from "react";
import {
  RefreshCw,
  Search,
  LayoutDashboard,
  List,
  Filter,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/ui-bits";
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
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
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
  const [view, setView] = useState<ViewMode>("dashboard");
  const [approvalFilter, setApprovalFilter] = useState<"all" | AuthorityApprovalStatus>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<EnterpriseAuthority | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingAction | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycleAction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const qc = useQueryClient();
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

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      {/* ── Page header ── */}
      <SectionTitle
        eyebrow="Governance"
        title="Authority Management"
        action={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-1 bg-muted/50 rounded-xl border border-border">
              <button
                onClick={() => setView("dashboard")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  view === "dashboard"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutDashboard className="size-3.5" />
                Intelligence
              </button>
              <button
                onClick={() => setView("directory")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  view === "directory"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3.5" />
                Directory
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── Intelligence Dashboard ── */}
      {view === "dashboard" && (
        <div className="glass rounded-2xl p-5">
          <AuthorityIntelligenceDashboard />
        </div>
      )}

      {/* ── Directory View ── */}
      {view === "directory" && (
        <>
          {/* Search + filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search name, email, ID, dept, city…"
                className="pl-8 h-9"
              />
              {searchTerm && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="size-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
                  {(approvalFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground text-xs"
                onClick={() => { setApprovalFilter("all"); setStatusFilter("all"); setSearchTerm(""); setPage(1); }}
              >
                <X className="size-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter panels */}
          {showFilters && (
            <div className="glass rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Approval Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {APPROVAL_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setApprovalFilter(f.value); setPage(1); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        approvalFilter === f.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Workforce Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setStatusFilter(f.value); setPage(1); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        statusFilter === f.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Directory list */}
          <div className="glass rounded-2xl p-4 md:p-5">
            <AuthorityEnterpriseList
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              approvalFilter={approvalFilter}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onSelect={setSelected}
            />
          </div>
        </>
      )}

      {/* ── Profile Drawer ── */}
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

      {/* ── Approval Dialog (reused from Phase 2.3) ── */}
      <AuthorityRequestActionDialog
        pending={pendingApproval}
        onOpenChange={(open) => !open && setPendingApproval(null)}
        onConfirm={handleConfirmApproval}
        isSubmitting={approve.isPending || reject.isPending}
      />

      {/* ── Lifecycle Dialog (legacy — kept for backward compat) ── */}
      <AuthorityLifecycleDialog
        pending={pendingLifecycle}
        onOpenChange={(open) => !open && setPendingLifecycle(null)}
        onConfirm={handleConfirmLifecycle}
        isSubmitting={activate.isPending || deactivate.isPending}
      />
    </div>
  );
}
