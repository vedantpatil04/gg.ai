/**
 * GreenGuard Dashboard — Motion Primitives
 *
 * Reusable animated building blocks used by every dashboard component.
 * Importing from here (rather than duplicating hooks inline) means:
 *  - `AnimatedNumber` lives in exactly one place
 *  - Spring configs come from src/lib/motion.ts
 *  - prefers-reduced-motion is handled once, here, not scattered
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
  type FADE_UP as FadeUpVariants,
} from "@/lib/motion";

// ─── AnimatedNumber ────────────────────────────────────────────────────────────
// Replaces two identical local copies that existed in Phase 5's
// environmental-health-hero.tsx and highlights-grid.tsx.
//
// Uses a spring (not a linear tween) so deceleration feels natural.
// Respects prefers-reduced-motion: if the user has opted out of animation,
// the number jumps straight to target.

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
  const spring = useSpring(prefersReduced ? target : 0, springConfig);
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString(),
  );

  useEffect(() => {
    spring.set(target);
  }, [target, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}

/** Same as AnimatedNumber but faster spring — for small UI elements. */
export function AnimatedNumberFast({ target, className }: { target: number; className?: string }) {
  return (
    <AnimatedNumber target={target} className={className} springConfig={SPRING_COUNTER_FAST} />
  );
}

// ─── FadeUp ────────────────────────────────────────────────────────────────────
// Drop-in wrapper that applies the standard entrance animation to any child.
// Used for sections that enter independently (not part of a stagger group).

export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      variants={{
        ...FADE_UP,
        show: {
          ...FADE_UP.show,
          transition: { duration: DUR_MD, ease: EASE_OUT, delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer ─────────────────────────────────────────────────────────
// Wrap a list of items in this and apply variants={STAGGER_ITEM} to each
// child to get the staggered entrance for free.

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

export function StaggerContainer({
  children,
  className,
  staggerChildren = 0.07,
  delayChildren = 0,
}: {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  delayChildren?: number;
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
// A div wrapper that adds lift + glow on hover and press feedback on tap.
// Use instead of inline whileHover/whileTap on every card.

export function MotionCard({
  children,
  className,
  lift = "md",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: "sm" | "md" | "none";
  style?: React.CSSProperties;
}) {
  const prefersReduced = useReducedMotion();
  const hoverProp =
    lift === "none" || prefersReduced ? undefined : lift === "sm" ? HOVER_LIFT_SM : HOVER_LIFT;

  return (
    <motion.div
      className={cn("cursor-default", className)}
      whileHover={hoverProp}
      whileTap={prefersReduced ? undefined : TAP_PRESS}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── GlowCard ─────────────────────────────────────────────────────────────────
// A Panel-like wrapper that adds a per-section ambient lighting layer so every
// major card has a distinct visual identity (AI=indigo, Alerts=amber, etc.)
// without touching brand colours. The glow is an absolutely-positioned pseudo-
// layer — GPU opacity only, never layout. Pairs with the --glow-* CSS tokens
// added in styles.css Phase 8.

export function GlowCard({
  children,
  className,
  glowVar = "--glow-ai",
  lift = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** One of the --glow-* CSS custom property names from styles.css */
  glowVar?: string;
  lift?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className={cn("glass rounded-2xl p-5 relative overflow-hidden", className)}
      whileHover={lift && !prefersReduced ? HOVER_LIFT_SM : undefined}
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

// ─── ShimmerBadge ─────────────────────────────────────────────────────────────
// A small pill/badge that runs a shimmer animation across its surface —
// used for the AI confidence badge and the "Generated" timestamp to give
// them a sense of liveness without a distracting pulse.

export function ShimmerBadge({
  children,
  color = "var(--color-primary)",
  className,
}: {
  children: React.ReactNode;
  color?: string;
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
      {/* Shimmer sweep */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
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
// Full-bleed ambient lighting layer inserted behind dashboard content.
// The colour shifts based on AQI category so the whole page breathes
// the environmental status — good = emerald, moderate = blue-green,
// poor = amber, hazardous = deep red — all very subtly.
// GPU-accelerated (opacity/filter only — no layout changes).

function aqiGlow(aqi: number): string {
  if (aqi > 200) return "oklch(0.52 0.22 25 / 0.18)"; // hazardous — red
  if (aqi > 150) return "oklch(0.62 0.20 30 / 0.14)"; // very unhealthy — orange-red
  if (aqi > 100) return "oklch(0.72 0.18 65 / 0.12)"; // unhealthy — amber
  if (aqi > 50) return "oklch(0.70 0.18 200 / 0.10)"; // moderate — blue-green
  return "oklch(0.68 0.16 150 / 0.09)"; // good — emerald
}

export function SceneBackground({ aqi = 30 }: { aqi?: number }) {
  const glow = aqiGlow(aqi);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Slow ambient blob — top-left */}
      <motion.div
        className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full blur-3xl opacity-60"
        style={{ background: glow }}
        animate={{ x: [0, 18, 0], y: [0, 12, 0], scale: [1, 1.06, 1] }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "mirror",
        }}
      />
      {/* Counterpoint blob — bottom-right */}
      <motion.div
        className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full blur-3xl opacity-40"
        style={{ background: glow }}
        animate={{ x: [0, -14, 0], y: [0, -10, 0], scale: [1, 1.04, 1] }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "mirror",
        }}
      />
    </div>
  );
}
