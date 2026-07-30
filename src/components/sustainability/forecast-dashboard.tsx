/**
 * forecast-dashboard.tsx — Phase 6 Predictive Sustainability Intelligence
 *
 * EcoScore forecast (7 / 30 / 90 days), per-metric environmental forecast
 * cards, confidence band area chart, and sustainability forecast timeline.
 *
 * All projections are rule-based linear extrapolations seeded from the same
 * `trendSeries` helper already used across the analytics panels. No new
 * backend endpoints. Confidence degrades with horizon length (a standard,
 * honest property of any open-loop forecast).
 *
 * Exports:
 *   ForecastDashboard   — main container (forecast summary + EcoScore chart)
 *   EnvForecastCards    — per-metric (AQI / Carbon / Water / Renewable) row
 *   ForecastTimeline    — milestone timeline with predicted events
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Target,
  Gauge, Droplets, Zap, Factory, Leaf, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trendSeries } from "@/lib/mock-data";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";
import { CountUp } from "@/components/sustainability/count-up";
import type { City } from "@/lib/mock-data";

// ─── types ────────────────────────────────────────────────────────────────────

type Horizon = "7d" | "30d" | "90d";

interface MetricForecast {
  icon: typeof Gauge;
  label: string;
  current: number;
  predicted: number;
  unit: string;
  color: string;
  confidence: number;
  trend: "up" | "down" | "flat";
  higherIsBetter: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function horizonDays(h: Horizon) { return h === "7d" ? 7 : h === "30d" ? 30 : 90; }

/** Confidence degrades with horizon: 7d=88%, 30d=74%, 90d=56% */
function horizonConfidence(h: Horizon, baseConf: number) {
  const decay = h === "7d" ? 1 : h === "30d" ? 0.84 : 0.64;
  return Math.round(baseConf * decay);
}

/**
 * Simple linear extrapolation with bounded noise.
 * slope — points-per-day expected change
 * Returns {points, upper, lower} arrays for the forecast period.
 */
function forecast(
  current: number, slope: number, days: number,
  noiseAmp: number, min = 0, max = 100,
) {
  return Array.from({ length: days + 1 }, (_, i) => {
    const noise = (Math.sin(i * 1.618) * noiseAmp);
    const v = Math.max(min, Math.min(max, current + slope * i + noise));
    const band = noiseAmp * 1.5 * (i / days);
    return {
      d: i,
      v: parseFloat(v.toFixed(1)),
      upper: parseFloat(Math.min(max, v + band).toFixed(1)),
      lower: parseFloat(Math.max(min, v - band).toFixed(1)),
    };
  });
}

/** Derive per-metric slope from existing city fields. */
function ecoSlope(city: City): number {
  // Higher AQI or carbon → slight downward pressure; lower → neutral/up
  const airPressure  = city.aqi > 150 ? -0.04 : city.aqi < 80 ? 0.02 : 0;
  const carbonPress  = city.carbon > 7 ? -0.03 : city.carbon < 5 ? 0.02 : 0;
  return airPressure + carbonPress;
}

// ─── horizon selector ─────────────────────────────────────────────────────────

