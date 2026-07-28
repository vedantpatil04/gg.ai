import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — reusable loading skeletons.
 *
 * Phase 12 cleanup: removed dead exports for sections that no longer exist
 * (AQI & Weather Intelligence, Environmental Context, WeatherOverview,
 * AQI Trend) and generic placeholder skeletons (Weather, Forecast, Chart,
 * Pollutants, Map) that were never imported by active components.
 *
 * Active exports (all consumed by at least one component):
 *   EnvHeroCommandCenterSkeleton  → env-hero-command-center
 *   EnvMetricsStripSkeleton       → env-metrics-strip
 *   EnvAqiHeroSkeleton            → env-live-aqi-hero
 *   EnvForecastOverviewSkeleton   → env-forecast-overview
 *   EnvPollutantsOverviewSkeleton → env-pollutants
 *   EnvHealthRecommendationSkeleton → env-health-recommendation
 *   EnvMapPreviewSkeleton         → env-map
 *   EnvAISummarySkeleton          → env-ai-summary
 */

export function EnvHeroCommandCenterSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-5 md:p-8", className)}>
      <div className="flex items-center justify-between gap-4 pb-5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 flex flex-col gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnvMetricsStripSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      ))}
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

export function EnvPollutantsOverviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-4"
          >
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-2.5 w-10" />
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
