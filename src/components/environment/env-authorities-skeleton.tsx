import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Phase 10 — Emergency & Environmental Authorities skeleton.
 *
 * Mirrors `EnvAuthorities`'s populated layout: a search/filter row and a
 * grid of authority cards.
 */
export function EnvAuthoritiesSkeleton({
  className,
  count = 3,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <Skeleton className="h-9 w-full sm:w-64" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
