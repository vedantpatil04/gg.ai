/**
 * renewable-card.tsx — Phase 3 Renewable Energy Intelligence module
 *
 * All values derived from existing per-city energy mix logic in the route
 * (solar/wind/hydro/fossil percentages), plus city.carbon for grid intensity.
 * No new data fields or backend calls.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Sun, Wind, Droplets, Flame } from "lucide-react";
import { trendSeries } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { CountUp } from "@/components/sustainability/count-up";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";

interface EnergySource { icon: typeof Sun; label: string; pct: number; color: string }

function AnimatedEnergyBar({
  pct, color, delay,
}: { pct: number; color: string; delay: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function RenewableCard({
  city, mix, renewableShare,
}: {
  city: City;
  mix: { name: string; v: number; c: string }[];
  renewableShare: number;
}) {
  // Map mix array to typed sources with icons
  const sources: EnergySource[] = useMemo(() => [
    { icon: Sun,      label: "Solar",  pct: mix[0].v, color: "var(--color-warning)" },
    { icon: Wind,     label: "Wind",   pct: mix[1].v, color: "var(--color-info)" },
    { icon: Droplets, label: "Hydro",  pct: mix[2].v, color: "var(--color-primary)" },
    { icon: Flame,    label: "Fossil", pct: mix[3].v, color: "var(--color-destructive)" },
  ], [mix]);

  // Synthetic 12-month renewable trend
  const renewTrend = useMemo(() =>
    trendSeries(renewableShare * 7, renewableShare * 5, 12, 8).map((d, i) => ({
      m: ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
      r: Math.max(10, Math.min(80, Math.round(renewableShare - 6 + (d.aqi % 12)))),
    })),
  [renewableShare]);

  const target    = 40;
  const gap       = Math.max(0, target - renewableShare);
  const onTarget  = renewableShare >= target;
  const accent    = onTarget ? "var(--color-success)" : renewableShare >= 30
    ? "var(--color-warning)" : "var(--color-destructive)";
  const gridIntensity = Math.round(city.carbon * 82); // gCO₂/kWh proxy

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 h-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Renewable Share</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            <CountUp value={renewableShare} />
            <span className="text-sm font-normal text-muted-foreground">%</span>
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
        >
          {onTarget ? "On target" : `${gap}% below target`}
        </div>
      </div>

      {/* Grid intensity context */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="text-muted-foreground">Grid intensity</div>
          <div className="font-semibold tabular-nums mt-0.5">{gridIntensity} gCO₂/kWh</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="text-muted-foreground">Clean energy target</div>
          <div className="font-semibold tabular-nums mt-0.5">{target}%</div>
        </div>
      </div>

      {/* Progress to 40% target */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress to {target}% target</span>
          <span className="tabular-nums font-medium text-foreground">
            {Math.min(100, Math.round((renewableShare / target) * 100))}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (renewableShare / target) * 100)}%` }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Source bars */}
      <div className="space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Generation by source</div>
        {sources.map((s, i) => (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <s.icon className="size-3" aria-hidden="true" />{s.label}
              </span>
              <span className="tabular-nums font-medium">{s.pct}%</span>
            </div>
            <AnimatedEnergyBar pct={s.pct} color={s.color} delay={0.1 + i * 0.07} />
          </div>
        ))}
      </div>

      {/* Trend sparkline */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">12-month renewable trend</div>
        <div className="h-20">
          <ResponsiveContainer>
            <AreaChart data={renewTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="renew-gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Renewables"]} />
              <Area type="monotone" dataKey="r" stroke={accent} strokeWidth={1.5}
                fill="url(#renew-gr)" dot={false}
                isAnimationActive animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
