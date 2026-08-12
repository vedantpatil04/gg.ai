import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { EnvCurrentConditionsSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * CurrentConditions — Environmental Overview, Phase 1, Area 2 (foundation).
 *
 * "What are the important measurements?"
 *
 * Only the foundation is built in Phase 1: the AQI given the strongest
 * hierarchy, with whichever supporting measurements the current city
 * record actually has (PM2.5 / PM10 / O₃ / temperature / humidity / wind /
 * pressure) presented as a compact, readable list — never a wall of KPI
 * cards, and never a fabricated value for a field that isn't present.
 * Full contextual explanation of these readings ("Understanding Today's
 * Conditions") is later-phase scope and is not attempted here.
 */

interface Measurement {
  key: string;
  label: string;
  value: number;
  unit: string;
}

function AqiGauge({
  aqi,
  bandLabel,
  bandColor,
}: {
  aqi: number;
  bandLabel: string;
  bandColor: string;
}) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(aqi, 0) / 300, 1);
  const dash = pct * circ;

  return (
    <div
      className="relative shrink-0 size-[108px]"
      role="img"
      aria-label={`Air Quality Index ${aqi}, ${bandLabel}`}
    >
      <svg width={108} height={108} viewBox="0 0 108 108" aria-hidden="true">
        <circle cx={54} cy={54} r={r} fill="none" stroke="var(--color-border)" strokeWidth={7} />
        <circle
          cx={54}
          cy={54}
          r={r}
          fill="none"
          stroke={bandColor}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold tabular-nums leading-none"
          style={{ color: bandColor, fontFamily: "var(--font-display)" }}
        >
          {aqi}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">AQI</span>
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
      <section aria-labelledby="current-conditions-title" className={cn("space-y-4", className)}>
        {header}
        <EnvEmptyState
          title="Data unavailable"
          description="Current conditions will appear once a live reading is received."
        />
      </section>
    );
  }

  const band = findAqiBand(city.aqi);

  const measurements: Measurement[] = [];
  if (typeof city.pm25 === "number")
    measurements.push({ key: "pm25", label: "PM2.5", value: city.pm25, unit: "µg/m³" });
  if (typeof city.pm10 === "number")
    measurements.push({ key: "pm10", label: "PM10", value: city.pm10, unit: "µg/m³" });
  if (typeof city.o3 === "number")
    measurements.push({ key: "o3", label: "O₃", value: city.o3, unit: "ppb" });
  if (typeof city.temp === "number")
    measurements.push({ key: "temp", label: "Temperature", value: city.temp, unit: "°C" });
  if (typeof city.humidity === "number")
    measurements.push({ key: "humidity", label: "Humidity", value: city.humidity, unit: "%" });
  if (typeof city.windSpeed === "number")
    measurements.push({ key: "wind", label: "Wind", value: city.windSpeed, unit: "km/h" });
  if (typeof city.pressure === "number")
    measurements.push({ key: "pressure", label: "Pressure", value: city.pressure, unit: "hPa" });

  return (
    <section aria-labelledby="current-conditions-title" className={cn("space-y-4", className)}>
      {header}

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          {/* AQI — strongest hierarchy */}
          <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3 shrink-0">
            <AqiGauge aqi={city.aqi} bandLabel={band.label} bandColor={band.color} />
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                color: band.color,
                background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
              }}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {band.label}
            </span>
          </div>

          {/* Supporting measurements — compact list, only what's real */}
          {measurements.length > 0 && (
            <>
              <div className="hidden sm:block w-px self-stretch bg-border" aria-hidden="true" />
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 flex-1 min-w-0">
                {measurements.map((m) => (
                  <div key={m.key} className="flex items-baseline justify-between gap-2">
                    <dt className="text-xs text-muted-foreground">{m.label}</dt>
                    <dd className="text-sm font-semibold tabular-nums">
                      {m.value}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {m.unit}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
