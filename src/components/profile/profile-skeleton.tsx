import { Skeleton } from "@/components/ui/skeleton";

/**
 * Phase 10 Master Redesign — skeleton matching the new full-width hero:
 * Identity row, Profile Completion row, Quick Statistics row — each
 * separated by a divider, no cover banner.
 */
export function ProfileSkeleton() {
  return (
    <div
      className="space-y-6 animate-in fade-in-0 duration-300"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading profile…</span>

      {/* Hero card */}
      <div className="glass rounded-3xl overflow-hidden">
        <Skeleton className="h-1 w-full rounded-none shimmer" />
        <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-8">
          {/* Identity row */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-7 lg:gap-10">
            <Skeleton className="size-[104px] sm:size-[120px] rounded-full shrink-0 shimmer" />
            <div className="flex-1 space-y-3.5">
              <Skeleton className="h-9 w-56 shimmer" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full shimmer" />
                <Skeleton className="h-5 w-18 rounded-full shimmer" />
              </div>
              <Skeleton className="h-4 w-40 shimmer" />
              <div className="flex gap-6">
                <Skeleton className="h-4 w-48 shimmer" />
                <Skeleton className="h-4 w-32 shimmer" />
              </div>
            </div>
            <div className="flex sm:flex-col gap-2.5 shrink-0">
              <Skeleton className="h-10 w-36 rounded-md shimmer" />
              <Skeleton className="h-10 w-28 rounded-md shimmer" />
            </div>
          </div>

          <Skeleton className="h-px w-full shimmer" />

          {/* Completion row */}
          <div>
            <Skeleton className="h-3 w-36 mb-4 shimmer" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <Skeleton className="size-24 sm:size-28 rounded-full shrink-0 shimmer" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32 rounded-full shimmer" />
                <Skeleton className="h-5 w-48 shimmer" />
                <Skeleton className="h-4 w-64 max-w-full shimmer" />
              </div>
            </div>
          </div>

          <Skeleton className="h-px w-full shimmer" />

          {/* Quick stats row */}
          <div>
            <Skeleton className="h-3 w-32 mb-4 shimmer" />
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-32 rounded-lg shimmer" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <Skeleton className="h-12 w-full sm:w-[480px] rounded-none border-b shimmer" />

      {/* Statistics KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl shimmer" />
        ))}
      </div>

      {/* 3-col info row */}
      <div className="grid md:grid-cols-3 gap-5">
        <Skeleton className="h-48 rounded-2xl shimmer" />
        <Skeleton className="h-48 rounded-2xl shimmer" />
        <Skeleton className="h-48 rounded-2xl shimmer" />
      </div>
    </div>
  );
}
