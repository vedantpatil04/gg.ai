/**
 * MiniTrendCard — Phase 8
 *
 * Phase 5-6 added inView-triggered animation.
 * Phase 8 adds:
 *  - Cyan GlowCard ambient lighting (--glow-chart)
 *  - Recharts ReferenceLine crosshair on hover
 *  - Custom animated tooltip with dot indicator
 *  - Double-gradient: primary stroke at top, cyan tint at bottom
 *  - Dot marker on the last data point
 */

import { EmptyState } from "@/components/ui-bits";
import { GlowCard } from "@/components/dashboard/motion-primitives";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { TrendingUp, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { FADE, DUR_LG, EASE_OUT } from "@/lib/motion";

export interface TrendPoint {
  label: string;
  aqi: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color =
    val > 150
      ? "var(--color-destructive)"
      : val > 100
        ? "var(--color-warning)"
        : "var(--color-success)";
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs"
      style={{
        background: "var(--color-popover)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-elev)",
      }}
    >
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5 font-semibold tabular-nums">
        <span className="size-2 rounded-full" style={{ background: color }} />
        AQI {val}
      </div>
    </div>
  );
}

export function MiniTrendCard({
  series,
  isLoading,
}: {
  series: TrendPoint[];
  isLoading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  const lastVal = series.length > 0 ? series[series.length - 1].aqi : null;
  const lastColor =
    lastVal == null
      ? "var(--color-primary)"
      : lastVal > 150
        ? "var(--color-destructive)"
        : lastVal > 100
          ? "var(--color-warning)"
          : "var(--color-success)";

  return (
    <GlowCard glowVar="--glow-chart" lift={false} className="p-0">
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Telemetry
            </div>
            <div className="text-base font-semibold tracking-tight mt-0.5">AQI Trend</div>
          </div>
          <a
            className="text-[11px] text-primary inline-flex items-center gap-0.5 hover:underline transition-opacity mt-0.5"
            href="#detailed-analytics"
          >
            Full trend <ChevronRight className="size-3" />
          </a>
        </div>
      </div>

      <div className="px-5 pb-5">
        <motion.div
          ref={ref}
          variants={FADE}
          initial={prefersReduced ? false : "hidden"}
          animate={inView ? "show" : "hidden"}
          transition={{ duration: DUR_LG, ease: EASE_OUT }}
        >
          {isLoading ? (
            <CardSkeleton rows={3} />
          ) : series.length === 0 ? (
            <EmptyState icon={<TrendingUp className="size-4" />} title="Chart will appear here." />
          ) : (
            <div className="h-40">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="phase8AqiGradTop" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                      <stop offset="55%" stopColor="oklch(0.68 0.16 190)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="oklch(0.68 0.16 190)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "var(--color-border)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    stroke={lastColor}
                    strokeWidth={2.5}
                    fill="url(#phase8AqiGradTop)"
                    isAnimationActive={inView && !prefersReduced}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: lastColor,
                      stroke: "var(--color-background)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>
    </GlowCard>
  );
}
