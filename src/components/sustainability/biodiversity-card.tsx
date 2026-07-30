/**
 * biodiversity-card.tsx — Phase 4 Biodiversity Intelligence + Risk Wheel
 *
 * Two panels in one file:
 *
 * 1. BiodiversityCard — green cover, vegetation health, tree density,
 *    ecological health, and habitat score, all derived from existing fields.
 *
 * 2. RiskWheel — animated radar chart using recharts RadarChart. Six axes:
 *    Air, Heat, Water, Carbon, Waste, Green Cover. Values are normalised
 *    0–100 risk scores from existing City fields so the radar shows risk
 *    levels (higher = worse) — all honest rule-based derivations.
 *
 * No new data fields, no backend calls.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { TreePine, Leaf, Bug, Heart, Home } from "lucide-react";
import { TOOLTIP_STYLE } from "@/components/sustainability/carbon-card";
import type { City } from "@/lib/mock-data";

// ─── BiodiversityCard ─────────────────────────────────────────────────────────

interface BioMetric { icon: typeof TreePine; label: string; value: number; unit: string; pct: number }

export function BiodiversityCard({
  city, greenCover,
}: { city: City; greenCover: number }) {
  const metrics: BioMetric[] = useMemo(() => {
    const vegHealth  = Math.min(100, Math.round(city.eco * 0.7 + (40 - city.temp) * 0.6));
    const treeDensity = Math.min(100, Math.round(greenCover * 1.9));
    const ecoHealth  = Math.min(100, Math.round((city.eco * 0.5 + city.water * 0.3 + (100 - city.aqi * 0.15) * 0.2)));
    const habitatScore = Math.min(100, Math.round(greenCover * 1.2 + city.water * 0.25));
    return [
      { icon: Leaf,    label: "Green Cover",      value: greenCover, unit: "%",  pct: Math.min(100, Math.round(greenCover * 2.5)) },
      { icon: TreePine,label: "Vegetation Health", value: vegHealth,  unit: "%",  pct: vegHealth },
      { icon: Bug,     label: "Tree Density",      value: treeDensity,unit: "%",  pct: treeDensity },
      { icon: Heart,   label: "Ecological Health", value: ecoHealth,  unit: "%",  pct: ecoHealth },
      { icon: Home,    label: "Habitat Score",     value: habitatScore,unit: "/100",pct: habitatScore },
    ];
  }, [city, greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Biodiversity Intelligence</div>
        <div className="text-sm font-semibold mt-0.5">Ecological health profile</div>
      </div>
      <div className="space-y-2.5">
        {metrics.map((m, i) => (
          <div key={m.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <m.icon className="size-3" aria-hidden="true" />{m.label}
              </span>
              <span className="tabular-nums font-medium">{m.value}{m.unit}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--color-success)" }}
                initial={{ width: 0 }}
                animate={{ width: `${m.pct}%` }}
                transition={{ duration: 0.85, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── RiskWheel ────────────────────────────────────────────────────────────────

export function RiskWheel({ city, greenCover }: { city: City; greenCover: number }) {
  const wasteRisk = Math.max(0, 100 - Math.round(50 + city.eco * 0.15));

  const data = useMemo(() => [
    { axis: "Air",        risk: Math.min(100, Math.round(city.aqi * 0.22)) },
    { axis: "Heat",       risk: Math.min(100, Math.max(0, Math.round((city.temp - 18) * 4.5))) },
    { axis: "Water",      risk: Math.max(0, 100 - city.water) },
    { axis: "Carbon",     risk: Math.min(100, Math.round(city.carbon * 8)) },
    { axis: "Waste",      risk: Math.max(0, wasteRisk) },
    { axis: "Green",      risk: Math.max(0, Math.min(100, Math.round((30 - greenCover) * 3))) },
  ], [city, greenCover, wasteRisk]);

  const avgRisk = Math.round(data.reduce((s, d) => s + d.risk, 0) / data.length);
  const riskColor = avgRisk >= 60 ? "var(--color-destructive)" : avgRisk >= 35 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sustainability Risk Wheel</div>
          <div className="text-sm font-semibold mt-0.5">Environmental risk by domain</div>
        </div>
        <div
          className="text-center px-3 py-1.5 rounded-xl"
          style={{ background: `color-mix(in oklab, ${riskColor} 14%, transparent)` }}
        >
          <div className="text-lg font-semibold tabular-nums" style={{ color: riskColor }}>{avgRisk}</div>
          <div className="text-[9px] text-muted-foreground">avg risk</div>
        </div>
      </div>

      <div className="h-56" aria-label="Sustainability risk radar chart">
        <ResponsiveContainer>
          <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [`${v}%`, "Risk level"]}
            />
            <Radar
              name="Risk"
              dataKey="risk"
              stroke={riskColor}
              fill={riskColor}
              fillOpacity={0.22}
              strokeWidth={1.5}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Domain legend */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        {data.map(d => (
          <div key={d.axis} className="flex items-center justify-between rounded-lg bg-muted/30 px-2 py-1">
            <span className="text-muted-foreground">{d.axis}</span>
            <span className="tabular-nums font-medium" style={{ color: d.risk >= 60 ? "var(--color-destructive)" : d.risk >= 35 ? "var(--color-warning)" : "var(--color-success)" }}>
              {d.risk}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
