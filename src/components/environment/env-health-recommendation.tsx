import { ShieldCheck } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { EnvHealthRecommendationSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Phase 1 — Health Advisory Card.
 *
 * Design principles:
 *  - The AQI band color is the single accent — it carries meaning
 *  - Typography-first: the recommendation text is the hero
 *  - Supporting factors are secondary, visually subordinate
 *  - Glass surface with subtle hover elevation
 *  - No busy decorations — calm and trustworthy
 */

function AQIBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-1.5 rounded-full border w-fit"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 32%, transparent)`,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
      aria-label={`Current air quality status: ${label}`}
    >
      <span
        className="size-2 rounded-full shrink-0"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl"
      style={{
        background: "oklch(1 0 0 / 0.04)",
        border: "1px solid oklch(1 0 0 / 0.07)",
      }}
      aria-label={`${label}: ${value}`}
    >
      <span
        className="text-[9px] font-bold uppercase tracking-[0.18em] leading-none"
        style={{ color: "oklch(0.48 0.012 230)" }}
        aria-hidden="true"
      >
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums leading-none"
        style={{ color: "oklch(0.88 0.010 220)" }}
        aria-hidden="true"
      >
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
        message="Unable to load health advisory data."
      />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Health guidance is unavailable until environmental data is loaded."
      />
    );
  }

  const band = findAqiBand(city.aqi);
  const recommendation = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];

  const factors: { label: string; value: string }[] = [];
  if (typeof city.pm25 === "number")
    factors.push({ label: "PM2.5", value: `${city.pm25} µg/m³` });
  if (typeof city.humidity === "number")
    factors.push({ label: "Humidity", value: `${city.humidity}%` });
  if (typeof city.temp === "number")
    factors.push({ label: "Temperature", value: `${city.temp}°C` });

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-7 space-y-5 transition-shadow duration-300 hover:shadow-xl",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className,
      )}
    >
      {/* Header: shield icon + badge */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="size-9 rounded-xl grid place-items-center shrink-0"
          style={{
            background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
            color: band.color,
          }}
          aria-hidden="true"
        >
          <ShieldCheck className="size-4.5" />
        </div>
        <AQIBadge label={band.label} color={band.color} />
      </div>

      {/* Recommendation text — the hero */}
      <p
        className="text-[0.95rem] md:text-base leading-relaxed font-medium"
        style={{ color: "oklch(0.88 0.010 220)" }}
      >
        {recommendation}
      </p>

      {/* Supporting metrics */}
      {factors.length > 0 && (
        <div
          className="pt-1 border-t"
          style={{ borderColor: "oklch(1 0 0 / 0.07)" }}
        >
          <p
            className="text-[9.5px] font-bold uppercase tracking-[0.20em] mb-3"
            style={{ color: "oklch(0.46 0.012 230)" }}
          >
            Supporting readings
          </p>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(factors.length, 3)}, minmax(0, 1fr))`,
            }}
            role="list"
            aria-label="Supporting environmental readings"
          >
            {factors.map((f) => (
              <div key={f.label} role="listitem">
                <MetricPill label={f.label} value={f.value} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p
        className="text-[10px]"
        style={{ color: "oklch(0.42 0.010 230)" }}
      >
        Informational only — not medical advice.
      </p>
    </div>
  );
}
