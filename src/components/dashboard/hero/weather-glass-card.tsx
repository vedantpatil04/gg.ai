/**
 * WeatherGlassCard — Cinematic Hero Phase 1
 *
 * A floating glassmorphism card showing weather conditions.
 * Layer 6 in the hero stack, positioned alongside the AQI card.
 *
 * Features:
 * - Animated weather icon (SVG, CSS animation)
 * - Temperature, humidity, wind, UV, rain chance, feels-like
 * - Glassmorphism (backdrop-blur, translucent bg, soft border)
 * - Subtle hover lift animation
 * - Reduced motion: static icons, no hover animation
 */

import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Wind, Thermometer, Sun, CloudRain } from "lucide-react";
import { SPRING_SLOW, HOVER_LIFT } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Animated weather icon ───────────────────────────────────────────────────

type WeatherCondition = "sunny" | "cloudy" | "rainy" | "windy" | "foggy" | "clear";

function deriveCondition(
  humidity?: number,
  windSpeed?: number,
  temp?: number,
): WeatherCondition {
  if (humidity == null && windSpeed == null) return "clear";
  const h = humidity ?? 50;
  const w = windSpeed ?? 0;
  if (h > 80) return "rainy";
  if (h > 60) return "cloudy";
  if (w > 30) return "windy";
  if (h < 30) return "sunny";
  return "clear";
}

function WeatherIcon({
  condition,
  prefersReduced,
}: {
  condition: WeatherCondition;
  prefersReduced: boolean;
}) {
  if (condition === "sunny" || condition === "clear") {
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
            opacity="0.7"
          />
        ))}
        <style>{`
          @keyframes sun-spin { to { transform: rotate(360deg); transform-origin: 20px 20px; } }
        `}</style>
      </svg>
    );
  }

  if (condition === "rainy") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        {/* Cloud */}
        <ellipse cx="20" cy="16" rx="13" ry="9" fill="#94a3b8" />
        <ellipse cx="13" cy="19" rx="8"  ry="6" fill="#94a3b8" />
        <ellipse cx="27" cy="19" rx="8"  ry="6" fill="#94a3b8" />
        {/* Rain drops */}
        {[12, 18, 24, 28].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1="28"
            x2={x - 2}
            y2="36"
            stroke="#7dd3fc"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              animation: prefersReduced
                ? "none"
                : `rain-drop ${0.8 + i * 0.15}s ease-in ${i * 0.18}s infinite`,
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

  if (condition === "windy") {
    return (
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
        {[14, 20, 26].map((y, i) => (
          <path
            key={i}
            d={`M4 ${y} Q14 ${y - 5} 22 ${y} Q30 ${y + 5} 36 ${y}`}
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            style={{
              animation: prefersReduced
                ? "none"
                : `wind-wave ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite alternate`,
            }}
          />
        ))}
        <style>{`
          @keyframes wind-wave {
            from { transform: translateX(0); opacity: 0.6; }
            to   { transform: translateX(4px); opacity: 1; }
          }
        `}</style>
      </svg>
    );
  }

  // Default: partly cloudy
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden className="shrink-0">
      <circle cx="16" cy="18" r="8" fill="#fbbf24" opacity="0.85" />
      <ellipse cx="24" cy="24" rx="12" ry="8" fill="#94a3b8" />
      <ellipse cx="18" cy="26" rx="8"  ry="6" fill="#94a3b8" />
    </svg>
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
  feelsLike?: number;
  uvIndex?: number;
  rainChance?: number;
  className?: string;
}

export function WeatherGlassCard({
  temp,
  humidity,
  windSpeed,
  feelsLike,
  uvIndex,
  rainChance,
  className = "",
}: WeatherGlassCardProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const condition = deriveCondition(humidity, windSpeed, temp);

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
          <WeatherIcon condition={condition} prefersReduced={prefersReduced} />
          <div>
            {temp != null ? (
              <div className="text-2xl font-bold text-foreground dark:text-white leading-none">
                {temp}
                <span className="text-base font-normal text-muted-foreground dark:text-white/55">°C</span>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground dark:text-white/60">Temperature</div>
            )}
            <div className="text-[11px] text-muted-foreground dark:text-white/45 mt-0.5 capitalize">{condition}</div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 dark:border-white/10 mb-1" />

        {/* Stats */}
        <div>
          <StatRow icon={Droplets}  label="Humidity"     value={humidity}    unit="%" />
          <StatRow icon={Wind}      label="Wind"         value={windSpeed}   unit="km/h" />
          <StatRow icon={Thermometer} label="Feels like" value={feelsLike}   unit="°C" />
          <StatRow icon={Sun}       label="UV Index"     value={uvIndex}              />
          <StatRow icon={CloudRain} label="Rain chance"  value={rainChance}  unit="%" />
        </div>
      </div>
    </motion.div>
  );
}
