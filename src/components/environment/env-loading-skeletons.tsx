import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — reusable loading skeletons.
 *
 * Phase 1 (foundation rebuild) cleanup: removed dead exports for the
 * cinematic hero and telemetry strip that Phase 1 replaced
 * (EnvHeroCommandCenterSkeleton, EnvMetricsStripSkeleton — both belonged to
 * components deleted in this phase) and added skeletons for the two new
 * Phase 1 foundation sections.
 *
 * Active exports (all consumed by at least one component):
 *   EnvCityContextSkeleton        → env-city-context
 *   EnvCurrentConditionsSkeleton  → env-current-conditions
 *   EnvAqiHeroSkeleton            → env-live-aqi-hero
 *   EnvForecastOverviewSkeleton   → env-forecast-overview
 *   EnvHealthRecommendationSkeleton → env-health-recommendation
 *   EnvMapPreviewSkeleton         → env-map
 *   EnvAISummarySkeleton          → env-ai-summary
 *   EnvUnderstandingSkeleton      → env-understanding (Phase 2)
 *   EnvTrendsSkeleton              → env-trends (Phase 3)
 */

export function EnvCityContextSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] gap-5 md:gap-8",
        className,
      )}
    >
      <Skeleton className="h-[170px] sm:h-[200px] md:h-[220px] lg:h-[250px] xl:h-[280px] rounded-2xl" />
      <div className="flex flex-col justify-center gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-56" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-full max-w-md" />
      </div>
    </div>
  );
}

export function EnvCurrentConditionsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-3 w-32" />
      <div className="rounded-2xl border border-border p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3 shrink-0">
            <Skeleton className="size-[108px] rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="hidden sm:block w-px self-stretch bg-border" aria-hidden="true" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 flex-1 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnvAqiHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-8 md:p-10", className)}>
      <div className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-3 flex flex-col items-center">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-16 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-1.5 w-full flex flex-col items-center">
          <Skeleton className="h-3 w-full max-w-xs" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function EnvForecastOverviewSkeleton({
  className,
  days = 5,
}: {
  className?: string;
  days?: number;
}) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8", className)}>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: days }).map((_, i) => (
          <div
            key={i}
            className="flex-1 min-w-[104px] flex flex-col items-center gap-2 rounded-xl border border-border p-4"
          >
            <Skeleton className="h-3 w-12" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnvHealthRecommendationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-4", className)}>
      <Skeleton className="h-5 w-24 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnvMapPreviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export function EnvAISummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-6 w-28 rounded-full shrink-0" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </div>
  );
}

export function EnvUnderstandingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-3 w-52" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4">
        <div className="rounded-2xl border border-border p-5 md:p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function EnvTrendsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-3 w-40" />
      <div className="rounded-2xl border border-border p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
