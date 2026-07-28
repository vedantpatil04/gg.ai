import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Phase 8A — Nearby Cities skeleton.
 *
 * Mirrors `NearbyCities`'s layout: a row of comparison cards, each with a
 * name, AQI badge, and a couple of secondary metrics.
 */
export function EnvNearbyCitiesSkeleton({
  className,
  count = 4,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Phase 8B — Environmental Metrics skeleton.
 *
 * Mirrors `EnvironmentalMetrics`'s layout: a grid of metric tiles.
 */
export function EnvEnvironmentalMetricsSkeleton({
  className,
  count = 6,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-4"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
