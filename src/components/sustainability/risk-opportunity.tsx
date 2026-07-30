/**
 * risk-opportunity.tsx — Phase 6 AI Risk Prediction + Opportunity Intelligence
 *
 * Two export:
 *   RiskPredictions    — AI risk cards (AQI deterioration, water stress, etc.)
 *   OpportunityCards   — Positive opportunity cards (carbon reduction, renewables, etc.)
 *
 * All values rule-based from existing City fields.
 * Reuses existing probability/severity classification from climate-card.tsx.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert,
  TrendingDown, Droplets, TreePine, Zap, Leaf, Wind,
  Lightbulb, Target,
} from "lucide-react";
import type { City } from "@/lib/mock-data";

// ─── shared types ─────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "moderate" | "low";
type Difficulty = "Low" | "Medium" | "High";

const SEV_COLOR: Record<Severity, string> = {
  critical: "var(--color-destructive)",
  high:     "var(--color-warning)",
  moderate: "oklch(0.7 0.18 200)",
  low:      "var(--color-success)",
};
const SEV_ICON: Record<Severity, typeof AlertCircle> = {
  critical: AlertCircle,
  high:     AlertTriangle,
  moderate: AlertTriangle,
  low:      CheckCircle2,
};

// ─── RiskPredictions ──────────────────────────────────────────────────────────

interface Risk {
  icon: typeof ShieldAlert;
  label: string;
  probability: number;  // 0–100
  severity: Severity;
  description: string;
  mitigation: string;
}

function RiskCard({ risk, delay }: { risk: Risk; delay: number }) {
  const color    = SEV_COLOR[risk.severity];
  const SevIcon  = SEV_ICON[risk.severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="rounded-xl border border-border p-3.5 hover:border-primary/30 transition-colors duration-200"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="size-7 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
          <risk.icon className="size-3.5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">{risk.label}</span>
            <SevIcon className="size-3" style={{ color }} aria-hidden="true" />
          </div>
        </div>
        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
          {risk.probability}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden mb-2.5">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${risk.probability}%` }}
          transition={{ duration: 0.8, delay: delay + 0.05, ease: "easeOut" }} />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{risk.description}</p>
      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
        <CheckCircle2 className="size-3 text-success shrink-0 mt-0.5" aria-hidden="true" />
        <span className="text-[10px] text-muted-foreground leading-relaxed">{risk.mitigation}</span>
      </div>
    </motion.div>
  );
}

export function RiskPredictions({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const risks: Risk[] = useMemo(() => {
    const list: Risk[] = [];

    // AQI deterioration
    const aqiProb = city.aqi > 150 ? 78 : city.aqi > 100 ? 52 : 22;
    const aqiSev: Severity = city.aqi > 200 ? "critical" : city.aqi > 150 ? "high" : city.aqi > 100 ? "moderate" : "low";
    list.push({
      icon: Wind, label: "AQI Deterioration", probability: aqiProb, severity: aqiSev,
      description: `${aqiProb}% probability of AQI worsening above ${city.aqi + 30} within 30 days, based on current PM2.5 (${city.pm25} µg/m³) and carbon intensity.`,
      mitigation: "Restrict heavy vehicles during peak hours; issue advisory for sensitive groups if AQI exceeds 150.",
    });

    // Water stress
    const waterProb = city.water < 55 ? 82 : city.water < 70 ? 55 : 20;
    const waterSev: Severity = city.water < 50 ? "critical" : city.water < 65 ? "high" : city.water < 75 ? "moderate" : "low";
    list.push({
      icon: Droplets, label: "Water Stress", probability: waterProb, severity: waterSev,
      description: `Water quality index at ${city.water}% — ${waterProb}% probability of conservation pressure intensifying over the next quarter.`,
      mitigation: "Audit treatment infrastructure; pilot grey-water reuse in high-density zones.",
    });

    // Carbon increase
    const carbonProb = city.carbon > 8 ? 72 : city.carbon > 6 ? 48 : 18;
    const carbonSev: Severity = city.carbon > 9 ? "critical" : city.carbon > 7 ? "high" : city.carbon > 5 ? "moderate" : "low";
    list.push({
      icon: TrendingDown, label: "Carbon Increase", probability: carbonProb, severity: carbonSev,
      description: `Carbon at ${city.carbon} tCO₂/cap — ${carbonProb}% risk of exceeding ${Math.round(city.carbon * 1.1 * 10) / 10} t without intervention.`,
      mitigation: "Introduce sector carbon budgets; fast-track transport and industrial decarbonisation.",
    });

    // Biodiversity decline
    const bioProb = greenCover < 20 ? 68 : greenCover < 30 ? 42 : 15;
    const bioSev: Severity = greenCover < 15 ? "critical" : greenCover < 25 ? "high" : greenCover < 30 ? "moderate" : "low";
    list.push({
      icon: TreePine, label: "Biodiversity Decline", probability: bioProb, severity: bioSev,
      description: `Urban canopy at ${greenCover}% — ${bioProb}% probability of habitat fragmentation worsening if plantation rate stays unchanged.`,
      mitigation: "Designate protected green corridors; mandate green roofs in new development approvals.",
    });

    // Renewable decline (only show if below target)
    if (renewableShare < 40) {
      const renewProb = renewableShare < 25 ? 65 : 38;
      list.push({
        icon: Zap, label: "Renewable Energy Gap", probability: renewProb, severity: renewableShare < 25 ? "high" : "moderate",
        description: `At ${renewableShare}% renewable share, ${renewProb}% probability of missing the 40% grid target this year absent new capacity.`,
        mitigation: "Accelerate rooftop solar incentives; fast-track grid-scale wind procurement.",
      });
    }

    return list;
  }, [city, renewableShare, greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI Risk Prediction</div>
          <div className="text-sm font-semibold mt-0.5">Environmental risks — next 90 days</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {risks.filter(r => r.severity === "critical" || r.severity === "high").length} elevated
        </div>
      </div>
      <div className="space-y-2.5">
        {risks.map((r, i) => <RiskCard key={r.label} risk={r} delay={0.05 + i * 0.07} />)}
      </div>
    </motion.div>
  );
}

// ─── OpportunityCards ─────────────────────────────────────────────────────────

interface Opportunity {
  icon: typeof Lightbulb;
  label: string;
  impact: string;
  difficulty: Difficulty;
  timeframe: string;
  confidence: number;
  description: string;
}

const DIFF_COLOR: Record<Difficulty, string> = {
  Low:    "var(--color-success)",
  Medium: "var(--color-warning)",
  High:   "var(--color-destructive)",
};

function OppCard({ opp, delay }: { opp: Opportunity; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-border p-3.5 hover:border-primary/30 transition-colors duration-200"
    >
      <div className="flex items-start gap-2.5">
        <div className="size-7 rounded-lg grid place-items-center shrink-0 bg-primary/12 text-primary mt-0.5">
          <opp.icon className="size-3.5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">{opp.label}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{opp.description}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[9px]">
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
          <div className="text-muted-foreground">Impact</div>
          <div className="font-semibold mt-0.5 text-success">{opp.impact}</div>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
          <div className="text-muted-foreground">Difficulty</div>
          <div className="font-semibold mt-0.5" style={{ color: DIFF_COLOR[opp.difficulty] }}>{opp.difficulty}</div>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
          <div className="text-muted-foreground">Timeframe</div>
          <div className="font-semibold mt-0.5">{opp.timeframe}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Target className="size-3" aria-hidden="true" />
          Confidence: <span className="font-medium text-foreground ml-0.5">{opp.confidence}%</span>
        </div>
        <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full rounded-full bg-primary"
            initial={{ width: 0 }} animate={{ width: `${opp.confidence}%` }}
            transition={{ duration: 0.7, delay: delay + 0.1 }} />
        </div>
      </div>
    </motion.div>
  );
}

export function OpportunityCards({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const opportunities: Opportunity[] = useMemo(() => {
    const list: Opportunity[] = [];

    if (city.carbon > 5) list.push({
      icon: TrendingDown, label: "Carbon Reduction",
      impact: `−${Math.round((city.carbon - city.carbon * 0.8) * 10) / 10} tCO₂`,
      difficulty: city.carbon > 8 ? "High" : "Medium", timeframe: "6–12 mo", confidence: 76,
      description: `20% carbon intensity reduction achievable via transport electrification and industrial efficiency upgrades.`,
    });

    if (renewableShare < 60) list.push({
      icon: Zap, label: "Renewable Growth",
      impact: `+${Math.min(20, 60 - renewableShare)}% share`,
      difficulty: "Medium", timeframe: "3–6 mo", confidence: 82,
      description: `Rooftop solar programme + wind capacity expansion could add ${Math.min(20, 60 - renewableShare)}% clean energy share within 6 months.`,
    });

    if (greenCover < 40) list.push({
      icon: Leaf, label: "Green Cover Expansion",
      impact: `+${Math.min(10, 40 - greenCover)}% canopy`,
      difficulty: greenCover < 20 ? "High" : "Low", timeframe: "12–24 mo", confidence: 71,
      description: `Targeted urban forestry in under-canopied wards can close the gap to 40% canopy target over 2 years.`,
    });

    if (city.water < 80) list.push({
      icon: Droplets, label: "Water Quality Improvement",
      impact: `+${Math.min(15, 80 - city.water)}% index`,
      difficulty: city.water < 55 ? "High" : "Medium", timeframe: "3–12 mo", confidence: 68,
      description: `Decentralised grey-water reuse and treatment capacity upgrades can raise the water index by up to ${Math.min(15, 80 - city.water)}%.`,
    });

    return list.slice(0, 4);
  }, [city, renewableShare, greenCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Opportunity Intelligence</div>
        <div className="text-sm font-semibold mt-0.5">Positive sustainability levers</div>
      </div>
      <div className="space-y-2.5">
        {opportunities.map((o, i) => <OppCard key={o.label} opp={o} delay={0.05 + i * 0.07} />)}
      </div>
    </motion.div>
  );
}
