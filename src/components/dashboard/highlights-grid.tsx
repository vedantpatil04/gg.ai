/**
 * HighlightsGrid — Phase 2
 *
 * Upgrades over Phase 10:
 *  - KpiCard: border-glow on hover (MotionCard glowColor prop)
 *  - Data fallback: unavailable values show "Data unavailable" (not "--")
 *  - UV Index / Rain Chance: spec-compliant "Data unavailable" copy
 *  - Accent glow: stronger opacity transition on hover
 *  - Entrance: stagger delay slightly increased for more premium feel
 *
 * All existing props preserved (backward compatible with dashboard.tsx).
 */

import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { AnimatedNumber, MotionCard, STAGGER_ITEM } from "@/components/dashboard/motion-primitives";
import { STAGGER, DUR_MD, EASE_OUT } from "@/lib/motion";
import { Wind, ThermometerSun, Droplets, Sun, CloudRain, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  accentColor,
  isNumeric = false,
  inView    = false,
  unavailable = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  accentColor: string;
  isNumeric?: boolean;
  inView?: boolean;
  unavailable?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <MotionCard
      className={cn("glass rounded-2xl p-4 relative overflow-hidden group")}
      glowColor={accentColor}
    >
      {/* Accent glow blob */}
      <div
        className="absolute -top-8 -right-8 size-28 rounded-full blur-2xl opacity-15 transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: accentColor }}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div
          className="size-7 rounded-lg grid place-items-center transition-colors duration-200"
          style={{
            background: `color-mix(in oklab, ${accentColor} 14%, transparent)`,
            color: accentColor,
          }}
        >
          <Icon className="size-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        {unavailable ? (
          <span className="text-sm text-muted-foreground italic">Data unavailable</span>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums tracking-tight">
              {isNumeric && typeof value === "number" && inView && !prefersReduced ? (
                <AnimatedNumber target={value} />
              ) : (
                value
              )}
            </div>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </>
        )}
      </div>

      {hint && !unavailable && (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </MotionCard>
  );
}

export function HighlightsGrid({
  aqi,
  band,
  temp,
  humidity,
  windSpeed,
  isLoading,
}: {
  aqi: number;
  band: { label: string; color: string };
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  isLoading?: boolean;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  if (isLoading) return <CardSkeleton rows={2} />;

  const aqiColor =
    aqi > 200
      ? "var(--color-destructive)"
      : aqi > 150
        ? "oklch(0.55 0.20 315)"
        : aqi > 100
          ? "var(--color-warning)"
          : "var(--color-success)";

  const stagger = STAGGER(0.08);

  const cards = [
    {
      icon: Gauge,
      label: "AQI",
      value: aqi,
      unit: undefined,
      hint: band.label,
      color: aqiColor,
      isNumeric: true,
      unavailable: false,
    },
    {
      icon: ThermometerSun,
      label: "Temperature",
      value: temp ?? 0,
      unit: temp != null ? "°C" : undefined,
      hint: undefined,
      color: "var(--color-info)",
      isNumeric: temp != null,
      unavailable: temp == null,
    },
    {
      icon: Droplets,
      label: "Humidity",
      value: humidity ?? 0,
      unit: humidity != null ? "%" : undefined,
      hint: undefined,
      color: "var(--color-info)",
      isNumeric: humidity != null,
      unavailable: humidity == null,
    },
    {
      icon: Wind,
      label: "Wind",
      value: windSpeed ?? 0,
      unit: windSpeed != null ? "km/h" : undefined,
      hint: undefined,
      color: "var(--color-primary)",
      isNumeric: windSpeed != null,
      unavailable: windSpeed == null,
    },
    {
      icon: Sun,
      label: "UV Index",
      value: 0,
      unit: undefined,
      hint: undefined,
      color: "var(--color-warning)",
      isNumeric: false,
      // UV Index is not in the City data model — always show unavailable per spec
      unavailable: true,
    },
    {
      icon: CloudRain,
      label: "Rain Chance",
      value: 0,
      unit: undefined,
      hint: undefined,
      color: "oklch(0.65 0.15 230)",
      isNumeric: false,
      // Rain Chance is not in the City data model — always show unavailable per spec
      unavailable: true,
    },
  ];

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4"
      variants={stagger}
      initial={prefersReduced ? false : "hidden"}
      animate={inView ? "show" : "hidden"}
    >
      {cards.map((card) => (
        <motion.div key={card.label} variants={STAGGER_ITEM}>
          <KpiCard
            icon={card.icon}
            label={card.label}
            value={card.value}
            unit={card.unit}
            hint={card.hint}
            accentColor={card.color}
            isNumeric={card.isNumeric}
            inView={inView}
            unavailable={card.unavailable}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
