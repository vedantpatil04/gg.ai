/**
 * WeatherIntelligencePanel.tsx — Phase 5: Advanced Weather Intelligence Platform
 *
 * Premium weather experience: animated hero card with context-aware theme,
 * scrollable hourly timeline, 5-day forecast, weather insights, and all
 * the microinteractions from the Phase 5 spec.
 *
 * Renders inside the existing Intelligence Panel drawer (map.tsx),
 * as a new "Weather" tab — no structural changes to the drawer itself.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind,
  Droplets,
  Eye,
  Gauge,
  Thermometer,
  Sun,
  CloudRain,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";
import {
  generateWeatherData,
  conditionIconPath,
  uvLabel,
  uvColor,
  type WeatherData,
  type WeatherCondition,
  type HourlyForecast,
  type DailyForecast,
  type WeatherTheme,
} from "@/lib/map/weather-data";

// ─── Animated weather icon ────────────────────────────────────────────────────
function WeatherIcon({
  condition,
  theme,
  size = 64,
  className,
}: {
  condition: WeatherCondition;
  theme: WeatherTheme;
  size?: number;
  className?: string;
}) {
  const isRain = condition.includes("rain");
  const isStorm = condition === "thunderstorm";
  const isSun = condition === "clear";
  const isWind = condition === "windy";

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {/* Glow halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: theme.glow }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: isSun ? 2.5 : isStorm ? 1.2 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
      >
        {/* Sun rays — only for clear */}
        {isSun && (
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ originX: "12px", originY: "12px" }}
          >
            <line x1="12" y1="1" x2="12" y2="3" stroke={theme.accent} strokeWidth="2" />
            <line x1="12" y1="21" x2="12" y2="23" stroke={theme.accent} strokeWidth="2" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={theme.accent} strokeWidth="2" />
            <line
              x1="18.36"
              y1="18.36"
              x2="19.78"
              y2="19.78"
              stroke={theme.accent}
              strokeWidth="2"
            />
            <line x1="1" y1="12" x2="3" y2="12" stroke={theme.accent} strokeWidth="2" />
            <line x1="21" y1="12" x2="23" y2="12" stroke={theme.accent} strokeWidth="2" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={theme.accent} strokeWidth="2" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={theme.accent} strokeWidth="2" />
          </motion.g>
        )}

        {/* Sun/moon body or cloud body */}
        <motion.path
          d={conditionIconPath(condition)}
          stroke={theme.accent}
          strokeWidth="1.8"
          fill={isSun ? `${theme.accent}33` : "none"}
          animate={isSun ? { opacity: [0.9, 1, 0.9] } : {}}
          transition={isSun ? { duration: 2, repeat: Infinity } : {}}
        />

        {/* Rain drops */}
        {isRain &&
          [0, 1, 2, 3].map((i) => (
            <motion.line
              key={i}
              x1={6 + i * 3}
              y1={18 + (i % 2) * 1}
              x2={5 + i * 3}
              y2={21 + (i % 2) * 1}
              stroke={theme.secondary}
              strokeWidth="1.5"
              animate={{ y: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeIn",
              }}
            />
          ))}

        {/* Lightning bolt for storm */}
        {isStorm && (
          <motion.path
            d="M13 2L5 14h7l-1 8 8-12h-7l1-8z"
            stroke={theme.accent}
            strokeWidth="1.5"
            fill={`${theme.accent}44`}
            animate={{ opacity: [1, 0.2, 1], scale: [1, 1.05, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "9px", originY: "11px" }}
          />
        )}

        {/* Wind lines */}
        {isWind &&
          [0, 1, 2].map((i) => (
            <motion.line
              key={i}
              x1={2}
              y1={8 + i * 4}
              x2={14 - i * 2}
              y2={8 + i * 4}
              stroke={theme.accent}
              strokeWidth="1.6"
              animate={{ x1: [-2, 2, -2], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
      </svg>
    </div>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────
function WeatherHero({ wd, cityName }: { wd: WeatherData; cityName: string }) {
  const { theme } = wd;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: theme.heroBg }}
    >
      {/* Atmospheric shimmer layer */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 20% 30%, ${theme.accent}, transparent)`,
        }}
      />

      {/* Rain streaks overlay (only when raining) */}
      {(wd.condition.includes("rain") || wd.condition === "thunderstorm") && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-px rounded-full"
              style={{
                left: `${10 + i * 12}%`,
                top: "-20%",
                height: "60%",
                background: `linear-gradient(to bottom, transparent, ${theme.accent})`,
              }}
              animate={{ y: ["0%", "120%"], opacity: [0, 0.8, 0] }}
              transition={{
                duration: 1.0 + i * 0.1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-start justify-between gap-2 z-10">
        {/* Left: temperature + condition */}
        <div>
          <div
            className="text-[9px] uppercase tracking-[0.2em] mb-1 font-medium"
            style={{ color: `${theme.heroText}99` }}
          >
            {cityName} — Live Weather
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span
              className="text-5xl font-bold tabular-nums leading-none"
              style={{ color: theme.heroText }}
              key={wd.temp}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {wd.temp}
            </motion.span>
            <span className="text-xl font-light" style={{ color: `${theme.heroText}cc` }}>
              °C
            </span>
          </div>
          <div className="text-[11px] font-medium mt-0.5" style={{ color: `${theme.heroText}cc` }}>
            {wd.conditionLabel}
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: `${theme.heroText}88` }}>
            Feels like {wd.feelsLike}°C
          </div>
        </div>

        {/* Right: animated icon */}
        <WeatherIcon condition={wd.condition} theme={theme} size={72} />
      </div>

      {/* Bottom row: quick stats */}
      <div
        className="relative z-10 flex items-center gap-3 mt-3 pt-3"
        style={{ borderTop: `1px solid ${theme.heroText}22` }}
      >
        {[
          { icon: Droplets, label: `${wd.humidity}%`, sub: "Humidity" },
          { icon: Wind, label: `${wd.windSpeed} km/h`, sub: wd.windDirectionLabel },
          { icon: Eye, label: `${wd.visibility} km`, sub: "Visibility" },
          { icon: Sun, label: uvLabel(wd.uvIndex), sub: `UV ${wd.uvIndex}` },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={sub} className="flex-1 flex flex-col items-center gap-0.5">
            <Icon className="size-3" style={{ color: `${theme.heroText}88` }} />
            <span
              className="text-[10px] font-semibold leading-none"
              style={{ color: theme.heroText }}
            >
              {label}
            </span>
            <span className="text-[8px] leading-none" style={{ color: `${theme.heroText}77` }}>
              {sub}
            </span>
          </div>
        ))}
      </div>

      {/* Risk badge */}
      <AnimatePresence>
        {wd.riskLevel !== "low" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5"
            style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}44` }}
          >
            <AlertTriangle className="size-3 shrink-0" style={{ color: theme.accent }} />
            <span className="text-[9px] font-medium" style={{ color: theme.accent }}>
              {wd.riskLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Hourly timeline ──────────────────────────────────────────────────────────
function HourlyTimeline({ hourly, theme }: { hourly: HourlyForecast[]; theme: WeatherTheme }) {
  const [activeIdx, setActiveIdx] = useState(0);
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
        <Wind className="size-3" /> Hourly Forecast
      </div>
      {/* Scrollable timeline */}
      <div
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {hourly.map((h, i) => {
          const isActive = i === activeIdx;
          return (
            <motion.button
              key={h.label}
              onClick={() => setActiveIdx(i)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="snap-start shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              style={{
                background: isActive
                  ? `color-mix(in oklab, ${theme.accent} 20%, transparent)`
                  : "color-mix(in oklab, var(--color-foreground) 4%, transparent)",
                border: `1px solid ${isActive ? `color-mix(in oklab, ${theme.accent} 40%, transparent)` : "color-mix(in oklab, var(--color-foreground) 7%, transparent)"}`,
                minWidth: 60,
              }}
            >
              <span
                className="text-[8.5px] font-medium"
                style={{ color: isActive ? theme.accent : "var(--color-muted-foreground)" }}
              >
                {h.label}
              </span>
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d={conditionIconPath(h.condition)}
                  stroke={isActive ? theme.accent : "var(--color-muted-foreground)"}
                  strokeWidth="1.8"
                />
              </svg>
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: isActive ? theme.accent : "var(--color-foreground)" }}
              >
                {h.temp}°
              </span>
              {h.rainChance > 20 && (
                <span className="text-[7.5px] font-medium" style={{ color: "var(--color-info)" }}>
                  {h.rainChance}%
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Detail row for active hour */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="mt-2 rounded-xl px-3 py-2 flex items-center gap-4"
          style={{ background: "color-mix(in oklab, var(--color-foreground) 4%, transparent)", border: "1px solid color-mix(in oklab, var(--color-foreground) 7%, transparent)" }}
        >
          <div className="flex items-center gap-1.5">
            <Wind className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-foreground">{hourly[activeIdx].windSpeed} km/h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CloudRain className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-foreground">
              {hourly[activeIdx].rainChance}% rain
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-foreground">
              {hourly[activeIdx].cloudCover}% cloud
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── 5-day forecast ───────────────────────────────────────────────────────────
function DailyForecastRow({ daily, theme }: { daily: DailyForecast[]; theme: WeatherTheme }) {
  const tempMin = Math.min(...daily.map((d) => d.tempLow));
  const tempMax = Math.max(...daily.map((d) => d.tempHigh));
  const range = Math.max(tempMax - tempMin, 1);

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
        <Thermometer className="size-3" /> 5-Day Forecast
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid color-mix(in oklab, var(--color-foreground) 8%, transparent)" }}
      >
        {daily.map((d, i) => (
          <motion.div
            key={d.dayLabel}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="flex items-center gap-2 px-3 py-2"
            style={{
              borderBottom: i < daily.length - 1 ? "1px solid color-mix(in oklab, var(--color-foreground) 6%, transparent)" : undefined,
              background:
                i === 0 ? `color-mix(in oklab, ${theme.accent} 6%, transparent)` : undefined,
            }}
          >
            {/* Day */}
            <span
              className={cn(
                "w-10 text-[10px] font-medium",
                i === 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {d.dayLabel}
            </span>
            {/* Icon */}
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path
                d={conditionIconPath(d.condition)}
                stroke={i === 0 ? theme.accent : "var(--color-muted-foreground)"}
                strokeWidth="1.8"
              />
            </svg>
            {/* Rain chance */}
            <span
              className="text-[8.5px] w-8 text-right"
              style={{
                color: d.rainChance > 40 ? "var(--color-info)" : "var(--color-muted-foreground)",
              }}
            >
              {d.rainChance > 10 ? `${d.rainChance}%` : ""}
            </span>
            {/* Temperature range bar */}
            <div
              className="flex-1 relative h-1.5 rounded-full mx-1"
              style={{ background: "color-mix(in oklab, var(--color-foreground) 8%, transparent)" }}
            >
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: `${((d.tempLow - tempMin) / range) * 100}%`,
                  right: `${100 - ((d.tempHigh - tempMin) / range) * 100}%`,
                  background:
                    i === 0
                      ? `linear-gradient(to right, ${theme.secondary}, ${theme.accent})`
                      : "color-mix(in oklab, var(--color-foreground) 25%, transparent)",
                }}
              />
            </div>
            {/* Temp range */}
            <span className="text-[9px] text-muted-foreground w-6 text-right">{d.tempLow}°</span>
            <span className="text-[9px] font-semibold w-6 text-right">{d.tempHigh}°</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail metrics grid ──────────────────────────────────────────────────────
function WeatherMetrics({ wd }: { wd: WeatherData }) {
  const metrics = [
    {
      label: "Feels Like",
      value: `${wd.feelsLike}°C`,
      icon: Thermometer,
      color: "var(--color-warning)",
    },
    { label: "Pressure", value: `${wd.pressure} hPa`, icon: Gauge, color: "var(--color-info)" },
    { label: "Dew Point", value: `${wd.dewPoint}°C`, icon: Droplets, color: "var(--color-info)" },
    {
      label: "UV Index",
      value: `${wd.uvIndex} — ${uvLabel(wd.uvIndex)}`,
      icon: Sun,
      color: uvColor(wd.uvIndex),
    },
    {
      label: "Cloud Cover",
      value: `${wd.cloudCover}%`,
      icon: CloudRain,
      color: "oklch(0.65 0.06 240)",
    },
    {
      label: "Wind",
      value: `${wd.windSpeed} km/h ${wd.windDirectionLabel}`,
      icon: Wind,
      color: "var(--color-primary)",
    },
    {
      label: "Rain Chance",
      value: `${wd.rainChance}%`,
      icon: CloudRain,
      color: "var(--color-info)",
    },
    { label: "Visibility", value: `${wd.visibility} km`, icon: Eye, color: "var(--color-success)" },
  ];

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
        <Gauge className="size-3" /> Atmospheric Detail
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="rounded-xl px-3 py-2 flex flex-col gap-0.5"
            style={{ background: "color-mix(in oklab, var(--color-foreground) 4%, transparent)", border: "1px solid color-mix(in oklab, var(--color-foreground) 7%, transparent)" }}
          >
            <div className="flex items-center gap-1.5">
              <m.icon className="size-2.5 shrink-0" style={{ color: m.color }} />
              <span className="text-[8.5px] text-muted-foreground/70 uppercase tracking-wide truncate">
                {m.label}
              </span>
            </div>
            <span className="text-[10.5px] font-semibold leading-tight" style={{ color: m.color }}>
              {m.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Sunrise/sunset bar ───────────────────────────────────────────────────────
function SunBar({
  sunrise,
  sunset,
  theme,
}: {
  sunrise: string;
  sunset: string;
  theme: WeatherTheme;
}) {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map((v) => Math.round(Number(v) || 0));
    return (h || 0) * 60 + (m || 0);
  };
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const srMin = toMin(sunrise);
  const ssMin = toMin(sunset);
  const daySpan = ssMin - srMin;
  const elapsed = Math.max(0, Math.min(daySpan, now - srMin));
  const pct = daySpan > 0 ? (elapsed / daySpan) * 100 : 0;
  const isDaytime = now >= srMin && now <= ssMin;

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "color-mix(in oklab, var(--color-foreground) 4%, transparent)", border: "1px solid color-mix(in oklab, var(--color-foreground) 7%, transparent)" }}
    >
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
        Daylight
      </div>
      <div
        className="relative h-1.5 rounded-full mb-2"
        style={{ background: "color-mix(in oklab, var(--color-foreground) 10%, transparent)" }}
      >
        <div
          className="absolute h-full rounded-full"
          style={{
            width: "100%",
            background: `linear-gradient(to right, ${theme.secondary}44, ${theme.accent})`,
          }}
        />
        {isDaytime && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full border-2"
            style={{
              left: `${pct}%`,
              background: theme.accent,
              borderColor: "oklch(0.12 0.015 240)",
              boxShadow: `0 0 6px ${theme.glow}`,
              marginLeft: -6,
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ArrowUp className="size-2.5" style={{ color: theme.accent }} /> {sunrise}
        </span>
        <span className="flex items-center gap-1">
          {sunset} <ArrowRight className="size-2.5 rotate-45" style={{ color: theme.secondary }} />
        </span>
      </div>
    </div>
  );
}

// ─── Weather highlights / insights ───────────────────────────────────────────
function WeatherInsights({ wd }: { wd: WeatherData }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
        <Zap className="size-3" /> Weather Intelligence
      </div>
      <div className="space-y-1.5">
        {wd.highlights.map((h, i) => {
          const colorMap = {
            info: "var(--color-info)",
            warning: "var(--color-warning)",
            alert: "var(--color-destructive)",
          };
          const bgMap = {
            info: "oklch(0.55 0.14 240 / 0.12)",
            warning: "oklch(0.75 0.15 70 / 0.12)",
            alert: "oklch(0.55 0.20 25 / 0.14)",
          };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-2 rounded-xl px-2.5 py-2"
              style={{
                background: bgMap[h.severity],
                border: `1px solid ${colorMap[h.severity]}33`,
              }}
            >
              <AlertTriangle
                className="size-3 shrink-0 mt-0.5"
                style={{ color: colorMap[h.severity] }}
              />
              <div className="min-w-0">
                <span
                  className="text-[9px] font-semibold block"
                  style={{ color: colorMap[h.severity] }}
                >
                  {h.label}
                </span>
                <span className="text-[9px] text-muted-foreground/80 leading-snug">{h.value}</span>
              </div>
            </motion.div>
          );
        })}

        {/* AI-ready placeholder (Phase 5 spec: "AI-ready insight placeholders") */}
        <div
          className="flex items-center gap-2 rounded-xl px-2.5 py-2"
          style={{ background: "color-mix(in oklab, var(--color-foreground) 3%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-foreground) 12%, transparent)" }}
        >
          <Zap className="size-3 text-muted-foreground/40 shrink-0" />
          <span className="text-[9px] text-muted-foreground/40 italic">
            AI weather insights — coming in a future phase
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Wind compass ─────────────────────────────────────────────────────────────
function WindCompass({
  direction,
  speed,
  theme,
}: {
  direction: number;
  speed: number;
  theme: WeatherTheme;
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={{ background: "color-mix(in oklab, var(--color-foreground) 4%, transparent)", border: "1px solid color-mix(in oklab, var(--color-foreground) 7%, transparent)" }}
    >
      {/* SVG compass */}
      <div className="relative size-14 shrink-0">
        <svg viewBox="0 0 48 48" width={56} height={56}>
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="color-mix(in oklab, var(--color-foreground) 12%, transparent)"
            strokeWidth="1.5"
            fill="none"
          />
          {["N", "E", "S", "W"].map((dir, i) => {
            const angle = i * 90 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 24 + 17 * Math.cos(rad);
            const y = 24 + 17 * Math.sin(rad);
            return (
              <text
                key={dir}
                x={x}
                y={y + 1.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="5"
                fill="color-mix(in oklab, var(--color-foreground) 35%, transparent)"
                fontWeight="600"
              >
                {dir}
              </text>
            );
          })}
          {/* Arrow */}
          <motion.g
            animate={{ rotate: direction }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            style={{ originX: "24px", originY: "24px" }}
          >
            <polygon points="24,8 22,22 24,20 26,22" fill={theme.accent} />
            <polygon points="24,40 22,26 24,28 26,26" fill="color-mix(in oklab, var(--color-foreground) 25%, transparent)" />
          </motion.g>
          <circle cx="24" cy="24" r="2" fill={theme.accent} />
        </svg>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
          Wind
        </div>
        <div className="text-[18px] font-bold tabular-nums" style={{ color: theme.accent }}>
          {speed}
          <span className="text-[10px] font-normal text-muted-foreground ml-1">km/h</span>
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          {direction}° —{" "}
          {
            [
              "N",
              "NNE",
              "NE",
              "ENE",
              "E",
              "ESE",
              "SE",
              "SSE",
              "S",
              "SSW",
              "SW",
              "WSW",
              "W",
              "WNW",
              "NW",
              "NNW",
            ][Math.round(direction / 22.5) % 16]
          }
        </div>
      </div>
    </div>
  );
}

// ─── Temperature curve (mini sparkline) ──────────────────────────────────────
function TempCurve({ hourly, theme }: { hourly: HourlyForecast[]; theme: WeatherTheme }) {
  const temps = hourly.map((h) => h.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = Math.max(max - min, 1);
  const w = 240;
  const h = 44;
  const pts = temps.map((t, i) => {
    const x = (i / (temps.length - 1)) * w;
    const y = h - ((t - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const path = `M${pts.join("L")}`;
  const areaPath = `M0,${h} ${path} L${w},${h} Z`;

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
        <Thermometer className="size-3" /> Temperature Trend (12h)
      </div>
      <div
        className="rounded-xl px-3 py-2.5"
        style={{ background: "color-mix(in oklab, var(--color-foreground) 4%, transparent)", border: "1px solid color-mix(in oklab, var(--color-foreground) 7%, transparent)" }}
      >
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="overflow-visible">
          <defs>
            <linearGradient id="temp-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#temp-fill)" />
          <path
            d={path}
            fill="none"
            stroke={theme.accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Now marker */}
          <circle cx={pts[0].split(",")[0]} cy={pts[0].split(",")[1]} r="3" fill={theme.accent} />
        </svg>
        <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
          <span>Now</span>
          <span>+12h</span>
        </div>
        <div className="flex justify-between text-[8px] mt-0.5">
          <span className="text-muted-foreground">Low {min}°</span>
          <span className="font-medium">High {max}°</span>
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function WeatherIntelligencePanel({ city }: { city: City }) {
  const wd: WeatherData = useMemo(
    () => generateWeatherData(city),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city.id, city.temp, city.humidity],
  );

  return (
    <div
      className="flex flex-col gap-4 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* 1. Hero */}
      <WeatherHero wd={wd} cityName={city.name} />

      {/* 2. Sunrise/sunset bar */}
      <SunBar sunrise={wd.sunrise} sunset={wd.sunset} theme={wd.theme} />

      {/* 3. Wind compass */}
      <WindCompass direction={wd.windDirection} speed={wd.windSpeed} theme={wd.theme} />

      {/* 4. Hourly timeline */}
      <HourlyTimeline hourly={wd.hourly} theme={wd.theme} />

      {/* 5. Temperature curve */}
      <TempCurve hourly={wd.hourly} theme={wd.theme} />

      {/* 6. 5-day forecast */}
      <DailyForecastRow daily={wd.daily} theme={wd.theme} />

      {/* 7. Atmospheric detail grid */}
      <WeatherMetrics wd={wd} />

      {/* 8. Intelligence & highlights */}
      <WeatherInsights wd={wd} />

      {/* Radar-ready placeholder (Section 3/Phase 5 architecture note) */}
      <div
        className="rounded-xl px-3 py-2 flex items-center gap-2"
        style={{ background: "color-mix(in oklab, var(--color-foreground) 3%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-foreground) 10%, transparent)" }}
      >
        <ChevronRight className="size-3 text-muted-foreground/30" />
        <span className="text-[8.5px] text-muted-foreground/35 italic">
          Weather radar overlay — registered in GIS framework, coming next phase
        </span>
      </div>
    </div>
  );
}
