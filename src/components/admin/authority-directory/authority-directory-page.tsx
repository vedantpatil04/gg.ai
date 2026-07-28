import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
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
import { AuthorityDirectoryList, type ApprovalFilter } from "./authority-directory-list";
import { AuthorityDetailPanel } from "./authority-detail-panel";
import {
  AuthorityLifecycleDialog,
  type PendingLifecycleAction,
} from "./authority-lifecycle-dialog";
import {
  useActivateAuthority,
  useDeactivateAuthority,
  type DirectoryAuthority,
} from "./authority-directory-queries";

const APPROVAL_FILTERS: { value: ApprovalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_FILTERS: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function AuthorityDirectoryPage() {
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<DirectoryAuthority | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingAction | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycleAction | null>(null);

  const qc = useQueryClient();
  const approve = useApproveAuthorityRequest();
  const reject = useRejectAuthorityRequest();
  const activate = useActivateAuthority();
  const deactivate = useDeactivateAuthority();

  const isActive = statusFilter === "all" ? undefined : statusFilter === "active";
  const limit = searchTerm.trim() || approvalFilter !== "all" ? 100 : 20;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-authority-directory"] });
    qc.invalidateQueries({ queryKey: ["admin-authority-requests"] });
  };

  const handleConfirmApproval = () => {
    if (!pendingApproval) return;
    const mutation = pendingApproval.action === "approve" ? approve : reject;
    mutation.mutate(pendingApproval.request._id, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["admin-authority-directory"] }); // reused mutation only invalidates its own key
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

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <SectionTitle
        eyebrow="Governance"
        title="Authority Directory"
        action={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
            {APPROVAL_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setApprovalFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                  approvalFilter === f.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === f.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email..."
            className="pl-8 h-9 w-56"
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-4 md:p-5">
        <AuthorityDirectoryList
          isActive={isActive}
          approvalFilter={approvalFilter}
          page={page}
          limit={limit}
          searchTerm={searchTerm}
          onPageChange={setPage}
          onSelect={setSelected}
        />
      </div>

      <AuthorityDetailPanel
        authority={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onApprove={(a) => setPendingApproval({ request: a, action: "approve" })}
        onReject={(a) => setPendingApproval({ request: a, action: "reject" })}
        onActivate={(a) => setPendingLifecycle({ authority: a, action: "activate" })}
        onDeactivate={(a) => setPendingLifecycle({ authority: a, action: "deactivate" })}
      />

      {/* Reused directly from Phase 2.3 — same component, same mutations */}
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
