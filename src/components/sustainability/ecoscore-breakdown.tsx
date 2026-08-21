import { Wind, Leaf, Zap, Droplets, Recycle, Info, CheckCircle2 } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import type { City, EcoScoreMetricKey, EcoScoreBreakdown } from "@/lib/mock-data";

const METRIC_META: Record<
  EcoScoreMetricKey,
  { label: string; icon: typeof Wind; unit: string; description: string; nominalWeight: number }
> = {
  airQuality: {
    label: "Air Quality",
    icon: Wind,
    unit: "AQI",
    description: "Normalized from ambient AQI (100 - AQI / 3, clamped 0–100)",
    nominalWeight: 0.3,
  },
  greenCover: {
    label: "Green Cover",
    icon: Leaf,
    unit: "% canopy",
    description: "Urban canopy coverage relative to 40% excellence benchmark",
    nominalWeight: 0.25,
  },
  renewableEnergy: {
    label: "Renewable Energy",
    icon: Zap,
    unit: "% mix",
    description: "Renewable generation mix relative to 60% grid target",
    nominalWeight: 0.2,
  },
  waterQuality: {
    label: "Water Quality",
    icon: Droplets,
    unit: "% index",
    description: "Potable and surface water quality telemetric index",
    nominalWeight: 0.15,
  },
  wasteDiversion: {
    label: "Waste Diversion",
    icon: Recycle,
    unit: "% diverted",
    description: "Municipal solid waste diversion and recycling compliance",
    nominalWeight: 0.1,
  },
};

const METRIC_ORDER: EcoScoreMetricKey[] = [
  "airQuality",
  "greenCover",
  "renewableEnergy",
  "waterQuality",
  "wasteDiversion",
];

// Fallback breakdown synthesizer for offline demo state matching backend methodology
function resolveBreakdown(city: City): EcoScoreBreakdown {
  if (city.ecoScore) return city.ecoScore;

  const rawByMetric: Record<EcoScoreMetricKey, number | undefined> = {
    airQuality: city.aqi,
    greenCover: city.greenCover,
    renewableEnergy: city.renewableShare,
    waterQuality: city.water,
    wasteDiversion: undefined, // unmonitored in base dataset
  };

  const normalized: Record<EcoScoreMetricKey, number | null> = {
    airQuality: Math.max(0, Math.min(100, Math.round(100 - city.aqi / 3))),
    greenCover: city.greenCover != null ? Math.max(0, Math.min(100, Math.round((city.greenCover / 40) * 100))) : null,
    renewableEnergy: city.renewableShare != null ? Math.max(0, Math.min(100, Math.round((city.renewableShare / 60) * 100))) : null,
    waterQuality: city.water != null ? Math.max(0, Math.min(100, Math.round(city.water))) : null,
    wasteDiversion: null,
  };

  const availableKeys = METRIC_ORDER.filter((k) => normalized[k] != null);
  const missingMetrics = METRIC_ORDER.filter((k) => normalized[k] == null);
  const sumWeights = availableKeys.reduce((s, k) => s + METRIC_META[k].nominalWeight, 0) || 1;

  const breakdown: any = {};
  let totalScore = 0;

  for (const k of METRIC_ORDER) {
    const norm = normalized[k];
    const available = norm != null;
    const effectiveWeight = available ? METRIC_META[k].nominalWeight / sumWeights : 0;
    const contribution = available ? Math.round(norm * effectiveWeight * 100) / 100 : 0;

    breakdown[k] = {
      rawValue: rawByMetric[k] ?? null,
      normalizedScore: norm,
      weight: METRIC_META[k].nominalWeight,
      effectiveWeight: Math.round(effectiveWeight * 1000) / 1000,
      contribution,
      available,
    };
    totalScore += contribution;
  }

  const roundedScore = Math.max(0, Math.min(100, Math.round(totalScore)));
  const grade = roundedScore >= 85 ? "A+" : roundedScore >= 75 ? "A" : roundedScore >= 65 ? "B+" : roundedScore >= 55 ? "B" : roundedScore >= 45 ? "C+" : "C";

  return {
    score: roundedScore,
    grade,
    dataComplete: missingMetrics.length === 0,
    missingMetrics,
    breakdown,
  };
}

export function EcoScoreBreakdownPanel({ city }: { city: City }) {
  const ecoScore = resolveBreakdown(city);

  return (
    <Panel
      eyebrow="EcoScore Explained"
      title="How the overall sustainability score is calculated."
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Score: {ecoScore.score}/100</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
            Grade {ecoScore.grade}
          </span>
        </div>
      }
    >
      {/* Methodology status banner */}
      {!ecoScore.dataComplete ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 border border-border p-3.5 mb-6 text-xs text-muted-foreground">
          <Info className="size-4 text-info mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-foreground">Data incomplete — </span>
            <span>
              unavailable metrics ({ecoScore.missingMetrics.map((m) => METRIC_META[m].label).join(", ")}) are excluded
              and remaining weights are normalized proportionally to 100%.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl bg-success/10 border border-success/30 p-3.5 mb-6 text-xs text-success">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
          <span className="font-medium leading-relaxed">
            Complete methodology — all 5 environmental dimensions are actively tracked and weighted.
          </span>
        </div>
      )}

      {/* Breakdown list */}
      <div className="space-y-4">
        {METRIC_ORDER.map((key) => {
          const meta = METRIC_META[key];
          const metric = ecoScore.breakdown[key];
          const Icon = meta.icon;
          const nominalPct = Math.round(meta.nominalWeight * 100);
          const effectivePct = (metric.effectiveWeight * 100).toFixed(1);

          return (
            <div
              key={key}
              className="rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 grid place-items-center shrink-0 text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{meta.description}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {metric.available ? (
                    <div>
                      <span className="text-base font-extrabold tabular-nums">{metric.normalizedScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">Not available</span>
                  )}
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Weight: {nominalPct}% {metric.available && metric.effectiveWeight !== metric.weight && `(Eff: ${effectivePct}%)`}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    metric.available ? "bg-primary" : "bg-muted"
                  }`}
                  style={{ width: `${metric.available ? metric.normalizedScore : 0}%` }}
                />
              </div>

              {/* Contribution line */}
              {metric.available && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-1.5 border-t border-border/40">
                  <span>Raw: {metric.rawValue != null ? `${metric.rawValue} ${meta.unit}` : "N/A"}</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    Contribution: +{metric.contribution.toFixed(1)} pts
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
