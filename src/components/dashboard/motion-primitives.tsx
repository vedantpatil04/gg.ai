/**
 * GreenGuard Dashboard — Motion Primitives — Phase 2
 *
 * Phase 2 additions (all existing exports unchanged):
 *  - MotionCard: border glow on hover (AQI-colour aware via optional `glowColor` prop)
 *  - GlowCard: floating animation option for premium cards
 *  - BorderGlowCard: new component — card with animated gradient border
 *  - All new effects respect prefers-reduced-motion
 */

import { useEffect } from "react";
import { motion, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  SPRING_COUNTER_SLOW,
  SPRING_COUNTER_FAST,
  FADE_UP,
  STAGGER,
  HOVER_LIFT,
  HOVER_LIFT_SM,
  TAP_PRESS,
  DUR_MD,
  EASE_OUT,
} from "@/lib/motion";

// ─── AnimatedNumber ────────────────────────────────────────────────────────────

export function AnimatedNumber({
  target,
  decimals = 0,
  className,
  springConfig = SPRING_COUNTER_SLOW,
}: {
  target: number;
  decimals?: number;
  className?: string;
  springConfig?: { stiffness: number; damping: number };
}) {
  const prefersReduced = useReducedMotion();
  const spring  = useSpring(prefersReduced ? target : 0, springConfig);
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString(),
  );
  useEffect(() => { spring.set(target); }, [target, spring]);
  return <motion.span className={className}>{display}</motion.span>;
}

export function AnimatedNumberFast({ target, className }: { target: number; className?: string }) {
  return <AnimatedNumber target={target} className={className} springConfig={SPRING_COUNTER_FAST} />;
}

// ─── FadeUp ────────────────────────────────────────────────────────────────────

export function FadeUp({
  children, className, delay = 0,
}: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      variants={{
        ...FADE_UP,
        show: { ...FADE_UP.show, transition: { duration: DUR_MD, ease: EASE_OUT, delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer ─────────────────────────────────────────────────────────

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

export function StaggerContainer({
  children, className, staggerChildren = 0.07, delayChildren = 0,
}: {
  children: React.ReactNode; className?: string;
  staggerChildren?: number; delayChildren?: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={STAGGER(staggerChildren, delayChildren)}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
    >
      {children}
    </motion.div>
  );
}

// ─── MotionCard ────────────────────────────────────────────────────────────────
// Phase 2: optional `glowColor` adds a border glow on hover.

export function MotionCard({
  children, className, lift = "md", style, glowColor,
}: {
  children:    React.ReactNode;
  className?:  string;
  lift?:       "sm" | "md" | "none";
  style?:      React.CSSProperties;
  /** Optional: CSS color string for border glow on hover (e.g. band.color) */
  glowColor?:  string;
}) {
  const prefersReduced = useReducedMotion();
  const hoverProp =
    lift === "none" || prefersReduced ? undefined : lift === "sm" ? HOVER_LIFT_SM : HOVER_LIFT;

  return (
    <motion.div
      className={cn("cursor-default relative group", className)}
      whileHover={hoverProp}
      whileTap={prefersReduced ? undefined : TAP_PRESS}
      style={style}
    >
      {/* Phase 2: gradient border glow on hover */}
      {glowColor && !prefersReduced && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: `0 0 0 1px ${glowColor}45, 0 0 16px ${glowColor}25`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

// ─── GlowCard ─────────────────────────────────────────────────────────────────
// Phase 2: optional `float` prop adds a slow vertical float animation.

export function GlowCard({
  children, className, glowVar = "--glow-ai", lift = true, float = false,
}: {
  children:   React.ReactNode;
  className?: string;
  glowVar?:   string;
  lift?:      boolean;
  /** Phase 2: slow floating animation for premium cards */
  float?:     boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className={cn("glass rounded-2xl p-5 relative overflow-hidden", className)}
      whileHover={lift && !prefersReduced ? HOVER_LIFT_SM : undefined}
      animate={float && !prefersReduced
        ? { y: [0, -5, 0] }
        : undefined}
      transition={float && !prefersReduced
        ? { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
        : undefined}
    >
      {/* Ambient glow layer */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse 90% 60% at 10% 0%, var(${glowVar}), transparent 70%)`,
        }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// ─── BorderGlowCard ───────────────────────────────────────────────────────────
// Phase 2: NEW — a card with an animated gradient border that rotates.
// Inspired by Apple's Dynamic Island and Tesla's energy display cards.
// Use for high-importance cards (AI brief, live AQI overview).

export function BorderGlowCard({
  children, className, color = "var(--color-primary)", animate: shouldAnimate = true,
}: {
  children:   React.ReactNode;
  className?: string;
  color?:     string;
  animate?:   boolean;
}) {
  const prefersReduced = useReducedMotion();
  const doAnimate = shouldAnimate && !prefersReduced;

  return (
    <div className={cn("relative rounded-2xl p-px overflow-hidden", className)}>
      {/* Animated conic-gradient border */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `conic-gradient(from 0deg, transparent 0%, ${color} 20%, transparent 40%)`,
          opacity: 0.55,
          animation: doAnimate ? "border-rotate 5s linear infinite" : "none",
        }}
      />
      {/* Inner card fills over the border */}
      <div className={cn("relative rounded-[calc(theme(borderRadius.2xl)-1px)] glass", "z-10")}>
        {children}
      </div>
      <style>{`
        @keyframes border-rotate { to { transform: rotate(360deg); } }
        @media(prefers-reduced-motion:reduce){ @keyframes border-rotate{from{}to{}} }
      `}</style>
    </div>
  );
}

// ─── ShimmerBadge ─────────────────────────────────────────────────────────────

export function ShimmerBadge({
  children, color = "var(--color-primary)", className,
}: {
  children:   React.ReactNode;
  color?:     string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full overflow-hidden",
        className,
      )}
      style={{
        color,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      }}
    >
      <span aria-hidden className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, color-mix(in oklab, ${color} 25%, transparent) 50%, transparent 100%)`,
          animation: "shimmer 2.8s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

// ─── SceneBackground ──────────────────────────────────────────────────────────

function aqiGlow(aqi: number): string {
  if (aqi > 200) return "oklch(0.52 0.22 25 / 0.18)";
  if (aqi > 150) return "oklch(0.62 0.20 30 / 0.14)";
  if (aqi > 100) return "oklch(0.72 0.18 65 / 0.12)";
  if (aqi > 50)  return "oklch(0.70 0.18 200 / 0.10)";
  return                "oklch(0.68 0.16 150 / 0.09)";
}

export function SceneBackground({ aqi = 30 }: { aqi?: number }) {
  const glow = aqiGlow(aqi);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full blur-3xl opacity-60"
        style={{ background: glow }}
        animate={{ x:[0,18,0], y:[0,12,0], scale:[1,1.06,1] }}
        transition={{ duration:22, repeat:Infinity, ease:"easeInOut", repeatType:"mirror" }}
      />
      <motion.div
        className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full blur-3xl opacity-40"
        style={{ background: glow }}
        animate={{ x:[0,-14,0], y:[0,-10,0], scale:[1,1.04,1] }}
        transition={{ duration:28, repeat:Infinity, ease:"easeInOut", repeatType:"mirror" }}
      />
    </div>
  );
}
