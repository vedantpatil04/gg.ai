/**
 * carbon-card.tsx — Phase 3 Carbon Intelligence module
 *
 * Derives all displayed values from existing City fields:
 *   city.carbon  — per-capita tCO₂/yr (primary)
 *   city.co2     — atmospheric CO₂ ppm (secondary context)
 *   city.aqi     — used to estimate transport sector proxy
 *   city.pm25    — industrial activity proxy
 *
 * Sector split is rule-based normalisation, not a new calculation.
 * No backend endpoints are added or modified.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { Factory, Car, Home, Zap, TrendingDown } from "lucide-react";
import { trendSeries } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { CountUp } from "@/components/sustainability/count-up";

// ─── shared tooltip style (avoids repeating the object everywhere) ───────────
export const TOOLTIP_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--color-foreground)",
};

// ─── animated progress bar ───────────────────────────────────────────────────
function ProgressBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ─── sector row ──────────────────────────────────────────────────────────────
function SectorRow({
  icon: Icon, label, pct, color, delay,
}: { icon: typeof Factory; label: string; pct: number; color: string; delay: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3" aria-hidden="true" />{label}
        </span>
        <span className="tabular-nums font-medium">{pct}%</span>
      </div>
      <ProgressBar pct={pct} color={color} delay={delay} />
    </div>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────
export function CarbonCard({ city }: { city: City }) {
  // Sector split derived from existing field proxies — rule-based normalisation
  const sectors = useMemo(() => {
    const transport  = Math.min(42, Math.round(city.aqi * 0.14 + 8));
    const industrial = Math.min(38, Math.round(city.pm25 * 0.22 + 4));
    const buildings  = Math.min(28, Math.max(12, 38 - transport - industrial + 12));
    const energy     = Math.max(6, 100 - transport - industrial - buildings);
    return [
      { icon: Car,     label: "Transport",   pct: transport,  color: "var(--color-destructive)" },
      { icon: Factory, label: "Industrial",  pct: industrial, color: "var(--color-warning)" },
      { icon: Home,    label: "Buildings",   pct: buildings,  color: "var(--color-info)" },
      { icon: Zap,     label: "Energy grid", pct: energy,     color: "var(--color-primary)" },
    ];
  }, [city.aqi, city.pm25]);

  // 12-point synthetic carbon trend using trendSeries seed
  const carbonTrend = useMemo(() =>
    trendSeries(city.carbon * 10, city.carbon * 8, 12, 6).map((d, i) => ({
      m: ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
      t: Math.max(0, parseFloat((city.carbon - 1 + (d.aqi % 2.5) * 0.1).toFixed(2))),
    })),
  [city.carbon]);

  // Reduction target: 20% below current
  const target     = parseFloat((city.carbon * 0.8).toFixed(1));
  const reduction  = parseFloat((city.carbon - target).toFixed(1));
  const progressPct = Math.min(100, Math.round(((12 - city.carbon) / (12 - target)) * 100));
  const status = city.carbon < 5 ? "good" : city.carbon < 8 ? "warning" : "critical";
  const statusColors = {
    good:     "var(--color-success)",
    warning:  "var(--color-warning)",
    critical: "var(--color-destructive)",
  };
  const accent = statusColors[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 h-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Carbon Intensity</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            <CountUp value={city.carbon} decimals={1} />{" "}
            <span className="text-sm font-normal text-muted-foreground">tCO₂ / cap</span>
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
        >
          {status === "good" ? "Low intensity" : status === "warning" ? "Moderate" : "High intensity"}
        </div>
      </div>

      {/* CO₂ context row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="text-muted-foreground">Atmospheric CO₂</div>
          <div className="font-semibold tabular-nums mt-0.5">{city.co2} ppm</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="text-muted-foreground">Reduction target</div>
          <div className="font-semibold tabular-nums mt-0.5 flex items-center gap-1">
            <TrendingDown className="size-3 text-success" aria-hidden="true" />
            {target} t (−{reduction})
          </div>
        </div>
      </div>

      {/* Progress toward target */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Reduction progress</span>
          <span className="tabular-nums font-medium text-foreground">{progressPct}%</span>
        </div>
        <ProgressBar pct={progressPct} color={accent} delay={0.1} />
      </div>

      {/* Sector split */}
      <div className="space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector breakdown</div>
        {sectors.map((s, i) => (
          <SectorRow key={s.label} {...s} delay={0.1 + i * 0.07} />
        ))}
      </div>

      {/* Mini pie */}
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={sectors.map(s => ({ name: s.label, v: s.pct }))} dataKey="v"
                innerRadius={28} outerRadius={44} paddingAngle={2}>
                {sectors.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* 12-month trend sparkline */}
        <div className="flex-1 h-24">
          <ResponsiveContainer>
            <AreaChart data={carbonTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="carbon-gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toFixed(2), "tCO₂"]} />
              <Area type="monotone" dataKey="t" stroke={accent} strokeWidth={1.5}
                fill="url(#carbon-gr)" dot={false}
                isAnimationActive animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
