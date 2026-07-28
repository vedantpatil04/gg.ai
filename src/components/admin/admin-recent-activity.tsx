import { Loader2, MessageSquarePlus, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ComponentType } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRecentComplaints, useActiveAlertsNetwork } from "./admin-dashboard-queries";

interface ActivityItem {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  timestamp: number;
}

interface ComplaintRow {
  _id: string;
  title: string;
  status: string;
  cityId: string;
  createdAt: string;
  resolvedAt?: string;
}

interface AlertRow {
  _id: string;
  title: string;
  cityId: string;
  createdAt: string;
}

/**
 * There's no dedicated activity-log/audit model in this backend, so this
 * feed is assembled client-side from two data sources already being
 * fetched for other panels on this dashboard (recent complaints, active
 * alerts) — no extra network requests beyond what those panels need
 * anyway. "New User" / "New Authority" events are intentionally omitted:
 * including them would need a third query dedicated solely to this feed,
 * which isn't justified for a supplementary activity list.
 */
export function AdminRecentActivity() {
  const complaints = useRecentComplaints();
  const alerts = useActiveAlertsNetwork();

  if (complaints.isLoading || alerts.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (complaints.isError && alerts.isError) {
    return (
      <p className="text-sm text-destructive">Couldn't load recent activity. Try refreshing.</p>
    );
  }

  const complaintItems: ActivityItem[] = ((complaints.data ?? []) as ComplaintRow[]).map((c) => ({
    id: `complaint-${c._id}`,
    icon: c.status === "resolved" ? CheckCircle2 : MessageSquarePlus,
    label: c.status === "resolved" ? "Complaint resolved" : "New complaint",
    detail: `${c.title} · ${c.cityId}`,
    timestamp: new Date(
      c.status === "resolved" && c.resolvedAt ? c.resolvedAt : c.createdAt,
    ).getTime(),
  }));

  const alertItems: ActivityItem[] = ((alerts.data ?? []) as AlertRow[]).slice(0, 5).map((a) => ({
    id: `alert-${a._id}`,
    icon: AlertTriangle,
    label: "Environmental alert",
    detail: `${a.title} · ${a.cityId}`,
    timestamp: new Date(a.createdAt).getTime(),
  }));

  const items = [...complaintItems, ...alertItems]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No recent activity to show.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0 mt-0.5">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground truncate">{item.detail}</div>
            </div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
