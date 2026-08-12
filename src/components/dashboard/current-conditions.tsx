/**
 * CurrentConditions — Phase 1: Dashboard Foundation & Realism
 *
 * Compact "Where am I / what's it like right now" strip shown immediately
 * after the hero. Shows AQI, temperature, humidity and wind from the same
 * live city reading the rest of the dashboard already uses — no new data
 * source, no fabricated values. Missing fields show "Not available" rather
 * than a fake number or a bare dash.
 */

import { useReducedMotion } from "framer-motion";
import { Panel } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { freshnessColor, type DataFreshness } from "@/lib/data-freshness";
import { cn } from "@/lib/utils";

function ConditionStat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div
        className="mt-1 text-xl font-semibold tabular-nums tracking-tight"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function CurrentConditions({
  aqi,
  band,
  temp,
  humidity,
  windSpeed,
  freshness,
  lastUpdatedLabel,
  isLoading,
}: {
  aqi: number;
  band: { label: string; color: string };
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  freshness: DataFreshness;
  lastUpdatedLabel: string;
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const statusColor = freshnessColor(freshness);
  const statusText =
    freshness === "current" ? "Live" : freshness === "delayed" ? "Data delayed" : "Data unavailable";

  return (
    <Panel title="Current Conditions">
      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <ConditionStat label="AQI" value={`${aqi} ${band.label}`} valueColor={band.color} />
            <ConditionStat
              label="Temperature"
              value={temp != null ? `${temp}°C` : "Not available"}
            />
            <ConditionStat
              label="Humidity"
              value={humidity != null ? `${humidity}%` : "Not available"}
            />
            <ConditionStat
              label="Wind"
              value={windSpeed != null ? `${windSpeed} km/h` : "Not available"}
            />
          </div>

          <div
            role="status"
            aria-live="polite"
            className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs"
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                freshness === "current" && !prefersReduced && "pulse-dot",
              )}
              style={{ background: statusColor }}
            />
            <span style={{ color: statusColor }} className="font-medium">
              {statusText}
            </span>
            {freshness !== "unavailable" && (
              <span className="text-muted-foreground">· Updated {lastUpdatedLabel}</span>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
