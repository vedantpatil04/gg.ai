/**
 * DataStatus — Phase 1: Dashboard Foundation & Realism
 *
 * Compact, enterprise-style connection/freshness strip. There is no
 * per-city "monitoring stations" concept in the current data model, so
 * this deliberately does NOT show a fabricated station count (e.g.
 * "12/12 stations reporting") — only states we can actually derive from
 * the live reading: connection status and how fresh environmental/weather
 * data is.
 */

import { Panel } from "@/components/ui-bits";
import { freshnessColor, freshnessLabel, type DataFreshness } from "@/lib/data-freshness";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DataStatus({
  isConnected,
  freshness,
  lastUpdatedLabel,
}: {
  isConnected: boolean;
  freshness: DataFreshness;
  lastUpdatedLabel: string;
}) {
  const prefersReduced = useReducedMotion();
  const dotColor = isConnected ? freshnessColor(freshness) : "var(--color-muted-foreground)";

  return (
    <Panel title="Data Status">
      <div role="status" aria-live="polite" className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="inline-flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                isConnected && freshness === "current" && !prefersReduced && "pulse-dot",
              )}
              style={{ background: dotColor }}
            />
            <span className="font-semibold tracking-wide text-xs">
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {freshness === "unavailable" ? "Monitoring status unavailable" : `Last update · ${lastUpdatedLabel}`}
          </div>
        </div>

        <div className="pt-3 border-t border-border flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
          <div className="text-muted-foreground">
            Environmental data ·{" "}
            <span className="text-foreground font-medium">{freshnessLabel(freshness)}</span>
          </div>
          <div className="text-muted-foreground">
            Weather data ·{" "}
            <span className="text-foreground font-medium">{freshnessLabel(freshness)}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
