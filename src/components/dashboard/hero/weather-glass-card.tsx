/**
 * WeatherGlassCard — Cinematic Hero Phase 1
 *
 * A floating glassmorphism card showing real weather conditions.
 * Layer 6 in the hero stack, positioned alongside the AQI card.
 *
 * Features:
 * - Data-driven weather condition & day/night aware icon from WMO weather codes
 * - Authoritative temperature, humidity, wind, feels-like, UV, precipitation
 * - Glassmorphism (backdrop-blur, translucent bg, soft border)
 * - Subtle hover lift animation & reduced motion safety
 * - Honest unavailable state when metrics are missing
 */

import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Wind, Thermometer, Sun, CloudRain } from "lucide-react";
import { SPRING_SLOW, HOVER_LIFT } from "@/lib/motion";
import {
  getWeatherConditionMeta,
  type WeatherConditionMeta,
} from "@/lib/weather-codes";
import { cn } from "@/lib/utils";

// ─── Animated Day / Night Weather Icon ───────────────────────────────────────

function WeatherIcon({
  meta,
  prefersReduced,
}: {
  meta: WeatherConditionMeta;
  prefersReduced: boolean;
}) {
  const { normalized, isDay, Icon } = meta;

  if (normalized === "CLEAR") {
    if (!isDay) {
      // Clear Night: Moon with soft glowing silver-blue aura
      return (
        <svg
          viewBox="0 0 40 40"
          width="40"
          height="40"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M26 12A10 10 0 1 1 15 28a12 12 0 0 0 11-16z"
            fill="#93c5fd"
            style={{
              filter: "drop-shadow(0 0 8px rgba(147,197,253,0.5))",
            }}
          />
          {/* Twinkling star */}
          <circle
            cx="28"
            cy="14"
            r="1.5"
            fill="#e0f2fe"
            style={{
              animation: prefersReduced ? "none" : "twinkle 3s ease-in-out infinite",
            }}
          />
          <circle
            cx="12"
            cy="14"
            r="1"
            fill="#e0f2fe"
            style={{
              animation: prefersReduced ? "none" : "twinkle 2.5s ease-in-out 1s infinite",
            }}
          />
          <style>{`
            @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
          `}</style>
        </svg>
      );
    }

    // Clear Day: Golden sun with rotating rays
    return (
      <svg
        viewBox="0 0 40 40"
        width="40"
        height="40"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <circle
          cx="20"
          cy="20"
          r="8"
          fill="#fbbf24"
          style={{
            filter: "drop-shadow(0 0 8px #fbbf2480)",
            animation: prefersReduced ? "none" : "sun-spin 20s linear infinite",
          }}
        />
        {/* Rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <line
            key={i}
            x1="20"
            y1="20"
            x2={20 + 14 * Math.cos((deg * Math.PI) / 180)}
            y2={20 + 14 * Math.sin((deg * Math.PI) / 180)}
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        ))}
        <style>{`
          @keyframes sun-spin { to { transform: rotate(360deg); transform-origin: 20px 20px; } }
        `}</style>
      </svg>
    );
  }

  if (normalized === "PARTLY_CLOUDY") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        {/* Sun or Moon behind */}
        {isDay ? (
          <circle cx="16" cy="17" r="7" fill="#fbbf24" style={{ filter: "drop-shadow(0 0 6px #fbbf2460)" }} />
        ) : (
          <path d="M20 12A7 7 0 1 1 12 23a9 9 0 0 0 8-11z" fill="#93c5fd" />
        )}
        {/* Cloud in front */}
        <ellipse cx="23" cy="24" rx="11" ry="7" fill="#94a3b8" />
        <ellipse cx="17" cy="26" rx="7"  ry="5" fill="#94a3b8" />
        <ellipse cx="29" cy="26" rx="6"  ry="5" fill="#94a3b8" />
      </svg>
    );
  }

  if (normalized === "OVERCAST" || normalized === "CLOUDY") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        {/* Back cloud */}
        <ellipse cx="16" cy="18" rx="10" ry="7" fill="#64748b" opacity="0.6" />
        <ellipse cx="24" cy="17" rx="8"  ry="6" fill="#64748b" opacity="0.6" />
        {/* Front cloud */}
        <ellipse cx="21" cy="24" rx="12" ry="8" fill="#94a3b8" />
        <ellipse cx="14" cy="26" rx="8"  ry="6" fill="#94a3b8" />
        <ellipse cx="28" cy="26" rx="7"  ry="5" fill="#94a3b8" />
      </svg>
    );
  }

  if (normalized === "FOG" || normalized === "MIST") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        <ellipse cx="20" cy="17" rx="11" ry="7" fill="#94a3b8" opacity="0.8" />
        <line x1="8"  y1="27" x2="32" y2="27" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="31" x2="28" y2="31" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="35" x2="30" y2="35" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (normalized === "DRIZZLE") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        <ellipse cx="20" cy="17" rx="12" ry="8" fill="#94a3b8" />
        <ellipse cx="14" cy="20" rx="7"  ry="5" fill="#94a3b8" />
        <ellipse cx="26" cy="20" rx="7"  ry="5" fill="#94a3b8" />
        {[13, 20, 27].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="28"
            x2={x - 1.5}
            y2="33"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              animation: prefersReduced
                ? "none"
                : `rain-drop ${1.0 + i * 0.1}s ease-in ${i * 0.2}s infinite`,
              opacity: 0,
            }}
          />
        ))}
        <style>{`
          @keyframes rain-drop {
            0%   { opacity: 0; transform: translateY(-3px); }
            40%  { opacity: 1; }
            100% { opacity: 0; transform: translateY(4px); }
          }
        `}</style>
      </svg>
    );
  }

  if (normalized === "RAIN" || normalized === "HEAVY_RAIN") {
    const isHeavy = normalized === "HEAVY_RAIN";
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        {/* Cloud */}
        <ellipse cx="20" cy="16" rx="13" ry="9" fill={isHeavy ? "#64748b" : "#94a3b8"} />
        <ellipse cx="13" cy="19" rx="8"  ry="6" fill={isHeavy ? "#64748b" : "#94a3b8"} />
        <ellipse cx="27" cy="19" rx="8"  ry="6" fill={isHeavy ? "#64748b" : "#94a3b8"} />
        {/* Rain drops */}
        {[12, 17, 23, 28].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="28"
            x2={x - 2}
            y2="36"
            stroke={isHeavy ? "#3b82f6" : "#60a5fa"}
            strokeWidth={isHeavy ? "2.5" : "2"}
            strokeLinecap="round"
            style={{
              animation: prefersReduced
                ? "none"
                : `rain-drop ${0.7 + i * 0.12}s ease-in ${i * 0.15}s infinite`,
              opacity: 0,
            }}
          />
        ))}
        <style>{`
          @keyframes rain-drop {
            0%   { opacity: 0; transform: translateY(-4px); }
            30%  { opacity: 1; }
            100% { opacity: 0; transform: translateY(4px); }
          }
        `}</style>
      </svg>
    );
  }

  if (normalized === "THUNDERSTORM") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        <ellipse cx="20" cy="15" rx="13" ry="8" fill="#475569" />
        <ellipse cx="13" cy="18" rx="8"  ry="6" fill="#475569" />
        <ellipse cx="27" cy="18" rx="8"  ry="6" fill="#475569" />
        {/* Lightning bolt */}
        <polygon
          points="21,22 15,31 19,31 17,39 26,28 21,28"
          fill="#fbbf24"
          style={{
            filter: "drop-shadow(0 0 6px rgba(251,191,36,0.8))",
            animation: prefersReduced ? "none" : "flash 2.5s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes flash {
            0%, 90%, 100% { opacity: 0.9; }
            93% { opacity: 0.3; }
            96% { opacity: 1; }
          }
        `}</style>
      </svg>
    );
  }

  if (normalized === "SNOW" || normalized === "HEAVY_SNOW" || normalized === "FREEZING_RAIN") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        <ellipse cx="20" cy="16" rx="12" ry="8" fill="#94a3b8" />
        <ellipse cx="14" cy="19" rx="7"  ry="5" fill="#94a3b8" />
        <ellipse cx="26" cy="19" rx="7"  ry="5" fill="#94a3b8" />
        {/* Snowflakes */}
        {[12, 19, 26].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy="31"
            r="1.8"
            fill="#e0f2fe"
            style={{
              animation: prefersReduced
                ? "none"
                : `snow-drift ${1.8 + i * 0.3}s ease-in-out ${i * 0.3}s infinite alternate`,
            }}
          />
        ))}
        <style>{`
          @keyframes snow-drift {
            0%   { transform: translateY(-2px); opacity: 0.4; }
            100% { transform: translateY(3px); opacity: 1; }
          }
        `}</style>
      </svg>
    );
  }

  // Fallback icon
  return (
    <div className="size-10 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground shrink-0">
      <Icon className="size-6" />
    </div>
  );
}

// ─── Stat row item ────────────────────────────────────────────────────────────

function StatRow({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  unit?: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/50">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-[11px]">{label}</span>
      </div>
      <span className="text-[12px] font-semibold text-foreground dark:text-white/80 tabular-nums">
        {value}
        {unit && <span className="text-[10px] font-normal text-muted-foreground dark:text-white/45 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface WeatherGlassCardProps {
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number | null;
  isDay?: boolean | null;
  feelsLike?: number;
  uvIndex?: number;
  rainChance?: number;
  rainfall?: number;
  lastUpdated?: string;
  updatedAt?: string;
  className?: string;
}

export function WeatherGlassCard({
  temp,
  humidity,
  windSpeed,
  weatherCode,
  isDay,
  feelsLike,
  uvIndex,
  rainChance,
  rainfall,
  className = "",
}: WeatherGlassCardProps) {
  const prefersReduced = useReducedMotion() ?? false;

  // Determine isDay state (defaulting to current local time if undefined)
  const currentIsDay =
    isDay !== undefined && isDay !== null
      ? isDay
      : new Date().getHours() >= 6 && new Date().getHours() < 19;

  // Resolve condition and icon deterministically from real weatherCode
  const conditionMeta = getWeatherConditionMeta(weatherCode, currentIsDay);

  const hasValidTemp = temp !== undefined && temp !== null && Number.isFinite(temp);
  const hasValidHumidity = humidity !== undefined && humidity !== null && Number.isFinite(humidity);
  const hasValidWind = windSpeed !== undefined && windSpeed !== null && Number.isFinite(windSpeed);
  const hasValidFeelsLike = feelsLike !== undefined && feelsLike !== null && Number.isFinite(feelsLike);
  const hasValidUv = uvIndex !== undefined && uvIndex !== null && Number.isFinite(uvIndex);
  const hasValidRainChance = rainChance !== undefined && rainChance !== null && Number.isFinite(rainChance);
  const hasValidRainfall = rainfall !== undefined && rainfall !== null && Number.isFinite(rainfall) && rainfall > 0;

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl overflow-hidden cursor-default transition-colors",
        "bg-card/90 dark:bg-black/40 backdrop-blur-xl",
        "border border-border/80 dark:border-white/12",
        "shadow-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.30)]",
        className,
      )}
      whileHover={prefersReduced ? {} : HOVER_LIFT}
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { ...SPRING_SLOW, delay: 0.65 }}
    >
      {/* Subtle highlight edge */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
        }}
      />
      {/* Reflection sheen (upper-left) */}
      <div
        aria-hidden
        className="absolute top-0 left-0 w-1/2 h-1/3 pointer-events-none opacity-40 dark:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.06), transparent)",
        }}
      />

      <div className="relative p-4">
        {/* Header: icon + temperature */}
        <div className="flex items-center gap-3 mb-3">
          <WeatherIcon meta={conditionMeta} prefersReduced={prefersReduced} />
          <div>
            {hasValidTemp ? (
              <div className="text-2xl font-bold text-foreground dark:text-white leading-none">
                {temp}
                <span className="text-base font-normal text-muted-foreground dark:text-white/55">°C</span>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground dark:text-white/60">
                Temperature unavailable
              </div>
            )}
            <div
              className="text-[11px] text-muted-foreground dark:text-white/60 mt-0.5"
              style={conditionMeta.normalized !== "UNKNOWN" ? { color: conditionMeta.color } : undefined}
            >
              {conditionMeta.label}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 dark:border-white/10 mb-1" />

        {/* Stats */}
        <div>
          {hasValidHumidity && <StatRow icon={Droplets} label="Humidity" value={humidity} unit="%" />}
          {hasValidWind && <StatRow icon={Wind} label="Wind" value={windSpeed} unit="km/h" />}
          {hasValidFeelsLike && <StatRow icon={Thermometer} label="Feels like" value={feelsLike} unit="°C" />}
          {hasValidUv && <StatRow icon={Sun} label="UV Index" value={uvIndex} />}
          {hasValidRainChance ? (
            <StatRow icon={CloudRain} label="Rain chance" value={rainChance} unit="%" />
          ) : hasValidRainfall ? (
            <StatRow icon={CloudRain} label="Precipitation" value={rainfall} unit="mm" />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
