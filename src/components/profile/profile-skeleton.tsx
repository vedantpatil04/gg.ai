import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div
      className="space-y-6 animate-in fade-in-0 duration-300"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading profile…</span>

      {/* Header card skeleton */}
      <div className="glass rounded-2xl p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            <Skeleton className="size-16 sm:size-20 rounded-full shrink-0 shimmer" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-48 shimmer" />
                <Skeleton className="h-5 w-16 rounded-full shimmer" />
                <Skeleton className="h-5 w-16 rounded-full shimmer" />
              </div>
              <Skeleton className="h-4 w-36 shimmer" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-3.5 w-32 shimmer" />
                <Skeleton className="h-3.5 w-24 shimmer" />
                <Skeleton className="h-3.5 w-28 shimmer" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-9 w-28 rounded-xl shimmer" />
            <Skeleton className="h-9 w-24 rounded-xl shimmer" />
          </div>
        </div>
      </div>

      {/* Completion banner skeleton */}
      <div className="glass rounded-xl p-4 flex items-center gap-4">
        <Skeleton className="size-10 rounded-full shrink-0 shimmer" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40 shimmer" />
          <Skeleton className="h-3 w-64 shimmer" />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="border-b border-border/80 pb-1">
        <div className="flex gap-4">
          <Skeleton className="h-9 w-24 rounded-lg shimmer" />
          <Skeleton className="h-9 w-28 rounded-lg shimmer" />
          <Skeleton className="h-9 w-24 rounded-lg shimmer" />
        </div>
      </div>

      {/* 3-col stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-xl shimmer" />
        <Skeleton className="h-20 rounded-xl shimmer" />
        <Skeleton className="h-20 rounded-xl shimmer" />
      </div>

      {/* 3-col details skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Skeleton className="h-48 rounded-2xl shimmer" />
        <Skeleton className="h-48 rounded-2xl shimmer" />
        <Skeleton className="h-48 rounded-2xl shimmer" />
      </div>
    </div>
  );
}
