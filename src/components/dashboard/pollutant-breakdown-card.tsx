/**
 * PollutantBreakdownCard — Phase 2
 *
 * Premium animated cards for PM2.5, PM10, NO₂, SO₂, CO, O₃.
 * Each card shows:
 *  - Animated SVG circular progress ring (vs WHO safe limit)
 *  - Current value + unit
 *  - Trend indicator
 *  - Health impact label
 *  - Hover lift with border glow
 *
 * Data comes from city object (pm25, pm10, no2, o3 are available;
 * so2 and co are derived from the AQI + pollutant mix for display).
 * All animations respect prefers-reduced-motion.
 */

import { motion, useReducedMotion, useSpring, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { STAGGER, HOVER_LIFT, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Pollutant definitions ────────────────────────────────────────────────────

interface PollutantDef {
  key:        string;
  label:      string;
  unit:       string;
  /** WHO / EPA 24h safe reference limit */
  safeLimit:  number;
  value:      number;
  /** Inferred trend direction */
  trend:      "up" | "down" | "stable";
  healthNote: string;
  accentColor:string;
}

function getHealthNote(key: string, ratio: number): string {
  if (ratio < 0.5) return "Within safe limits";
  if (ratio < 0.8) return "Acceptable range";
  if (ratio < 1.0) return "Approaching limit";
  if (ratio < 1.5) return "Exceeds safe limit";
  return "Significantly elevated";
}

function getAccent(ratio: number): string {
  if (ratio < 0.5)  return "var(--color-success)";
  if (ratio < 0.8)  return "oklch(0.72 0.18 155)";
  if (ratio < 1.0)  return "var(--color-warning)";
  if (ratio < 1.5)  return "oklch(0.65 0.19 45)";
  return "var(--color-destructive)";
}

export function buildPollutants(city: {
  pm25: number; pm10: number; no2: number; o3: number;
  co2?: number; aqi?: number;
}): PollutantDef[] {
  // SO₂ and CO aren't in the City model — estimate from AQI for display
  const aqi   = city.aqi ?? 80;
  const so2   = Math.round(aqi * 0.18 + 4);
  const co    = Math.round(aqi * 0.55 + 12);

  const defs = [
    { key: "pm25", label: "PM2.5", unit: "µg/m³", safeLimit: 25,  value: city.pm25, trend: city.pm25 > 30 ? "up" : "down" },
    { key: "pm10", label: "PM10",  unit: "µg/m³", safeLimit: 50,  value: city.pm10, trend: city.pm10 > 60 ? "up" : "down" },
    { key: "no2",  label: "NO₂",   unit: "ppb",   safeLimit: 40,  value: city.no2,  trend: city.no2  > 45 ? "up" : "stable" },
    { key: "o3",   label: "O₃",    unit: "ppb",   safeLimit: 60,  value: city.o3,   trend: city.o3   > 65 ? "up" : "stable" },
    { key: "so2",  label: "SO₂",   unit: "ppb",   safeLimit: 20,  value: so2,       trend: "stable" },
    { key: "co",   label: "CO",    unit: "ppm",   safeLimit: 9,   value: +(co / 10).toFixed(1), trend: aqi > 150 ? "up" : "stable" },
  ] as const;

  return defs.map((d) => {
    const ratio = d.value / d.safeLimit;
    return {
      ...d,
      trend: d.trend as "up" | "down" | "stable",
      healthNote:  getHealthNote(d.key, ratio),
      accentColor: getAccent(ratio),
    };
  });
}

// ─── Animated counter hook ────────────────────────────────────────────────────
// FIX: Previously returned a MotionValue object directly which React 19 cannot
// render as a child ("Objects are not valid as a React child").
// Now syncs the animated value to a plain string via useMotionValueEvent so
// only primitive strings ever reach JSX.

function useAnimatedValue(target: number, enabled: boolean): string {
  const fallback = target < 10 ? target.toFixed(1) : String(Math.round(target));
  const mv = useMotionValue(enabled ? 0 : target);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const [val, setVal] = useState(fallback);

  useEffect(() => { mv.set(target); }, [target, mv]);

  useMotionValueEvent(spring, "change", (latest) => {
    setVal(target < 10 ? latest.toFixed(1) : Math.round(latest).toString());
  });

  return enabled ? val : fallback;
}

// ─── SVG ring ────────────────────────────────────────────────────────────────

const RING_R     = 34;
const RING_CIRC  = 2 * Math.PI * RING_R;

function PollutantRing({
  ratio, color, prefersReduced, inView,
}: {
  ratio: number; color: string; prefersReduced: boolean; inView: boolean;
}) {
  const clampedRatio = Math.min(ratio, 1.3);
  const offset       = RING_CIRC * (1 - Math.min(clampedRatio, 1));

  return (
    <svg width="88" height="88" viewBox="0 0 88 88"
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }} aria-hidden>
      {/* Track */}
      <circle cx="44" cy="44" r={RING_R} fill="none"
        stroke="currentColor" strokeWidth="5"
        className="text-border" />
      {/* Fill */}
      <motion.circle cx="44" cy="44" r={RING_R} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        initial={{ strokeDashoffset: RING_CIRC }}
        animate={{ strokeDashoffset: inView && !prefersReduced ? offset : RING_CIRC }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
      {/* Overflow arc (red tint) when > safe limit */}
      {ratio > 1 && (
        <circle cx="44" cy="44" r={RING_R} fill="none"
          stroke="var(--color-destructive)" strokeWidth="2"
          strokeLinecap="round" strokeOpacity="0.45"
          strokeDasharray={`${RING_CIRC * Math.min(ratio - 1, 0.3)} ${RING_CIRC}`}
          strokeDashoffset={RING_CIRC * 0.0}
        />
      )}
    </svg>
  );
}

// ─── Single pollutant card ────────────────────────────────────────────────────

const CARD_ITEM = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

function PollutantCard({ p, inView }: { p: PollutantDef; inView: boolean }) {
  const prefersReduced = useReducedMotion() ?? false;
  const ratio          = p.value / p.safeLimit;
  // FIX: useAnimatedValue now always returns a plain string — never a MotionValue
  const displayVal     = useAnimatedValue(p.value, inView && !prefersReduced);

  const TrendIcon = p.trend === "up" ? TrendingUp : p.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    p.trend === "up"   ? "text-destructive" :
    p.trend === "down" ? "text-success"     : "text-muted-foreground";

  return (
    <motion.div
      variants={CARD_ITEM}
      whileHover={prefersReduced ? undefined : HOVER_LIFT}
      className="glass rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group cursor-default"
      style={{ borderColor: `color-mix(in oklab, ${p.accentColor} 20%, transparent)` }}
    >
      {/* Ambient glow */}
      <div aria-hidden className="absolute -top-6 -right-6 size-24 rounded-full blur-2xl opacity-15 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
        style={{ background: p.accentColor }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          {p.label}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-medium ${trendColor}`}>
          <TrendIcon className="size-3" />
          {p.trend === "up" ? "Rising" : p.trend === "down" ? "Falling" : "Stable"}
        </div>
      </div>

      {/* Ring + value */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <PollutantRing
            ratio={ratio}
            color={p.accentColor}
            prefersReduced={prefersReduced}
            inView={inView}
          />
          {/* Center text — displayVal is always a primitive string; no MotionValue here */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold tabular-nums leading-none"
              style={{ color: p.accentColor }}>
              {displayVal}
            </span>
            <span className="text-[8px] text-muted-foreground mt-0.5">{p.unit}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Safe limit bar */}
          <div>
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
              <span>Safe limit</span>
              <span>{p.safeLimit} {p.unit}</span>
            </div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: p.accentColor }}
                initial={{ width: 0 }}
                animate={{ width: inView ? `${Math.min(ratio * 100, 130)}%` : 0 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              />
            </div>
          </div>

          {/* Health note */}
          <div className="text-[10px] leading-snug" style={{ color: p.accentColor }}>
            {p.healthNote}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PollutantBreakdownCard({
  pm25, pm10, no2, o3, aqi,
}: {
  pm25: number; pm10: number; no2: number; o3: number; aqi?: number;
}) {
  const ref            = useRef<HTMLDivElement>(null);
  const inView         = useInView(ref, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion() ?? false;
  const pollutants     = buildPollutants({ pm25, pm10, no2, o3, aqi });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Composition</div>
          <h2 className="text-lg font-semibold mt-0.5">Pollutant Breakdown</h2>
        </div>
        <div className="text-[11px] text-muted-foreground px-2.5 py-1 rounded-full border border-border">
          vs WHO limits
        </div>
      </div>

      <motion.div
        ref={ref}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
        variants={STAGGER(0.07)}
        initial={prefersReduced ? false : "hidden"}
        animate={inView ? "show" : "hidden"}
      >
        {pollutants.map((p) => (
          <PollutantCard key={p.key} p={p} inView={inView} />
        ))}
      </motion.div>
    </div>
  );
}
