/**
 * green-cover-card.tsx — Phase 3 Green Cover Intelligence module
 *
 * Derived from:
 *   greenCover   — city-specific percentage (passed as prop, same calc as route)
 *   city.eco     — overall sustainability score (vegetation health proxy)
 *   city.temp    — heat island severity proxy
 *   city.aqi     — particulate context (tree filtering benefit)
 *
 * No new backend fields or API calls.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { TreePine, Thermometer, Wind } from "lucide-react";
import { trendSeries } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { CountUp } from "@/components/sustainability/count-up";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";

// Animated radial ring (reusable within this file)
function MiniRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }} aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--color-muted)" strokeWidth="6" fill="none" />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{ strokeDasharray: circ }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-sm font-semibold tabular-nums leading-none">{pct}%</div>
      </div>
    </div>
  );
}

export function GreenCoverCard({ city, greenCover }: { city: City; greenCover: number }) {
  const target          = 30;
  const onTarget        = greenCover >= target;
  const sequestration   = Math.round(greenCover * 3);        // ktCO₂ — same as KPI
  const treesPlanted    = Math.round(greenCover * 6.8);      // k units — same as KPI
  // Vegetation health: higher eco + lower temp = better health
  const vegHealth       = Math.min(100, Math.round(city.eco * 0.7 + (40 - city.temp) * 0.6));
  // Heat island reduction: more green = lower heat island
  const heatReduction   = Math.min(4.5, parseFloat((greenCover * 0.072).toFixed(1)));
  // Air filtering: trees remove particulates proportional to coverage
  const airFiltering    = Math.round(greenCover * 0.38 * (city.pm25 / 30));

  const accent = onTarget ? "var(--color-success)" : "var(--color-warning)";

  const coverTrend = useMemo(() =>
    trendSeries(greenCover * 5, greenCover * 4, 12, 6).map((d, i) => ({
      m: ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
      g: Math.max(10, Math.min(60, Math.round(greenCover - 4 + (d.aqi % 8)))),
    })),
  [greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 h-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <MiniRing pct={greenCover} color={accent} size={88} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Green Cover</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            <CountUp value={greenCover} />
            <span className="text-sm font-normal text-muted-foreground">%</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Target <span className="font-medium text-foreground">{target}%</span> urban canopy
          </div>
          <div
            className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
          >
            {onTarget ? "On target" : `${target - greenCover}% below target`}
          </div>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { icon: TreePine,    label: "Sequestration", value: `${sequestration} ktCO₂` },
          { icon: TreePine,    label: "Trees planted",  value: `${treesPlanted}k` },
          { icon: Thermometer, label: "Heat island −",  value: `${heatReduction}°C` },
          { icon: Wind,        label: "Air filtering",  value: `${airFiltering} t/yr` },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-muted/40 p-2.5 flex items-center gap-2">
            <m.icon className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div>
              <div className="text-muted-foreground">{m.label}</div>
              <div className="font-semibold tabular-nums">{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Vegetation health bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Vegetation health</span>
          <span className="tabular-nums font-medium text-foreground">{vegHealth}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${vegHealth}%` }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Trend sparkline */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">12-month cover trend</div>
        <div className="h-20">
          <ResponsiveContainer>
            <AreaChart data={coverTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="green-gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Green cover"]} />
              <Area type="monotone" dataKey="g" stroke={accent} strokeWidth={1.5}
                fill="url(#green-gr)" dot={false}
                isAnimationActive animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
