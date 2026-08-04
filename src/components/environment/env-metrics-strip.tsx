import type { ComponentType } from "react";
import {
  Activity, Thermometer, Droplets, Wind, Gauge,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { EnvMetricsStripSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * ExecIntelligenceStrip — Phase 1 Live Telemetry Zone.
 *
 * Information hierarchy:
 *  - AQI panel is visually dominant: 1.6× column width, SVG ring gauge,
 *    AQI-reactive colour that responds to the actual band.
 *  - Secondary panels are quiet and data-forward: icon, value, label.
 *  - No equal-weight grid. Asymmetry is the design.
 *
 * Colours:
 *  - AQI panel colour = the actual AQI band colour (green/yellow/orange/red)
 *  - Secondary panels = slate neutral — they support, not compete
 *
 * Responsive:
 *  - Mobile: single column (AQI first, secondaries below in 2-col grid)
 *  - Tablet+: all inline with AQI dominant left
 */

type TrendDir = "up" | "down" | "stable";

function TrendLabel({ dir }: { dir?: TrendDir }) {
  if (!dir || dir === "stable") {
    return (
      <span className="env-strip__trend" aria-label="Stable">
        <Minus className="size-2.5" aria-hidden="true" />
        Stable
      </span>
    );
  }
  return dir === "up" ? (
    <span className="env-strip__trend env-strip__trend--up" aria-label="Rising">
      <TrendingUp className="size-2.5" aria-hidden="true" />
      Rising
    </span>
  ) : (
    <span className="env-strip__trend env-strip__trend--down" aria-label="Falling">
      <TrendingDown className="size-2.5" aria-hidden="true" />
      Falling
    </span>
  );
}

/* ── AQI Hero Panel ─────────────────────────────────────────────────────── */

function HeroAQIPanel({
  aqi,
  bandLabel,
  bandColor,
}: {
  aqi: number;
  bandLabel: string;
  bandColor: string;
}) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(aqi / 300, 1);
  const dash = pct * circ;

  return (
    <motion.article
      className="env-strip__hero"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.04 }}
      aria-label={`Air Quality Index: ${aqi} — ${bandLabel}`}
      style={{ "--band-color": bandColor } as React.CSSProperties}
    >
      {/* Ambient glow in the top-right — AQI-reactive */}
      <div className="env-strip__hero-glow" aria-hidden="true" />

      {/* Eyebrow */}
      <div className="env-strip__hero-eyebrow">Air Quality Index</div>

      {/* Gauge + value */}
      <div className="env-strip__hero-gauge-wrap">
        <svg
          width={116} height={116}
          viewBox="0 0 116 116"
          aria-hidden="true"
          className="env-strip__hero-svg"
        >
          {/* Track ring */}
          <circle
            cx={58} cy={58} r={r}
            fill="none"
            stroke="oklch(1 0 0 / 0.07)"
            strokeWidth={7}
          />
          {/* Progress ring */}
          <circle
            cx={58} cy={58} r={r}
            fill="none"
            stroke={bandColor}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform="rotate(-90, 58, 58)"
            style={{
              filter: `drop-shadow(0 0 8px ${bandColor}55)`,
              transition: "stroke-dasharray 1.1s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        {/* AQI number in centre */}
        <div className="env-strip__hero-center" aria-hidden="true">
          <span
            className="env-strip__hero-value"
            style={{ color: bandColor }}
          >
            {aqi}
          </span>
          <span className="env-strip__hero-unit">AQI</span>
        </div>
      </div>

      {/* Band label */}
      <div
        className="env-strip__hero-band"
        style={{ color: bandColor }}
      >
        {bandLabel}
      </div>
    </motion.article>
  );
}

/* ── Secondary metric panel ─────────────────────────────────────────────── */

function SecondaryPanel({
  Icon,
  label,
  sublabel,
  value,
  unit,
  trend,
  index,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  value: string;
  unit?: string;
  trend?: TrendDir;
  index: number;
}) {
  return (
    <motion.article
      className="env-strip__secondary"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
        delay: 0.06 + index * 0.05,
      }}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
    >
      {/* Icon */}
      <div className="env-strip__secondary-icon" aria-hidden="true">
        <Icon className="size-4" />
      </div>

      {/* Value */}
      <div className="env-strip__secondary-value-row">
        <span className="env-strip__secondary-value">{value}</span>
        {unit && (
          <span className="env-strip__secondary-unit">{unit}</span>
        )}
      </div>

      {/* Label */}
      <div className="env-strip__secondary-meta">
        <span className="env-strip__secondary-sublabel">{sublabel}</span>
        <TrendLabel dir={trend} />
      </div>
    </motion.article>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */

export function ExecIntelligenceStrip({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();

  if (isCityListLoading) return <EnvMetricsStripSkeleton className={className} />;

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load live telemetry."
      />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Live telemetry is unavailable."
        description="This panel will update when a live reading is received."
      />
    );
  }

  const band = findAqiBand(city.aqi);

  const secondaries: {
    key: string;
    Icon: ComponentType<{ className?: string }>;
    label: string;
    sublabel: string;
    value: string;
    unit?: string;
  }[] = [];

  if (typeof city.temp === "number")
    secondaries.push({ key: "temp", Icon: Thermometer, label: "Temperature", sublabel: "Ambient", value: String(city.temp), unit: "°C" });
  if (typeof city.humidity === "number")
    secondaries.push({ key: "hum", Icon: Droplets, label: "Humidity", sublabel: "Relative", value: String(city.humidity), unit: "%" });
  if (typeof city.windSpeed === "number")
    secondaries.push({ key: "wind", Icon: Wind, label: "Wind", sublabel: "Surface", value: String(city.windSpeed), unit: "km/h" });
  if (typeof city.pressure === "number")
    secondaries.push({ key: "pres", Icon: Gauge, label: "Pressure", sublabel: "Barometric", value: String(city.pressure), unit: "hPa" });

  return (
    <div
      className={cn("env-strip", className)}
      role="region"
      aria-label="Live environmental telemetry"
    >
      <HeroAQIPanel aqi={city.aqi} bandLabel={band.label} bandColor={band.color} />
      {secondaries.slice(0, 4).map((s, i) => (
        <SecondaryPanel key={s.key} {...s} index={i} />
      ))}
    </div>
  );
}

/* Backward-compat re-export */
export { ExecIntelligenceStrip as LiveMetricsStrip };
