import { Droplets, Shield, Leaf, Cloud, Zap, Trees, Waves, Beaker } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { EnvEnvironmentalMetricsSkeleton } from "@/components/environment/phase8/env-phase8-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Deliberately excludes temperature/humidity/wind/pressure (already shown
 * in Weather Overview) and pm25/pm10/no2/o3/co/so2 (already shown in
 * Pollutants) to avoid duplicating content already on the page. This
 * section covers the real backend fields that aren't shown anywhere else
 * yet: water quality, sustainability scores, and water sub-metrics.
 */
interface MetricDef {
  key:
    | "water"
    | "risk"
    | "eco"
    | "co2"
    | "renewableShare"
    | "greenCover"
    | "turbidity"
    | "dissolvedOxygen"
    | "ph";
  label: string;
  icon: typeof Droplets;
  unit: string;
}

const METRICS: MetricDef[] = [
  { key: "water", label: "Water Quality", icon: Droplets, unit: "/100" },
  { key: "risk", label: "Risk Score", icon: Shield, unit: "/100" },
  { key: "eco", label: "Eco Score", icon: Leaf, unit: "/100" },
  { key: "co2", label: "CO₂", icon: Cloud, unit: "ppm" },
  { key: "renewableShare", label: "Renewable Share", icon: Zap, unit: "%" },
  { key: "greenCover", label: "Green Cover", icon: Trees, unit: "%" },
  { key: "turbidity", label: "Turbidity", icon: Waves, unit: "NTU" },
  { key: "dissolvedOxygen", label: "Dissolved Oxygen", icon: Waves, unit: "mg/L" },
  { key: "ph", label: "pH", icon: Beaker, unit: "" },
];

function MetricTile({
  label,
  icon: Icon,
  value,
  unit,
}: {
  label: string;
  icon: typeof Droplets;
  value: number;
  unit: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border border-border p-4 glass"
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
    </div>
  );
}

export function EnvironmentalMetrics({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) {
    return <EnvEnvironmentalMetricsSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load environmental metrics."
      />
    );
  }

  // Only ever render metrics we actually have a real value for.
  const available = METRICS.filter((m) => typeof city[m.key] === "number");

  if (available.length === 0) {
    return (
      <EnvEmptyState
        className={className}
        title="No environmental metrics are currently available."
      />
    );
  }

  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Environmental indicators for {city.name}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {available.map((m) => (
          <MetricTile
            key={m.key}
            label={m.label}
            icon={m.icon}
            value={city[m.key] as number}
            unit={m.unit}
          />
        ))}
      </div>
    </div>
  );
}
