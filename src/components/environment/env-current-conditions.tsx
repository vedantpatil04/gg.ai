import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { EnvCurrentConditionsSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { Wind, Droplets, Thermometer, Gauge, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SECTION 02 — CURRENT CONDITIONS
 *
 * Real environmental readings divided into two compact environmental groups:
 *  1. AIR QUALITY: AQI, PM2.5, PM10, O₃
 *  2. ATMOSPHERIC CONDITIONS: Temperature, Humidity, Wind, Pressure
 *
 * Designed as compact enterprise surfaces with strong readability,
 * avoiding large oversized cards or excessive nested containers.
 */

interface MetricItemProps {
  label: string;
  value?: number;
  unit: string;
  subtext?: string;
  accent?: string;
}

function MetricItem({ label, value, unit, subtext, accent }: MetricItemProps) {
  if (typeof value !== "number") return null;

  return (
    <div className="flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card/60 transition-colors">
      <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground">
        <span>{label}</span>
        {subtext && <span className="text-[10px] text-muted-foreground/80">{subtext}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="text-lg sm:text-xl font-bold tabular-nums tracking-tight"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function AqiPrimaryGauge({
  aqi,
  bandLabel,
  bandColor,
}: {
  aqi: number;
  bandLabel: string;
  bandColor: string;
}) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(aqi, 0) / 300, 1);
  const dash = pct * circ;

  return (
    <div
      className="flex items-center gap-4 sm:gap-5 p-4 rounded-xl border border-border/80 bg-card/80"
      role="img"
      aria-label={`Air Quality Index ${aqi}, ${bandLabel}`}
    >
      <div className="relative shrink-0 size-[92px]">
        <svg width={92} height={92} viewBox="0 0 92 92" aria-hidden="true">
          <circle cx={46} cy={46} r={r} fill="none" stroke="var(--color-border)" strokeWidth={6.5} />
          <circle
            cx={46}
            cy={46}
            r={r}
            fill="none"
            stroke={bandColor}
            strokeWidth={6.5}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform="rotate(-90 46 46)"
            style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl sm:text-3xl font-bold tabular-nums leading-none"
            style={{ color: bandColor, fontFamily: "var(--font-display)" }}
          >
            {aqi}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground mt-0.5">
            AQI
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Air Quality Index
        </span>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              color: bandColor,
              background: `color-mix(in oklab, ${bandColor} 14%, transparent)`,
            }}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {bandLabel}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/90 mt-0.5">
          Real-time composite air quality reading
        </span>
      </div>
    </div>
  );
}

export function CurrentConditions({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) {
    return <EnvCurrentConditionsSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load current conditions."
      />
    );
  }

  const header = (
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
      <span
        id="current-conditions-title"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
      >
        Current Conditions
      </span>
    </div>
  );

  if (!city || typeof city.aqi !== "number") {
    return (
      <section aria-labelledby="current-conditions-title" className={cn("space-y-3.5", className)}>
        {header}
        <EnvEmptyState
          title="Data unavailable"
          description="Current conditions will appear once a live reading is received."
        />
      </section>
    );
  }

  const band = findAqiBand(city.aqi);

  return (
    <section aria-labelledby="current-conditions-title" className={cn("space-y-3.5", className)}>
      {header}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GROUP 1: AIR QUALITY */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-foreground">
                Air Quality
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Pollutant Concentrations</span>
          </div>

          <AqiPrimaryGauge aqi={city.aqi} bandLabel={band.label} bandColor={band.color} />

          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <MetricItem
              label="PM2.5"
              value={city.pm25}
              unit="µg/m³"
              subtext="Fine particles"
              accent={typeof city.pm25 === "number" && city.pm25 > 35 ? "var(--color-destructive)" : undefined}
            />
            <MetricItem
              label="PM10"
              value={city.pm10}
              unit="µg/m³"
              subtext="Inhalable"
              accent={typeof city.pm10 === "number" && city.pm10 > 70 ? "var(--color-destructive)" : undefined}
            />
            <MetricItem
              label="O₃"
              value={city.o3}
              unit="ppb"
              subtext="Ground ozone"
              accent={typeof city.o3 === "number" && city.o3 > 70 ? "var(--color-destructive)" : undefined}
            />
          </div>
        </div>

        {/* GROUP 2: ATMOSPHERIC CONDITIONS */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <Thermometer className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-foreground">
                Atmospheric Conditions
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Weather & Dispersion</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 flex-1 items-stretch">
            <div className="flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="size-3.5 text-primary" aria-hidden="true" />
                  Temperature
                </span>
                <span className="text-[10px]">Ambient</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                  {typeof city.temp === "number" ? city.temp : "--"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">°C</span>
              </div>
            </div>

            <div className="flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Droplets className="size-3.5 text-sky-500" aria-hidden="true" />
                  Humidity
                </span>
                <span className="text-[10px]">Relative</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                  {typeof city.humidity === "number" ? city.humidity : "--"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Wind className="size-3.5 text-teal-500" aria-hidden="true" />
                  Wind Speed
                </span>
                <span className="text-[10px]">Dispersion</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                  {typeof city.windSpeed === "number" ? city.windSpeed : "--"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">km/h</span>
              </div>
            </div>

            <div className="flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Gauge className="size-3.5 text-indigo-400" aria-hidden="true" />
                  Pressure
                </span>
                <span className="text-[10px]">Barometric</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                  {typeof city.pressure === "number" ? city.pressure : "--"}
                </span>
                <span className="text-xs font-medium text-muted-foreground">hPa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
