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
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const STATUS_TABS: { value: ComplaintStatus; label: string; icon: typeof Inbox; badgeColor?: string }[] = [
  { value: "pending", label: "Pending", icon: Inbox },
  { value: "in-progress", label: "In Progress", icon: Loader },
  { value: "resolved", label: "Verification", icon: CheckSquare, badgeColor: "text-sky-500" },
  { value: "rework", label: "Rework", icon: RotateCcw, badgeColor: "text-destructive" },
  { value: "closed", label: "Closed", icon: Lock },
  { value: "rejected", label: "Rejected", icon: XCircle },
];

const SEVERITY_FILTERS: { value: ComplaintSeverity | "all"; label: string; dotColor?: string }[] = [
  { value: "all", label: "All Severity" },
  { value: "critical", label: "Critical", dotColor: "bg-destructive" },
  { value: "high", label: "High", dotColor: "bg-amber-500" },
  { value: "medium", label: "Medium", dotColor: "bg-sky-500" },
  { value: "low", label: "Low", dotColor: "bg-muted-foreground/60" },
];

function WorkloadStrip() {
  const { data, isLoading } = useAuthorityWorkload();

  if (isLoading) {
    return (
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-40 rounded-xl shrink-0" />
        ))}
      </div>
    );
  }

  if (!data) return null;
  const { workloads, unassigned } = data;

  return (
    <div className="space-y-2.5">
      {unassigned > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-6 rounded-md bg-amber-500/20 grid place-items-center shrink-0">
              <AlertTriangle className="size-3.5 text-amber-500" />
            </div>
            <p className="text-xs font-medium text-foreground truncate">
              <span className="font-bold text-amber-500 tabular-nums">{unassigned}</span> unassigned complaint{unassigned !== 1 ? "s" : ""} awaiting officer triage.
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline shrink-0">
            Select "Pending" tab to assign officers
          </span>
        </div>
      )}

      {workloads.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-bold tracking-[0.14em] text-muted-foreground/75 mb-1.5 px-1 flex items-center gap-1.5">
            <Users className="size-3 text-primary" />
            Officer Active Workload &amp; Capacity
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[...workloads]
              .sort((a, b) => b.total - a.total)
              .map((w) => {
                const isOverloaded = w.total >= 5;
                const isBusy = w.total >= 3;
                return (
                  <div
                    key={w._id}
                    className="rounded-xl px-3 py-2 flex items-center gap-2.5 shrink-0 border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors min-w-[150px] select-none"
                  >
                    <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary text-[11px] font-bold shrink-0">
                      {w.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate text-foreground">{w.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={cn(
                            "text-xs font-bold tabular-nums",
                            isOverloaded
                              ? "text-destructive"
                              : isBusy
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {w.total}
                        </span>
                        <span className="text-[10px] text-muted-foreground">active cases</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
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
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const qc = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["admin-complaint-queue"] }) > 0;
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

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-complaint-queue"] });
    qc.invalidateQueries({ queryKey: ["admin-authority-workload"] });
  };

  // If verification workspace is open, display full-page view
  if (verifyingId) {
    return (
      <div className="px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 max-w-full overflow-hidden">
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
    <div className="px-3.5 sm:px-5 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      {/* ── 1. PAGE HEADER ────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Incident Governance &amp; Triage
            </span>
            <span>&middot;</span>
            <span>Admin Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
            Complaint Queue
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5 max-w-2xl leading-relaxed">
            Review, assign, verify, and resolve environmental incidents across network municipalities.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkload((v) => !v)}
            className="h-8.5 text-xs font-medium border-border/70 hover:bg-muted/60 transition-all cursor-pointer shadow-2xs"
          >
            {showWorkload ? (
              <>
                <BarChart3 className="size-3.5 mr-1.5 text-primary" />
                <span className="hidden sm:inline">Hide Workload</span>
                <span className="sm:hidden">Capacity</span>
              </>
            ) : (
              <>
                <Users className="size-3.5 mr-1.5 text-primary" />
                <span className="hidden sm:inline">Show Workload</span>
                <span className="sm:hidden">Capacity</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-8.5 text-xs font-medium border-border/70 hover:border-border hover:bg-muted/60 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5 text-primary", isFetching && "animate-spin")} />
            <span>{isFetching ? "Syncing..." : "Sync Queue"}</span>
          </Button>
        </div>
      </section>

      {/* ── 2. OFFICER WORKLOAD STRIP ─────────────────────────────────────── */}
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

      {/* ── 3. FILTER TOOLBAR (STATUS TABS + SEVERITY) ────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
          {/* Status Tabs */}
          <div className="overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-max border border-border/60">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = status === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => changeTab(tab.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap outline-none select-none cursor-pointer",
                      "focus-visible:ring-1 focus-visible:ring-primary",
                      isSelected
                        ? "bg-card text-foreground shadow-xs border border-border/50 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5",
                        isSelected ? "text-primary" : tab.badgeColor || "text-muted-foreground",
                      )}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Selector */}
          <div className="overflow-x-auto scrollbar-hide pb-0.5">
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/50 w-max shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 px-2 select-none">
                Severity
              </span>
              {SEVERITY_FILTERS.map((f) => {
                const isSelected = severity === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => changeSev(f.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all select-none cursor-pointer outline-none whitespace-nowrap",
                      "focus-visible:ring-1 focus-visible:ring-primary",
                      isSelected
                        ? "bg-card text-foreground shadow-2xs border border-border/40 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    {f.dotColor && <span className={cn("size-1.5 rounded-full", f.dotColor)} />}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Verification Notice Banner */}
      {status === "resolved" && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 select-none">
          <CheckSquare className="size-4 text-sky-500 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-sky-500 leading-snug">
            These complaints have been marked as resolved by assigned field authorities. Click any row to open the full <strong>Resolution Verification Workspace</strong> to inspect evidence, approve closure, or mandate rework.
          </p>
        </div>
      )}

      {/* ── 4. COMPLAINT LIST / TABLE CONTAINER ─────────────────────────── */}
      <section className="rounded-2xl border border-border/70 bg-card/60 shadow-2xs overflow-hidden">
        <ComplaintQueueList
          status={status}
          severity={severity === "all" ? undefined : severity}
          page={page}
          onPageChange={setPage}
          onSelect={handleSelectComplaint}
        />
      </section>

      {/* ── 5. COMPLAINT DETAIL & ACTION MODALS ───────────────────────────── */}
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

