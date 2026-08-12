import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUp, ArrowDown, Minus, MapPin, BarChart2,
  ArrowUpDown, Trophy, TrendingUp, TrendingDown,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand, type City } from "@/lib/mock-data";
import { measureDistanceMeters, formatDistance } from "@/lib/map/map-visuals";
import { EnvNearbyCitiesSkeleton } from "@/components/environment/phase8/env-phase8-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Phase 4 — Regional Comparison: Interactive Environmental Exploration.
 *
 * Upgrades over Phase 3:
 *
 *  1. View modes — Cards (default) | Ranked list (compact comparison).
 *     Users choose the density that suits them.
 *
 *  2. City cards: clickable to reveal an inline detail panel with:
 *     - AQI interpretation sentence
 *     - Temperature / humidity / PM2.5 if available
 *     - Distance from your city
 *     - Trend direction vs current city
 *     Progressive disclosure — expand by tapping, collapse by tapping again.
 *
 *  3. Regional comparison bar chart: a single visual showing all nearby AQIs
 *     relative to each other and to the current city — makes it immediately
 *     clear who is cleanest and who is worst without reading numbers.
 *
 *  4. Comparative insights upgraded: now shows spread (max−min), regional
 *     context sentence, and which city to consider visiting for clean air.
 *
 *  5. Sort + filter controls: Best AQI / Worst AQI / Nearest — now with icons.
 *
 * All data from useCity() — no new API calls.
 * All existing exports preserved.
 */

const MAX_NEARBY = 8;

type SortKey = "aqi-asc" | "aqi-desc" | "distance";
type ViewMode = "cards" | "ranked";

const SORT_LABELS: Record<SortKey, { label: string; icon: typeof ArrowUpDown }> = {
  "aqi-asc":  { label: "Best AQI",   icon: TrendingDown },
  "aqi-desc": { label: "Worst AQI",  icon: TrendingUp   },
  distance:   { label: "Nearest",    icon: MapPin        },
};

// ─── AQI delta ───────────────────────────────────────────────────────────────

function AqiDelta({ cityAqi, currentAqi }: { cityAqi: number; currentAqi: number }) {
  const diff = cityAqi - currentAqi;
  if (Math.abs(diff) < 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" aria-label="Similar AQI">
        <Minus className="size-3" aria-hidden="true" /> Similar
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-medium"
        style={{ color: "var(--color-success)" }}
        aria-label={`AQI ${Math.abs(diff)} better`}
      >
        <ArrowDown className="size-3" aria-hidden="true" /> {Math.abs(diff)} better
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-medium"
      style={{ color: "hsl(28 90% 55%)" }}
      aria-label={`AQI ${diff} worse`}
    >
      <ArrowUp className="size-3" aria-hidden="true" /> {diff} worse
    </span>
  );
}

// ─── Comparison bar ───────────────────────────────────────────────────────────

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

// ─── AQI interpretation sentence ─────────────────────────────────────────────

function aqiInterpretation(aqi: number, name: string, bandLabel: string): string {
  if (aqi <= 50)  return `${name} has good air quality — no restrictions on outdoor activity.`;
  if (aqi <= 100) return `${name} is experiencing moderate conditions. Sensitive groups should monitor.`;
  if (aqi <= 150) return `${name}'s air quality is unhealthy for sensitive groups. General population may notice effects.`;
  if (aqi <= 200) return `${name} has unhealthy air quality. Limit prolonged outdoor activity.`;
  return `${name} is experiencing ${bandLabel} conditions. Stay indoors where possible.`;
}

// ─── Expandable city card ─────────────────────────────────────────────────────

