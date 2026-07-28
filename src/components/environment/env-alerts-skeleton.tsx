import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Phase 9 — Environmental Alerts skeleton.
 *
 * Mirrors `EnvAlerts`'s populated-state layout: a short list of alert
 * rows, each with a severity dot, title, and description line.
 */
export function EnvAlertsSkeleton({
  className,
  count = 3,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-border p-3">
          <Skeleton className="size-2 rounded-full mt-1 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
