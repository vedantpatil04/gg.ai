import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { getCityVisual } from "@/lib/city-images";
import { formatRelativeTime } from "@/lib/format-time";
import { EnvCityContextSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * SECTION 01 — CURRENT ENVIRONMENTAL STATE
 *
 * "Where am I? What is the environmental situation here right now?"
 *
 * Visual hierarchy:
 *  - Current city title & subtitle
 *  - Live indicator & real-time update timestamp
 *  - Concise natural-language environmental summary
 *  - Data-driven contextual city photograph resolved via `getCityVisual(city.id, city.name)`
 *    (Belagavi active by default, future-ready for any city configuration)
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
  const cityVisual = getCityVisual(city.id, city.name);
  const imageUrl = imageFailed ? undefined : cityVisual.image;

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
        "grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr] gap-4 sm:gap-6 md:gap-8 items-stretch",
        className,
      )}
    >
      {/* Compact contextual photograph — future-ready, responsive, no layout shift */}
      <div className="relative h-[160px] sm:h-[180px] md:h-[200px] lg:h-[220px] rounded-2xl overflow-hidden border border-border bg-muted">
        {imageUrl ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={cityVisual.alt}
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
        {/* Subtle base-anchored fade for theme contrast */}
        <div
          className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, oklch(from var(--color-background) l c h / 0.55), transparent)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* City identity + live status + summary */}
      <div className="flex flex-col justify-center gap-2.5 min-w-0">
        <div>
          <h1
            id="env-city-context-title"
            className="text-2xl md:text-3xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {city.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Current environmental conditions
          </p>
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

        <p className="text-sm md:text-base leading-relaxed max-w-prose text-foreground/90 font-normal">
          {summary}
        </p>
      </div>
    </section>
  );
}
