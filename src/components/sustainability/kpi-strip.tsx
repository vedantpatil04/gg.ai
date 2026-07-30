/**
 * kpi-strip.tsx — Phase 2 executive KPI strip (upgraded)
 *
 * Phase 1 already had glass cards, count-up numbers, hover glow, and
 * progress bars. Phase 2 adds:
 *   • Optional trend arrow + coloured delta label (trend field)
 *   • Status badge (e.g. "On track", "Below target", "Critical")
 *
 * KpiItem is extended with optional `trend` and `status` fields.
 * All existing callers work unchanged because the new fields are optional.
 */
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CountUp } from "@/components/sustainability/count-up";

export interface KpiItem {
  icon: LucideIcon;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  accent: string;
  /** Reference value for the mini progress bar — percentage metrics only. */
  target?: number;
  targetLabel?: string;
  /** Phase 2 — optional trend indicator */
  trend?: { direction: "up" | "down" | "flat"; delta: number; unit?: string };
  /** Phase 2 — optional status badge */
  status?: { label: string; tone: "good" | "warning" | "critical" };
}

const TONE_COLORS = {
  good:     { fg: "var(--color-success)",     bg: "color-mix(in oklab, var(--color-success) 14%, transparent)" },
  warning:  { fg: "var(--color-warning)",     bg: "color-mix(in oklab, var(--color-warning) 14%, transparent)" },
  critical: { fg: "var(--color-destructive)", bg: "color-mix(in oklab, var(--color-destructive) 14%, transparent)" },
};

export function ExecutiveKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((k, i) => {
        const progress = k.target ? Math.min(100, Math.round((k.value / k.target) * 100)) : null;
        const toneColors = k.status ? TONE_COLORS[k.status.tone] : null;

        const TrendIcon = k.trend?.direction === "up"
          ? TrendingUp
          : k.trend?.direction === "down"
          ? TrendingDown
          : Minus;
        const trendColor = k.trend?.direction === "up"
          ? "var(--color-success)"
          : k.trend?.direction === "down"
          ? "var(--color-destructive)"
          : "var(--color-muted-foreground)";

        return (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
            className="glass rounded-2xl p-4 relative overflow-hidden group transition-shadow duration-300"
            style={{ boxShadow: "var(--shadow-elev)" }}
            role="group"
            aria-label={`${k.label}: ${k.value}${k.suffix ?? ""}`}
          >
            {/* Hover glow overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${k.accent} 45%, transparent), 0 12px 32px -16px color-mix(in oklab, ${k.accent} 55%, transparent)` }}
            />

            {/* Header row — icon + label */}
            <div className="relative flex items-center justify-between">
              <div
                className="size-9 rounded-lg grid place-items-center shrink-0"
                style={{ background: `color-mix(in oklab, ${k.accent} 18%, transparent)`, color: k.accent }}
              >
                <k.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-right leading-tight max-w-[7rem]">
                {k.label}
              </div>
            </div>

            {/* Value */}
            <div className="relative text-2xl font-semibold tabular-nums mt-3">
              <CountUp value={k.value} decimals={k.decimals ?? 0} />
              {k.suffix}
            </div>

            {/* Phase 2 — trend arrow */}
            {k.trend && (
              <div
                className="relative inline-flex items-center gap-1 text-[10px] font-medium mt-1 tabular-nums"
                style={{ color: trendColor }}
                aria-label={`Trend: ${k.trend.direction}, ${k.trend.delta}${k.trend.unit ?? ""}`}
              >
                <TrendIcon className="size-3" aria-hidden="true" />
                {k.trend.direction !== "flat" && (
                  `${k.trend.direction === "up" ? "+" : "-"}${k.trend.delta}${k.trend.unit ?? ""}`
                )}
                {k.trend.direction === "flat" && "Stable"}
              </div>
            )}

            {/* Phase 2 — status badge */}
            {k.status && toneColors && (
              <div
                className="relative inline-block px-2 py-0.5 rounded-full text-[9px] font-medium mt-1.5"
                style={{ color: toneColors.fg, background: toneColors.bg }}
              >
                {k.status.label}
              </div>
            )}

            {/* Progress bar (Phase 1, unchanged) */}
            {progress !== null && (
              <div className="relative mt-3">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: k.accent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.15 + i * 0.05, ease: "easeOut" }}
                  />
                </div>
                {k.targetLabel && (
                  <div className="text-[9px] text-muted-foreground mt-1">{k.targetLabel}</div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
