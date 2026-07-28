import { Wind } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { EnvAqiHeroSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Short, non-clinical health guidance per AQI band. Keyed off the labels
 * from the project's single centralized AQI classification table
 * (`AQI_BANDS` / `findAqiBand` in `lib/mock-data.ts`) — this is copy only,
 * not a new set of thresholds.
 */
export const HEALTH_STATUS_BY_BAND: Record<string, string> = {
  Good: "Air quality is good. Enjoy normal outdoor activities.",
  Moderate:
    "Air quality is moderate. Sensitive individuals should consider reducing prolonged outdoor activity.",
  "Unhealthy (SG)":
    "Air quality is unhealthy for sensitive groups. Consider limiting prolonged outdoor exertion.",
  Unhealthy: "Air quality is unhealthy. Reduce prolonged outdoor exertion where possible.",
  "Very Unhealthy": "Air quality is very unhealthy. Avoid outdoor activity where possible.",
  Hazardous: "Air quality is hazardous. Avoid all outdoor activity.",
};

/** City name, country and a short static subtitle for the hero. */
function CityInfo({ name, country }: { name: string; country?: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">
        {name}
        {country && <span className="text-muted-foreground font-normal"> · {country}</span>}
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5">Current environmental conditions</p>
    </div>
  );
}

/** Large, visually dominant AQI number with an accessible combined label. */
function AQIValue({ aqi, categoryLabel }: { aqi: number; categoryLabel: string }) {
  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`Air quality index ${aqi} — ${categoryLabel}`}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Air Quality Index
      </span>
      <span
        className="text-6xl md:text-7xl font-bold tabular-nums tracking-tight mt-1"
        aria-hidden="true"
      >
        {aqi}
      </span>
    </div>
  );
}

/** AQI category pill — never color-only; always paired with the text label. */
function AQICategory({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
      aria-hidden="true"
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Main pollutant row. GreenGuard has no dominant-pollutant field or utility
 *  yet, so this only ever shows real data or an honest "unavailable" state —
 *  never a guessed value. */
function MainPollutant({ value }: { value?: string | null }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Main Pollutant
      </span>
      <span className={cn("text-sm font-medium mt-1", !value && "text-muted-foreground italic")}>
        {value ?? "Main pollutant unavailable"}
      </span>
    </div>
  );
}

function HealthStatus({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">{text}</p>
  );
}

function LastUpdated({ timestamp }: { timestamp?: number }) {
  const label = timestamp
    ? `Updated ${formatDistanceToNow(timestamp, { addSuffix: true })}`
    : "Updated --";
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

export function LiveAqiHero({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, isApiConnected, cityDataUpdatedAt, refreshCity } =
    useCity();

  if (isCityListLoading) {
    return <EnvAqiHeroSkeleton className={className} />;
  }

  if (isCityError) {
    return <EnvErrorState className={className} onRetry={refreshCity} retryDisabled={false} />;
  }

  if (!city || typeof city.aqi !== "number") {
    return <EnvEmptyState className={className} />;
  }

  const band = findAqiBand(city.aqi);
  const healthText = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];
  // Live last-updated timestamp only makes sense once we have a confirmed
  // API-backed reading; in offline/mock mode there's no real fetch to time.
  const lastUpdated = isApiConnected ? cityDataUpdatedAt : undefined;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-8 md:p-10 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 mb-5">
        <Wind className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          AQI Intelligence
        </span>
      </div>
      <div className="flex flex-col items-center text-center gap-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CityInfo name={city.name} country={city.country} />
        </div>

        <AQIValue aqi={city.aqi} categoryLabel={band.label} />
        <AQICategory label={band.label} color={band.color} />

        <MainPollutant value={null} />

        <HealthStatus text={healthText} />

        <LastUpdated timestamp={lastUpdated} />
      </div>
    </div>
  );
}
