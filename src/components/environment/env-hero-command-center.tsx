import type { ComponentType, ReactNode } from "react";
import { MapPin, CloudSun } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { EnvHeroCommandCenterSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Hero Environmental Command Center.
 *
 * Phase 1 laid out a plain three-column summary. Phase 2 upgrades that same
 * section into a premium three-zone command center: Location + AQI,
 * Current Weather, and a distinct GreenGuard AI panel — still built purely
 * from the one live-city reading (`useCity()`) every other section already
 * shares. No second network request, no new API, no AI generation.
 *
 * AQI classification/colors reuse the project's single source of truth
 * (`findAqiBand` / `AQI_BANDS` in `lib/mock-data.ts`) and the same
 * deterministic guidance copy already used by the AQI Hero and Health
 * Recommendation (`HEALTH_STATUS_BY_BAND`) — no second threshold system.
 * `WEATHER_IMPACT_BY_BAND` / `RECOMMENDATION_BY_BAND` below follow that
 * exact same pattern: static copy keyed off the existing band label, not a
 * new classification and not a live AI call.
 *
 * No animation is used anywhere in this component (no pulse, no aurora
 * blur, no count-up) — that's out of scope for this phase.
 */

/** Short, non-clinical "how today's weather interacts with the AQI"
 *  copy, keyed off the same band labels as `HEALTH_STATUS_BY_BAND`. Text
 *  only — this doesn't add a second AQI/weather classification. */
const WEATHER_IMPACT_BY_BAND: Record<string, string> = {
  Good: "Current conditions are favorable for spending time outdoors.",
  Moderate:
    "Weather conditions are generally comfortable, but sensitive individuals should stay mindful of air quality.",
  "Unhealthy (SG)":
    "Weather is pleasant, but pollution levels mean sensitive groups should limit time outdoors.",
  Unhealthy:
    "Despite the current weather, elevated pollution levels make outdoor exposure less favorable today.",
  "Very Unhealthy":
    "Current weather does not offset the very poor air quality — outdoor exposure should be minimized.",
  Hazardous:
    "Weather conditions are secondary right now — hazardous air quality is the primary concern.",
};

/** Short actionable recommendation, keyed off the same band labels. */
const RECOMMENDATION_BY_BAND: Record<string, string> = {
  Good: "Outdoor activities are currently suitable for everyone.",
  Moderate:
    "Outdoor activities are generally fine; sensitive individuals may want to pace prolonged exertion.",
  "Unhealthy (SG)": "Sensitive groups should consider limiting prolonged outdoor exertion today.",
  Unhealthy: "Reduce prolonged outdoor exertion where possible.",
  "Very Unhealthy": "Avoid outdoor activity where possible.",
  Hazardous: "Avoid all outdoor activity.",
};

function TelemetryBadge({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border w-fit",
        live ? "text-[color:var(--color-success)]" : "text-muted-foreground",
      )}
      style={{
        borderColor: live
          ? "color-mix(in oklab, var(--color-success) 35%, transparent)"
          : undefined,
        background: live ? "color-mix(in oklab, var(--color-success) 12%, transparent)" : undefined,
      }}
      role="status"
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: live ? "var(--color-success)" : "var(--color-muted-foreground)" }}
        aria-hidden="true"
      />
      {live ? "Live telemetry" : "Offline"}
    </span>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border w-fit"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

/** One of the hero's three zones — a distinct, layered surface within the
 *  outer glass shell, giving each zone clear visual grouping. */
function HeroZone({
  eyebrow,
  icon: Icon,
  className,
  children,
}: {
  eyebrow: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 min-w-0 rounded-xl border border-border bg-card/40 p-5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />}
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      {children}
    </div>
  );
}

function WeatherMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function HeroCommandCenter({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, isApiConnected, cityDataUpdatedAt, refreshCity } =
    useCity();

  if (isCityListLoading) {
    return <EnvHeroCommandCenterSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load the command center summary."
      />
    );
  }

  if (!city || typeof city.aqi !== "number" || typeof city.temp !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Command center summary is unavailable."
        description="This section will update once a live environmental reading is available."
      />
    );
  }

  const band = findAqiBand(city.aqi);
  const healthText = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];
  const weatherImpactText =
    WEATHER_IMPACT_BY_BAND[band.label] ?? WEATHER_IMPACT_BY_BAND["Moderate"];
  const recommendationText =
    RECOMMENDATION_BY_BAND[band.label] ?? RECOMMENDATION_BY_BAND["Moderate"];

  const lastUpdated = isApiConnected ? cityDataUpdatedAt : undefined;
  const lastUpdatedLabel = lastUpdated
    ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
    : "Updated --";

  // Only ever render weather metrics we actually have — same rule as
  // Weather Overview and every other section on this page. "Feels like",
  // "Rain" and "UV" aren't in the current City/weather data model yet
  // (see lib/mock-data.ts) and are gracefully omitted rather than faked.
  const weatherMetrics: { label: string; value: string }[] = [];
  if (typeof city.humidity === "number") {
    weatherMetrics.push({ label: "Humidity", value: `${city.humidity}%` });
  }
  if (typeof city.windSpeed === "number") {
    weatherMetrics.push({ label: "Wind", value: `${city.windSpeed} km/h` });
  }
  if (typeof city.pressure === "number") {
    weatherMetrics.push({ label: "Pressure", value: `${city.pressure} hPa` });
  }

  const hasWeatherImpact = typeof city.temp === "number" && typeof city.humidity === "number";

  return (
    <div className={cn("glass rounded-2xl p-5 md:p-8", className)}>
      {/* Header row — command-center label + live status */}
      <div className="flex items-center justify-between gap-4 pb-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Environmental Command Center
        </span>
        <TelemetryBadge live={isApiConnected} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Zone 1 — Location + AQI (primary visual focus) */}
        <HeroZone eyebrow="Location & air quality" icon={MapPin}>
          <h2 className="text-lg font-semibold tracking-tight truncate">
            {city.name}
            {city.country && (
              <span className="text-muted-foreground font-normal"> · {city.country}</span>
            )}
          </h2>

          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Air Quality Index
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-6xl font-bold tabular-nums tracking-tight"
                style={{ color: band.color }}
                aria-label={`Air quality index ${city.aqi} — ${band.label}`}
              >
                {city.aqi}
              </span>
            </div>
          </div>

          <StatusPill label={band.label} color={band.color} />

          <span className="text-xs text-muted-foreground">{lastUpdatedLabel}</span>
        </HeroZone>

        {/* Zone 2 — Current weather */}
        <HeroZone eyebrow="Current weather" icon={CloudSun}>
          <div className="flex items-center gap-3">
            <CloudSun className="size-8 text-muted-foreground" aria-hidden="true" />
            <span className="text-4xl font-bold tabular-nums tracking-tight">{city.temp}°C</span>
          </div>

          {weatherMetrics.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-1">
              {weatherMetrics.map((m) => (
                <WeatherMetric key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          )}
        </HeroZone>

        {/* Zone 3 — GreenGuard AI panel */}
        <HeroZone eyebrow="GreenGuard AI" className="bg-primary/5 border-primary/20">
          <div>
            <span className="text-xs font-semibold">Environmental Status</span>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">{healthText}</p>
          </div>

          {hasWeatherImpact && (
            <div className="pt-2 border-t border-border">
              <span className="text-xs font-semibold">Weather Impact</span>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                {weatherImpactText}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <span className="text-xs font-semibold">Recommendation</span>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              {recommendationText}
            </p>
          </div>
        </HeroZone>
      </div>
    </div>
  );
}
