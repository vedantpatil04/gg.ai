import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, Minus, MapPin, ArrowUpDown } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand, type City } from "@/lib/mock-data";
import { measureDistanceMeters, formatDistance } from "@/lib/map/map-visuals";
import { EnvNearbyCitiesSkeleton } from "@/components/environment/phase8/env-phase8-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Phase 1 — Nearby Cities & Regional Comparison.
 *
 * All business logic is preserved exactly.
 * UI improvements:
 *  - Current city "anchor row" has stronger visual identity
 *  - City cards are ranked with cleaner hierarchy (AQI is the dominant value)
 *  - Sort controls use compact pill design, not text buttons
 *  - Comparison bars are thinner, more refined
 *  - AQI delta chips are cleaner
 *  - Regional insights panel is typographically cleaner
 */

const MAX_NEARBY = 8;

type SortKey = "aqi-asc" | "aqi-desc" | "distance";
const SORT_LABELS: Record<SortKey, string> = {
  "aqi-asc":  "Best AQI",
  "aqi-desc": "Worst AQI",
  distance:   "Nearest",
};

// ─── AQI Delta chip ───────────────────────────────────────────────────────────

function AqiDelta({ cityAqi, currentAqi }: { cityAqi: number; currentAqi: number }) {
  const diff = cityAqi - currentAqi;
  if (Math.abs(diff) < 5) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[9px] font-medium"
        style={{ color: "oklch(0.50 0.012 230)" }}
        aria-label="Similar AQI to your city"
      >
        <Minus className="size-2.5" aria-hidden="true" />
        Similar
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[9px] font-semibold"
        style={{ color: "var(--color-success)" }}
        aria-label={`AQI ${Math.abs(diff)} better than your city`}
      >
        <ArrowDown className="size-2.5" aria-hidden="true" />
        {Math.abs(diff)} better
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[9px] font-semibold"
      style={{ color: "hsl(28 90% 55%)" }}
      aria-label={`AQI ${diff} worse than your city`}
    >
      <ArrowUp className="size-2.5" aria-hidden="true" />
      {diff} worse
    </span>
  );
}

// ─── Comparison bar ───────────────────────────────────────────────────────────

function ComparisonBar({ aqi, maxAqi, color }: { aqi: number; maxAqi: number; color: string }) {
  const pct = maxAqi > 0 ? Math.min(100, Math.round((aqi / maxAqi) * 100)) : 0;
  return (
    <div
      className="h-px w-full rounded-full overflow-hidden"
      style={{ background: "oklch(1 0 0 / 0.08)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 6px ${color}50`,
        }}
        role="progressbar"
        aria-valuenow={aqi}
        aria-valuemin={0}
        aria-valuemax={maxAqi}
        aria-label={`AQI ${aqi}`}
      />
    </div>
  );
}

// ─── City card ────────────────────────────────────────────────────────────────

function CityCard({
  city,
  distanceMeters,
  currentAqi,
  maxAqi,
  rank,
}: {
  city: City;
  distanceMeters: number;
  currentAqi: number;
  maxAqi: number;
  rank: number;
}) {
  const band = findAqiBand(city.aqi);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3.5 rounded-xl p-4 overflow-hidden",
        "transition-all duration-200 hover:scale-[1.02]",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
      style={{
        background: `color-mix(in oklab, ${band.color} 4%, oklch(1 0 0 / 0.05))`,
        border: `1px solid color-mix(in oklab, ${band.color} 18%, oklch(1 0 0 / 0.07))`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animationDelay: `${rank * 55}ms`,
      }}
      aria-label={`${city.name}, AQI ${city.aqi} ${band.label}, ${formatDistance(distanceMeters)} away`}
    >
      {/* Rank badge */}
      <span
        className="absolute top-3 right-3 text-[9px] font-bold tabular-nums"
        style={{ color: "oklch(0.42 0.012 230)" }}
        aria-hidden="true"
      >
        #{rank + 1}
      </span>

      {/* City name + country */}
      <div className="min-w-0 pr-7">
        <div
          className="text-[0.85rem] font-semibold truncate"
          style={{ color: "oklch(0.90 0.010 220)" }}
        >
          {city.name}
        </div>
        <div
          className="text-[9.5px] truncate mt-0.5"
          style={{ color: "oklch(0.50 0.012 230)" }}
        >
          {city.country}
        </div>
      </div>

      {/* AQI value + band badge */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-[1.9rem] font-bold tabular-nums leading-none tracking-tighter"
          style={{ color: band.color }}
        >
          {city.aqi}
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
          style={{
            color: band.color,
            background: `color-mix(in oklab, ${band.color} 13%, transparent)`,
          }}
        >
          {band.shortLabel}
        </span>
      </div>

      {/* Comparison bar */}
      <ComparisonBar aqi={city.aqi} maxAqi={maxAqi} color={band.color} />

      {/* Delta + metadata row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <AqiDelta cityAqi={city.aqi} currentAqi={currentAqi} />
        <div
          className="flex items-center gap-2 text-[9px]"
          style={{ color: "oklch(0.48 0.012 230)" }}
        >
          {typeof city.temp === "number" && <span>{city.temp}°C</span>}
          <span>{formatDistance(distanceMeters)}</span>
        </div>
      </div>

      {/* Timestamp */}
      {city.updatedAt && (
        <div
          className="text-[9px]"
          style={{ color: "oklch(0.42 0.010 230)" }}
        >
          {formatDistanceToNow(new Date(city.updatedAt), { addSuffix: true })}
        </div>
      )}
    </div>
  );
}

