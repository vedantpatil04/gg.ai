/**
 * motion-system.tsx — Phase 8 reusable motion primitives
 *
 * Lightweight wrappers around framer-motion that apply the GreenGuard
 * standard easing and timing across the Sustainability module.
 *
 * All primitives respect `prefers-reduced-motion` via framer-motion's
 * built-in `useReducedMotion` hook — animations collapse to instant
 * opacity transitions when the user has indicated a preference.
 *
 * Exports:
 *   PageReveal     — wraps the entire page content with a fade-up
 *   SectionReveal  — staggered fade-up triggered on scroll-into-view
 *   CardStagger    — wraps a list of cards and staggers their entrance
 *   ScrollReveal   — single element fade-up triggered on scroll
 *   SkeletonPulse  — shimmer box used for inline skeleton placeholders
 */
import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";

// ─── shared easing ────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── PageReveal ───────────────────────────────────────────────────────────────

export function PageReveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ─── SectionReveal ────────────────────────────────────────────────────────────

export function SectionReveal({
  children, delay = 0, className,
}: { children: ReactNode; delay?: number; className?: string }) {
  const ref     = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduced ? 0 : 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduced ? 0.15 : 0.55, delay: reduced ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── CardStagger ──────────────────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export function CardStagger({
  children, className,
}: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ─── ScrollReveal ─────────────────────────────────────────────────────────────

export function ScrollReveal({
  children, delay = 0, className,
}: { children: ReactNode; delay?: number; className?: string }) {
  const ref     = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduced ? 0.1 : 0.45, delay: reduced ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SkeletonPulse ────────────────────────────────────────────────────────────

export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-muted/40 ${className ?? ""}`}>
      <div className="absolute inset-0 shimmer" aria-hidden="true" />
    </div>
  );
}
