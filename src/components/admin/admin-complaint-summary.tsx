import { Loader2, ChevronRight, AlertTriangle, CheckSquare, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ComplaintIntelligenceData } from "@/lib/api/command.api";
import { useAdminComplaintIntelligence, useAuthorityWorkload } from "./admin-dashboard-queries";

interface Bucket {
  label: string;
  value: number | string | null;
  note?: string;
  accent?: "destructive" | "warning" | "success" | "info" | "muted";
}

function BucketCell({ label, value, note, accent = "muted" }: Bucket) {
  const tracked = value !== null;
  const COLOR: Record<string, string> = {
    destructive: "var(--color-destructive)",
    warning: "var(--color-warning)",
    success: "var(--color-success)",
    info: "var(--color-info)",
    muted: "inherit",
  };
  return (
    <div
      className={cn("rounded-lg border border-border p-3", !tracked && "border-dashed opacity-60")}
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className="text-xl font-semibold tabular-nums mt-1"
        style={{ color: tracked ? COLOR[accent] : undefined }}
      >
        {tracked ? value : "—"}
      </div>
      {note && <div className="text-[10px] text-muted-foreground mt-0.5">{note}</div>}
    </div>
  );
}

/** Phase 3C — updated to show pending verification count and rework count. */
export function AdminComplaintSummary() {
  const complaints = useAdminComplaintIntelligence();
  const workload = useAuthorityWorkload();

  if (complaints.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (complaints.isError) {
    return (
      <p className="text-sm text-destructive">Couldn't load complaint data. Try refreshing.</p>
    );
  }

  const d = complaints.data?.data as ComplaintIntelligenceData | undefined;
  const unassigned = workload.data?.unassigned ?? null;

  if (!d || d.summary.total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No complaints logged yet.</p>
    );
  }

  const byStatus = (s: string) => d.byStatus.find((x) => x.status === s)?.count ?? 0;
  const openCount = byStatus("pending") + byStatus("in-progress") + byStatus("rework");
  const pendingVerify = byStatus("resolved");
  const reworkCount = byStatus("rework");

  const buckets: Bucket[] = [
    { label: "Total", value: d.summary.total, accent: "info" },
    { label: "Pending", value: byStatus("pending"), accent: "warning" },
    {
      label: "Unassigned",
      value: unassigned,
      accent: unassigned !== null && unassigned > 0 ? "destructive" : "success",
      note: "Awaiting admin",
    },
    { label: "In Progress", value: byStatus("in-progress"), accent: "info" },
    {
      label: "Verification",
      value: pendingVerify,
      accent: pendingVerify > 0 ? "info" : "muted",
      note: "Awaiting review",
    },
    {
      label: "Rework",
      value: reworkCount,
      accent: reworkCount > 0 ? "destructive" : "muted",
      note: "Returned to authority",
    },
    { label: "Closed", value: byStatus("closed"), accent: "success" },
    { label: "Rejected", value: byStatus("rejected"), accent: "muted" },
  ];

  return (
    <div>
      {/* Unassigned alert */}
      {unassigned !== null && unassigned > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 mb-3 text-xs">
          <AlertTriangle className="size-3.5 text-warning shrink-0" />
          <span className="font-medium text-warning">{unassigned}</span>
          <span className="text-muted-foreground">
            complaint{unassigned !== 1 ? "s" : ""} need assignment
          </span>
        </div>
      )}

      {/* Verification alert */}
      {pendingVerify > 0 && (
        <Link
          to="/admin/complaints"
          className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/8 px-3 py-2 mb-3 text-xs hover:bg-info/15 transition-colors"
        >
          <CheckSquare className="size-3.5 text-info shrink-0" />
          <span className="font-medium text-info">{pendingVerify}</span>
          <span className="text-muted-foreground">
            resolution{pendingVerify !== 1 ? "s" : ""} awaiting your verification
          </span>
          <ChevronRight className="size-3.5 ml-auto text-muted-foreground" />
        </Link>
      )}

      {/* Rework alert */}
      {reworkCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 mb-3 text-xs">
          <RotateCcw className="size-3.5 text-destructive shrink-0" />
          <span className="font-medium text-destructive">{reworkCount}</span>
          <span className="text-muted-foreground">
            complaint{reworkCount !== 1 ? "s" : ""} in rework with authority
          </span>
        </div>
      )}

      {/* Open count link */}
      <Link
        to="/admin/complaints"
        className="flex items-center justify-between rounded-lg border border-border p-3 mb-3 hover:bg-muted/60 transition-colors"
      >
        <div>
          <div className="text-2xl font-semibold tabular-nums leading-tight">{openCount}</div>
          <div className="text-xs text-muted-foreground">Open Complaints → Complaint Queue</div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {buckets.map((b) => (
          <BucketCell key={b.label} {...b} />
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {d.summary.resolutionRate}% resolution rate overall
      </div>
    </div>
  );
}
