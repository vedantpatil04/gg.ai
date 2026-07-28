import { formatDistanceToNow } from "date-fns";
import { Loader2, Radar } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-dashboard-container";
import { useEnvironmentalReadings } from "./platform-health-queries";

/**
 * The backend has no dedicated event/audit log (see Backend Gaps in the
 * phase report) — the only genuinely real, timestamped "something just
 * happened" signal available anywhere is each city's latest environmental
 * reading. This shows exactly that, sorted by recency: real ingestion
 * completions, not a synthesized activity feed.
 */
export function PlatformEventsList() {
  const readings = useEnvironmentalReadings();

  if (readings.isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (readings.isError) {
    return <p className="text-sm text-destructive">Couldn't load recent events. Try refreshing.</p>;
  }

  const events = [...(readings.data?.cities ?? [])]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  if (events.length === 0) {
    return (
      <AdminEmptyState
        icon={Radar}
        title="No recent platform events available."
        description="Environmental data ingestion events will appear here once the pipeline has run."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.cityId} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="size-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
            <span className="text-sm truncate">{e.cityName} environmental data updated</span>
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
            {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
          </span>
        </li>
      ))}
    </ul>
  );
}
