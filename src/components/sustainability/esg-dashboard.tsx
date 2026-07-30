/**
 * esg-dashboard.tsx — Phase 7 ESG Intelligence Dashboard
 *
 * Exports:
 *   EsgScoreCard        — animated ESG composite + E/S/G breakdown rings
 *   EsgPillars          — Environmental / Social / Governance metric rows
 *   ExecutiveEsgSummary — narrative executive card (rule-based, no LLM)
 *
 * All values derived from existing City fields only:
 *   Environmental: carbon, aqi, pm25, water, co2  (direct proxies)
 *   Social:        aqi, water, humidity, temp      (public health proxies)
 *   Governance:    alerts, eco, risk               (management quality proxies)
 *
 * No new backend endpoints. No fabricated data.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Leaf, Droplets, Wind, Factory, Zap, Recycle,
  Users, Heart, Eye, BookOpen, Shield,
  ClipboardCheck, Radio, FileCheck, BarChart3, CheckCircle2,
  TrendingUp, TrendingDown, Star, AlertTriangle,
} from "lucide-react";
import { CountUp } from "@/components/sustainability/count-up";
import type { City } from "@/lib/mock-data";

// ─── scoring helpers ──────────────────────────────────────────────────────────

/** Normalise to 0-100 where higher is always better. */
const norm = (v: number, best: number, worst: number) =>
  Math.max(0, Math.min(100, Math.round(((v - worst) / (best - worst)) * 100)));

function esgScores(city: City, renewableShare: number, greenCover: number) {
  // Environmental — 6 indicators averaged
  const carbonScore  = norm(city.carbon, 0, 12);      // lower carbon → higher score
  const airScore     = norm(city.aqi, 0, 300);         // lower AQI → higher score
  const waterScore   = city.water;                     // already 0-100
  const renewScore   = Math.min(100, renewableShare * 2.5);
  const greenScore   = Math.min(100, greenCover * 3);
  const wasteScore   = Math.round(50 + city.eco * 0.15);
  const environmental = Math.round((carbonScore + airScore + waterScore + renewScore + greenScore + wasteScore) / 6);

  // Social — public health proxies
  const publicHealth  = norm(city.aqi, 0, 300);
  const cleanAir      = norm(city.pm25, 0, 150);
  const waterAccess   = city.water;
  const heatStress    = norm(city.temp, 10, 45);       // cooler = better for residents
  const envAwareness  = Math.min(100, city.eco + 5);   // eco score as awareness proxy
  const social = Math.round((publicHealth + cleanAir + waterAccess + heatStress + envAwareness) / 5);

  // Governance — management quality proxies
  const dataComplete  = Math.min(100, 90 - city.alerts * 2);
  const compliance    = norm(city.risk, 0, 100);        // lower risk = better compliance
  const monitoring    = Math.min(100, 70 + city.eco * 0.25);
  const reporting     = Math.min(100, 65 + city.eco * 0.3);
  const policyCover   = Math.min(100, 60 + (100 - city.risk) * 0.35);
  const governance = Math.round((dataComplete + compliance + monitoring + reporting + policyCover) / 5);

  const overall = Math.round(environmental * 0.5 + social * 0.3 + governance * 0.2);
  return { environmental, social, governance, overall };
}

// ─── animated ring ────────────────────────────────────────────────────────────

