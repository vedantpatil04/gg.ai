import { Loader2, ChevronRight, ShieldCheck, UserCheck, Clock, UserCog, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  useAdminStats,
  usePendingAuthorityRequests,
  useActiveAuthorities,
} from "./admin-dashboard-queries";

interface UsersByRole {
  _id: string;
  count: number;
}

function AuthorityRow({
  icon: Icon,
  label,
  value,
  note,
  to,
  badge,
  isPending = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  note?: string;
  to?: string;
  badge?: string;
  isPending?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "group flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40",
        "transition-all duration-150 select-none",
        to && "hover:border-border cursor-pointer",
        isPending && "border-amber-500/30 bg-amber-500/[0.04]",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="size-8 rounded-lg bg-muted/80 border border-border/50 grid place-items-center text-muted-foreground shrink-0 group-hover:text-foreground transition-colors">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{label}</span>
            {badge && (
              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500">
                {badge}
              </span>
            )}
          </div>
          {note && <div className="text-[10.5px] text-muted-foreground/75 truncate mt-0.5">{note}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        <div className="text-base sm:text-lg font-bold tabular-nums text-foreground font-display">
          {value}
        </div>
        {to && (
          <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Authority Overview Panel for the Administrator Dashboard.
 */
export function AdminAuthorityOverview() {
  const stats = useAdminStats();
  const pending = usePendingAuthorityRequests();
  const active = useActiveAuthorities();

  if (stats.isLoading || pending.isLoading || active.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Loading workforce data…</span>
      </div>
    );
  }

  if (stats.isError || !stats.data) {
    return (
      <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive">
        Couldn't load authority telemetry. Try refreshing the dashboard.
      </div>
    );
  }

  const usersByRole = (stats.data.usersByRole ?? []) as UsersByRole[];
  const totalAuthorities = usersByRole.find((r) => r._id === "authority")?.count ?? 0;
  const activeCount = active.isError ? "—" : (active.data?.pagination?.total ?? 0);
  const pendingCount = pending.isError ? 0 : (pending.data?.pagination?.total ?? 0);

  return (
    <div className="space-y-2">
      {/* Total Authorities */}
      <AuthorityRow
        icon={ShieldCheck}
        label="Total Authorities"
        value={totalAuthorities}
        note="Registered agency officers"
        to="/admin/authorities"
      />

      {/* Active Authorities */}
      <AuthorityRow
        icon={UserCheck}
        label="Active Authorities"
        value={activeCount}
        note="Currently responding"
        to="/admin/authorities"
      />

      {/* Pending Onboarding Requests */}
      <AuthorityRow
        icon={UserCog}
        label="Pending Requests"
        value={pendingCount}
        note="Awaiting admin approval"
        to="/admin/authority-requests"
        badge={pendingCount > 0 ? "Action required" : undefined}
        isPending={pendingCount > 0}
      />

      {/* Avg Response Time */}
      <AuthorityRow
        icon={Clock}
        label="Avg. Response Time"
        value="—"
        note="Telemetry integration in progress"
      />

      {/* Bottom quick navigation */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] select-none">
        <Link
          to="/admin/authorities"
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          <span>Authority Directory</span>
          <ChevronRight className="size-3" />
        </Link>
        <Link
          to="/admin/authority-requests"
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          <span>Review Requests</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