function HorizonSelector({ value, onChange }: { value: Horizon; onChange: (v: Horizon) => void }) {
  const opts: { id: Horizon; label: string }[] = [
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "90d", label: "90 Days" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1" role="group" aria-label="Forecast horizon">
      {opts.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            value === o.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── confidence badge ─────────────────────────────────────────────────────────

function ConfBadge({ pct, className }: { pct: number; className?: string }) {
  const color = pct >= 80 ? "var(--color-success)" : pct >= 65 ? "var(--color-warning)" : "var(--color-muted-foreground)";
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", className)}
      style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      {pct}% confidence
    </span>
  );
}

// ─── ForecastDashboard (EcoScore chart + summary) ─────────────────────────────

export function ForecastDashboard({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const [horizon, setHorizon] = useState<Horizon>("30d");
  const days = horizonDays(horizon);
  const slope = ecoSlope(city);
  const baseConf = 82;
  const conf = horizonConfidence(horizon, baseConf);

  const series = useMemo(
    () => forecast(city.eco, slope, days, 1.8, 0, 100),
    [city.eco, slope, days],
  );

  const predicted = series[series.length - 1].v;
  const delta     = parseFloat((predicted - city.eco).toFixed(1));
  const direction = delta > 0.4 ? "up" : delta < -0.4 ? "down" : "flat";
  const TrendIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const trendColor = direction === "up" ? "var(--color-success)" : direction === "down" ? "var(--color-destructive)" : "var(--color-muted-foreground)";

  // Label x-axis by week/month markers depending on horizon
  const labelledSeries = series.filter((_, i) => {
    if (days === 7)  return true;
    if (days === 30) return i % 5 === 0;
    return i % 15 === 0;
  }).map(p => ({
    ...p,
    label: days === 7 ? `D${p.d}` : days === 30 ? `D${p.d}` : `D${p.d}`,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">EcoScore Forecast</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-semibold tabular-nums">
              <CountUp value={predicted} decimals={1} />
            </span>
            <span className="text-sm text-muted-foreground">predicted in {horizon}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums" style={{ color: trendColor }}>
              <TrendIcon className="size-3.5" />
              {direction === "flat" ? "Stable" : `${delta > 0 ? "+" : ""}${delta} pts`}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ConfBadge pct={conf} />
            <span className="text-[10px] text-muted-foreground">
              {conf >= 80 ? "High reliability" : conf >= 65 ? "Moderate reliability" : "Indicative only"}
            </span>
          </div>
        </div>
        <HorizonSelector value={horizon} onChange={setHorizon} />
      </div>

      {/* Confidence band + predicted line */}
      <div className="h-56">
        <ResponsiveContainer>
          <AreaChart data={labelledSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fc-band-gr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [v, name === "upper" || name === "lower" ? "Confidence band" : "EcoScore"]} />
            {/* Upper confidence band */}
            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#fc-band-gr)" isAnimationActive animationDuration={900} />
            {/* Lower confidence band (white fill to create hollow middle) */}
            <Area type="monotone" dataKey="lower" stroke="none" fill="var(--color-background)" fillOpacity={0.8} isAnimationActive animationDuration={900} />
            {/* Forecast line */}
            <Area type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={2}
              fill="none" dot={false} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
            {/* Current baseline */}
            <ReferenceLine y={city.eco} stroke="var(--color-muted-foreground)" strokeDasharray="4 2"
              label={{ value: `Now: ${city.eco}`, position: "insideBottomRight", fontSize: 10, fill: "var(--color-muted-foreground)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Horizon comparison row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center text-xs">
        {(["7d","30d","90d"] as Horizon[]).map(h => {
          const d   = horizonDays(h);
          const pts = forecast(city.eco, slope, d, 1.8, 0, 100);
          const v   = pts[pts.length - 1].v;
          const c   = horizonConfidence(h, baseConf);
          const diff = parseFloat((v - city.eco).toFixed(1));
          return (
            <div key={h} className={cn("rounded-xl p-2.5 border transition-colors", h === horizon ? "border-primary/40 bg-primary/6" : "border-border bg-muted/20")}>
              <div className="text-muted-foreground">{h}</div>
              <div className="font-semibold tabular-nums mt-0.5">{v}</div>
              <div className="text-[9px] mt-0.5" style={{ color: diff >= 0 ? "var(--color-success)" : "var(--color-destructive)" }}>
                {diff >= 0 ? "+" : ""}{diff} pts
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{c}% conf</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── EnvForecastCards ─────────────────────────────────────────────────────────

export function EnvForecastCards({ city, renewableShare }: { city: City; renewableShare: number }) {
  const [horizon, setHorizon] = useState<Horizon>("30d");

  const metrics: MetricForecast[] = useMemo(() => {
    const days = horizonDays(horizon);
    const make = (current: number, slope: number, conf: number) => {
      const pts = forecast(current, slope, days, current * 0.02, 0, 500);
      return { predicted: pts[pts.length - 1].v, confidence: horizonConfidence(horizon, conf) };
    };
    const aqiSlope    = city.aqi > 150 ? 0.06 : city.aqi < 80 ? -0.02 : 0;
    const waterSlope  = city.water < 65 ? -0.03 : city.water > 80 ? 0.01 : 0;
    const carbonSlope = city.carbon > 7 ? 0.005 : -0.005;
    const renewSlope  = renewableShare < 40 ? 0.04 : 0.01;

    const aqi     = make(city.aqi,        aqiSlope,    80);
    const water   = make(city.water,      waterSlope,  84);
    const carbon  = make(city.carbon,     carbonSlope, 76);
    const renew   = make(renewableShare,  renewSlope,  78);

    return [
      {
        icon: Gauge, label: "AQI", current: city.aqi, unit: "",
        color: "var(--color-primary)", higherIsBetter: false, ...aqi,
        trend: aqi.predicted > city.aqi + 2 ? "up" : aqi.predicted < city.aqi - 2 ? "down" : "flat",
      },
      {
        icon: Droplets, label: "Water Quality", current: city.water, unit: "%",
        color: "var(--color-info)", higherIsBetter: true, ...water,
        trend: water.predicted > city.water + 1 ? "up" : water.predicted < city.water - 1 ? "down" : "flat",
      },
      {
        icon: Factory, label: "Carbon", current: city.carbon, unit: " tCO₂",
        color: "var(--color-destructive)", higherIsBetter: false, ...carbon,
        trend: carbon.predicted > city.carbon + 0.05 ? "up" : carbon.predicted < city.carbon - 0.05 ? "down" : "flat",
      },
      {
        icon: Zap, label: "Renewables", current: renewableShare, unit: "%",
        color: "var(--color-warning)", higherIsBetter: true, ...renew,
        trend: renew.predicted > renewableShare + 0.5 ? "up" : "flat",
      },
    ];
  }, [city, renewableShare, horizon]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Environmental Forecast</div>
          <div className="text-sm font-semibold mt-0.5">Metric predictions by horizon</div>
        </div>
        <HorizonSelector value={horizon} onChange={setHorizon} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {metrics.map((m, i) => {
          const TrendIcon = m.trend === "up" ? TrendingUp : m.trend === "down" ? TrendingDown : Minus;
          // For "higher is better" metrics, up is good; for "lower is better", up is bad
          const isImproving = m.higherIsBetter ? m.trend === "up" : m.trend === "down";
          const isDeclining = m.higherIsBetter ? m.trend === "down" : m.trend === "up";
          const statusColor = isImproving ? "var(--color-success)" : isDeclining ? "var(--color-destructive)" : "var(--color-muted-foreground)";
          const delta = parseFloat((m.predicted - m.current).toFixed(m.unit === " tCO₂" ? 2 : 1));

          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
              className="rounded-xl border border-border p-3.5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, ${m.color} 16%, transparent)`, color: m.color }}>
                    <m.icon className="size-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-medium">{m.label}</span>
                </div>
                <ConfBadge pct={m.confidence} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-semibold tabular-nums mt-0.5">{m.current}{m.unit}</div>
                </div>
                <div className="rounded-lg p-2" style={{ background: `color-mix(in oklab, ${statusColor} 10%, var(--color-muted))` }}>
                  <div className="text-muted-foreground">In {horizon}</div>
                  <div className="font-semibold tabular-nums mt-0.5 flex items-center gap-1">
                    {m.predicted}{m.unit}
                    <TrendIcon className="size-3" style={{ color: statusColor }} />
                  </div>
                </div>
              </div>
              <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: m.color }}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m.predicted / (m.unit === " tCO₂" ? 12 : 100)) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.06 }} />
              </div>
              <div className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1" style={{ color: statusColor }}>
                <TrendIcon className="size-2.5" />
                {delta >= 0 ? "+" : ""}{delta}{m.unit} over {horizon}
                {" — "}
                {isImproving ? "improving" : isDeclining ? "declining" : "stable"}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── ForecastTimeline ─────────────────────────────────────────────────────────

interface ForecastEvent {
  week: number;
  label: string;
  type: "improvement" | "risk" | "milestone";
  description: string;
}

export function ForecastTimeline({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const events: ForecastEvent[] = useMemo(() => {
    const list: ForecastEvent[] = [];

    // Week 1
    if (city.aqi > 120) list.push({ week: 1, label: "Elevated AQI window", type: "risk", description: `AQI expected to remain above 120 for 3–5 days. Sensitive-group health advisories likely.` });
    else list.push({ week: 1, label: "Air quality stable", type: "improvement", description: `AQI ${city.aqi} — no deterioration forecast. Outdoor activities within normal limits.` });

    // Week 2–4
    if (city.water < 65) list.push({ week: 2, label: "Water stress risk", type: "risk", description: `Water quality index ${city.water}% — moderate conservation pressure expected to continue.` });
    if (renewableShare < 35) list.push({ week: 3, label: "Renewable gap persists", type: "risk", description: `${40 - renewableShare}% below clean energy target — grid carbon intensity remains elevated.` });
    else list.push({ week: 3, label: "Clean energy stable", type: "improvement", description: `Renewable share at ${renewableShare}% — on or above the 40% grid target.` });

    // Month milestone
    if (city.eco >= 70) list.push({ week: 4, label: "EcoScore likely to hold above 70", type: "milestone", description: `Current trajectory suggests EcoScore remains in the "Good" band through the next 30 days.` });
    else list.push({ week: 4, label: "EcoScore improvement opportunity", type: "improvement", description: `Targeted interventions in ${city.aqi > 130 ? "air quality" : city.water < 65 ? "water management" : "carbon reduction"} could push EcoScore above ${Math.min(95, city.eco + 8)} by day 30.` });

    // 90-day
    if (greenCover < 30) list.push({ week: 12, label: "Canopy gap likely sustained", type: "risk", description: `Urban green cover at ${greenCover}% — without active plantation, 30% target unreached by end of quarter.` });
    else list.push({ week: 12, label: "Urban canopy target sustained", type: "milestone", description: `${greenCover}% green cover — sequestration capacity expected to hold at ~${Math.round(greenCover * 3)} ktCO₂/yr.` });

    return list;
  }, [city, renewableShare, greenCover]);

  const typeColor: Record<ForecastEvent["type"], string> = {
    improvement: "var(--color-success)",
    risk:        "var(--color-destructive)",
    milestone:   "var(--color-primary)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sustainability Forecast Timeline</div>
        <div className="text-sm font-semibold mt-0.5">Predicted events — next 90 days</div>
      </div>

      <div className="relative">
        <div className="absolute left-[14px] top-0 bottom-0 w-px bg-border" aria-hidden="true" />
        <ol className="space-y-4" aria-label="Predicted sustainability events">
          {events.map((e, i) => {
            const color = typeColor[e.type];
            return (
              <motion.li
                key={e.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + i * 0.07 }}
                className="relative flex gap-3"
              >
                <div className="relative z-10 size-7 rounded-full grid place-items-center shrink-0 border-2 border-background"
                  style={{ background: `color-mix(in oklab, ${color} 18%, var(--color-card))`, color }}>
                  <CalendarDays className="size-3" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium" style={{ color }}>{e.label}</span>
                    <span className="text-[9px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full">
                      {e.week <= 1 ? "Week 1" : e.week <= 4 ? `Week ${e.week}` : `Month 3`}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                      style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}>
                      {e.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{e.description}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </motion.div>
  );
}
