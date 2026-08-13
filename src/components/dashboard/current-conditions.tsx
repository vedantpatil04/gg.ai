/**
 * CurrentConditions — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 *
 * Compact "Where am I / what's it like right now" strip shown immediately
 * after the hero. Shows AQI, temperature, humidity and wind from the same
 * live city reading the rest of the dashboard already uses — no new data
 * source, no fabricated values. Missing fields show "Not available" rather
 * than a fake number or a bare dash.
 *
 * Phase 2 change (UI only, same props/data): AQI is now the clear primary
 * value — larger, color-led, set apart by a divider — with temperature,
 * humidity and wind demoted to a secondary metric row. Matches the calmer
 * "card" surface used across the rest of the Phase 2 sections.
 */

import { useReducedMotion } from "framer-motion";
import { Panel } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { freshnessColor, type DataFreshness } from "@/lib/data-freshness";
import { cn } from "@/lib/utils";

function SecondaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</div>
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
    <Panel title="Current Conditions" surface="card">
      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-5 sm:gap-6">
            {/* Primary — AQI carries the strongest visual weight in this section */}
            <div className="sm:pr-6 sm:border-r sm:border-border">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Air Quality Index
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  className="text-4xl font-bold tabular-nums tracking-tight leading-none"
                  style={{ color: band.color }}
                >
                  {aqi}
                </span>
                <span className="text-sm font-semibold" style={{ color: band.color }}>
                  {band.label}
                </span>
              </div>
            </div>

            {/* Secondary — supporting readings, visually quieter than AQI */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 flex-1">
              <SecondaryStat label="Temperature" value={temp != null ? `${temp}°C` : "Not available"} />
              <SecondaryStat label="Humidity" value={humidity != null ? `${humidity}%` : "Not available"} />
              <SecondaryStat label="Wind" value={windSpeed != null ? `${windSpeed} km/h` : "Not available"} />
            </div>
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
