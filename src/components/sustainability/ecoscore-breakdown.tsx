import { Wind, Leaf, Zap, Droplets, Recycle, Info } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import type { City, EcoScoreMetricKey } from "@/lib/mock-data";

// ─── Phase 2: minimal, transparent "why is the score X" breakdown ────────────
// Deliberately plain — a labeled list of the five methodology dimensions with
// their normalized score, weight and contribution, sourced entirely from the
// backend EcoScore engine (city.ecoScore). No new dashboard, chart, or
// redesign — that's Phase 3's job. This component only ever displays what
// the backend already computed; it does not calculate anything itself.

const METRIC_META: Record<EcoScoreMetricKey, { label: string; icon: typeof Wind }> = {
  airQuality: { label: "Air Quality", icon: Wind },
  greenCover: { label: "Green Cover", icon: Leaf },
  renewableEnergy: { label: "Renewable Energy", icon: Zap },
  waterQuality: { label: "Water Quality", icon: Droplets },
  wasteDiversion: { label: "Waste Diversion", icon: Recycle },
};

const METRIC_ORDER: EcoScoreMetricKey[] = [
  "airQuality", "greenCover", "renewableEnergy", "waterQuality", "wasteDiversion",
];

export function EcoScoreBreakdownPanel({ city }: { city: City }) {
  const ecoScore = city.ecoScore;

  if (!ecoScore) {
    // Offline/mock-fallback state — no per-metric reading exists to explain.
    return (
      <Panel eyebrow="EcoScore Explained" title={`Why is the EcoScore ${city.eco}?`}>
        <p className="text-sm text-muted-foreground">
          A detailed breakdown isn't available while running on offline demo data.
          Reconnect to live data to see how each metric contributes to {city.name}'s EcoScore.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="EcoScore Explained"
      title={`Why is the EcoScore ${ecoScore.score}?`}
      action={<span className="text-xs font-semibold text-muted-foreground">Grade {ecoScore.grade}</span>}
    >
      {!ecoScore.dataComplete && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border px-3 py-2 mb-4 text-xs text-muted-foreground">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>
            Data incomplete — {ecoScore.missingMetrics.map((m) => METRIC_META[m].label).join(", ")}{" "}
            {ecoScore.missingMetrics.length === 1 ? "isn't" : "aren't"} tracked yet for {city.name}, so
            the remaining metrics are weighted proportionally instead.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {METRIC_ORDER.map((key) => {
          const meta = METRIC_META[key];
          const metric = ecoScore.breakdown[key];
          const Icon = meta.icon;
          return (
            <div key={key} className="flex items-center gap-3">
              <Icon className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {metric.available
                      ? `${metric.normalizedScore} · weight ${(metric.weight * 100).toFixed(0)}%`
                      : "Not available"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${metric.available ? metric.normalizedScore : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
