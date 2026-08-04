import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { ShieldAlert } from "lucide-react";

export interface DashboardAlert {
  id?: string;
  _id?: string;
  severity: string;
  title: string;
  area: string;
  time?: string;
  createdAt?: string;
  description?: string;
  desc?: string;
}

export function AlertsCard({
  alerts,
  isLoading,
}: {
  alerts: DashboardAlert[];
  isLoading?: boolean;
}) {
  return (
    <Panel
      eyebrow="Live feed"
      title="Environmental Alerts"
      action={<span className="text-[11px] text-muted-foreground">{alerts.length} active</span>}
    >
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="size-4" />}
          title="No alert data available."
          description="You'll see environmental alerts for your area here as soon as they're issued."
        />
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((a) => (
            <div key={a.id ?? a._id} className="flex gap-3 rounded-xl border border-border p-3 hover:border-primary/40 transition-colors">
              <div className="mt-0.5">
                {a.severity === "critical" && <span className="size-2 rounded-full bg-[var(--color-destructive)] block pulse-dot" />}
                {a.severity === "warning" && <span className="size-2 rounded-full bg-[var(--color-warning)] block" />}
                {a.severity === "info" && <span className="size-2 rounded-full bg-[var(--color-info)] block" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{a.time ?? "live"}</div>
                </div>
                <div className="text-xs text-muted-foreground">{a.area}</div>
                <div className="text-xs mt-1">{a.desc ?? a.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
