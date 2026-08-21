/**
 * AQIGlassCard — Cinematic Hero Phase 1
 *
 * A premium floating glassmorphism card for AQI data.
 * Displayed as Layer 6 in the hero stack.
 *
 * Features:
 * - Animated counter (number counts up on mount)
 * - SVG circular progress ring (animated via Framer Motion)
 * - AQI status badge with color glow
 * - Trend indicator (↑ rising / ↓ falling / → stable)
 * - Hover lift effect
 * - Color shifts based on AQI tier (emerald → yellow → orange → red → purple)
 * - Reduced motion: skips counter and ring animations
 */

import { motion, useReducedMotion, useSpring, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Wind } from "lucide-react";
import { SPRING_SLOW, HOVER_LIFT, SPRING_SNAP } from "@/lib/motion";
import { findAqiBand } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── AQI theme palette (overrides band color for cinematic effect) ──────────
function getAqiTheme(aqi: number) {
  if (aqi <= 50)  return { primary: "#10b981", glow: "rgba(16,185,129,0.25)",  label: "Good",          ringColor: "#10b981" };
  if (aqi <= 100) return { primary: "#eab308", glow: "rgba(234,179,8,0.25)",   label: "Moderate",      ringColor: "#eab308" };
  if (aqi <= 150) return { primary: "#f97316", glow: "rgba(249,115,22,0.25)",  label: "Unhealthy (SG)",ringColor: "#f97316" };
  if (aqi <= 200) return { primary: "#ef4444", glow: "rgba(239,68,68,0.25)",   label: "Unhealthy",     ringColor: "#ef4444" };
  return            { primary: "#a855f7", glow: "rgba(168,85,247,0.25)",   label: "Hazardous",     ringColor: "#a855f7" };
}

// ─── Animated counter hook ───────────────────────────────────────────────────
function useAnimatedCounter(target: number, skipAnimation: boolean): string {
  const motionVal = useMotionValue(skipAnimation ? target : 0);
  const spring = useSpring(motionVal, { stiffness: 55, damping: 18 });
  const [val, setVal] = useState(() => target.toString());

  useEffect(() => {
    if (!skipAnimation) {
      motionVal.set(target);
    } else {
      setVal(target.toString());
    }
  }, [target, skipAnimation, motionVal]);

  useMotionValueEvent(spring, "change", (latest) => {
    setVal(Math.round(latest).toString());
  });

  return val;
}

// ─── Circular SVG progress ring ──────────────────────────────────────────────
const RING_R = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;
const AQI_MAX = 300;

function AQIRing({
  aqi,
  color,
  prefersReduced,
}: {
  aqi: number;
  color: string;
  prefersReduced: boolean;
}) {
  const progress = Math.min(aqi / AQI_MAX, 1);
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <svg
      width="108"
      height="108"
      viewBox="0 0 108 108"
      className="absolute inset-0"
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden
    >
      {/* Track */}
      <circle
        cx="54"
        cy="54"
        r={RING_R}
        fill="none"
        stroke="currentColor"
        className="text-border/70 dark:text-white/10"
        strokeWidth="6"
      />
      {/* Progress arc */}
      <motion.circle
        cx="54"
        cy="54"
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        initial={{ strokeDashoffset: prefersReduced ? dashOffset : RING_CIRCUMFERENCE }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
        }
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
    </svg>
  );
}

export interface AQIGlassCardProps {
  aqi: number;
  /** Optional previous AQI to show trend direction */
  previousAqi?: number;
  className?: string;
}

export function AQIGlassCard({ aqi, previousAqi, className = "" }: AQIGlassCardProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const theme = getAqiTheme(aqi);
  const band = findAqiBand(aqi);
  const displayValue = useAnimatedCounter(aqi, prefersReduced);

  // Trend
  const TrendIcon =
    previousAqi == null || Math.abs(aqi - previousAqi) < 3
      ? Minus
      : aqi > previousAqi
        ? TrendingUp
        : TrendingDown;
  const trendColor =
    previousAqi == null || Math.abs(aqi - previousAqi) < 3
      ? "text-muted-foreground dark:text-white/60"
      : aqi > previousAqi
        ? "text-red-500 dark:text-red-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl overflow-hidden cursor-default transition-colors",
        "bg-card/90 dark:bg-black/45 backdrop-blur-xl",
        "border border-border/80 dark:border-white/10",
        "shadow-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        className,
      )}
      whileHover={prefersReduced ? {} : HOVER_LIFT}
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { ...SPRING_SLOW, delay: 0.5 }}
    >
      {/* AQI glow halo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-60 dark:opacity-100"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${theme.glow}, transparent 70%)`,
        }}
      />

      {/* Gradient highlight top edge */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.primary}80, transparent)`,
        }}
      />

      <div className="relative p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Wind className="size-3.5 text-muted-foreground dark:text-white/50" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground dark:text-white/50">
              Air Quality
            </span>
          </div>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="size-3.5" />
            <span className="text-[10px] font-medium">
              {previousAqi == null || Math.abs(aqi - previousAqi) < 3
                ? "Stable"
                : aqi > previousAqi
                  ? `+${aqi - previousAqi}`
                  : `${aqi - previousAqi}`}
            </span>
          </div>
        </div>

        {/* Ring + value */}
        <div className="flex items-center gap-4">
          <div className="relative size-[108px] shrink-0 flex items-center justify-center">
            <AQIRing aqi={aqi} color={theme.primary} prefersReduced={prefersReduced} />
            <div className="relative z-10 text-center">
              <motion.span
                className="text-3xl font-bold tabular-nums text-foreground dark:text-white leading-none"
                style={{ textShadow: `0 0 20px ${theme.primary}50` }}
              >
                {displayValue}
              </motion.span>
              <div className="text-[10px] text-muted-foreground dark:text-white/45 mt-0.5 font-medium">AQI</div>
            </div>
          </div>

          {/* Status + detail */}
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <motion.div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
              style={{
                background: `color-mix(in oklab, ${theme.primary} 15%, transparent)`,
                border: `1px solid color-mix(in oklab, ${theme.primary} 35%, transparent)`,
              }}
              initial={prefersReduced ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={prefersReduced ? { duration: 0 } : { ...SPRING_SNAP, delay: 0.7 }}
            >
              {/* Live pulse dot */}
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{
                  background: theme.primary,
                  boxShadow: `0 0 6px ${theme.primary}`,
                  animation: prefersReduced ? "none" : "aqi-pulse 2s ease-in-out infinite",
                }}
              />
              <span
                className="text-[11px] font-semibold"
                style={{ color: theme.primary }}
              >
                {band.label}
              </span>
            </motion.div>

            {/* Secondary info */}
            <p className="text-[11px] text-muted-foreground dark:text-white/65 leading-relaxed">
              {aqi <= 50
                ? "Safe for all activities"
                : aqi <= 100
                  ? "Acceptable for most people"
                  : aqi <= 150
                    ? "Sensitive groups at risk"
                    : aqi <= 200
                      ? "Limit outdoor exposure"
                      : "Avoid outdoor activities"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aqi-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.5); }
        }
      `}</style>
    </motion.div>
  );
}
