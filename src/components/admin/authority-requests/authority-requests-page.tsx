import { useState } from "react";
import { RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/ui-bits";
import { AuthorityRequestList } from "./authority-request-list";
import { AuthorityRequestDetailPanel } from "./authority-request-detail-panel";
import {
  AuthorityRequestActionDialog,
  type PendingAction,
} from "./authority-request-action-dialog";
import {
  useApproveAuthorityRequest,
  useRejectAuthorityRequest,
  type AuthorityApprovalStatus,
  type AuthorityRequest,
} from "./authority-request-queries";

const TABS: { value: AuthorityApprovalStatus; label: string; icon: typeof Clock }[] = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "approved", label: "Approved", icon: CheckCircle2 },
  { value: "rejected", label: "Rejected", icon: XCircle },
];

export function AuthorityRequestsPage() {
  const [status, setStatus] = useState<AuthorityApprovalStatus>("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuthorityRequest | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const qc = useQueryClient();
  const approve = useApproveAuthorityRequest();
  const reject = useRejectAuthorityRequest();

  const changeTab = (next: AuthorityApprovalStatus) => {
    setStatus(next);
    setPage(1);
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    const mutation = pendingAction.action === "approve" ? approve : reject;
    mutation.mutate(pendingAction.request._id, {
      onSuccess: () => {
        setPendingAction(null);
        setSelected(null); // the approved/rejected request no longer belongs in the pending list
      },
    });
  };

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Administration"
        title="Authority Requests"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-authority-requests"] })}
            className="h-8 text-xs"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Tab switcher */}
      <div className="overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-max border border-border">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => changeTab(tab.value)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                status === tab.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        <AuthorityRequestList
          status={status}
          page={page}
          onPageChange={setPage}
          onSelect={setSelected}
        />
      </div>

      <AuthorityRequestDetailPanel
        request={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onApprove={(request) => setPendingAction({ request, action: "approve" })}
        onReject={(request) => setPendingAction({ request, action: "reject" })}
      />

      <AuthorityRequestActionDialog
        pending={pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={handleConfirm}
        isSubmitting={approve.isPending || reject.isPending}
      />
    </div>
  );
}
