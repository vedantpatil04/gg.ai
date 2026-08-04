import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Phase 2 — EnvBentoSection: Environmental Identity upgrade.
 *
 * Additions over Phase 1:
 *  - `description` prop — a one-line prose subtitle rendered below each title.
 *    Gives users immediate context for each section's purpose without reading
 *    the content first. Typography: 0.875rem / muted / max-w-2xl.
 *
 * All Phase 1 section personalities (feature / editorial / accent / compact)
 * are preserved exactly. The description is purely additive.
 *
 * Identity matrix (unchanged):
 *  size="feature"   → Left-stripe, large heading + now + description
 *  size="editorial" → Flanked eyebrow rule, display heading + description
 *  size="accent"    → Glass panel with glow, heading + description
 *  size="compact"   → Minimal inline header, heading (no description — compact by design)
 *
 * Accent colour semantics (unchanged):
 *  emerald → environmental health
 *  cyan    → pollutants / telemetry
 *  sky     → weather / forecast / spatial
 *  amber   → regional / warnings
 *  purple  → AI intelligence
 *  coral   → alerts / critical
 */

type AccentKey = "emerald" | "cyan" | "sky" | "amber" | "purple" | "coral";
type SectionSize = "feature" | "editorial" | "accent" | "compact";

const ACCENTS: Record<AccentKey, {
  color: string;
  glow: string;
  border: string;
  stripe: string;
}> = {
  emerald: {
    color:  "oklch(0.72 0.18 160)",
    glow:   "oklch(0.55 0.18 160 / 0.12)",
    border: "oklch(0.55 0.18 160 / 0.25)",
    stripe: "oklch(0.65 0.20 160)",
  },
  cyan: {
    color:  "oklch(0.75 0.15 210)",
    glow:   "oklch(0.55 0.15 210 / 0.12)",
    border: "oklch(0.55 0.15 210 / 0.22)",
    stripe: "oklch(0.68 0.16 210)",
  },
  sky: {
    color:  "oklch(0.74 0.13 238)",
    glow:   "oklch(0.55 0.13 238 / 0.10)",
    border: "oklch(0.55 0.13 238 / 0.20)",
    stripe: "oklch(0.67 0.14 238)",
  },
  amber: {
    color:  "oklch(0.80 0.16 78)",
    glow:   "oklch(0.60 0.16 78  / 0.12)",
    border: "oklch(0.60 0.16 78  / 0.25)",
    stripe: "oklch(0.72 0.18 78)",
  },
  purple: {
    color:  "oklch(0.72 0.17 290)",
    glow:   "oklch(0.52 0.17 290 / 0.12)",
    border: "oklch(0.52 0.17 290 / 0.22)",
    stripe: "oklch(0.65 0.18 290)",
  },
  coral: {
    color:  "oklch(0.68 0.18 30)",
    glow:   "oklch(0.52 0.18 30  / 0.12)",
    border: "oklch(0.52 0.18 30  / 0.22)",
    stripe: "oklch(0.62 0.20 30)",
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 180, damping: 26 },
  },
};

/** Muted description line rendered below each section heading */
function SectionDescription({ text }: { text: string }) {
  return (
    <p
      className="text-sm leading-relaxed max-w-2xl mt-2.5"
      style={{ color: "oklch(0.54 0.014 230)" }}
    >
      {text}
    </p>
  );
}

export function EnvBentoSection({
  eyebrow,
  title,
  description,
  accent = "cyan",
  size = "feature",
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Phase 2: one-line section description rendered below the title */
  description?: string;
  accent?: AccentKey;
  size?: SectionSize;
  className?: string;
  children: ReactNode;
}) {
  const ac = ACCENTS[accent];
  const id = typeof title === "string"
    ? `env-bento-${title.replace(/\s+/g, "-").toLowerCase()}`
    : "env-bento";

  /* ── FEATURE ──────────────────────────────────────────────────────────── */
  if (size === "feature") {
    return (
      <motion.section
        id={id}
        aria-labelledby={`${id}-title`}
        className={cn("scroll-mt-10", className)}
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        <div className="flex items-stretch gap-5 mb-8 md:mb-10">
          <div
            className="w-0.5 rounded-full shrink-0 self-stretch"
            style={{ background: `linear-gradient(180deg, ${ac.stripe} 0%, ${ac.stripe}00 100%)` }}
            aria-hidden="true"
          />
          <div>
            {eyebrow && (
              <span
                className="block text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5"
                style={{ color: ac.color }}
              >
                {eyebrow}
              </span>
            )}
            <h2
              id={`${id}-title`}
              className="text-2xl md:text-3xl xl:text-4xl font-bold tracking-tight leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
            {description && <SectionDescription text={description} />}
          </div>
        </div>
        {children}
      </motion.section>
    );
  }

  /* ── EDITORIAL ────────────────────────────────────────────────────────── */
  if (size === "editorial") {
    return (
      <motion.section
        id={id}
        aria-labelledby={`${id}-title`}
        className={cn("scroll-mt-10", className)}
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        <div className="mb-10 space-y-0">
          {eyebrow && (
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-px flex-1 max-w-12"
                style={{ background: `linear-gradient(90deg, ${ac.stripe}, transparent)` }}
                aria-hidden="true"
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: ac.color }}
              >
                {eyebrow}
              </span>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(90deg, transparent, ${ac.stripe}, transparent)` }}
                aria-hidden="true"
              />
            </div>
          )}
          <h2
            id={`${id}-title`}
            className="text-3xl md:text-4xl xl:text-5xl font-bold tracking-tight leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h2>
          {description && <SectionDescription text={description} />}
        </div>
        {children}
      </motion.section>
    );
  }

  /* ── ACCENT ───────────────────────────────────────────────────────────── */
  if (size === "accent") {
    return (
      <motion.section
        id={id}
        aria-labelledby={`${id}-title`}
        className={cn("scroll-mt-10 relative overflow-hidden rounded-3xl", className)}
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        style={{
          background: "oklch(1 0 0 / 0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${ac.border}`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 100% at 30% 0%, ${ac.glow} 0%, transparent 70%)` }}
          aria-hidden="true"
        />
        <div className="relative p-6 md:p-8 xl:p-10">
          <div className="mb-6 space-y-0">
            {eyebrow && (
              <span
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1 rounded-full border mb-2.5"
                style={{ color: ac.color, borderColor: ac.border, background: ac.glow }}
              >
                {eyebrow}
              </span>
            )}
            <h2
              id={`${id}-title`}
              className="text-2xl md:text-3xl font-bold tracking-tight block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
            {description && <SectionDescription text={description} />}
          </div>
          {children}
        </div>
      </motion.section>
    );
  }

  /* ── COMPACT ──────────────────────────────────────────────────────────── */
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-10", className)}
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className="w-5 h-px rounded-full"
          style={{ background: ac.stripe }}
          aria-hidden="true"
        />
        {eyebrow && (
          <span
            className="text-[9px] font-bold uppercase tracking-[0.22em]"
            style={{ color: ac.color }}
          >
            {eyebrow}
          </span>
        )}
      </div>
      <h2
        id={`${id}-title`}
        className="text-lg md:text-xl font-bold tracking-tight mb-5"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {/* compact: description intentionally omitted — header is tight by design */}
      {children}
    </motion.section>
  );
}
