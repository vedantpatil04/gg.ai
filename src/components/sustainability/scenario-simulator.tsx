/**
 * scenario-simulator.tsx — Phase 6 What-If Scenario Simulator
 *
 * Embedded lightweight simulator for the Sustainability page.
 * Reuses the SAME lever definitions and projection formula that already
 * exist in src/routes/simulator.tsx (copy of the constants, NOT an import —
 * importing a route file would break tree-shaking; instead the constants
 * are duplicated here since they are pure data with no side effects).
 *
 * simulatorApi.run() is available when the API is connected; when offline
 * the localResults are shown with a clear "Estimated" label.
 *
 * Also renders intelligent scenario recommendations after projection.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  Car, TreePine, Factory, Zap, Bus, Recycle, Trees,
  Play, RotateCcw, Loader2, TrendingUp, TrendingDown, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { simulatorApi } from "@/lib/api/services.api";
import { CountUp } from "@/components/sustainability/count-up";
import type { City } from "@/lib/mock-data";

// ─── lever definitions (mirrors simulator.tsx — pure data, no logic import) ──

const SIM_LEVERS = [
  { id: "renewable",       label: "Renewable energy",   icon: Zap,      max: 100, unit: "%",    default: 20, color: "var(--color-warning)" },
  { id: "trees",           label: "Tree plantation",    icon: TreePine, max: 500, unit: "k/yr", default: 84, color: "var(--color-success)" },
  { id: "wasteManagement", label: "Waste reduction",    icon: Recycle,  max: 100, unit: "%",    default: 30, color: "var(--color-primary)" },
  { id: "ev",              label: "EV adoption",        icon: Car,      max: 100, unit: "%",    default: 22, color: "var(--color-info)" },
  { id: "greenArea",       label: "Green area",         icon: Trees,    max: 50,  unit: "%",    default: 10, color: "var(--color-success)" },
] as const;

type LeverId = typeof SIM_LEVERS[number]["id"];
type Vals = Record<LeverId, number>;

// ─── local projection (same formula as simulator.tsx localResults) ────────────

function project(vals: Vals, city: City) {
  const aqiDelta = -(vals.ev * 0.35) - (vals.trees * 0.04)
    - (vals.renewable * 0.18) - (vals.wasteManagement * 0.05) - (vals.greenArea * 0.10);
  const projectedAqi = Math.max(1, Math.round(city.aqi + aqiDelta));
  const eco = Math.max(0, Math.min(100, city.eco + Math.round(
    (vals.ev + vals.trees * 0.1 + vals.renewable * 0.22 + vals.wasteManagement * 0.12 + vals.greenArea * 0.2) / 3
  )));
  const carbon = Math.max(0, parseFloat((
    city.carbon - (vals.ev * 0.015 + vals.trees * 0.001 + vals.renewable * 0.025 + vals.wasteManagement * 0.01 + vals.greenArea * 0.008)
  ).toFixed(2)));
  const sustain = Math.max(0, Math.min(100, eco - 3 + Math.round(vals.trees / 30) + Math.round(vals.greenArea / 6)));
  return { projectedAqi, eco, carbon, sustain, aqiDelta };
}

// ─── lever slider ─────────────────────────────────────────────────────────────

function LeverRow({ lever, value, onChange }: {
  lever: typeof SIM_LEVERS[number];
  value: number;
  onChange: (id: LeverId, v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <lever.icon className="size-3" style={{ color: lever.color }} aria-hidden="true" />
          {lever.label}
        </span>
        <span className="tabular-nums font-medium">{value}{lever.unit}</span>
      </div>
      <input
        type="range"
        min={0} max={lever.max} value={value}
        onChange={e => onChange(lever.id, Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted"
        style={{ accentColor: lever.color }}
        aria-label={`${lever.label}: ${value}${lever.unit}`}
      />
    </div>
  );
}

// ─── delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ current, projected, higherBetter, unit = "" }: {
  current: number; projected: number; higherBetter: boolean; unit?: string;
}) {
  const diff = parseFloat((projected - current).toFixed(2));
  const good = higherBetter ? diff > 0 : diff < 0;
  const color = good ? "var(--color-success)" : diff === 0 ? "var(--color-muted-foreground)" : "var(--color-destructive)";
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : null;
  return (
    <div className="text-center">
      <div className="text-xl font-semibold tabular-nums">
        <CountUp value={projected} decimals={typeof projected === "number" && projected % 1 !== 0 ? 1 : 0} />
        <span className="text-xs font-normal ml-0.5 text-muted-foreground">{unit}</span>
      </div>
      <div className="inline-flex items-center gap-0.5 text-[10px] font-medium mt-0.5" style={{ color }}>
        {Icon && <Icon className="size-3" />}
        {diff >= 0 ? "+" : ""}{diff}{unit}
      </div>
    </div>
  );
}

// ─── recommendations ──────────────────────────────────────────────────────────

interface Recommendation {
  label: string;
  icon: typeof Star;
  reason: string;
  highlight: string;
}

function buildRecommendations(vals: Vals, city: City): Recommendation[] {
  const recs: Recommendation[] = [];
  if (vals.renewable > 40)
    recs.push({ icon: Zap, label: "Prioritise renewable energy", highlight: `${vals.renewable}% target`, reason: "Highest EcoScore uplift per unit — accelerate clean grid procurement." });
  if (vals.trees > 100)
    recs.push({ icon: TreePine, label: "Scale tree plantation", highlight: `${vals.trees}k trees/yr`, reason: "Most cost-effective long-term carbon sink and biodiversity co-benefit." });
  if (city.aqi > 120 && vals.ev > 30)
    recs.push({ icon: Car, label: "EV transition critical", highlight: `${vals.ev}% adoption`, reason: `AQI ${city.aqi} — transport electrification is the fastest lever for air quality.` });
  if (vals.wasteManagement > 50)
    recs.push({ icon: Recycle, label: "Waste management uplift", highlight: `${vals.wasteManagement}% efficiency`, reason: "Diversion rate improvement will push EcoScore above the current ceiling." });
  if (recs.length === 0)
    recs.push({ icon: Star, label: "Balanced scenario", highlight: "All levers moderate", reason: "No single lever dominates. Moderate gains across all dimensions are expected." });
  return recs.slice(0, 3);
}

// ─── main component ───────────────────────────────────────────────────────────

export function ScenarioSimulator({ city, isApiConnected }: { city: City; isApiConnected: boolean }) {
  const defaults = useMemo(
    () => Object.fromEntries(SIM_LEVERS.map(l => [l.id, l.default])) as Vals,
    [],
  );
  const [vals, setVals]       = useState<Vals>(defaults);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const handleChange = (id: LeverId, v: number) => {
    setVals(prev => ({ ...prev, [id]: v }));
    setAiInsight(null); // reset AI insight on change
  };

  const local = useMemo(() => project(vals, city), [vals, city]);
  const recs  = useMemo(() => buildRecommendations(vals, city), [vals, city]);

  const runMutation = useMutation({
    mutationFn: () => simulatorApi.run({ cityId: city.id, levers: vals as Record<string, number> }),
    onSuccess: (res) => {
      const payload = res?.data ?? res as Record<string, unknown>;
      setAiInsight(typeof payload?.aiInsight === "string" ? payload.aiInsight : null);
    },
  });

  const reset = () => { setVals(defaults); setAiInsight(null); };

  const outcomes = [
    { label: "EcoScore",   current: city.eco,   projected: local.eco,    unit: "", higherBetter: true },
    { label: "AQI",        current: city.aqi,   projected: local.projectedAqi, unit: "", higherBetter: false },
    { label: "Carbon",     current: city.carbon,projected: local.carbon,  unit: " t", higherBetter: false },
    { label: "Sustain.",   current: city.eco - 4,projected: local.sustain, unit: "", higherBetter: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">What-If Scenario Simulator</div>
          <div className="text-sm font-semibold mt-0.5">Adjust levers to project impact</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Reset levers"
          >
            <RotateCcw className="size-3" />Reset
          </button>
          {isApiConnected && (
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs aurora text-primary-foreground disabled:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Run AI simulation"
            >
              {runMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              AI Simulate
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Levers */}
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Policy levers</div>
          {SIM_LEVERS.map(l => (
            <LeverRow key={l.id} lever={l} value={vals[l.id]} onChange={handleChange} />
          ))}
          {!isApiConnected && (
            <div className="text-[10px] text-muted-foreground rounded-lg bg-muted/30 px-3 py-2 border border-border">
              Results are estimated — connect backend for Gemini-powered analysis.
            </div>
          )}
        </div>

        {/* Projected outcomes */}
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Projected outcomes {!isApiConnected && "— estimated"}</div>
          <div className="grid grid-cols-2 gap-3">
            {outcomes.map(o => (
              <div key={o.label} className="rounded-xl border border-border p-3 text-center hover:border-primary/30 transition-colors">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">{o.label}</div>
                <DeltaBadge {...o} />
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Intelligent recommendations</div>
            <div className="space-y-2">
              {recs.map((r, i) => (
                <motion.div
                  key={r.label}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="flex items-start gap-2.5 rounded-xl bg-muted/30 border border-border p-2.5 hover:border-primary/30 transition-colors"
                >
                  <div className="size-6 rounded-md grid place-items-center shrink-0 bg-primary/12 text-primary mt-0.5">
                    <r.icon className="size-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium flex items-center gap-1.5 flex-wrap">
                      {r.label}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{r.highlight}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{r.reason}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI insight if available */}
          <AnimatePresence>
            {aiInsight && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/30 bg-primary/6 p-3 text-xs leading-relaxed overflow-hidden"
              >
                <div className="text-[10px] uppercase tracking-wider text-primary mb-1.5">Gemini Analysis</div>
                {aiInsight}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
