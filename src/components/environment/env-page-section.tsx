import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EnvPageSection — Phase 1 Information Architecture Primitive.
 *
 * This is the single section-wrapper used across the entire Environmental
 * Overview page. It replaces EnvBentoSection with a system that has
 * proper information hierarchy — the header and content have different
 * visual weights depending on the layout.
 *
 * LAYOUT MODES:
 *
 *   "full"          Full-width stacked (header above, content below).
 *                   Used for: Pollutants, Forecast, Regional, Alerts.
 *
 *   "split-right"   40/60 horizontal split. Header left, content right.
 *                   Used for: AI Intelligence (gives the section a
 *                   strong editorial identity on desktop; stacks on mobile).
 *
 *   "stacked"       No top-level header — the section header is compact
 *                   and inline. Used inside the asymmetric Health + Map zone.
 *
 * ACCENT COLOURS (semantic):
 *   purple   → AI / intelligence
 *   cyan     → Pollutants / water quality
 *   emerald  → Health / safety
 *   sky      → Weather / spatial
 *   amber    → Regional / comparison / warnings
 *   coral    → Alerts / critical
 *
 * Typography hierarchy (largest → smallest):
 *   eyebrow   9.5px / bold / 0.24em tracking / uppercase
 *   title     display font / tight tracking / 2rem–3rem
 *   description  sm / muted / max-w-lg
 */

type AccentKey = "purple" | "cyan" | "emerald" | "sky" | "amber" | "coral";
type LayoutMode = "full" | "split-right" | "stacked";

const ACCENT: Record<AccentKey, { fg: string; stripe: string; glow: string }> = {
  purple: {
    fg:     "oklch(0.72 0.17 295)",
    stripe: "oklch(0.65 0.18 295)",
    glow:   "oklch(0.52 0.17 295 / 0.12)",
  },
  cyan: {
    fg:     "oklch(0.72 0.14 210)",
    stripe: "oklch(0.65 0.15 210)",
    glow:   "oklch(0.52 0.14 210 / 0.10)",
  },
  emerald: {
    fg:     "oklch(0.70 0.17 158)",
    stripe: "oklch(0.62 0.18 158)",
    glow:   "oklch(0.50 0.17 158 / 0.10)",
  },
  sky: {
    fg:     "oklch(0.72 0.12 238)",
    stripe: "oklch(0.65 0.13 238)",
    glow:   "oklch(0.52 0.12 238 / 0.09)",
  },
  amber: {
    fg:     "oklch(0.80 0.16 78)",
    stripe: "oklch(0.72 0.17 78)",
    glow:   "oklch(0.58 0.16 78 / 0.10)",
  },
  coral: {
    fg:     "oklch(0.68 0.18 28)",
    stripe: "oklch(0.60 0.19 28)",
    glow:   "oklch(0.50 0.18 28 / 0.10)",
  },
};

interface EnvPageSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  accent: AccentKey;
  layout: LayoutMode;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}

export function EnvPageSection({
  eyebrow,
  title,
  description,
  accent,
  layout,
  compact = false,
  className,
  children,
}: EnvPageSectionProps) {
  const ac = ACCENT[accent];
  const id = `env-sec-${title.replace(/\s+/g, "-").toLowerCase().slice(0, 32)}`;

  /* ─── STACKED: compact inline header, used in two-column zones ─────────── */
  if (layout === "stacked") {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-h`}
        className={cn("env-section-stacked", compact && "env-section-stacked--compact", className)}
      >
        <div className="env-section-stacked__header">
          <div
            className="env-section-stacked__stripe"
            style={{ background: `linear-gradient(180deg, ${ac.stripe} 0%, transparent 100%)` }}
            aria-hidden="true"
          />
          <div className="env-section-stacked__labels">
            <span
              className="env-eyebrow"
              style={{ color: ac.fg }}
            >
              {eyebrow}
            </span>
            <h2 id={`${id}-h`} className="env-title-compact">
              {title}
            </h2>
          </div>
        </div>
        <div className="env-section-stacked__body">
          {children}
        </div>
      </section>
    );
  }

  /* ─── SPLIT-RIGHT: header left 40%, content right 60% ─────────────────── */
  if (layout === "split-right") {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-h`}
        className={cn("env-section-split", className)}
      >
        {/* Left: header column */}
        <div className="env-section-split__header">
          {/* Top accent bar */}
          <div
            className="env-section-split__bar"
            style={{ background: `linear-gradient(90deg, ${ac.stripe}, transparent)` }}
            aria-hidden="true"
          />

          <span className="env-eyebrow" style={{ color: ac.fg }}>
            {eyebrow}
          </span>

          <h2 id={`${id}-h`} className="env-title-display">
            {title}
          </h2>

          {description && (
            <p className="env-description">
              {description}
            </p>
          )}

          {/* Vertical glow accent line */}
          <div
            className="env-section-split__glow-line"
            style={{
              background: `linear-gradient(180deg, ${ac.stripe} 0%, ${ac.stripe}00 100%)`,
            }}
            aria-hidden="true"
          />
        </div>

        {/* Right: content column */}
        <div className="env-section-split__body">
          {children}
        </div>
      </section>
    );
  }

  /* ─── FULL: standard stacked header + content, full width ──────────────── */
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={cn("env-section-full", className)}
    >
      <div className="env-section-full__header">
        {/* Horizontal rule with accent fade */}
        <div
          className="env-section-full__rule"
          style={{
            background: `linear-gradient(90deg, ${ac.stripe} 0%, ${ac.stripe} 48px, ${ac.stripe}00 100%)`,
          }}
          aria-hidden="true"
        />

        <div className="env-section-full__heading-group">
          <span className="env-eyebrow" style={{ color: ac.fg }}>
            {eyebrow}
          </span>
          <h2 id={`${id}-h`} className="env-title-section">
            {title}
          </h2>
          {description && (
            <p className="env-description">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="env-section-full__body">
        {children}
      </div>
    </section>
  );
}
