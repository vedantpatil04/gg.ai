/**
 * DataStatus — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 *
 * Compact, enterprise-style connection/freshness strip. There is no
 * per-city "monitoring stations" concept in the current data model, so
 * this deliberately does NOT show a fabricated station count (e.g.
 * "12/12 stations reporting") — only states we can actually derive from
 * the live reading: connection status and how fresh environmental/weather
 * data is.
 *
 * Phase 2 change (UI only, same data/props): the LIVE/OFFLINE state now
 * uses the shared `Pill` component (same one used in the dashboard header)
 * instead of bare bold text, so the indicator reads as part of the same
 * product language rather than a standalone debug label. Environmental
 * and weather freshness are grouped into a small two-column row instead
 * of an inline wrapping list.
 */

import { Panel, Pill } from "@/components/ui-bits";
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
  const pillTone = !isConnected
    ? "muted"
    : freshness === "current"
      ? "success"
      : freshness === "delayed"
        ? "warning"
        : "muted";

  return (
    <Panel title="Data Status" surface="card">
      <div role="status" aria-live="polite" className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <Pill tone={pillTone}>
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                isConnected && freshness === "current" && !prefersReduced && "pulse-dot",
              )}
              style={{ background: dotColor }}
            />
            {isConnected ? "Live" : "Offline"}
          </Pill>
          <div className="text-xs text-muted-foreground text-right">
            {freshness === "unavailable" ? "Monitoring status unavailable" : `Updated ${lastUpdatedLabel}`}
          </div>
        </div>

        <div className="pt-3.5 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Environmental data
            </div>
            <div className="text-xs font-medium">{freshnessLabel(freshness)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Weather data
            </div>
            <div className="text-xs font-medium">{freshnessLabel(freshness)}</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
