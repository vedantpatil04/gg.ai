/**
 * NearbyCitiesCard — Phase 2
 *
 * Premium comparison cards for nearby cities from the existing CITIES array.
 * Not a table — each city is a glass card with:
 *   - AQI with color-matched badge
 *   - Temperature
 *   - Trend indicator
 *   - Mini sparkline (generated deterministically from city seed)
 *   - Distance estimate from current city (haversine)
 *   - Hover lift with border glow
 *
 * Uses CITIES from mock-data.ts — no new API calls.
 * All city data is already loaded via the CityContext.
 */

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, MapPin, Thermometer, Wind } from "lucide-react";
import { CITIES, aqiBand } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { STAGGER, HOVER_LIFT, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const d1 = ((lat2 - lat1) * Math.PI) / 180;
  const d2 = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(d1 / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(d2 / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDist(km: number): string {
  if (km < 50)   return `${km} km`;
  if (km < 1000) return `${km} km`;
  return `${(km / 1000).toFixed(1)}k km`;
}

// ─── Deterministic mini sparkline ────────────────────────────────────────────
// Generates a 12-point AQI history from the city seed so the sparkline
// is visually consistent across renders (no random flicker).

function citySparkline(city: City): number[] {
  const seed = city.aqi + city.id.charCodeAt(0);
  const rng  = (n: number) => {
    let s = (seed + n * 2654435761) >>> 0;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
  const amp = city.aqi * 0.25;
  return Array.from({ length: 12 }, (_, i) =>
    Math.max(5, Math.round(city.aqi + (rng(i) - 0.5) * amp))
  );
}

// ─── Inline SVG sparkline ─────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const W = 64, H = 24;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min || 1)) * H,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fill = `${d} L${W},${H} L0,${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Single city card ─────────────────────────────────────────────────────────

const CARD_ITEM = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

function CityCard({
  city,
  distKm,
  isCurrent,
}: {
  city:      City;
  distKm:    number;
  isCurrent: boolean;
}) {
  const prefersReduced = useReducedMotion() ?? false;
  const band           = aqiBand(city.aqi);
  const sparkData      = useMemo(() => citySparkline(city), [city]);

  // Trend: last 3 vs first 3 of sparkline
  const early = sparkData.slice(0, 3).reduce((a, b) => a + b) / 3;
  const late  = sparkData.slice(-3).reduce((a, b) => a + b) / 3;
  const diff  = late - early;
  const TrendIcon  = Math.abs(diff) < 3 ? Minus : diff > 0 ? TrendingUp : TrendingDown;
  const trendColor = Math.abs(diff) < 3 ? "text-muted-foreground" : diff > 0 ? "text-destructive" : "text-success";

  return (
    <motion.div
      variants={CARD_ITEM}
      whileHover={prefersReduced ? undefined : HOVER_LIFT}
      className="glass rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group cursor-default"
      style={{
        borderColor: isCurrent
          ? `color-mix(in oklab, ${band.color} 35%, transparent)`
          : undefined,
        boxShadow: isCurrent
          ? `0 0 0 1px color-mix(in oklab, ${band.color} 25%, transparent)`
          : undefined,
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden
        className="absolute -top-6 -right-6 size-24 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
        style={{ background: band.color }}
      />

      {/* City name + distance */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold leading-tight">{city.name}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="size-2.5" />
            {isCurrent ? "Current city" : formatDist(distKm)}
          </div>
        </div>
        {isCurrent && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
              color: band.color,
              border: `1px solid color-mix(in oklab, ${band.color} 28%, transparent)`,
            }}>
            You
          </span>
        )}
      </div>

      {/* AQI badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold tabular-nums leading-none"
            style={{ color: band.color }}>{city.aqi}</div>
          <div className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
              color: band.color,
            }}>
            {(band as any).shortLabel ?? band.label}
          </div>
        </div>
        <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`}>
          <TrendIcon className="size-3" />
          {Math.abs(diff) < 3 ? "Stable" : diff > 0 ? `+${Math.round(diff)}` : Math.round(diff)}
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline data={sparkData} color={band.color} />

      {/* Footer stats */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border pt-2.5">
        {city.temp != null && (
          <span className="flex items-center gap-1">
            <Thermometer className="size-3" />{city.temp}°C
          </span>
        )}
        {city.windSpeed != null && (
          <span className="flex items-center gap-1">
            <Wind className="size-3" />{city.windSpeed} km/h
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function NearbyCitiesCard({
  currentCityId,
  currentLat,
  currentLng,
  maxCards = 6,
}: {
  currentCityId: string;
  currentLat:    number;
  currentLng:    number;
  maxCards?:     number;
}) {
  const ref            = useRef<HTMLDivElement>(null);
  const inView         = useInView(ref, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion() ?? false;

  // Sort all OTHER cities by distance, take nearest maxCards-1, prepend current
  const currentCity = CITIES.find((c) => c.id === currentCityId) ?? CITIES[0];
  const nearby = useMemo(() => {
    return CITIES
      .filter((c) => c.id !== currentCityId)
      .map((c) => ({ city: c, dist: distanceKm(currentLat, currentLng, c.lat, c.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxCards - 1);
  }, [currentCityId, currentLat, currentLng, maxCards]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Network</div>
          <h2 className="text-lg font-semibold mt-0.5">Nearby Cities</h2>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {nearby.length + 1} cities monitored
        </div>
      </div>

      <motion.div
        ref={ref}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3"
        variants={STAGGER(0.065)}
        initial={prefersReduced ? false : "hidden"}
        animate={inView ? "show" : "hidden"}
      >
        {/* Current city first */}
        <CityCard city={currentCity} distKm={0} isCurrent />
        {nearby.map(({ city, dist }) => (
          <CityCard key={city.id} city={city} distKm={dist} isCurrent={false} />
        ))}
      </motion.div>
    </div>
  );
}