function ScoreRing({ score, label, color, size = 96, delay = 0 }: {
  score: number; label: string; color: string; size?: number; delay?: number;
}) {
  const r    = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }} aria-hidden="true">
          <circle cx={size/2} cy={size/2} r={r} stroke="var(--color-muted)" strokeWidth="8" fill="none" />
          <motion.circle
            cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
            style={{ strokeDasharray: circ }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-xl font-semibold tabular-nums leading-none">
            <CountUp value={score} duration={1100} />
          </div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

// ─── ESG score card ───────────────────────────────────────────────────────────

export function EsgScoreCard({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const s = useMemo(() => esgScores(city, renewableShare, greenCover), [city, renewableShare, greenCover]);
  const status = s.overall >= 75 ? { label: "Strong",   color: "var(--color-success)" }
               : s.overall >= 55 ? { label: "Moderate", color: "var(--color-warning)" }
               :                   { label: "Weak",      color: "var(--color-destructive)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ESG Intelligence</div>
          <div className="text-sm font-semibold mt-0.5">{city.name} composite score</div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ color: status.color, background: `color-mix(in oklab, ${status.color} 14%, transparent)` }}>
          {status.label} ESG
        </span>
      </div>

      {/* Rings */}
      <div className="flex items-center justify-around gap-4 flex-wrap">
        <ScoreRing score={s.overall}       label="Overall ESG"    color="url(#esg-main-gr)" size={120} delay={0.05} />
        <ScoreRing score={s.environmental} label="Environmental"  color="var(--color-success)" size={88} delay={0.15} />
        <ScoreRing score={s.social}        label="Social"         color="var(--color-info)"    size={88} delay={0.22} />
        <ScoreRing score={s.governance}    label="Governance"     color="var(--color-warning)"  size={88} delay={0.29} />
        <svg width="0" height="0" aria-hidden="true">
          <defs>
            <linearGradient id="esg-main-gr" x1="0" x2="1">
              <stop offset="0%"   stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-info)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Trend hint */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-border pt-4">
        {[
          { label: "Environment", value: s.environmental, color: "var(--color-success)" },
          { label: "Social",      value: s.social,        color: "var(--color-info)" },
          { label: "Governance",  value: s.governance,    color: "var(--color-warning)" },
        ].map(p => (
          <div key={p.label} className="rounded-xl bg-muted/30 p-2 border border-border">
            <div className="text-muted-foreground">{p.label}</div>
            <div className="font-semibold tabular-nums mt-0.5" style={{ color: p.color }}>{p.value}</div>
            <div className="h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: p.color }}
                initial={{ width: 0 }} animate={{ width: `${p.value}%` }}
                transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── ESG pillars ──────────────────────────────────────────────────────────────

interface EsgMetric { icon: typeof Leaf; label: string; value: number; unit: string; color: string }

function PillarSection({ title, color, metrics, delay }: {
  title: string; color: string; metrics: EsgMetric[]; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="rounded-2xl border border-border p-4 space-y-3"
    >
      <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>{title}</div>
      <div className="space-y-2.5">
        {metrics.map((m, i) => (
          <div key={m.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <m.icon className="size-3" style={{ color: m.color }} aria-hidden="true" />{m.label}
              </span>
              <span className="tabular-nums font-medium">{m.value}{m.unit}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: m.color }}
                initial={{ width: 0 }} animate={{ width: `${Math.min(100, m.value)}%` }}
                transition={{ duration: 0.85, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function EsgPillars({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const s = useMemo(() => esgScores(city, renewableShare, greenCover), [city, renewableShare, greenCover]);

  const envMetrics: EsgMetric[] = [
    { icon: Factory,  label: "Carbon performance", value: norm(city.carbon, 0, 12), unit: "%", color: "var(--color-success)" },
    { icon: Droplets, label: "Water management",   value: city.water,  unit: "%", color: "var(--color-info)" },
    { icon: Wind,     label: "Air quality",         value: norm(city.aqi, 0, 300), unit: "%", color: "var(--color-primary)" },
    { icon: Recycle,  label: "Waste management",   value: Math.round(50 + city.eco * 0.15), unit: "%", color: "var(--color-warning)" },
    { icon: Zap,      label: "Renewable energy",   value: renewableShare, unit: "%", color: "var(--color-warning)" },
    { icon: Leaf,     label: "Green cover",         value: Math.min(100, greenCover * 3), unit: "%", color: "var(--color-success)" },
  ];

  const socMetrics: EsgMetric[] = [
    { icon: Heart,    label: "Public health impact",    value: norm(city.aqi, 0, 300),  unit: "%", color: "var(--color-destructive)" },
    { icon: Wind,     label: "Clean air access",        value: norm(city.pm25, 0, 150), unit: "%", color: "var(--color-info)" },
    { icon: Droplets, label: "Water accessibility",     value: city.water,  unit: "%", color: "var(--color-info)" },
    { icon: Users,    label: "Community sustainability",value: Math.min(100, city.eco + 5), unit: "%", color: "var(--color-primary)" },
    { icon: Eye,      label: "Environmental awareness", value: Math.min(100, city.eco),  unit: "%", color: "var(--color-success)" },
  ];

  const govMetrics: EsgMetric[] = [
    { icon: ClipboardCheck, label: "Data completeness",     value: Math.min(100, 90 - city.alerts * 2), unit: "%", color: "var(--color-primary)" },
    { icon: Shield,         label: "Compliance score",      value: norm(city.risk, 0, 100), unit: "%", color: "var(--color-success)" },
    { icon: Radio,          label: "Monitoring status",     value: Math.min(100, 70 + city.eco * 0.25), unit: "%", color: "var(--color-info)" },
    { icon: FileCheck,      label: "Reporting readiness",   value: Math.min(100, 65 + city.eco * 0.3), unit: "%", color: "var(--color-warning)" },
    { icon: BookOpen,       label: "Policy coverage",       value: Math.min(100, 60 + (100 - city.risk) * 0.35), unit: "%", color: "var(--color-primary)" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <PillarSection title={`Environmental · ${s.environmental}`} color="var(--color-success)" metrics={envMetrics} delay={0.05} />
      <PillarSection title={`Social · ${s.social}`}              color="var(--color-info)"    metrics={socMetrics} delay={0.12} />
      <PillarSection title={`Governance · ${s.governance}`}      color="var(--color-warning)"  metrics={govMetrics} delay={0.19} />
    </div>
  );
}

// ─── executive ESG summary ────────────────────────────────────────────────────

export function ExecutiveEsgSummary({ city, renewableShare, greenCover }: {
  city: City; renewableShare: number; greenCover: number;
}) {
  const s = useMemo(() => esgScores(city, renewableShare, greenCover), [city, renewableShare, greenCover]);

  const strongest = s.environmental >= s.social && s.environmental >= s.governance
    ? "Environmental" : s.social >= s.governance ? "Social" : "Governance";
  const weakest   = s.environmental <= s.social && s.environmental <= s.governance
    ? "Environmental" : s.social <= s.governance ? "Social" : "Governance";

  const achievements = [
    s.environmental >= 70 && "Strong carbon and air quality management",
    city.water >= 75 && "Water quality index exceeds the 75% threshold",
    renewableShare >= 40 && "Renewable energy grid target achieved",
    s.governance >= 70 && "High data completeness and monitoring coverage",
  ].filter(Boolean) as string[];

  const concerns = [
    city.aqi > 150 && `Elevated AQI (${city.aqi}) — health advisories likely`,
    city.carbon > 7 && `Carbon intensity ${city.carbon} tCO₂/cap above high-risk mark`,
    greenCover < 25 && `Green cover ${greenCover}% below 30% canopy target`,
    s.governance < 55 && "Governance gaps — monitoring and reporting need strengthening",
  ].filter(Boolean) as string[];

  const priorities = [
    city.aqi > 100 && "Reduce PM2.5 through traffic and industrial controls",
    renewableShare < 40 && `Close ${40 - renewableShare}% renewable energy gap`,
    greenCover < 30 && "Accelerate urban forestry to reach 30% canopy target",
    city.water < 65 && "Scale water treatment and reuse infrastructure",
  ].filter(Boolean) as string[];

  const statusColor = s.overall >= 75 ? "var(--color-success)" : s.overall >= 55 ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Executive ESG Summary</div>
          <div className="text-sm font-semibold mt-0.5">Overall ESG score: <span style={{ color: statusColor }}>{s.overall}/100</span></div>
        </div>
        <div className="text-xs text-muted-foreground">
          Strongest: <span className="font-medium text-foreground">{strongest}</span> ·
          Weakest: <span className="font-medium text-foreground">{weakest}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-xs">
        {achievements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-success">
              <CheckCircle2 className="size-3.5" />Key achievements
            </div>
            <ul className="space-y-1.5">
              {achievements.map(a => (
                <li key={a} className="flex items-start gap-1.5 text-muted-foreground">
                  <TrendingUp className="size-3 text-success shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {concerns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-destructive">
              <AlertTriangle className="size-3.5" />Immediate concerns
            </div>
            <ul className="space-y-1.5">
              {concerns.map(c => (
                <li key={c} className="flex items-start gap-1.5 text-muted-foreground">
                  <TrendingDown className="size-3 text-destructive shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
        {priorities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <Star className="size-3.5" />Recommended priorities
            </div>
            <ul className="space-y-1.5">
              {priorities.map(p => (
                <li key={p} className="flex items-start gap-1.5 text-muted-foreground">
                  <BarChart3 className="size-3 text-primary shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// re-export helper for use in benchmarking
export { esgScores, norm };
