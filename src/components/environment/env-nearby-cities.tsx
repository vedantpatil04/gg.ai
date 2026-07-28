import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, Minus, MapPin } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand, type City } from "@/lib/mock-data";
import { measureDistanceMeters, formatDistance } from "@/lib/map/map-visuals";
import { EnvNearbyCitiesSkeleton } from "@/components/environment/phase8/env-phase8-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Nearby Cities & Regional Comparison (Phase 8).
 *
 * Upgrades the flat 4-card grid into a premium regional analytics experience:
 *   • Sort controls — by AQI (best→worst), AQI (worst→best), Distance.
 *   • Current city highlight row at the top.
 *   • City cards — AQI-reactive accent, comparison bar showing relative AQI
 *     vs the regional max, ↑/↓ indicator vs current city, temp + distance.
 *   • Insights panel — derived from real data only, no fabrication.
 *
 * All data from `useCity()` — no new API calls, no duplicate fetches.
 * All animations via `motion-safe:` Tailwind variant — reduced-motion safe.
 */

const MAX_NEARBY = 8;

type SortKey = "aqi-asc" | "aqi-desc" | "distance";
const SORT_LABELS: Record<SortKey, string> = {
  "aqi-asc": "Best AQI",
  "aqi-desc": "Worst AQI",
  distance: "Nearest",
};

// ─── Trend arrow vs current city ─────────────────────────────────────────────

function AqiDelta({ cityAqi, currentAqi }: { cityAqi: number; currentAqi: number }) {
  const diff = cityAqi - currentAqi;
  if (Math.abs(diff) < 5) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
        aria-label="Similar AQI"
      >
        <Minus className="size-3" aria-hidden="true" /> Similar
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-medium"
        style={{ color: "var(--color-success)" }}
        aria-label={`AQI ${Math.abs(diff)} better than your city`}
      >
        <ArrowDown className="size-3" aria-hidden="true" /> {Math.abs(diff)} better
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-medium"
      style={{ color: "hsl(28 90% 55%)" }}
      aria-label={`AQI ${diff} worse than your city`}
    >
      <ArrowUp className="size-3" aria-hidden="true" /> {diff} worse
    </span>
  );
}

// ─── AQI comparison bar ───────────────────────────────────────────────────────

function ComparisonBar({ aqi, maxAqi, color }: { aqi: number; maxAqi: number; color: string }) {
  const pct = maxAqi > 0 ? Math.min(100, Math.round((aqi / maxAqi) * 100)) : 0;
  return (
    <div className="h-1 w-full rounded-full bg-border overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
        role="progressbar"
        aria-valuenow={aqi}
        aria-valuemin={0}
        aria-valuemax={maxAqi}
        aria-label={`AQI ${aqi}`}
      />
    </div>
  );
}

// ─── Individual city card ─────────────────────────────────────────────────────

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
        "relative flex flex-col gap-3 rounded-xl border p-4 glass",
        "transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
      style={{
        borderColor: `color-mix(in oklab, ${band.color} 22%, var(--color-border))`,
        animationDelay: `${rank * 60}ms`,
      }}
      aria-label={`${city.name}, AQI ${city.aqi} ${band.label}, ${formatDistance(distanceMeters)} away`}
    >
      {/* Rank badge */}
      <span
        className="absolute top-3 right-3 text-[10px] font-semibold tabular-nums text-muted-foreground"
        aria-hidden="true"
      >
        #{rank + 1}
      </span>

      {/* City name */}
      <div className="min-w-0 pr-6">
        <div className="text-sm font-semibold truncate">{city.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{city.country}</div>
      </div>

      {/* AQI value + band */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums" style={{ color: band.color }}>
          {city.aqi}
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
          style={{
            color: band.color,
            borderColor: `color-mix(in oklab, ${band.color} 35%, transparent)`,
            background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
          }}
        >
          {band.shortLabel}
        </span>
      </div>

      {/* Comparison bar */}
      <ComparisonBar aqi={city.aqi} maxAqi={maxAqi} color={band.color} />

      {/* Delta + secondary metrics */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <AqiDelta cityAqi={city.aqi} currentAqi={currentAqi} />
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {typeof city.temp === "number" && <span>{city.temp}°C</span>}
          <span>{formatDistance(distanceMeters)}</span>
        </div>
      </div>

      {city.updatedAt && (
        <div className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(city.updatedAt), { addSuffix: true })}
        </div>
      )}
    </div>
  );
}

// ─── Current city highlight ───────────────────────────────────────────────────

function CurrentCityRow({ city }: { city: City }) {
  const band = findAqiBand(city.aqi);
  return (
    <div
      className="flex items-center gap-4 rounded-xl border p-4 glass"
      style={{
        borderColor: `color-mix(in oklab, ${band.color} 40%, var(--color-border))`,
        background: `color-mix(in oklab, ${band.color} 6%, var(--color-card))`,
      }}
      aria-label={`Your city: ${city.name}, AQI ${city.aqi} ${band.label}`}
    >
      <div
        className="size-8 rounded-lg grid place-items-center shrink-0"
        style={{
          background: `color-mix(in oklab, ${band.color} 16%, transparent)`,
          color: band.color,
        }}
        aria-hidden="true"
      >
        <MapPin className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{city.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">Your city</span>
        </div>
        <div className="text-[10px] text-muted-foreground">{city.country}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xl font-bold tabular-nums" style={{ color: band.color }}>
          {city.aqi}
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
          style={{
            color: band.color,
            borderColor: `color-mix(in oklab, ${band.color} 35%, transparent)`,
            background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
          }}
        >
          {band.label}
        </span>
      </div>
    </div>
  );
}

// ─── Insights panel ───────────────────────────────────────────────────────────

function RegionalInsights({
  current,
  nearby,
}: {
  current: City;
  nearby: { city: City; distanceMeters: number }[];
}) {
  if (nearby.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
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
    insights.push(`${current.name}'s air quality is currently higher than most nearby cities.`);
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
    <ul className="space-y-2">
      {insights.map((text, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
        >
          <span className="mt-2 size-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden="true" />
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
    if (sortKey === "aqi-asc") return a.city.aqi - b.city.aqi;
    if (sortKey === "aqi-desc") return b.city.aqi - a.city.aqi;
    return a.distanceMeters - b.distanceMeters;
  });

  const maxAqi = Math.max(city.aqi, ...base.map((n) => n.city.aqi));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current city */}
      <CurrentCityRow city={city} />

      {/* Sort controls */}
      <div
        className="flex items-center gap-2 flex-wrap"
        role="group"
        aria-label="Sort nearby cities by"
      >
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
          Sort by
        </span>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            aria-pressed={sortKey === key}
            className={cn(
              "text-[11px] font-medium px-3 py-1 rounded-full border transition-colors duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              sortKey === key
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {SORT_LABELS[key]}
          </button>
        ))}
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
          "glass rounded-2xl p-5 md:p-6 space-y-3",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        )}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Regional Insights
        </span>
        <RegionalInsights current={city} nearby={base} />
      </div>
    </div>
  );
}
