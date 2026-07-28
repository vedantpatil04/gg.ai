import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * One flexible skeleton primitive reused across every dashboard section
 * instead of a bespoke skeleton per card — keeps loading states visually
 * consistent and avoids duplicating the same pulse markup everywhere.
 */
export function CardSkeleton({
  rows = 3,
  className,
}: {
  /** Number of placeholder lines to render below the title bar. */
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-4 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === rows - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

/** Hero-sized skeleton — big score circle + a row of mini stats. */
export function HeroSkeleton() {
  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <Skeleton className="size-28 rounded-full shrink-0" />
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grid of highlight stat cards while metrics are loading. */
export function HighlightsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-4 space-y-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </div>
  );
}
