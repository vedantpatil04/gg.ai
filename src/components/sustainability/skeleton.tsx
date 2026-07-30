/**
 * skeleton.tsx — Phase 1 + Phase 8 loading states
 *
 * Phase 1 originals preserved unchanged.
 * Phase 8 adds: ChartSkeleton, TableSkeleton, AiPanelSkeleton,
 * ReportSkeleton, and a generic FullPageSkeleton for the initial load.
 */
import type { CSSProperties } 
from "react";
 import { cn } from "@/lib/utils";
// ─── Phase 1 originals (unchanged) ───────────────────────────────────────────

export function SkeletonBlock({ className,style, }: { className?: string ; style?:CSSProperties;}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted/40", className)} style={style}>
      <div className="absolute inset-0 shimmer" aria-hidden="true" />
    </div>
  );
}

export function GlassPanelSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)} role="status" aria-label="Loading data">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-3 w-14" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading live sustainability data…</span>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4" role="status" aria-label="Loading metric">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="size-9 rounded-lg" />
        <SkeletonBlock className="h-2.5 w-12" />
      </div>
      <SkeletonBlock className="h-6 w-16 mt-4" />
      <SkeletonBlock className="h-1.5 w-full mt-3 rounded-full" />
    </div>
  );
}

// ─── Phase 8 additions ────────────────────────────────────────────────────────

/** Skeleton for AreaChart / BarChart panels */
export function ChartSkeleton({ height = 280, className }: { height?: number; className?: string }) {
  return (
    <div
      className={cn("glass rounded-2xl p-5", className)}
      role="status"
      aria-label="Loading chart"
      style={{ minHeight: height + 40 }}
    >
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-3 w-36" />
        <SkeletonBlock className="h-7 w-40 rounded-xl" />
      </div>
      {/* Fake bars */}
      <div className="flex items-end gap-2 px-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 relative overflow-hidden rounded-t-md bg-muted/40"
            style={{ height: `${35 + ((i * 23 + 17) % 55)}%` }}
          >
            <div className="absolute inset-0 shimmer" aria-hidden="true" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading chart data…</span>
    </div>
  );
}

/** Skeleton for the SDG progress matrix / benchmark table */
export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-5 space-y-3", className)} role="status" aria-label="Loading table">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-7 w-28 rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <SkeletonBlock className="size-7 rounded-lg shrink-0" />
            <SkeletonBlock className="h-3 w-20 shrink-0" />
            <SkeletonBlock className="flex-1 h-2 rounded-full" />
            <SkeletonBlock className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading table data…</span>
    </div>
  );
}

/** Skeleton for the AI Copilot / AI Summary panels */
export function AiPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-3xl p-5 space-y-4", className)} role="status" aria-label="AI loading">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SkeletonBlock className="size-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-2.5 w-24" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
      </div>
      {/* Message bubbles */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <SkeletonBlock className="size-8 rounded-lg shrink-0" />
          <SkeletonBlock className="h-16 flex-1 rounded-2xl rounded-tl-sm" />
        </div>
        <div className="flex gap-3 justify-end">
          <SkeletonBlock className="h-10 w-2/3 rounded-2xl rounded-tr-sm" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="size-8 rounded-lg shrink-0" />
          <SkeletonBlock className="h-20 flex-1 rounded-2xl rounded-tl-sm" />
        </div>
      </div>
      {/* Input */}
      <SkeletonBlock className="h-11 w-full rounded-xl" />
      {/* Chips */}
      <div className="flex gap-2 flex-wrap">
        {[80, 120, 96, 110, 88].map(w => (
          <SkeletonBlock key={w} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <span className="sr-only">AI Copilot loading…</span>
    </div>
  );
}

/** Skeleton for the Reporting Center */
export function ReportSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-5 space-y-4", className)} role="status" aria-label="Loading reports">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-48" />
        <SkeletonBlock className="h-6 w-32 rounded-full" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3 pt-1 border-t border-border">
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
      </div>
      <span className="sr-only">Loading reporting centre…</span>
    </div>
  );
}

/** Full-page skeleton shown on initial load before city data arrives */
export function FullPageSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto" role="status" aria-label="Loading sustainability dashboard">
      {/* Hero */}
      <div className="glass rounded-3xl p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-3">
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="h-9 w-56" />
            <SkeletonBlock className="h-6 w-32 rounded-full" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <SkeletonBlock className="size-48 rounded-full" />
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      {/* Ribbon */}
      <SkeletonBlock className="h-12 rounded-2xl" />
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      {/* Charts */}
      <ChartSkeleton height={200} />
      <span className="sr-only">Loading sustainability dashboard…</span>
    </div>
  );
}
