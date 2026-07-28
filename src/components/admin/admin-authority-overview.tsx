import { Loader2, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  useAdminStats,
  usePendingAuthorityRequests,
  useActiveAuthorities,
} from "./admin-dashboard-queries";

interface UsersByRole {
  _id: string;
  count: number;
}

function Row({
  label,
  value,
  note,
  to,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  to?: string;
}) {
  const content = (
    <>
      <div>
        <div className="text-sm">{label}</div>
        {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
      </div>
      <div className="flex items-center gap-1">
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        {to && <ChevronRight className="size-3.5 text-muted-foreground" />}
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="flex items-center justify-between py-2 border-b border-border/60 last:border-0 -mx-1 px-1 rounded hover:bg-muted/60 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
      {content}
    </div>
  );
}

/**
 * Total Authorities and Active Authorities come from real account data.
 * "Pending Assignments" reuses the existing authority-approval-workflow
 * endpoint (/admin/authority-requests?status=pending) — the only "pending
 * ... authority" concept this backend actually tracks is authority accounts
 * awaiting an admin's approval decision, so that's what's shown here,
 * labeled explicitly so it isn't mistaken for complaint-assignment queueing
 * (which doesn't exist as a tracked workflow). It links to Authority
 * Requests (onboarding); Total Authorities links to Authority Directory
 * (ongoing lifecycle management) — Phase 3.1 keeps these two destinations
 * deliberately separate rather than merging them.
 */
export function AdminAuthorityOverview() {
  const stats = useAdminStats();
  const pending = usePendingAuthorityRequests();
  const active = useActiveAuthorities();

  if (stats.isLoading || pending.isLoading || active.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stats.isError || !stats.data) {
    return (
      <p className="text-sm text-destructive">Couldn't load authority data. Try refreshing.</p>
    );
  }

  const usersByRole = (stats.data.usersByRole ?? []) as UsersByRole[];
  const totalAuthorities = usersByRole.find((r) => r._id === "authority")?.count ?? 0;

  return (
    <div>
      <Row label="Total Authorities" value={totalAuthorities} to="/admin/authorities" />
      <Row
        label="Active Authorities"
        value={active.isError ? "—" : (active.data?.pagination?.total ?? 0)}
      />
      <Row
        label="Pending Assignments"
        value={pending.isError ? "—" : (pending.data?.pagination?.total ?? 0)}
        note="Awaiting approval"
        to="/admin/authority-requests"
      />
      <Row label="Avg. Response Time" value="—" note="Not tracked by the backend yet" />
    </div>
  );
}