// ─── Current city anchor row ──────────────────────────────────────────────────

function CurrentCityRow({ city }: { city: City }) {
  const band = findAqiBand(city.aqi);
  return (
    <div
      className="flex items-center gap-4 rounded-xl p-4 overflow-hidden"
      style={{
        background: `color-mix(in oklab, ${band.color} 7%, oklch(1 0 0 / 0.06))`,
        border: `1px solid color-mix(in oklab, ${band.color} 32%, oklch(1 0 0 / 0.08))`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: `0 0 24px -8px color-mix(in oklab, ${band.color} 20%, transparent)`,
      }}
      aria-label={`Your city: ${city.name}, AQI ${city.aqi} ${band.label}`}
    >
      {/* Pin icon */}
      <div
        className="size-9 rounded-xl grid place-items-center shrink-0"
        style={{
          background: `color-mix(in oklab, ${band.color} 16%, transparent)`,
          color: band.color,
          border: `1px solid color-mix(in oklab, ${band.color} 24%, transparent)`,
        }}
        aria-hidden="true"
      >
        <MapPin className="size-4.5" />
      </div>

      {/* City info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[0.9rem] font-semibold truncate"
            style={{ color: "oklch(0.92 0.010 220)" }}
          >
            {city.name}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full shrink-0"
            style={{
              color: "oklch(0.65 0.012 210)",
              background: "oklch(1 0 0 / 0.07)",
              border: "1px solid oklch(1 0 0 / 0.09)",
            }}
          >
            Your city
          </span>
        </div>
        <div
          className="text-[9.5px] mt-0.5"
          style={{ color: "oklch(0.50 0.012 230)" }}
        >
          {city.country}
        </div>
      </div>

      {/* AQI + band */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          className="text-[1.6rem] font-bold tabular-nums leading-none tracking-tighter"
          style={{ color: band.color }}
        >
          {city.aqi}
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full"
          style={{
            color: band.color,
            background: `color-mix(in oklab, ${band.color} 13%, transparent)`,
            border: `1px solid color-mix(in oklab, ${band.color} 24%, transparent)`,
          }}
        >
          {band.label}
        </span>
      </div>
    </div>
  );
}

// ─── Regional insights ────────────────────────────────────────────────────────

function RegionalInsights({
  current,
  nearby,
}: {
  current: City;
  nearby: { city: City; distanceMeters: number }[];
}) {
  if (nearby.length < 2) {
    return (
      <p
        className="text-sm"
        style={{ color: "oklch(0.52 0.012 230)" }}
      >
        More nearby city data is needed for a regional comparison.
      </p>
    );
  }

  const betterCount = nearby.filter((n) => n.city.aqi < current.aqi - 5).length;
  const worseCount = nearby.filter((n) => n.city.aqi > current.aqi + 5).length;
  const avgAqi = Math.round(nearby.reduce((s, n) => s + n.city.aqi, 0) / nearby.length);
  const best = nearby.reduce((a, b) => (b.city.aqi < a.city.aqi ? b : a));
  const worst = nearby.reduce((a, b) => (b.city.aqi > a.city.aqi ? b : a));

  const insights: string[] = [];

  if (betterCount > nearby.length / 2) {
    insights.push(`${current.name} has better air quality than most nearby cities right now.`);
  } else if (worseCount > nearby.length / 2) {
    insights.push(`${current.name}'s AQI is currently higher than most nearby cities.`);
  } else {
    insights.push(
      `Regional air quality is broadly similar across nearby cities (avg AQI ${avgAqi}).`,
    );
  }

  if (best.city.aqi < current.aqi - 10) {
    insights.push(`${best.city.name} has the best nearby air quality at AQI ${best.city.aqi}.`);
  }
  if (worst.city.aqi > current.aqi + 10) {
    insights.push(`${worst.city.name} has the highest nearby AQI at ${worst.city.aqi}.`);
  }

  return (
    <ul className="space-y-3" role="list">
      {insights.map((text, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-[0.82rem] leading-relaxed"
          style={{ color: "oklch(0.55 0.012 230)" }}
        >
          <span
            className="mt-[7px] size-1.5 rounded-full shrink-0"
            style={{ background: "oklch(0.55 0.14 210 / 0.7)" }}
            aria-hidden="true"
          />
          {text}
        </li>
      ))}
    </ul>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function NearbyCities({ className }: { className?: string }) {
  const { city, cities, isCityListLoading, isCityError, refreshCity } = useCity();
  const [sortKey, setSortKey] = useState<SortKey>("aqi-asc");

  if (isCityListLoading) {
    return <EnvNearbyCitiesSkeleton className={className} count={MAX_NEARBY} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load nearby city data."
      />
    );
  }

  const base = (cities ?? [])
    .filter(
      (c) =>
        c.id !== city.id &&
        typeof c.aqi === "number" &&
        typeof c.lat === "number" &&
        typeof c.lng === "number",
    )
    .map((c) => ({ city: c, distanceMeters: measureDistanceMeters(city, c) }))
    .slice(0, MAX_NEARBY);

  if (base.length === 0) {
    return (
      <EnvEmptyState className={className} title="No nearby city data is currently available." />
    );
  }

  const sorted = [...base].sort((a, b) => {
    if (sortKey === "aqi-asc")  return a.city.aqi - b.city.aqi;
    if (sortKey === "aqi-desc") return b.city.aqi - a.city.aqi;
    return a.distanceMeters - b.distanceMeters;
  });

  const maxAqi = Math.max(city.aqi, ...base.map((n) => n.city.aqi));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current city anchor */}
      <CurrentCityRow city={city} />

      {/* Sort controls */}
      <div
        className="flex items-center gap-2 flex-wrap"
        role="group"
        aria-label="Sort nearby cities by"
      >
        <span
          className="inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.18em] mr-1"
          style={{ color: "oklch(0.46 0.012 230)" }}
        >
          <ArrowUpDown className="size-2.5" aria-hidden="true" />
          Sort
        </span>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
          const active = sortKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              aria-pressed={active}
              className={cn(
                "text-[11px] font-semibold h-7 px-3 rounded-full border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
              style={
                active
                  ? {
                      color: "var(--color-primary)",
                      borderColor: "color-mix(in oklab, var(--color-primary) 40%, transparent)",
                      background: "color-mix(in oklab, var(--color-primary) 11%, transparent)",
                    }
                  : {
                      color: "oklch(0.52 0.012 230)",
                      borderColor: "oklch(1 0 0 / 0.10)",
                      background: "oklch(1 0 0 / 0.03)",
                    }
              }
            >
              {SORT_LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* City cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sorted.map(({ city: c, distanceMeters }, i) => (
          <CityCard
            key={c.id}
            city={c}
            distanceMeters={distanceMeters}
            currentAqi={city.aqi}
            maxAqi={maxAqi}
            rank={i}
          />
        ))}
      </div>

      {/* Regional insights */}
      <div
        className={cn(
          "rounded-2xl p-5 md:p-6 space-y-3.5",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        )}
        style={{
          background: "oklch(1 0 0 / 0.05)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          border: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div>
          <span
            className="block text-[9.5px] font-bold uppercase tracking-[0.22em] mb-1.5"
            style={{ color: "oklch(0.46 0.012 230)" }}
          >
            Regional Insights
          </span>
          <h4
            className="text-[0.9rem] font-semibold"
            style={{ color: "oklch(0.86 0.010 220)", fontFamily: "var(--font-display)" }}
          >
            How does {city.name} compare?
          </h4>
        </div>
        <RegionalInsights current={city} nearby={base} />
      </div>
    </div>
  );
}
