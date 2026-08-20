import { Loader2, ChevronRight, AlertTriangle, CheckSquare, RotateCcw, ClipboardCheck, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ComplaintIntelligenceData } from "@/lib/api/command.api";
import { useAdminComplaintIntelligence, useAuthorityWorkload } from "./admin-dashboard-queries";

interface StatusTileProps {
  label: string;
  value: number | string | null;
  note?: string;
  accent?: "destructive" | "warning" | "success" | "info" | "purple" | "muted";
  to?: string;
}

function StatusTile({ label, value, note, accent = "muted", to = "/admin/complaints" }: StatusTileProps) {
  const tracked = value !== null;

  const accentStyles = {
    destructive: "text-destructive border-destructive/25 bg-destructive/[0.04]",
    warning: "text-amber-500 border-amber-500/25 bg-amber-500/[0.04]",
    success: "text-emerald-500 border-emerald-500/25 bg-emerald-500/[0.04]",
    info: "text-sky-500 border-sky-500/25 bg-sky-500/[0.04]",
    purple: "text-violet-500 border-violet-500/25 bg-violet-500/[0.04]",
    muted: "text-muted-foreground border-border/50 bg-muted/20",
  }[accent];

  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-150 outline-none select-none",
        "hover:border-border hover:bg-muted/40",
        "focus-visible:ring-1 focus-visible:ring-primary",
        accentStyles,
        !tracked && "border-dashed opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] uppercase font-bold tracking-[0.12em] text-muted-foreground/80 truncate">
          {label}
        </span>
        <div className="size-1.5 rounded-full bg-current opacity-70" />
      </div>

      <div className="my-1 text-lg sm:text-xl font-bold tabular-nums tracking-tight text-foreground font-display">
        {tracked ? value : "—"}
      </div>

      {note && (
        <span className="text-[9.5px] text-muted-foreground/75 truncate">
          {note}
        </span>
      )}
    </Link>
  );
}

/**
 * Complaint Intelligence & Governance Panel for the Administrator Dashboard.
 */
export function AdminComplaintSummary() {
  const complaints = useAdminComplaintIntelligence();
  const workload = useAuthorityWorkload();

  if (complaints.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Loading complaint governance data…</span>
      </div>
    );
  }

  if (complaints.isError) {
    return (
      <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive">
        Couldn't load complaint telemetry. Try refreshing the dashboard.
      </div>
    );
  }

  const d = complaints.data?.data as ComplaintIntelligenceData | undefined;
  const unassigned = workload.data?.unassigned ?? null;

  if (!d || d.summary.total === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        No complaints registered in the system yet.
      </p>
    );
  }

  const byStatus = (s: string) => d.byStatus.find((x) => x.status === s)?.count ?? 0;
  const openCount = byStatus("pending") + byStatus("in-progress") + byStatus("rework");
  const pendingVerify = byStatus("resolved");
  const reworkCount = byStatus("rework");
  const closedCount = byStatus("closed");
  const resolutionRate = d.summary.resolutionRate ?? 0;

  return (
    <div className="space-y-2.5">
      {/* ── Urgent Action Alert Banners ── */}
      {unassigned !== null && unassigned > 0 && (
        <Link
          to="/admin/complaints"
          className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs hover:bg-amber-500/15 transition-colors group select-none"
        >
          <div className="size-5 rounded-md bg-amber-500/20 grid place-items-center shrink-0">
            <AlertTriangle className="size-3 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-amber-500">{unassigned} complaint{unassigned !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground ml-1.5">awaiting officer assignment</span>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}

      {pendingVerify > 0 && (
        <Link
          to="/admin/complaints"
          className="flex items-center gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs hover:bg-sky-500/15 transition-colors group select-none"
        >
          <div className="size-5 rounded-md bg-sky-500/20 grid place-items-center shrink-0">
            <CheckSquare className="size-3 text-sky-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sky-500">{pendingVerify} resolution{pendingVerify !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground ml-1.5">ready for administrator verification</span>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}

      {reworkCount > 0 && (
        <Link
          to="/admin/complaints"
          className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs hover:bg-destructive/15 transition-colors group select-none"
        >
          <div className="size-5 rounded-md bg-destructive/20 grid place-items-center shrink-0">
            <RotateCcw className="size-3 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-destructive">{reworkCount} complaint{reworkCount !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground ml-1.5">returned in rework with agency</span>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}

      {/* ── Hero Open Complaints & Progress Bar ── */}
      <Link
        to="/admin/complaints"
        className="group block p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-all select-none"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-[0.14em] text-muted-foreground/80">
              Active Case Backlog
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums font-display mt-0.5">
              {openCount}{" "}
              <span className="text-xs font-normal text-muted-foreground tracking-normal">
                open of {d.summary.total} total
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
            <span>Queue</span>
            <ChevronRight className="size-3.5" />
          </div>
        </div>

        {/* Resolution progress bar */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground/80 mb-1">
            <span>Overall Resolution Rate</span>
            <span className="font-semibold text-foreground tabular-nums">{resolutionRate}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, resolutionRate))}%` }}
            />
          </div>
        </div>
      </Link>

      {/* ── 8-Bucket Status Breakdown ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <StatusTile label="Total" value={d.summary.total} accent="info" />
        <StatusTile label="Pending" value={byStatus("pending")} accent="warning" note="Unprocessed" />
        <StatusTile
          label="Unassigned"
          value={unassigned}
          accent={unassigned !== null && unassigned > 0 ? "destructive" : "success"}
          note="Needs officer"
        />
        <StatusTile label="In Progress" value={byStatus("in-progress")} accent="info" note="Field active" />
        <StatusTile
          label="Verification"
          value={pendingVerify}
          accent={pendingVerify > 0 ? "info" : "muted"}
          note="Resolved review"
        />
        <StatusTile
          label="Rework"
          value={reworkCount}
          accent={reworkCount > 0 ? "destructive" : "muted"}
          note="Returned"
        />
        <StatusTile label="Closed" value={closedCount} accent="success" note="Archived" />
        <StatusTile label="Rejected" value={byStatus("rejected")} accent="muted" note="Invalid" />
      </div>
    </div>
  );
}

