import { useState, useEffect } from "react";
import { Loader2, Users, AlertTriangle, ShieldCheck, Check } from "lucide-react";
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-card border-border/60">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Authority Dispatch</span>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold font-display mt-0.5">
            {isReassign ? "Reassign Authority Officer" : "Assign Authority Officer"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
            {complaint && (
              <>
                {isReassign ? (
                  <>
                    Reassign case <strong className="text-foreground">#{complaint._id.slice(-6).toUpperCase()}</strong> ({complaint.title}) from{" "}
                    <span className="font-semibold text-foreground">{complaint.assignedTo?.name}</span> to an alternative responder.
                  </>
                ) : (
                  <>
                    Dispatch an authority officer to investigate incident <strong className="text-foreground">#{complaint._id.slice(-6).toUpperCase()}</strong> ({complaint.title}) in{" "}
                    <span className="font-semibold text-foreground capitalize">{complaint.cityId}</span>.
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1 my-2">
          {authorities.isLoading || workload.isLoading ? (
            <div className="flex items-center justify-center h-28 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-xs font-medium">Checking officer availability…</span>
            </div>
          ) : !authorities.data?.length ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
              <Users className="size-4 shrink-0" />
              <span>No active authority accounts registered for dispatch.</span>
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
                  type="button"
                  onClick={() => setSelectedId(a._id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 sm:gap-3 rounded-xl p-3 border text-left transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary"
                      : "border-border/60 hover:border-primary/40 hover:bg-muted/30 active:bg-muted/60",
                  )}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "size-8 rounded-xl grid place-items-center text-xs font-bold shrink-0 border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border/50",
                      )}
                    >
                      {a.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate">{a.name}</span>
                        {isCurrent && (
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20 shrink-0">
                            Current Assignee
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate block">{a.email}</span>
                    </div>
                  </div>

                  {/* Workload status */}
                  <div className="shrink-0 text-right">
                    {load ? (
                      <>
                        <div
                          className={cn(
                            "text-xs font-bold tabular-nums",
                            overloaded
                              ? "text-destructive"
                              : workloadTotal >= 3
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {workloadTotal} active
                        </div>
                        {overloaded && (
                          <div className="flex items-center gap-0.5 justify-end mt-0.5">
                            <AlertTriangle className="size-2.5 text-destructive" />
                            <span className="text-[9px] font-medium text-destructive">Heavy Load</span>
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

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto h-8.5 text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId || isSubmitting || selectedId === complaint?.assignedTo?._id}
            className="w-full sm:w-auto h-8.5 text-xs font-semibold cursor-pointer shadow-xs"
          >
            {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isReassign ? "Confirm Reassignment" : "Confirm Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

