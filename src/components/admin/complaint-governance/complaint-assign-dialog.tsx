import { useState, useEffect } from "react";
import { Loader2, Users, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAssignableAuthorities, useAuthorityWorkload } from "./complaint-governance-queries";
import type { GovernedComplaint } from "./complaint-governance-queries";

interface ComplaintAssignDialogProps {
  complaint: GovernedComplaint | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (authorityId: string) => void;
  isSubmitting: boolean;
}

/**
 * Phase 3B — redesigned assign dialog.
 *
 * Shows a card-per-authority layout instead of a plain select. Each card
 * displays the authority's current workload (open complaint count) so the
 * administrator can make an informed assignment decision. The current assignee
 * (if any) is highlighted and auto-selected, enabling one-click reassignment.
 */
export function ComplaintAssignDialog({
  complaint,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: ComplaintAssignDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  const authorities = useAssignableAuthorities();
  const workload = useAuthorityWorkload();

  useEffect(() => {
    setSelectedId(complaint?.assignedTo?._id ?? "");
  }, [complaint?._id, complaint?.assignedTo?._id]);

  const workloadMap: Record<
    string,
    { assignedPending: number; assignedActive: number; total: number }
  > = Object.fromEntries((workload.data?.workloads ?? []).map((w) => [w._id, w]));

  const isReassign = !!complaint?.assignedTo;

  return (
    <Dialog open={!!complaint} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isReassign ? "Reassign Complaint" : "Assign Complaint"}</DialogTitle>
          <DialogDescription>
            {complaint && (
              <>
                {isReassign ? (
                  <>
                    Reassign <strong className="text-foreground">{complaint.title}</strong> from{" "}
                    {complaint.assignedTo?.name} to a different officer.
                  </>
                ) : (
                  <>
                    Assign <strong className="text-foreground">{complaint.title}</strong> in{" "}
                    {complaint.cityId} to an authority officer.
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
          {authorities.isLoading || workload.isLoading ? (
            <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading officers…</span>
            </div>
          ) : !authorities.data?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Users className="size-4 shrink-0" />
              No active authority accounts available for assignment.
            </div>
          ) : (
            authorities.data.map((a) => {
              const load = workloadMap[a._id];
              const isSelected = selectedId === a._id;
              const isCurrent = complaint?.assignedTo?._id === a._id;
              const workloadTotal = load?.total ?? 0;
              const overloaded = workloadTotal >= 5;

              return (
                <button
                  key={a._id}
                  onClick={() => setSelectedId(a._id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 sm:gap-3 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 border text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/8 shadow-[0_0_0_1px_var(--color-primary)]"
                      : "border-border hover:border-primary/40 hover:bg-muted/30 active:bg-muted/60",
                  )}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "size-8 rounded-full grid place-items-center text-xs font-bold shrink-0",
                        isSelected
                          ? "aurora text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {a.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">{a.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-info/15 text-info shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">{a.email}</span>
                    </div>
                  </div>

                  {/* Workload indicator */}
                  <div className="shrink-0 text-right">
                    {load ? (
                      <>
                        <div
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            overloaded
                              ? "text-destructive"
                              : workloadTotal >= 3
                                ? "text-warning"
                                : "text-success",
                          )}
                        >
                          {workloadTotal}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight">
                          open case{workloadTotal !== 1 ? "s" : ""}
                        </div>
                        {overloaded && (
                          <div className="flex items-center gap-0.5 justify-end mt-0.5">
                            <AlertTriangle className="size-2.5 text-destructive" />
                            <span className="text-[9px] text-destructive">heavy load</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId || isSubmitting || selectedId === complaint?.assignedTo?._id}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isReassign ? "Reassign" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
