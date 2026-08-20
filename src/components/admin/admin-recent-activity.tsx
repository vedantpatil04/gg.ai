import { useMemo, useCallback } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ChevronRight, Radio } from "lucide-react";
import {
  ActivityFeed,
  complaintsToActivityFeed,
  type ActivityEvent,
} from "@/components/shared/activity-feed";
import { useRecentComplaints, useActiveAlertsNetwork } from "./admin-dashboard-queries";

interface AlertRow {
  _id: string;
  title: string;
  cityId: string;
  createdAt: string;
}

/**
 * Recent Activity Feed for the Administrator Dashboard.
 * Interactively routes event clicks to their relevant administrative destination.
 */
export function AdminRecentActivity() {
  const complaints = useRecentComplaints();
  const alerts = useActiveAlertsNetwork();
  const navigate = useNavigate();

  const events = useMemo<ActivityEvent[]>(() => {
    const complaintEvents = complaintsToActivityFeed(complaints.data ?? [], 10);

    const alertEvents: ActivityEvent[] = ((alerts.data ?? []) as AlertRow[])
      .slice(0, 5)
      .map((a) => ({
        id: `alert-${a._id}`,
        type: "environmental_alert",
        title: "Environmental Alert",
        detail: `${a.title} · ${a.cityId}`,
        timestamp: a.createdAt,
        entityId: a._id,
      }));

    return [...complaintEvents, ...alertEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 7);
  }, [complaints.data, alerts.data]);

  const handleEventClick = useCallback(
    (entityId?: string) => {
      if (!entityId) return;
      if (entityId.startsWith("alert-") || entityId.length === 24) {
        // Navigate to environmental monitoring or complaint queue
        navigate({ to: "/admin/complaints" });
      } else {
        navigate({ to: "/admin/complaints" });
      }
    },
    [navigate],
  );

  return (
    <div className="space-y-3">
      <ActivityFeed
        events={events}
        isLoading={complaints.isLoading && alerts.isLoading}
        isError={complaints.isError && alerts.isError}
        onRetry={() => {
          complaints.refetch?.();
          alerts.refetch?.();
        }}
        onEventClick={handleEventClick}
        maxItems={7}
        compact
      />

      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] select-none">
        <span className="flex items-center gap-1.5 text-muted-foreground/75 font-mono">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Event Stream
        </span>
        <Link
          to="/admin/complaints"
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          <span>Open Queue</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

