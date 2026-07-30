/**
 * water-card.tsx — Phase 3 Water Intelligence module
 *
 * Derives all values from city.water (quality %) and city.humidity (a proxy
 * for environmental moisture context). No new backend fields introduced.
 *
 *   city.water   — 0–100 water sustainability index (primary)
 *   city.humidity — % relative humidity (context)
 *   city.co2     — used only as a seed for synthetic trend variety
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Droplets, CheckCircle2, AlertTriangle } from "lucide-react";
import { trendSeries } from "@/lib/mock-data";
import type { City } from "@/lib/mock-data";
import { CountUp } from "@/components/sustainability/count-up";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";

function RingGauge({ pct, color }: { pct: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 grid place-items-center shrink-0">
      <svg viewBox="0 0 88 88" className="h-24 w-24 -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={r} stroke="var(--color-muted)" strokeWidth="7" fill="none" />
        <motion.circle
          cx="44" cy="44" r={r}
          stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ strokeDasharray: circ }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-semibold tabular-nums leading-none">{pct}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

export function WaterCard({ city }: { city: City }) {
  const waterReuse   = Math.round(city.water * 0.56);
  const conservation = Math.min(100, Math.round(city.water * 0.88));
  const treatment    = Math.min(100, Math.round(city.water * 0.92));
  const efficiency   = Math.min(100, Math.round(city.water * 0.74));

  const accent = city.water >= 80
    ? "var(--color-info)"
    : city.water >= 60
    ? "var(--color-warning)"
    : "var(--color-destructive)";

  const statusLabel = city.water >= 80 ? "Excellent" : city.water >= 60 ? "Moderate" : "Poor";
  const StatusIcon  = city.water >= 60 ? CheckCircle2 : AlertTriangle;

  const waterTrend = useMemo(() =>
    trendSeries(city.co2 % 40, city.water * 0.7, 12, 10).map((d, i) => ({
      m: ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
      w: Math.max(20, Math.min(100, Math.round(city.water - 8 + (d.aqi % 16)))),
    })),
  [city.water, city.co2]);

  const metrics = [
    { label: "Water quality index",    value: city.water,   pct: city.water },
    { label: "Reuse rate",             value: waterReuse,   pct: waterReuse },
    { label: "Conservation score",     value: conservation, pct: conservation },
    { label: "Treatment efficiency",   value: treatment,    pct: treatment },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 h-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <RingGauge pct={city.water} color={accent} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Water Sustainability</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            <CountUp value={city.water} />
            <span className="text-sm font-normal text-muted-foreground">%</span>
          </div>
          <div
            className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
          >
            <StatusIcon className="size-3" aria-hidden="true" />{statusLabel}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            Humidity: <span className="font-medium text-foreground">{city.humidity}%</span>
          </div>
        </div>
      </div>

      {/* Metric bars */}
      <div className="space-y-2.5">
        {metrics.map((m, i) => (
          <div key={m.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="tabular-nums font-medium">{m.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent }}
                initial={{ width: 0 }}
                animate={{ width: `${m.pct}%` }}
                transition={{ duration: 0.85, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Reuse efficiency row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="text-muted-foreground">Reuse rate</div>
          <div className="font-semibold tabular-nums mt-0.5">{waterReuse}%</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="text-muted-foreground">Efficiency score</div>
          <div className="font-semibold tabular-nums mt-0.5">{efficiency}%</div>
        </div>
      </div>

      {/* Trend */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Usage trend (12 mo)</div>
        <div className="h-20">
          <ResponsiveContainer>
            <AreaChart data={waterTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="water-gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Water quality"]} />
              <Area type="monotone" dataKey="w" stroke={accent} strokeWidth={1.5}
                fill="url(#water-gr)" dot={false}
                isAnimationActive animationDuration={900} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
