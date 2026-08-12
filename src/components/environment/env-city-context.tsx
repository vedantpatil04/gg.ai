import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { resolveHeroImage } from "@/lib/city-images";
import { getTimeSlot, getWeatherProxy } from "@/lib/hero-scene";
import { formatRelativeTime } from "@/lib/format-time";
import { EnvCityContextSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * CityEnvironmentalContext — Environmental Overview, Phase 1, Area 1.
 *
 * "Where am I? What is the environmental situation here right now?"
 *
 * Design:
 *  — Compact contextual photograph (220–300px tall on desktop, shorter on
 *    mobile), NOT a full-bleed cinematic hero. Resolved through the
 *    project's existing city-image configuration (`src/lib/city-images.ts`
 *    → `resolveHeroImage()`), the same architecture the Citizen Dashboard
 *    hero already uses — reused here rather than duplicated so a new image
 *    only ever needs to be dropped into one config.
 *  — A city with no configured/loadable photograph falls back to a plain
 *    tinted placeholder rather than a broken image or a fabricated one.
 *  — The natural-language summary is built only from real fields already
 *    present on the city record (AQI band + PM2.5 when available) — no
 *    invented figures.
 *  — Fully theme-aware: no hardcoded dark-only surfaces, so it renders
 *    correctly whether the app is in Light or Dark mode.
 */

export function CityEnvironmentalContext({ className }: { className?: string }) {
  const { city, isApiConnected, isCityListLoading, isCityError, cityDataUpdatedAt, refreshCity } =
    useCity();
  const [imageFailed, setImageFailed] = useState(false);

  if (isCityListLoading) {
    return <EnvCityContextSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load city environmental context."
      />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Data unavailable"
        description="City environmental context will appear once a live reading is received."
      />
    );
  }

  const band = findAqiBand(city.aqi);

  // Real-data-derived scene selection — no fabricated weather condition.
  const hour = new Date().getHours();
  const slot = getTimeSlot(hour);
  const weather = getWeatherProxy({
    humidity: city.humidity,
    windSpeed: city.windSpeed,
    temp: city.temp,
  });
  const imageUrl = imageFailed ? undefined : resolveHeroImage(city.id, slot, weather);

  const hasOwnTimestamp = typeof city.updatedAt === "string" && city.updatedAt.length > 0;
  const updatedLabel = hasOwnTimestamp
    ? formatRelativeTime(city.updatedAt)
    : isApiConnected && cityDataUpdatedAt
      ? formatRelativeTime(new Date(cityDataUpdatedAt).toISOString())
      : null;

  const summary = `Air quality is currently in the ${band.label} range${
    typeof city.pm25 === "number" ? `, with PM2.5 near ${city.pm25} µg/m³` : ""
  }.`;

  return (
    <section
      aria-labelledby="env-city-context-title"
      className={cn(
        "grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] gap-5 md:gap-8 items-stretch",
        className,
      )}
    >
      {/* Compact contextual photograph — not a hero */}
      <div className="relative h-[170px] sm:h-[200px] md:h-[220px] lg:h-[250px] xl:h-[280px] rounded-2xl overflow-hidden border border-border bg-muted">
        {imageUrl ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`${city.name} environmental photograph`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--color-primary) 10%, var(--color-muted)) 0%, var(--color-muted) 100%)",
            }}
          >
            <ImageOff className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground max-w-[220px]">
              No photograph available yet for {city.name}
            </p>
          </div>
        )}
        {/* Subtle base-anchored fade — adapts to the active theme automatically */}
        <div
          className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, oklch(from var(--color-background) l c h / 0.55), transparent)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* City identity + live status + summary */}
      <div className="flex flex-col justify-center gap-3 min-w-0">
        <div>
          <h1
            id="env-city-context-title"
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {city.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Current environmental conditions</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
          {isApiConnected ? (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: "var(--color-success)" }}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full opacity-70 bg-current motion-safe:animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-current" />
              </span>
              Live
            </span>
          ) : (
            <span className="text-muted-foreground">Static reference data</span>
          )}
          {updatedLabel && <span className="text-muted-foreground">· Updated {updatedLabel}</span>}
        </div>

        <p className="text-sm md:text-base leading-relaxed max-w-prose text-foreground/90">
          {summary}
        </p>
      </div>
    </section>
  );
}