function CityCard({
  city,
  distanceMeters,
  currentAqi,
  maxAqi,
  rank,
  isExpanded,
  onToggle,
}: {
  city: City;
  distanceMeters: number;
  currentAqi: number;
  maxAqi: number;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const band = findAqiBand(city.aqi);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border glass",
        "transition-all duration-200",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        isExpanded ? "shadow-lg" : "hover:shadow-md",
      )}
      style={{
        borderColor: isExpanded
          ? `color-mix(in oklab, ${band.color} 40%, var(--color-border))`
          : `color-mix(in oklab, ${band.color} 22%, var(--color-border))`,
        animationDelay: `${rank * 55}ms`,
      }}
    >
      {/* Main card content — always visible */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex flex-col gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-xl"
      >
        <span className="absolute top-3 right-3 text-[10px] font-semibold tabular-nums text-muted-foreground" aria-hidden="true">
          #{rank + 1}
        </span>

        <div className="min-w-0 pr-6">
          <div className="text-sm font-semibold truncate">{city.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{city.country}</div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums" style={{ color: band.color }}>
            {city.aqi}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              color: band.color,
              background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
            }}
          >
            {band.shortLabel}
          </span>
        </div>

        <ComparisonBar aqi={city.aqi} maxAqi={maxAqi} color={band.color} />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <AqiDelta cityAqi={city.aqi} currentAqi={currentAqi} />
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {typeof city.temp === "number" && <span>{city.temp}°C</span>}
            <span>{formatDistance(distanceMeters)}</span>
          </div>
        </div>
      </button>

      {/* Expanded detail — progressive disclosure */}
      {isExpanded && (
        <div
          className="px-4 pb-4 space-y-2.5 border-t border-border"
          style={{ paddingTop: "0.875rem" }}
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            {aqiInterpretation(city.aqi, city.name, band.label)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {typeof city.pm25 === "number" && (
              <div className="text-center py-2 rounded-lg bg-muted/30">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">PM2.5</div>
                <div className="text-sm font-semibold tabular-nums">{city.pm25} µg/m³</div>
              </div>
            )}
            {typeof city.humidity === "number" && (
              <div className="text-center py-2 rounded-lg bg-muted/30">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Humidity</div>
                <div className="text-sm font-semibold tabular-nums">{city.humidity}%</div>
              </div>
            )}
          </div>
          {city.updatedAt && (
            <p className="text-[10px] text-muted-foreground">
              Updated {formatDistanceToNow(new Date(city.updatedAt), { addSuffix: true })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ranked list view ─────────────────────────────────────────────────────────

function RankedListView({
  current,
  items,
  maxAqi,
}: {
  current: City;
  items: { city: City; distanceMeters: number }[];
  maxAqi: number;
}) {
  const allItems = [{ city: current, distanceMeters: 0 }, ...items]
    .sort((a, b) => a.city.aqi - b.city.aqi);

  return (
    <div className="space-y-1">
      {allItems.map(({ city: c, distanceMeters }, i) => {
        const band = findAqiBand(c.aqi);
        const isCurrent = c.id === current.id;
        const pct = maxAqi > 0 ? Math.min(100, Math.round((c.aqi / maxAqi) * 100)) : 0;

        return (
          <div
            key={c.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl",
              isCurrent && "border",
            )}
            style={isCurrent ? {
              background: `color-mix(in oklab, ${band.color} 6%, var(--color-card))`,
              borderColor: `color-mix(in oklab, ${band.color} 30%, var(--color-border))`,
            } : {}}
          >
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-5 text-center shrink-0">
              {i === 0 && <Trophy className="size-3 text-amber-500" aria-label="Best" />}
              {i !== 0 && `${i + 1}`}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium truncate">
                  {c.name}
                  {isCurrent && <span className="ml-1 text-[9px] text-muted-foreground">(your city)</span>}
                </span>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color: band.color, background: `color-mix(in oklab, ${band.color} 14%, transparent)` }}
                >
                  {c.aqi}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: band.color }}
                />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
              {distanceMeters > 0 ? formatDistance(distanceMeters) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Regional Insights (upgraded) ────────────────────────────────────────────

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

  const aqis = [current.aqi, ...nearby.map((n) => n.city.aqi)];
  const avgAqi = Math.round(aqis.reduce((s, v) => s + v, 0) / aqis.length);
  const spread = Math.max(...aqis) - Math.min(...aqis);
  const best = nearby.reduce((a, b) => (b.city.aqi < a.city.aqi ? b : a));
  const worst = nearby.reduce((a, b) => (b.city.aqi > a.city.aqi ? b : a));
  const betterCount = nearby.filter((n) => n.city.aqi > current.aqi + 5).length;
  const worseCount = nearby.filter((n) => n.city.aqi < current.aqi - 5).length;

  const summaryLine = worseCount > nearby.length / 2
    ? `${current.name} has better air quality than most nearby cities right now.`
    : betterCount > nearby.length / 2
      ? `${current.name}'s air quality is higher than most nearby cities.`
      : `Air quality across the region is broadly similar (avg AQI ${avgAqi}).`;

  const insights: string[] = [summaryLine];

  if (best.city.aqi < current.aqi - 10) {
    insights.push(
      `${best.city.name} has the best nearby air quality at AQI ${best.city.aqi} — ${formatDistance(best.distanceMeters)} away.`
    );
  }
  if (worst.city.aqi > current.aqi + 10) {
    insights.push(`${worst.city.name} currently has the highest regional AQI at ${worst.city.aqi}.`);
  }
  if (spread > 50) {
    insights.push(`There is significant variation across the region (AQI spread: ${spread} points) — conditions differ substantially between cities.`);
  }

  return (
    <ul className="space-y-2">
      {insights.map((text, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
          <span className="mt-2 size-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

// ─── Current city row ─────────────────────────────────────────────────────────

function CurrentCityRow({ city, rank, total }: { city: City; rank: number; total: number }) {
  const band = findAqiBand(city.aqi);
  const rankLabel = rank === 1
    ? "Best in region"
    : rank === total
      ? "Highest in region"
      : `#${rank} of ${total}`;

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
        style={{ background: `color-mix(in oklab, ${band.color} 16%, transparent)`, color: band.color }}
        aria-hidden="true"
      >
        <MapPin className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{city.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">Your city</span>
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{
              color: rank <= 2 ? "var(--color-success)" : rank >= total - 1 ? "hsl(28 90% 55%)" : "var(--color-muted-foreground)",
              background: "var(--color-muted)",
            }}
          >
            {rankLabel}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">{city.country}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xl font-bold tabular-nums" style={{ color: band.color }}>{city.aqi}</span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
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

// ─── Main export ──────────────────────────────────────────────────────────────

export function NearbyCities({ className }: { className?: string }) {
  const { city, cities, isCityListLoading, isCityError, refreshCity } = useCity();
  const [sortKey, setSortKey] = useState<SortKey>("aqi-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isCityListLoading) {
    return <EnvNearbyCitiesSkeleton className={className} count={MAX_NEARBY} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState className={className} onRetry={refreshCity} retryDisabled={false}
        message="Unable to load nearby city data." />
    );
  }

  const base = useMemo(() => {
    return (cities ?? [])
      .filter((c) =>
        c.id !== city.id &&
        typeof c.aqi === "number" &&
        typeof c.lat === "number" &&
        typeof c.lng === "number",
      )
      .map((c) => ({ city: c, distanceMeters: measureDistanceMeters(city, c) }))
      .slice(0, MAX_NEARBY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id, cities]);

  if (base.length === 0) {
    return <EnvEmptyState className={className} title="No nearby city data is currently available." />;
  }

  const sorted = useMemo(() => {
    return [...base].sort((a, b) => {
      if (sortKey === "aqi-asc")  return a.city.aqi - b.city.aqi;
      if (sortKey === "aqi-desc") return b.city.aqi - a.city.aqi;
      return a.distanceMeters - b.distanceMeters;
    });
  }, [base, sortKey]);

  const maxAqi = Math.max(city.aqi, ...base.map((n) => n.city.aqi));

  // Current city rank (among all incl. current)
  const allSortedByAqi = [city, ...base.map((n) => n.city)].sort((a, b) => a.aqi - b.aqi);
  const currentRank = allSortedByAqi.findIndex((c) => c.id === city.id) + 1;
  const total = allSortedByAqi.length;

  return (
    <div className={cn("space-y-4", className)}>

      {/* Current city */}
      <CurrentCityRow city={city} rank={currentRank} total={total} />

      {/* Controls — sort + view mode */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Sort */}
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Sort nearby cities">
          <span className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground mr-0.5">
            <ArrowUpDown className="size-2.5" aria-hidden="true" />
            Sort
          </span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
            const cfg = SORT_LABELS[key];
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSortKey(key)}
                aria-pressed={sortKey === key}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border transition-all duration-150",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  sortKey === key
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-2.5" aria-hidden="true" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* View mode */}
        <div className="flex items-center gap-1 border border-border rounded-full p-0.5" role="group" aria-label="View mode">
          {(["cards", "ranked"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-medium px-3 py-1 rounded-full transition-all duration-150",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                viewMode === mode
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === "cards" ? <BarChart2 className="size-2.5" aria-hidden="true" /> : <ArrowUpDown className="size-2.5" aria-hidden="true" />}
              {mode === "cards" ? "Cards" : "Ranked"}
            </button>
          ))}
        </div>
      </div>

      {/* City cards or ranked list */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sorted.map(({ city: c, distanceMeters }, i) => (
            <CityCard
              key={c.id}
              city={c}
              distanceMeters={distanceMeters}
              currentAqi={city.aqi}
              maxAqi={maxAqi}
              rank={i}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-4 md:p-6">
          <RankedListView current={city} items={sorted} maxAqi={maxAqi} />
        </div>
      )}

      {/* Regional insights */}
      <div
        className={cn(
          "glass rounded-2xl p-5 md:p-6 space-y-3",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        )}
      >
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Regional Insights</span>
          <h3 className="text-sm font-semibold mt-0.5">How does {city.name} compare?</h3>
        </div>
        <RegionalInsights current={city} nearby={base} />
      </div>
    </div>
  );
}
