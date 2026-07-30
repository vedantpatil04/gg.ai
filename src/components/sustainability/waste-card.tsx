/**
 * waste-card.tsx — Phase 3 Waste Intelligence module
 *
 * All values derived from existing City fields:
 *   city.eco     — primary proxy for overall environmental management quality
 *   city.aqi     — industrial activity proxy (affects waste generation estimate)
 *   city.pm25    — secondary proxy for waste-to-energy / open-burning signal
 *
 * No new backend fields or API calls.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Recycle, Trash2, TrendingUp } from "lucide-react";
import { trendSeries } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { CountUp } from "@/components/sustainability/count-up";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";

export function WasteCard({ city }: { city: City }) {
  // Rule-based derivations from existing fields
  const diversionRate  = Math.round(50 + city.eco * 0.15);
  const recyclingRate  = Math.round(diversionRate * 0.62);
  const composting     = Math.round(diversionRate * 0.22);
  const landfill       = 100 - diversionRate;
  const target         = 60;
  const progressPct    = Math.min(100, Math.round((diversionRate / target) * 100));

  const accent = diversionRate >= 60
    ? "var(--color-success)"
    : diversionRate >= 45
    ? "var(--color-warning)"
    : "var(--color-destructive)";

  // 12-month bar chart for waste diversion
  const wasteTrend = useMemo(() =>
    trendSeries(city.eco * 3, city.eco * 2, 12, 12).map((d, i) => ({
      m: ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
      divert: Math.max(20, Math.min(80, Math.round(diversionRate - 6 + (d.aqi % 12)))),
      landfill: Math.max(20, Math.min(80, 100 - Math.max(20, Math.min(80, Math.round(diversionRate - 6 + (d.aqi % 12)))))),
    })),
  [city.eco, diversionRate]);

  const streams = [
    { label: "Recycling",   pct: recyclingRate, color: "var(--color-info)" },
    { label: "Composting",  pct: composting,    color: "var(--color-success)" },
    { label: "Landfill",    pct: landfill,      color: "var(--color-destructive)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 h-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Waste Diverted</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            <CountUp value={diversionRate} />
            <span className="text-sm font-normal text-muted-foreground">%</span>
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
        >
          {diversionRate >= 60 ? "On target" : `Target: ${target}%`}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { icon: Recycle,  label: "Recycling",   value: `${recyclingRate}%` },
          { icon: TrendingUp, label: "Composting", value: `${composting}%` },
          { icon: Trash2,   label: "Landfill",    value: `${landfill}%` },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-muted/40 p-2 text-center">
            <s.icon className="size-3.5 mx-auto text-muted-foreground" aria-hidden="true" />
            <div className="text-muted-foreground mt-1">{s.label}</div>
            <div className="font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Diversion progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress to {target}% target</span>
          <span className="tabular-nums font-medium text-foreground">{progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Stream breakdown bars */}
      <div className="space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Waste streams</div>
        {streams.map((s, i) => (
          <div key={s.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="tabular-nums font-medium">{s.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: s.color }}
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 0.85, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 12-month bar chart */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">12-month diversion trend</div>
        <div className="h-28">
          <ResponsiveContainer>
            <BarChart data={wasteTrend} barSize={10} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="divert"   name="Diverted" fill={accent}                          radius={[3,3,0,0]} isAnimationActive animationDuration={800} />
              <Bar dataKey="landfill" name="Landfill"  fill="var(--color-destructive)" opacity={0.55} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationBegin={100} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
