/**
 * Phase 8 — Admin Recent Activity (improved)
 *
 * Now uses the shared ActivityFeed component. Derives events from both
 * recent complaints (with their events[]) and active alerts — same two
 * data sources as before, zero new network requests.
 */

import { useMemo } from "react";
import {
  ActivityFeed,
  complaintsToActivityFeed,
  type ActivityEvent,
} from "@/components/shared/activity-feed";
import { useRecentComplaints, useActiveAlertsNetwork } from "./admin-dashboard-queries";
import { AlertTriangle } from "lucide-react";

interface AlertRow {
  _id: string;
  title: string;
  cityId: string;
  createdAt: string;
}

export function AdminRecentActivity() {
  const complaints = useRecentComplaints();
  const alerts = useActiveAlertsNetwork();

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
      .slice(0, 8);
  }, [complaints.data, alerts.data]);

  return (
    <ActivityFeed
      events={events}
      isLoading={complaints.isLoading && alerts.isLoading}
      isError={complaints.isError && alerts.isError}
      onRetry={() => {
        complaints.refetch?.();
        alerts.refetch?.();
      }}
      maxItems={8}
      compact
    />
  );
}
