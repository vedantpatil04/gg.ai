import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  UserCheck,
  UserX,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import {
  commandApi,
  type BoardOperationalContextData,
} from "@/lib/api/command.api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BoardOperationalCardProps {
  className?: string;
}

export function BoardOperationalCard({ className }: BoardOperationalCardProps) {
  const queryClient = useQueryClient();
  const [updatingAvail, setUpdatingAvail] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["board-operational-context"],
    queryFn: async () => {
      const res = await commandApi.getBoardContext();
      return res.data.boardContext;
    },
    refetchInterval: 30000,
  });

  const availabilityMutation = useMutation({
    mutationFn: (newAvail: "available" | "busy" | "on_leave") =>
      commandApi.updateAvailability(newAvail),
    onMutate: () => setUpdatingAvail(true),
    onSettled: () => {
      setUpdatingAvail(false);
      queryClient.invalidateQueries({ queryKey: ["board-operational-context"] });
    },
  });

  if (isLoading) {
    return (
      <div className={cn("p-5 rounded-2xl border border-border/70 bg-card/60 animate-pulse space-y-4", className)}>
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-16 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const {
    organization,
    department,
    jurisdiction,
    totalOfficers,
    availability,
    officers,
    workload,
    jurisdictionCoverage,
    coverageGaps,
    boardStatus,
    self,
  } = data;

  const statusTone =
    boardStatus === "optimal"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : boardStatus === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-background p-5 shadow-xs transition-all duration-200",
        className,
      )}
    >
      {/* ─── Board Header & Identity ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0 mt-0.5">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">{organization}</h2>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border", statusTone)}>
                {boardStatus} Operations
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              {department && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Briefcase className="size-3 text-emerald-500" />
                  {department}
                </span>
              )}
              {jurisdiction.length > 0 && (
                <>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-cyan-500" />
                    {jurisdiction.map((c) => c.toUpperCase()).join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Officer Self Availability Switcher ────────────────────────────── */}
        <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60 self-start sm:self-auto">
          <span className="text-[11px] font-semibold text-muted-foreground px-1 hidden md:inline">
            Status:
          </span>
          <button
            onClick={() => availabilityMutation.mutate("available")}
            disabled={updatingAvail}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5",
              self.availability === "available"
                ? "bg-emerald-500 text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <UserCheck className="size-3.5" />
            <span>Available</span>
          </button>
          <button
            onClick={() => availabilityMutation.mutate("busy")}
            disabled={updatingAvail}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5",
              self.availability === "busy"
                ? "bg-amber-500 text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <Clock className="size-3.5" />
            <span>Busy</span>
          </button>
          <button
            onClick={() => availabilityMutation.mutate("on_leave")}
            disabled={updatingAvail}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5",
              self.availability === "on_leave"
                ? "bg-purple-600 text-white font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <UserX className="size-3.5" />
            <span>On Leave</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="size-7 p-0 ml-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ─── Coverage Gaps Alert (if any) ─────────────────────────────────── */}
      {coverageGaps.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold tracking-tight">Board Coverage Alert</span>
            <p className="text-[11px] opacity-90">
              {coverageGaps.map((g) => `${g.cityName}: ${g.reason}`).join(" • ")}
            </p>
          </div>
        </div>
      )}

      {/* ─── Key Operational Metrics ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Board Workforce</span>
            <Users className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {totalOfficers}{" "}
            <span className="text-xs font-normal text-muted-foreground">officers</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
            <span className="text-emerald-500 font-semibold">{availability.available} avail</span>
            <span>•</span>
            <span>{availability.busy} busy</span>
            <span>•</span>
            <span>{availability.on_leave} leave</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Board Active Load</span>
            <Shield className="size-3.5 text-cyan-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {workload.inProgress + workload.rework}{" "}
            <span className="text-xs font-normal text-muted-foreground">active</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
            <span>{workload.inProgress} ongoing</span>
            <span>•</span>
            <span className={workload.rework > 0 ? "text-amber-500 font-semibold" : ""}>
              {workload.rework} rework
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Citizen Review</span>
            <Clock className="size-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {workload.awaitingReview}{" "}
            <span className="text-xs font-normal text-muted-foreground">pending review</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
            <span>{workload.resolved} awaiting verify</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Board Resolved</span>
            <CheckCircle2 className="size-3.5 text-teal-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {workload.closed}{" "}
            <span className="text-xs font-normal text-muted-foreground">closed</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
            <span>{workload.totalAssigned} total assigned</span>
          </div>
        </div>
      </div>

      {/* ─── Jurisdiction Coverage & Officer Roster ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
        {/* Jurisdiction Coverage Summary */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Jurisdiction Coverage ({jurisdictionCoverage.length} Cities)
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {jurisdictionCoverage.map((jc) => (
              <div
                key={jc.cityId}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40 text-xs"
              >
                <div className="flex items-center gap-2">
                  <MapPin className={cn("size-3.5", jc.hasGap ? "text-amber-500" : "text-emerald-500")} />
                  <span className="font-semibold text-foreground">{jc.cityName}</span>
                  {jc.hasGap && (
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20">
                      GAP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {jc.availableOfficerCount}/{jc.officerCount} avail
                  </span>
                  <span>•</span>
                  <span className="font-mono">{jc.activeComplaintCount} active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Board Officers Roster (Aggregate view, strict privacy) */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Board Officers ({officers.length})
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {officers.map((off) => {
              const isSelf = off.id === self.id;
              const availBadge =
                off.availability === "available"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : off.availability === "busy"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";

              return (
                <div
                  key={off.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border text-xs transition-colors",
                    isSelf
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-muted/20 border-border/40",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-6 rounded-full bg-muted grid place-items-center text-[10px] font-bold text-muted-foreground shrink-0">
                      {off.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <span className="font-medium text-foreground truncate block">
                        {off.name} {isSelf && <span className="text-[10px] text-emerald-500 font-bold">(You)</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {off.designation || off.department || "Officer"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("px-1.5 py-0.5 text-[9px] font-semibold rounded border uppercase", availBadge)}>
                      {off.availability}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {off.activeCaseCount} active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
