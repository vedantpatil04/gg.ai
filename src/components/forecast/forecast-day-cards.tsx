/**
 * ForecastDayCards — Phase 3
 *
 * Premium 7-day forecast cards replacing the plain line chart.
 * Each day shows: day label, animated weather icon, high/low temp,
 * rain chance, wind, UV index, and AQI trend.
 *
 * Data: generateWeatherData() from weather-data.ts + weekly API fallback.
 */

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { Droplets, Wind, Zap, Gauge } from "lucide-react";
import type { City } from "@/lib/mock-data";
import { aqiBand, forecastSeries } from "@/lib/mock-data";
import {
  generateWeatherData,
  uvLabel,
  uvColor,
  type DailyForecast,
  type WeatherCondition,
} from "@/lib/map/weather-data";
import { cn } from "@/lib/utils";
import { STAGGER, HOVER_LIFT, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Day weather icon ─────────────────────────────────────────────────────────

function DayWeatherIcon({ condition, animated }: { condition: WeatherCondition; animated: boolean }) {
  const isClear   = condition === "clear";
  const isPartly  = condition.includes("partly");
  const isRain    = condition.includes("rain") || condition === "thunderstorm";
  const isCloudy  = condition.includes("cloud") || condition === "overcast";
  const isHaze    = condition === "haze" || condition === "smoke";

  return (
    <div className="relative size-12 flex items-center justify-center">
      {/* Sun */}
      {(isClear || isPartly) && (
        <div
          className="absolute size-8 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.96 0.16 82), oklch(0.88 0.20 68))",
            boxShadow: "0 0 16px oklch(0.88 0.18 72 / 0.55)",
            animation: animated ? "day-sun-pulse 4s ease-in-out infinite" : "none",
          }}
        />
      )}
      {/* Cloud */}
      {(isCloudy || isPartly || isHaze) && (
        <div
          className="absolute bottom-1 right-0 size-9 rounded-full blur-[1px]"
          style={{ background: isHaze ? "oklch(0.72 0.06 55 / 0.70)" : "oklch(0.82 0.02 240 / 0.85)" }}
        />
      )}
      {/* Rain drops */}
      {isRain && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-0.5 h-2 rounded-full bg-blue-400/70"
              style={{
                animation: animated
                  ? `rain-drop ${0.6 + i * 0.2}s ease-in ${i * 0.15}s infinite`
                  : "none",
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes day-sun-pulse {
          0%,100% { transform: scale(1); opacity:1; }
          50%      { transform: scale(1.1); opacity:0.88; }
        }
        @keyframes rain-drop {
          0%   { opacity:0; transform:translateY(-4px); }
          40%  { opacity:1; }
          100% { opacity:0; transform:translateY(6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes day-sun-pulse { from{} to{} }
          @keyframes rain-drop     { from{} to{} }
        }
      `}</style>
    </div>
  );
}

// ─── Single day card ──────────────────────────────────────────────────────────

const CARD_ITEM = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

function DayCard({
  day,
  aqiPredicted,
  isToday,
  prefersReduced,
}: {
  day:           DailyForecast;
  aqiPredicted:  number;
  isToday:       boolean;
  prefersReduced:boolean;
}) {
  const band = aqiBand(aqiPredicted);
  const uv   = day.uvIndex;

  return (
    <motion.div
      variants={CARD_ITEM}
      whileHover={prefersReduced ? undefined : HOVER_LIFT}
      className={cn(
        "glass rounded-2xl p-4 flex flex-col gap-3 cursor-default relative overflow-hidden group",
        isToday && "border-primary/25 bg-primary/5",
      )}
    >
      {/* Subtle ambient glow */}
      <div
        aria-hidden
        className="absolute -top-6 -right-6 size-20 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{ background: band.color }}
      />

      {/* Day label */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "text-[10px] uppercase tracking-[0.18em] font-semibold",
          isToday ? "text-primary" : "text-muted-foreground",
        )}>
          {isToday ? "Today" : day.dayLabel}
        </div>
        {/* AQI dot */}
        <div
          className="size-2 rounded-full"
          style={{ background: band.color, boxShadow: `0 0 6px ${band.color}80` }}
        />
      </div>

      {/* Weather icon */}
      <div className="flex justify-center">
        <DayWeatherIcon condition={day.condition} animated={!prefersReduced} />
      </div>

      {/* Temp high / low */}
      <div className="flex items-baseline justify-center gap-1.5">
        <span className="text-xl font-bold tabular-nums leading-none">{day.tempHigh}°</span>
        <span className="text-sm text-muted-foreground tabular-nums">{day.tempLow}°</span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Stats */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Droplets className="size-2.5" /> Rain
          </span>
          <span className="tabular-nums font-medium">{day.rainChance}%</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="size-2.5" /> UV
          </span>
          <span className="font-medium" style={{ color: uvColor(uv) }}>
            {uvLabel(uv)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Gauge className="size-2.5" /> AQI
          </span>
          <span className="font-semibold" style={{ color: band.color }}>
            {aqiPredicted}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ForecastDayCards({
  city,
  apiWeekly,
}: {
  city:       City;
  apiWeekly?: Array<{ label: string; predicted: number }>;
}) {
  const ref            = useRef<HTMLDivElement>(null);
  const inView         = useInView(ref, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion() ?? false;
  const weather        = generateWeatherData(city);
  const aqiWeekly      = forecastSeries(city.aqi, city.aqi, 7);

  const days = weather.daily.slice(0, 7).map((d, i) => ({
    ...d,
    aqiPredicted: apiWeekly?.[i]?.predicted ?? aqiWeekly[i]?.predicted ?? city.aqi,
  }));

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Outlook</div>
        <h3 className="text-base font-semibold mt-0.5">7-Day Forecast</h3>
      </div>

      <motion.div
        ref={ref}
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3"
        variants={STAGGER(0.06)}
        initial={prefersReduced ? false : "hidden"}
        animate={inView ? "show" : "hidden"}
      >
        {days.map((d, i) => (
          <DayCard
            key={i}
            day={d}
            aqiPredicted={d.aqiPredicted}
            isToday={i === 0}
            prefersReduced={prefersReduced}
          />
        ))}
      </motion.div>
    </div>
  );
}
