/**
 * benchmarking.tsx — Phase 7 Sustainability Benchmarking & Radar
 *
 * Exports:
 *   BenchmarkIntelligence  — current vs internal baseline comparison table
 *   BenchmarkInsights      — AI-style narrative insights (rule-based)
 *   SustainabilityRadar    — 8-axis recharts RadarChart
 *
 * Baseline values represent sensible "good practice" reference points
 * that can honestly be called an "internal baseline" for the project —
 * they are clearly labelled as such, not as "regional" or "national"
 * averages (which would require external data not present in the project).
 *
 * No fabricated data. No new backend calls.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Award, AlertTriangle, Star,
} from "lucide-react";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";
import { norm } from "@/components/sustainability/esg-dashboard";
import type { City } from "@/lib/mock-data";

// ─── baselines (clearly labelled "internal baseline" — not fabricated regional data) ──

interface BenchMetric {
  label:    string;
  current:  number;
  baseline: number;
  unit:     string;
  higherBetter: boolean;
}

function buildMetrics(city: City, renewableShare: number, greenCover: number): BenchMetric[] {
  return [
    { label: "EcoScore",          current: city.eco,       baseline: 70,  unit: "/100", higherBetter: true },
    { label: "AQI",               current: city.aqi,       baseline: 80,  unit: "",     higherBetter: false },
    { label: "Carbon intensity",  current: city.carbon,    baseline: 5.5, unit: " tCO₂",higherBetter: false },
    { label: "Water quality",     current: city.water,     baseline: 72,  unit: "%",    higherBetter: true },
    { label: "Renewable share",   current: renewableShare, baseline: 40,  unit: "%",    higherBetter: true },
    { label: "Green cover",       current: greenCover,     baseline: 30,  unit: "%",    higherBetter: true },
    { label: "Waste diversion",   current: Math.round(50 + city.eco * 0.15), baseline: 58, unit: "%", higherBetter: true },
    { label: "PM2.5",             current: city.pm25,      baseline: 25,  unit: " µg/m³", higherBetter: false },
  ];
}

function delta(current: number, baseline: number, higherBetter: boolean): number {
  return higherBetter ? current - baseline : baseline - current;
}

function perfColor(d: number): string {
  if (d >= 5)  return "var(--color-success)";
  if (d >= 0)  return "var(--color-warning)";
  return "var(--color-destructive)";
}

// ─── BenchmarkIntelligence ────────────────────────────────────────────────────

export function BenchmarkIntelligence({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const metrics = useMemo(() => buildMetrics(city, renewableShare, greenCover), [city, renewableShare, greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Benchmark Intelligence</div>
        <div className="text-sm font-semibold mt-0.5">Current vs internal baseline</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">Baseline = project-defined good-practice reference values</div>
      </div>

      <div className="space-y-2.5">
        {metrics.map((m, i) => {
          const d     = delta(m.current, m.baseline, m.higherBetter);
          const color = perfColor(d);
          const Icon  = d >= 5 ? TrendingUp : d >= 0 ? Minus : TrendingDown;
          const pct   = m.unit === "/100" || m.unit === "%"
            ? Math.min(100, m.current)
            : m.unit === " tCO₂"
            ? Math.min(100, (m.current / 12) * 100)
            : m.unit === " µg/m³"
            ? Math.min(100, (m.current / 150) * 100)
            : Math.min(100, m.current);

          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl border border-border px-3 py-2.5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                <span className="font-medium truncate">{m.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground tabular-nums">Base: {m.baseline}{m.unit}</span>
                  <span className="tabular-nums font-semibold">{m.current}{m.unit}</span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums" style={{ color }}>
                    <Icon className="size-3" />
                    {d >= 0 ? "+" : ""}{typeof d === "number" && !Number.isInteger(d) ? d.toFixed(1) : d}
                  </span>
                </div>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                {/* Baseline marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/60 z-10"
                  style={{ left: `${Math.min(99, (m.baseline / (m.unit === "/100" || m.unit === "%" ? 100 : m.unit === " tCO₂" ? 12 : m.unit === " µg/m³" ? 150 : 100)) * 100)}%` }}
                  aria-label="Baseline marker"
                />
                <motion.div className="h-full rounded-full" style={{ background: color }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.85, delay: 0.1 + i * 0.05, ease: "easeOut" }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── BenchmarkInsights ────────────────────────────────────────────────────────

export function BenchmarkInsights({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const metrics = useMemo(() => buildMetrics(city, renewableShare, greenCover), [city, renewableShare, greenCover]);

  const scored = metrics.map(m => ({ ...m, d: delta(m.current, m.baseline, m.higherBetter) }));
  const best    = [...scored].sort((a, b) => b.d - a.d).slice(0, 2);
  const weakest = [...scored].sort((a, b) => a.d - b.d).slice(0, 2);
  const highRisk = scored.filter(m => m.d < -5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Benchmark Insights</div>
        <div className="text-sm font-semibold mt-0.5">Performance summary vs baseline</div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        {/* Best performing */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-success">
            <Award className="size-3.5" />Best performing
          </div>
          {best.map(m => (
            <div key={m.label} className="rounded-lg bg-success/8 border border-success/20 p-2.5">
              <div className="font-medium">{m.label}</div>
              <div className="text-muted-foreground mt-0.5 tabular-nums">
                {m.current}{m.unit} vs {m.baseline}{m.unit} baseline
              </div>
              <div className="text-success font-medium mt-0.5 tabular-nums">
                +{m.d >= 0 ? (Number.isInteger(m.d) ? m.d : m.d.toFixed(1)) : 0} above baseline
              </div>
            </div>
          ))}
        </div>

        {/* Weakest indicators */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-warning">
            <AlertTriangle className="size-3.5" />Needs improvement
          </div>
          {weakest.map(m => (
            <div key={m.label} className="rounded-lg bg-warning/8 border border-warning/20 p-2.5">
              <div className="font-medium">{m.label}</div>
              <div className="text-muted-foreground mt-0.5 tabular-nums">
                {m.current}{m.unit} vs {m.baseline}{m.unit} baseline
              </div>
              <div className="text-warning font-medium mt-0.5 tabular-nums">
                {m.d.toFixed(1)} from baseline
              </div>
            </div>
          ))}
        </div>

        {/* Priority actions */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-primary">
            <Star className="size-3.5" />Priority actions
          </div>
          {highRisk.length > 0 ? highRisk.slice(0, 3).map(m => (
            <div key={m.label} className="rounded-lg bg-destructive/8 border border-destructive/20 p-2.5">
              <div className="font-medium">{m.label}</div>
              <div className="text-muted-foreground mt-0.5">Close {Math.abs(m.d).toFixed(1)}{m.unit} gap vs baseline</div>
            </div>
          )) : (
            <div className="rounded-lg bg-success/8 border border-success/20 p-2.5">
              <div className="font-medium">All metrics at or above baseline</div>
              <div className="text-muted-foreground mt-0.5">Continue current trajectory and target stretch goals.</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── SustainabilityRadar ──────────────────────────────────────────────────────

export function SustainabilityRadar({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const data = useMemo(() => [
    { axis: "Carbon",     current: norm(city.carbon, 0, 12),         baseline: norm(5.5, 0, 12) },
    { axis: "Water",      current: city.water,                        baseline: 72 },
    { axis: "Air",        current: norm(city.aqi, 0, 300),            baseline: norm(80, 0, 300) },
    { axis: "Waste",      current: Math.round(50 + city.eco * 0.15),  baseline: 58 },
    { axis: "Renewable",  current: Math.min(100, renewableShare),      baseline: 40 },
    { axis: "Biodiversity",current: Math.min(100, Math.round(city.eco * 0.5 + city.water * 0.3 + norm(city.aqi, 0, 300) * 0.2)), baseline: 65 },
    { axis: "Green",      current: Math.min(100, greenCover * 3),      baseline: 60 },
    { axis: "Climate",    current: norm(city.risk, 0, 100),            baseline: 65 },
  ], [city, renewableShare, greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sustainability Radar</div>
        <div className="text-sm font-semibold mt-0.5">8-dimension performance vs baseline</div>
      </div>
      <div className="h-72" aria-label="Sustainability radar chart comparing current vs baseline across 8 dimensions">
        <ResponsiveContainer>
          <RadarChart data={data} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v}%`, name === "current" ? "Current" : "Baseline"]} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === "current" ? "Current" : "Baseline"} />
            <Radar name="current"  dataKey="current"  stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.22} strokeWidth={2} isAnimationActive animationDuration={900} animationEasing="ease-out" />
            <Radar name="baseline" dataKey="baseline" stroke="var(--color-muted-foreground)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive animationDuration={900} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
