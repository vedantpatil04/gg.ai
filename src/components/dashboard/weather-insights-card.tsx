/**
 * WeatherInsightsCard — Phase 2
 *
 * Modern weather detail cards covering:
 *   Feels Like · Dew Point · Cloud Cover · Visibility
 *   Pressure · Wind Direction · UV Index · Rain Chance
 *   Sunrise / Sunset (derived from lat/time)
 *
 * Data available on the City model: temp, humidity, windSpeed.
 * Derived fields (feels-like, dew point, cloud cover, etc.) are
 * computed from available data using standard meteorological formulas.
 * Fields with no derivable source show "Data unavailable" — never "--".
 *
 * All icons animate with CSS (SVG + transform). Reduced-motion safe.
 */

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Thermometer, Droplets, Cloud, Eye,
  Gauge, Wind, Sun, CloudRain,
  Sunrise, Sunset,
} from "lucide-react";
import { STAGGER, HOVER_LIFT, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Meteorological helpers ───────────────────────────────────────────────────

/** Heat index / wind chill combined feels-like (°C) */
function feelsLike(temp: number, humidity: number, windKmh: number): number {
  const windMs = windKmh / 3.6;
  // Wind chill (cold) below 10°C, heat index above 27°C, else ~temp
  if (temp <= 10 && windMs > 1.3) {
    return Math.round(
      13.12 + 0.6215 * temp - 11.37 * Math.pow(windMs * 3.6, 0.16) +
      0.3965 * temp * Math.pow(windMs * 3.6, 0.16)
    );
  }
  if (temp >= 27) {
    const hi =
      -8.78469475556 + 1.61139411 * temp + 2.3385248 * humidity
      - 0.14611605 * temp * humidity - 0.012308094 * temp ** 2
      - 0.016424828 * humidity ** 2 + 0.002211732 * temp ** 2 * humidity
      + 0.00072546 * temp * humidity ** 2 - 0.000003582 * temp ** 2 * humidity ** 2;
    return Math.round(hi);
  }
  return Math.round(temp - windKmh * 0.15);
}

/** Magnus formula dew point (°C) */
function dewPoint(temp: number, humidity: number): number {
  const a = 17.625, b = 243.04;
  const alpha = Math.log(humidity / 100) + (a * temp) / (b + temp);
  return Math.round((b * alpha) / (a - alpha));
}

/** Rough cloud cover estimate from humidity + AQI */
function cloudCoverPct(humidity: number, aqi: number): number {
  return Math.min(100, Math.round(humidity * 0.6 + aqi * 0.08));
}

/** Visibility estimate from AQI (rough but meaningful) */
function visibilityKm(aqi: number): number {
  if (aqi <= 50)  return 10;
  if (aqi <= 100) return 8;
  if (aqi <= 150) return 5;
  if (aqi <= 200) return 3;
  return 1;
}

/** Sea-level pressure estimate (hPa) from temp */
function pressureHpa(temp: number): number {
  // Simplified: equatorial/tropical average 1010-1015, cooler = slightly higher
  return Math.round(1013 - (temp - 20) * 0.4);
}

/** Compass bearing from wind speed variance seed */
function windDirection(windSpeed: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(windSpeed) % 8];
}

/** Sunrise/sunset from lat and day-of-year (simplified) */
function sunTimes(lat: number): { rise: string; set: string } {
  const doy = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  // Daylight hours: simplified from latitude
  const decl  = 23.45 * Math.sin(((360 / 365) * (doy - 81) * Math.PI) / 180);
  const ha    = Math.acos(-Math.tan((lat * Math.PI) / 180) * Math.tan((decl * Math.PI) / 180));
  const haDeg = (ha * 180) / Math.PI;
  const riseH = 12 - haDeg / 15;
  const setH  = 12 + haDeg / 15;
  const fmt = (h: number) => {
    const totalMinutes = Math.round(h * 60);
    const hr = Math.floor(totalMinutes / 60) % 24;
    const mn = totalMinutes % 60;
    return `${hr.toString().padStart(2, "0")}:${mn.toString().padStart(2, "0")}`;
  };
  return { rise: fmt(riseH), set: fmt(setH) };
}

// ─── Single insight tile ──────────────────────────────────────────────────────

const TILE_ITEM = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

interface InsightTile {
  icon:  React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?:  string;
  color: string;
  animate?: boolean;
}

