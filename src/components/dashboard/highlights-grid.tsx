import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { AnimatedNumber, MotionCard } from "@/components/dashboard/motion-primitives";
import { STAGGER_ITEM } from "@/components/dashboard/motion-primitives";
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
  inView = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  accentColor: string;
  isNumeric?: boolean;
  inView?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <MotionCard className={cn("glass rounded-2xl p-4 relative overflow-hidden group")}>
      {/* Accent glow */}
      <div
        className="absolute -top-8 -right-8 size-28 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: accentColor }}
      />
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div
          className="size-7 rounded-lg grid place-items-center"
          style={{
            background: `color-mix(in oklab, ${accentColor} 14%, transparent)`,
            color: accentColor,
          }}
        >
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">
          {isNumeric && typeof value === "number" && inView && !prefersReduced ? (
            <AnimatedNumber target={value} />
          ) : (
            value
          )}
        </div>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
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
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  if (isLoading) return <CardSkeleton rows={2} />;

  const aqiColor =
    aqi > 150
      ? "var(--color-destructive)"
      : aqi > 100
        ? "var(--color-warning)"
        : "var(--color-success)";

  const stagger = STAGGER(0.06);

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4"
      variants={stagger}
      initial={prefersReduced ? false : "hidden"}
      animate={inView ? "show" : "hidden"}
    >
      {[
        {
          icon: Gauge,
          label: "AQI",
          value: aqi,
          unit: undefined,
          hint: band.label,
          color: aqiColor,
          isNumeric: true,
        },
        {
          icon: ThermometerSun,
          label: "Temperature",
          value: temp ?? "--",
          unit: temp != null ? "°C" : undefined,
          hint: temp == null ? "Not Available" : undefined,
          color: "var(--color-info)",
          isNumeric: temp != null,
        },
        {
          icon: Droplets,
          label: "Humidity",
          value: humidity ?? "--",
          unit: humidity != null ? "%" : undefined,
          hint: humidity == null ? "Not Available" : undefined,
          color: "var(--color-info)",
          isNumeric: humidity != null,
        },
        {
          icon: Wind,
          label: "Wind",
          value: windSpeed ?? "--",
          unit: windSpeed != null ? "km/h" : undefined,
          hint: windSpeed == null ? "Not Available" : undefined,
          color: "var(--color-primary)",
          isNumeric: windSpeed != null,
        },
        {
          icon: Sun,
          label: "UV Index",
          value: "--",
          unit: undefined,
          hint: "Not Available",
          color: "var(--color-warning)",
          isNumeric: false,
        },
        {
          icon: CloudRain,
          label: "Rain Chance",
          value: "--",
          unit: undefined,
          hint: "Not Available",
          color: "var(--color-primary)",
          isNumeric: false,
        },
      ].map((card) => (
        <motion.div key={card.label} variants={STAGGER_ITEM}>
          <KpiCard {...card} accentColor={card.color} inView={inView} />
        </motion.div>
      ))}
    </motion.div>
  );
}
