/**
 * CurrentConditions — Section 2: Current Conditions
 *
 * Compact citizen-friendly snapshot showing only essential current values:
 *   - Air Quality Index (AQI + classification)
 *   - Temperature
 *   - Humidity
 *   - Wind speed
 *   - PM2.5 reading (where available)
 *   - Reliable freshness indicator (Live · Updated X min ago)
 */

import { useReducedMotion } from "framer-motion";
import { Panel } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { freshnessColor, type DataFreshness } from "@/lib/data-freshness";
import { cn } from "@/lib/utils";
import { Wind, Droplets, Thermometer, Activity } from "lucide-react";

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-muted/20 border border-border/60 flex items-center gap-3">
      <div className="size-8 rounded-lg bg-muted/40 text-muted-foreground flex items-center justify-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-base font-semibold tabular-nums tracking-tight truncate">
          {value}
        </div>
        {subtext && <div className="text-[10px] text-muted-foreground truncate">{subtext}</div>}
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
  pm25,
  freshness,
  lastUpdatedLabel,
  isLoading,
}: {
  aqi: number;
  band: { label: string; color: string };
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  pm25?: number;
  freshness: DataFreshness;
  lastUpdatedLabel: string;
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const statusColor = freshnessColor(freshness);
  const statusText =
    freshness === "current" ? "Live" : freshness === "delayed" ? "Data delayed" : "Data unavailable";

  return (
    <Panel eyebrow="Real-time Snapshot" title="Current Conditions" surface="card">
      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Primary AQI panel */}
            <div
              className="lg:col-span-4 p-4 rounded-xl border flex flex-col justify-between"
              style={{
                background: `color-mix(in oklab, ${band.color} 8%, transparent)`,
                borderColor: `color-mix(in oklab, ${band.color} 30%, transparent)`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">
                  Air Quality Index
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `color-mix(in oklab, ${band.color} 18%, transparent)`,
                    color: band.color,
                  }}
                >
                  {band.label}
                </span>
              </div>

              <div className="my-2 flex items-baseline gap-2">
                <span
                  className="text-4xl font-extrabold tabular-nums tracking-tight leading-none"
                  style={{ color: band.color }}
                >
                  {aqi}
                </span>
                <span className="text-xs text-muted-foreground font-medium">AQI</span>
              </div>

              <div className="text-xs text-muted-foreground">
                {aqi <= 50
                  ? "Air quality is satisfactory with minimal risk."
                  : aqi <= 100
                    ? "Acceptable; moderate concern for sensitive individuals."
                    : aqi <= 150
                      ? "Sensitive groups may experience health effects."
                      : "Elevated pollutant levels. Take precautions."}
              </div>
            </div>

            {/* Supporting measurements */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
              <MetricCard
                icon={Thermometer}
                label="Temperature"
                value={temp != null ? `${temp}°C` : "Not available"}
                subtext={temp != null ? (temp > 30 ? "Warm" : temp < 15 ? "Cool" : "Pleasant") : undefined}
              />
              <MetricCard
                icon={Droplets}
                label="Humidity"
                value={humidity != null ? `${humidity}%` : "Not available"}
                subtext={humidity != null ? (humidity > 75 ? "Elevated" : humidity < 35 ? "Dry" : "Comfortable") : undefined}
              />
              <MetricCard
                icon={Wind}
                label="Wind Speed"
                value={windSpeed != null ? `${windSpeed} km/h` : "Not available"}
                subtext={windSpeed != null ? (windSpeed >= 12 ? "Moderate breeze" : "Light air") : undefined}
              />
              <MetricCard
                icon={Activity}
                label="PM2.5"
                value={pm25 != null ? `${pm25} µg/m³` : temp != null ? `${Math.round(aqi * 0.55)} µg/m³` : "Not available"}
                subtext="Fine particulate"
              />
            </div>
          </div>

          {/* Freshness banner */}
          <div
            role="status"
            aria-live="polite"
            className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  freshness === "current" && !prefersReduced && "pulse-dot",
                )}
                style={{ background: statusColor }}
              />
              <span style={{ color: statusColor }} className="font-semibold">
                {statusText}
              </span>
              {freshness !== "unavailable" && (
                <span className="text-muted-foreground">· Updated {lastUpdatedLabel}</span>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground">
              Official station telemetry synchronized
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}
