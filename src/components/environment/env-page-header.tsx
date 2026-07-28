import { RefreshCw, MapPinned, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — page header.
 *
 * Phase 2: Refresh is now functional when a handler is supplied — it
 * refetches the same live-city reading that powers the AQI Hero, and
 * shows a spinner + real "Updated x ago" timestamp. Called with no props
 * (Phase 1 usage), it falls back to its original fully-disabled state, so
 * this stays backward compatible. Change City remains disabled — city
 * selection belongs to a later phase.
 */
export function EnvPageHeader({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: {
  /** Timestamp (ms) of the last successful data fetch, if any. */
  lastUpdated?: number;
  /** Called when the user clicks Refresh. Omit to keep the button disabled. */
  onRefresh?: () => void;
  isRefreshing?: boolean;
} = {}) {
  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : "--";

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Environmental intelligence
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Environmental Overview</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Monitor your city&apos;s environmental conditions, air quality and weather intelligence.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pr-1">
          <Clock className="size-3.5" aria-hidden="true" />
          <span>Last updated: {lastUpdatedLabel}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={!onRefresh || isRefreshing}
          aria-label={
            onRefresh
              ? "Refresh environmental data"
              : "Refresh environmental data (available in a later phase)"
          }
        >
          <RefreshCw
            className={cn("size-3.5", isRefreshing && "animate-spin")}
            aria-hidden="true"
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          aria-label="Change city (available in a later phase)"
        >
          <MapPinned className="size-3.5" aria-hidden="true" />
          Change City
        </Button>
      </div>
    </header>
  );
}
