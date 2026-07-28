import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Inbox,
  Loader,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  AlertTriangle,
  CheckSquare,
  Lock,
  RotateCcw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceHeader } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { ComplaintQueueList } from "./complaint-queue-list";
import { ComplaintDetailPanel } from "./complaint-detail-panel";
import { ComplaintActionDialog, type PendingComplaintAction } from "./complaint-action-dialog";
import { ComplaintAssignDialog } from "./complaint-assign-dialog";
import { ResolutionVerificationWorkspace } from "./resolution-verification-workspace";
import {
  useVerifyComplaint,
  useRejectComplaint,
  useAssignComplaint,
  useAuthorityWorkload,
  type ComplaintStatus,
  type ComplaintSeverity,
  type GovernedComplaint,
} from "./complaint-governance-queries";

const STATUS_TABS: { value: ComplaintStatus; label: string; icon: typeof Inbox }[] = [
  { value: "pending", label: "Pending", icon: Inbox },
  { value: "in-progress", label: "In Progress", icon: Loader },
  { value: "resolved", label: "Verification", icon: CheckSquare }, // Phase 3C
  { value: "rework", label: "Rework", icon: RotateCcw }, // Phase 3C
  { value: "closed", label: "Closed", icon: Lock }, // Phase 3C
  { value: "rejected", label: "Rejected", icon: XCircle },
];

const SEVERITY_FILTERS: { value: ComplaintSeverity | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function WorkloadStrip() {
  const { data, isLoading } = useAuthorityWorkload();
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-36 rounded-xl shrink-0" />
        ))}
      </div>
    );
  }
  if (!data) return null;
  const { workloads, unassigned } = data;
  return (
    <div className="space-y-2">
      {unassigned > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-2.5"
        >
          <AlertTriangle className="size-4 text-warning shrink-0" />
          <p className="text-sm font-medium">
            <span className="text-warning tabular-nums">{unassigned}</span> complaint
            {unassigned !== 1 ? "s" : ""} awaiting assignment
          </p>
          <span className="text-xs text-muted-foreground ml-auto">
            Use the Pending tab to assign
          </span>
        </motion.div>
      )}
      {workloads.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[...workloads]
            .sort((a, b) => b.total - a.total)
            .map((w) => (
              <div
                key={w._id}
                className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5 shrink-0 border border-border min-w-[140px]"
              >
                <div className="size-7 rounded-full aurora grid place-items-center text-primary-foreground text-[10px] font-bold shrink-0">
                  {w.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate max-w-[90px]">{w.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        w.total >= 5
                          ? "text-destructive"
                          : w.total >= 3
                            ? "text-warning"
                            : "text-success",
                      )}
                    >
                      {w.total}
                    </span>
                    <span className="text-[10px] text-muted-foreground">open</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function ComplaintGovernancePage() {
  const [status, setStatus] = useState<ComplaintStatus>("pending");
  const [severity, setSeverity] = useState<ComplaintSeverity | "all">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<GovernedComplaint | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingComplaintAction | null>(null);
  const [assigning, setAssigning] = useState<GovernedComplaint | null>(null);
  const [showWorkload, setShowWorkload] = useState(true);
  // Phase 3C — verification workspace (replaces queue when a "resolved" complaint is selected)
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const qc = useQueryClient();
  const verify = useVerifyComplaint();
  const reject = useRejectComplaint();
  const assign = useAssignComplaint();

  const changeTab = (next: ComplaintStatus) => {
    setStatus(next);
    setPage(1);
    setVerifyingId(null);
    setSelected(null);
  };
  const changeSev = (next: ComplaintSeverity | "all") => {
    setSeverity(next);
    setPage(1);
  };

  const handleSelectComplaint = (complaint: GovernedComplaint) => {
    // Phase 3C: complaints in verification queue open the dedicated workspace
    if (complaint.status === "resolved") {
      setVerifyingId(complaint._id);
    } else {
      setSelected(complaint);
    }
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const mutation = pendingAction.action === "verify" ? verify : reject;
    mutation.mutate(pendingAction.complaint._id, {
      onSuccess: () => {
        setPendingAction(null);
        setSelected(null);
      },
    });
  };

  const handleConfirmAssign = (authorityId: string) => {
    if (!assigning) return;
    assign.mutate(
      { id: assigning._id, authorityId },
      {
        onSuccess: () => {
          setAssigning(null);
          setSelected(null);
        },
      },
    );
  };

  // If a verification workspace is open, show it full-page
  if (verifyingId) {
    return (
      <div className="px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          <ResolutionVerificationWorkspace
            key={verifyingId}
            complaintId={verifyingId}
            onBack={() => {
              setVerifyingId(null);
              qc.invalidateQueries({ queryKey: ["admin-complaint-queue"] });
            }}
          />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <WorkspaceHeader
        eyebrow="ADMINISTRATION · COMPLAINT GOVERNANCE"
        title="Complaint Queue"
        description="Review, assign, verify, and close environmental complaints across the network."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowWorkload((v) => !v)}>
              {showWorkload ? (
                <>
                  <BarChart3 className="size-3.5 mr-1.5" />
                  Hide Workload
                </>
              ) : (
                <>
                  <Users className="size-3.5 mr-1.5" />
                  Show Workload
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-complaint-queue"] })}
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <AnimatePresence>
        {showWorkload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <WorkloadStrip />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status tabs + severity filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => changeTab(tab.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                status === tab.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon
                className={cn(
                  "size-3.5",
                  tab.value === "resolved" && status !== "resolved" && "text-info",
                  tab.value === "rework" && status !== "rework" && "text-destructive",
                )}
              />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeSev(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                severity === f.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phase 3C: Verification tab notice */}
      {status === "resolved" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/8 px-4 py-3"
        >
          <CheckSquare className="size-4 text-info shrink-0 mt-0.5" />
          <p className="text-sm text-info">
            These complaints have been investigated and resolved by authorities. Click any complaint
            to open the full verification workspace and approve or request rework.
          </p>
        </motion.div>
      )}

      <div className="glass rounded-2xl p-4 md:p-5">
        <ComplaintQueueList
          status={status}
          severity={severity === "all" ? undefined : severity}
          page={page}
          onPageChange={setPage}
          onSelect={handleSelectComplaint}
        />
      </div>

      <ComplaintDetailPanel
        complaint={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onVerify={(c) => setPendingAction({ complaint: c, action: "verify" })}
        onReject={(c) => setPendingAction({ complaint: c, action: "reject" })}
        onAssign={(c) => setAssigning(c)}
      />

      <ComplaintActionDialog
        pending={pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isSubmitting={verify.isPending || reject.isPending}
      />

      <ComplaintAssignDialog
        complaint={assigning}
        onOpenChange={(open) => !open && setAssigning(null)}
        onConfirm={handleConfirmAssign}
        isSubmitting={assign.isPending}
      />
    </div>
  );
}
