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
  target?: number;
  targetLabel?: string;
  trend?: { direction: "up" | "down" | "flat"; delta: number; unit?: string };
  status?: { label: string; tone: "good" | "warning" | "critical" };
}

const TONE_COLORS = {
  good:     { fg: "var(--color-success)",     bg: "color-mix(in oklab, var(--color-success) 14%, transparent)" },
  warning:  { fg: "var(--color-warning)",     bg: "color-mix(in oklab, var(--color-warning) 14%, transparent)" },
  critical: { fg: "var(--color-destructive)", bg: "color-mix(in oklab, var(--color-destructive) 14%, transparent)" },
};

export function ExecutiveKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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
            className="glass rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-shadow duration-300 flex flex-col justify-between"
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
            <div className="relative flex items-center justify-between gap-2">
              <div
                className="size-10 rounded-xl grid place-items-center shrink-0 shadow-sm"
                style={{ background: `color-mix(in oklab, ${k.accent} 18%, transparent)`, color: k.accent }}
              >
                <k.icon className="size-5" aria-hidden="true" />
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground text-right font-semibold leading-tight truncate">
                {k.label}
              </div>
            </div>

            {/* Value (+15% larger typography) */}
            <div className="relative text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight mt-3">
              <CountUp value={k.value} decimals={k.decimals ?? 0} />
              {k.suffix}
            </div>

            {/* Trend indicator */}
            {k.trend && (
              <div
                className="relative inline-flex items-center gap-1 text-xs font-semibold mt-1 tabular-nums"
                style={{ color: trendColor }}
                aria-label={`Trend: ${k.trend.direction}, ${k.trend.delta}${k.trend.unit ?? ""}`}
              >
                <TrendIcon className="size-3.5" aria-hidden="true" />
                {k.trend.direction !== "flat" && (
                  `${k.trend.direction === "up" ? "+" : "-"}${k.trend.delta}${k.trend.unit ?? ""}`
                )}
                {k.trend.direction === "flat" && "Stable"}
              </div>
            )}

            {/* Status badge */}
            {k.status && toneColors && (
              <div
                className="relative inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold mt-2"
                style={{ color: toneColors.fg, background: toneColors.bg }}
              >
                {k.status.label}
              </div>
            )}

            {/* Progress bar */}
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
                  <div className="text-[10px] text-muted-foreground font-medium mt-1 truncate">{k.targetLabel}</div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
