/**
 * Phase 8 — Shared skeleton components
 *
 * Centralises all skeleton patterns so every portal uses the same
 * loading experience. Import from here instead of defining per-file.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Stat card skeleton ───────────────────────────────────────────────────────

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-5 space-y-3", className)}>
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-8 w-14" />
      <Skeleton className="h-2 w-24" />
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────────────────────

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50">
      <Skeleton className="size-8 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-20 rounded-full shrink-0 hidden md:block" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  );
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-xl" />
        <Skeleton className="h-8 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

// ─── List item skeleton ───────────────────────────────────────────────────────

export function ListItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      <Skeleton className="size-8 rounded-lg shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full shrink-0" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

export function ChartSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div className={cn("w-full relative overflow-hidden rounded-xl bg-muted/30", height)}>
      {/* Fake bar chart */}
      <div className="absolute inset-x-4 bottom-4 flex items-end gap-2">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Profile panel skeleton ───────────────────────────────────────────────────

export function ProfilePanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Notification skeleton ────────────────────────────────────────────────────

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 px-1 py-2">
      <Skeleton className="size-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ─── Dashboard grid skeleton ──────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-4 md:px-6 py-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CardSkeleton className="h-48" />
          <CardSkeleton className="h-40" />
        </div>
        <div className="space-y-4">
          <CardSkeleton className="h-32" />
          <ListSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
