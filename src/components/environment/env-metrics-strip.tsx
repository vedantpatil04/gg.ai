import type { ComponentType } from "react";
import { Activity, Thermometer, Droplets, Wind, Gauge } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { EnvMetricsStripSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Live Metrics Strip (Phase 1 — Layout Foundation).
 *
 * A row of compact, premium metric cards directly below the Hero Command
 * Center. Reuses the same live-city reading as every other section on this
 * page — no new API, no separate fetch.
 *
 * The phase spec's full metric list (AQI, Temperature, Humidity, Wind,
 * Rain, Pressure, Visibility, UV, Sunrise, Sunset) includes several fields
 * — Rain, Visibility, UV, Sunrise, Sunset — that don't exist anywhere in
 * GreenGuard's current `City` data model or backend response yet (see
 * `lib/mock-data.ts`). Consistent with this project's established rule of
 * never showing a fabricated value (see Weather Overview, Pollutants,
 * Environmental Metrics), only metrics with a real reading are rendered
 * here. The remaining fields will slot into this same strip once a later
 * phase adds them to the API — no layout change needed then.
 */
interface StripMetricDef {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  accent?: string;
}

function StripCard({ icon: Icon, label, value, accent }: StripMetricDef) {
  return (
    <div className="glass rounded-xl p-4 flex items-center gap-3 min-w-0">
      <div
        className="size-9 rounded-lg grid place-items-center bg-primary/10 text-primary shrink-0"
        style={
          accent
            ? { color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }
            : undefined
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </div>
        <div className="text-base font-semibold tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

export function LiveMetricsStrip({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) {
    return <EnvMetricsStripSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load live metrics."
      />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Live metrics are currently unavailable."
        description="This strip will update once a live environmental reading is available."
      />
    );
  }

  const band = findAqiBand(city.aqi);

  // Only ever render metrics we actually have a real value for.
  const metrics: StripMetricDef[] = [
    { key: "aqi", label: "AQI", icon: Activity, value: `${city.aqi}`, accent: band.color },
  ];
  if (typeof city.temp === "number") {
    metrics.push({ key: "temp", label: "Temperature", icon: Thermometer, value: `${city.temp}°C` });
  }
  if (typeof city.humidity === "number") {
    metrics.push({
      key: "humidity",
      label: "Humidity",
      icon: Droplets,
      value: `${city.humidity}%`,
    });
  }
  if (typeof city.windSpeed === "number") {
    metrics.push({ key: "wind", label: "Wind", icon: Wind, value: `${city.windSpeed} km/h` });
  }
  if (typeof city.pressure === "number") {
    metrics.push({
      key: "pressure",
      label: "Pressure",
      icon: Gauge,
      value: `${city.pressure} hPa`,
    });
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", className)}>
      {metrics.map((m) => (
        <StripCard key={m.key} icon={m.icon} label={m.label} value={m.value} accent={m.accent} />
      ))}
    </div>
  );
}
