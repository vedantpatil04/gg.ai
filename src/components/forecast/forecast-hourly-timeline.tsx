/**
 * ForecastHourlyTimeline — Phase 3
 *
 * Premium scrollable 24-hour forecast timeline.
 * Each hour card shows: time label, animated weather icon, temperature,
 * rain probability bar, wind speed, and AQI prediction.
 *
 * Data source: generateWeatherData() from weather-data.ts + forecastSeries()
 * from mock-data.ts. Falls back gracefully if API data is provided.
 * All animations respect prefers-reduced-motion.
 */

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Wind, Gauge } from "lucide-react";
import type { City } from "@/lib/mock-data";
import { forecastSeries, aqiBand } from "@/lib/mock-data";
import {
  generateWeatherData,
  conditionIconPath,
  type HourlyForecast,
  type WeatherCondition,
} from "@/lib/map/weather-data";
import { cn } from "@/lib/utils";
import { HOVER_LIFT_SM } from "@/lib/motion";

// ─── Inline weather icon (SVG path from weather-data) ────────────────────────

function WeatherIconSmall({
  condition,
  size = 28,
}: {
  condition: WeatherCondition;
  size?: number;
}) {
  const path = conditionIconPath(condition);
  const isRain = condition.includes("rain") || condition === "thunderstorm";
  const isSun  = condition === "clear";
  const isWind = condition === "windy";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {/* Sun core (for clear / partly cloudy) */}
      {isSun && (
        <circle cx="24" cy="24" r="10" fill="oklch(0.88 0.18 78)" />
      )}
      {/* Generic path (cloud / rain / wind shapes) */}
      {path && (
        <path
          d={path}
          fill={
            isRain  ? "oklch(0.72 0.12 230)" :
            isWind  ? "oklch(0.60 0.08 240)" :
            isSun   ? "oklch(0.88 0.18 78)"  :
                      "oklch(0.78 0.04 230)"
          }
        />
      )}
      {/* Rain drops */}
      {isRain && (
        <>
          <line x1="18" y1="36" x2="16" y2="42" stroke="oklch(0.70 0.14 220)" strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="38" x2="22" y2="44" stroke="oklch(0.70 0.14 220)" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="36" x2="28" y2="42" stroke="oklch(0.70 0.14 220)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ─── Single hour card ─────────────────────────────────────────────────────────

function HourCard({
  hour,
  aqiPredicted,
  isCurrent,
  prefersReduced,
}: {
  hour:         HourlyForecast;
  aqiPredicted: number;
  isCurrent:    boolean;
  prefersReduced: boolean;
}) {
  const band = aqiBand(aqiPredicted);

  return (
    <motion.div
      whileHover={prefersReduced ? undefined : HOVER_LIFT_SM}
      className={cn(
        "flex flex-col items-center gap-2 px-3.5 py-3.5 rounded-2xl shrink-0 w-[88px] cursor-default transition-colors duration-150",
        isCurrent
          ? "bg-primary/10 border border-primary/30"
          : "glass border border-border hover:border-border/80",
      )}
    >
      {/* Time label */}
      <div className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.14em]",
        isCurrent ? "text-primary" : "text-muted-foreground",
      )}>
        {hour.label}
      </div>

      {/* Weather icon */}
      <WeatherIconSmall condition={hour.condition} size={28} />

      {/* Temperature */}
      <div className="text-base font-bold tabular-nums leading-none">
        {hour.temp}°
      </div>

      {/* Rain chance bar */}
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between">
          <Droplets className="size-2.5 text-blue-400/70" />
          <span className="text-[9px] text-muted-foreground tabular-nums">{hour.rainChance}%</span>
        </div>
        <div className="h-0.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-400/70"
            style={{ width: `${hour.rainChance}%` }}
          />
        </div>
      </div>

      {/* Wind */}
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <Wind className="size-2.5 shrink-0" />
        {hour.windSpeed}
      </div>

      {/* AQI chip */}
      <div
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{
          background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
          color: band.color,
        }}
      >
        {aqiPredicted}
      </div>
    </motion.div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ForecastHourlyTimeline({
  city,
  apiHours,
}: {
  city:      City;
  apiHours?: Array<{ hour: number; aqi: number }>;
}) {
  const scrollRef      = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion() ?? false;
  const weather        = generateWeatherData(city);
  const aqiForecast    = forecastSeries(city.aqi, city.aqi, 24);

  // Merge weather hourly + AQI forecast into a combined 24h feed
  const hours = weather.hourly.slice(0, 24).map((h, i) => ({
    ...h,
    aqiPredicted: apiHours?.[i]?.aqi ?? aqiForecast[i]?.predicted ?? city.aqi,
  }));

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Hourly
          </div>
          <h3 className="text-base font-semibold mt-0.5">24-Hour Forecast</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Droplets className="size-2.5" /> Rain</span>
          <span className="flex items-center gap-1"><Wind className="size-2.5" /> Wind km/h</span>
          <span className="flex items-center gap-1"><Gauge className="size-2.5" /> AQI</span>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-track]:bg-transparent"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-border) transparent" }}
      >
        {hours.map((h, i) => (
          <div key={i} className="snap-start">
            <HourCard
              hour={h}
              aqiPredicted={h.aqiPredicted}
              isCurrent={i === 0}
              prefersReduced={prefersReduced}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