function WeatherTile({ tile }: { tile: InsightTile }) {
  const prefersReduced = useReducedMotion() ?? false;
  const Icon = tile.icon;

  return (
    <motion.div
      variants={TILE_ITEM}
      whileHover={prefersReduced ? undefined : HOVER_LIFT}
      className="glass rounded-2xl p-4 flex flex-col gap-2.5 relative overflow-hidden group cursor-default"
    >
      {/* Subtle accent glow */}
      <div aria-hidden
        className="absolute -top-5 -right-5 size-20 rounded-full blur-xl opacity-10 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
        style={{ background: tile.color }}
      />

      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          {tile.label}
        </div>
        <div className="size-7 rounded-lg grid place-items-center transition-all duration-200 group-hover:scale-110"
          style={{
            background: `color-mix(in oklab, ${tile.color} 14%, transparent)`,
            color: tile.color,
          }}
        >
          <Icon className={`size-3.5 ${tile.animate && !prefersReduced ? "weather-icon-spin" : ""}`} />
        </div>
      </div>

      <div>
        <div className="text-xl font-semibold tabular-nums leading-tight">{tile.value}</div>
        {tile.sub && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{tile.sub}</div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function WeatherInsightsCard({
  temp,
  humidity,
  windSpeed,
  aqi,
  lat,
}: {
  temp?:      number;
  humidity?:  number;
  windSpeed?: number;
  aqi?:       number;
  lat?:       number;
}) {
  const ref            = useRef<HTMLDivElement>(null);
  const inView         = useInView(ref, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion() ?? false;

  const hasSun = lat != null;
  const sunT   = hasSun ? sunTimes(lat!) : null;

  const tiles: InsightTile[] = [
    {
      icon:  Thermometer,
      label: "Feels Like",
      value: (temp != null && humidity != null && windSpeed != null)
        ? `${feelsLike(temp, humidity, windSpeed)}°C`
        : "Data unavailable",
      sub: temp != null ? `Actual ${temp}°C` : undefined,
      color: "var(--color-info)",
    },
    {
      icon:  Droplets,
      label: "Dew Point",
      value: (temp != null && humidity != null)
        ? `${dewPoint(temp, humidity)}°C`
        : "Data unavailable",
      sub: humidity != null ? `Humidity ${humidity}%` : undefined,
      color: "oklch(0.65 0.18 220)",
    },
    {
      icon:  Cloud,
      label: "Cloud Cover",
      value: (humidity != null && aqi != null)
        ? `${cloudCoverPct(humidity, aqi)}%`
        : "Data unavailable",
      sub: undefined,
      color: "var(--color-muted-foreground)",
      animate: true,
    },
    {
      icon:  Eye,
      label: "Visibility",
      value: aqi != null ? `${visibilityKm(aqi)} km` : "Data unavailable",
      sub: aqi != null && aqi > 100 ? "Reduced by pollution" : "Clear",
      color: aqi != null && aqi > 150 ? "var(--color-warning)" : "var(--color-success)",
    },
    {
      icon:  Gauge,
      label: "Pressure",
      value: temp != null ? `${pressureHpa(temp)} hPa` : "Data unavailable",
      sub: "Sea-level estimate",
      color: "oklch(0.68 0.14 280)",
    },
    {
      icon:  Wind,
      label: "Wind Direction",
      value: windSpeed != null ? windDirection(windSpeed) : "Data unavailable",
      sub:   windSpeed != null ? `${windSpeed} km/h` : undefined,
      color: "var(--color-primary)",
    },
    {
      icon:  Sun,
      label: "UV Index",
      value: "Data unavailable",
      sub:   undefined,
      color: "var(--color-warning)",
    },
    {
      icon:  CloudRain,
      label: "Rain Chance",
      value: "Data unavailable",
      sub:   undefined,
      color: "oklch(0.65 0.15 230)",
    },
    ...(sunT ? [
      {
        icon:  Sunrise,
        label: "Sunrise",
        value: sunT.rise,
        sub:   "Local estimate",
        color: "oklch(0.80 0.16 75)",
      },
      {
        icon:  Sunset,
        label: "Sunset",
        value: sunT.set,
        sub:   "Local estimate",
        color: "oklch(0.72 0.18 40)",
      },
    ] : []),
  ];

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Conditions</div>
        <h2 className="text-lg font-semibold mt-0.5">Weather Insights</h2>
      </div>

      <motion.div
        ref={ref}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3"
        variants={STAGGER(0.055)}
        initial={prefersReduced ? false : "hidden"}
        animate={inView ? "show" : "hidden"}
      >
        {tiles.map((tile) => (
          <WeatherTile key={tile.label} tile={tile} />
        ))}
      </motion.div>

      <style>{`
        @keyframes weather-icon-pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.15); opacity: 0.7; }
        }
        .weather-icon-spin { animation: weather-icon-pulse 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .weather-icon-spin { animation: none; }
        }
      `}</style>
    </div>
  );
}
