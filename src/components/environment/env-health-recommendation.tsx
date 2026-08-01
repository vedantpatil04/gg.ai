import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { EnvHealthRecommendationSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Health Recommendation (Phase 11 polish).
 *
 * No logic changes — same AQI band + HEALTH_STATUS_BY_BAND approach.
 * Polish additions:
 *   - `glass-hover` on the outer card for hover elevation consistency.
 *   - Entrance animation via `motion-safe:animate-in`.
 *   - Supporting factors row gets an accessible `aria-label` on its
 *     container so screen readers understand the grouped metrics.
 *   - Category badge `aria-label` now reads the full status (not just label).
 */

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-base font-semibold px-3.5 py-1.5 rounded-full border w-fit"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
      aria-label={`Air quality status: ${label}`}
    >
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      AQI: {label}
    </span>
  );
}

function SupportingFactor({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${label}: ${value}`}>
      <span
        className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
        aria-hidden="true"
      >
        {label}
      </span>
      <span className="text-base font-bold tabular-nums" aria-hidden="true">
        {value}
      </span>
    </div>
  );
}

export function HealthRecommendation({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) {
    return <EnvHealthRecommendationSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load health recommendation data."
      />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Health recommendations are unavailable because current environmental data is incomplete."
      />
    );
  }

  const band = findAqiBand(city.aqi);
  const recommendation = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];

  const factors: { label: string; value: string }[] = [];
  if (typeof city.pm25 === "number") factors.push({ label: "PM2.5", value: `${city.pm25} µg/m³` });
  if (typeof city.humidity === "number")
    factors.push({ label: "Humidity", value: `${city.humidity}%` });
  if (typeof city.temp === "number")
    factors.push({ label: "Temperature", value: `${city.temp}°C` });

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-4 glass-hover",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className,
      )}
    >
      <CategoryBadge label={band.label} color={band.color} />

      <p className="text-base md:text-lg leading-relaxed font-medium">{recommendation}</p>

      {factors.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-2">
            Supporting factors
          </p>
          <div
            className="grid grid-cols-3 gap-3"
            role="list"
            aria-label="Supporting environmental factors"
          >
            {factors.map((f) => (
              <div key={f.label} role="listitem">
                <SupportingFactor label={f.label} value={f.value} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Informational only — not medical advice.</p>
    </div>
  );
}
