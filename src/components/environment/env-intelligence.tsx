import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Wind,
  Thermometer,
  Droplets,
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  AlertTriangle,
  Info,
  Sun,
  Users,
  PersonStanding,
  Bike,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { environmentalApi, type CityHistoryDay } from "@/lib/api/environmental.api";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Phase 3 — Environmental Intelligence & Advanced Analytics.
 *
 * Upgrades over Phase 2:
 *
 *  1. IntelligenceHero: executive summary with key findings (positive +
 *     negative) and an AI confidence level. Users see WHAT changed and WHY.
 *
 *  2. Environmental Health Analysis panel (NEW): five composite indicators
 *     presented as elegant bars — Respiratory Risk, Outdoor Suitability,
 *     Sensitive Group Risk, Environmental Comfort, Pollution Load. Each has
 *     a plain-language label so users never interpret raw numbers.
 *
 *  3. ImpactAnalysis: unchanged in logic, improved label: "What's driving
 *     conditions" — emphasises causation not just state.
 *
 *  4. TrendIntelligence: shows 7-day high / low / average inline alongside
 *     the direction label — historical context, not just "Improving/Worsening".
 *
 *  5. SmartRecommendations: three-tier activity guidance (general / sensitive
 *     groups / children+elderly) replaces the generic single-item approach.
 *     Also adds "Why this matters" explainer per item.
 *
 * All data: useCity() + existing getCityHistory endpoint.
 * No new API calls. No fabricated data. No AI calls.
 * All animations respect prefers-reduced-motion.
 */

// ─── Reduced motion ──────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [v, set] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    set(q.matches);
    const h = (e: MediaQueryListEvent) => set(e.matches);
    q.addEventListener("change", h);
    return () => q.removeEventListener("change", h);
  }, []);
  return v;
}

// ─── Intelligence Score ──────────────────────────────────────────────────────

function computeIntelligenceScore(city: {
  aqi: number;
  pm25?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  temp?: number;
}): { score: number; label: string; confidence: "High" | "Moderate" | "Limited" } {
  const raw: { label: string; weight: number; value: number | undefined; norm: () => number }[] = [
    { label: "AQI",    weight: 0.45, value: city.aqi,       norm: () => Math.max(0, 1 - city.aqi / 300) },
    { label: "PM2.5",  weight: 0.20, value: city.pm25,      norm: () => Math.max(0, 1 - (city.pm25 ?? 0) / 150) },
    { label: "Humidity",weight:0.10, value: city.humidity,  norm: () => { const h = city.humidity ?? 50; return Math.max(0, 1 - Math.abs(h - 50) / 50); } },
    { label: "Wind",   weight: 0.10, value: city.windSpeed, norm: () => { const w = city.windSpeed ?? 10; if (w < 5) return 0.5; if (w < 30) return 1.0; return Math.max(0, 1 - (w - 30) / 70); } },
    { label: "Pressure",weight:0.08, value: city.pressure,  norm: () => { const p = (city.pressure as number | undefined) ?? 1013; return Math.max(0, 1 - Math.abs(p - 1013) / 60); } },
    { label: "Temperature",weight:0.07,value:city.temp,     norm: () => { const t = city.temp ?? 20; return Math.max(0, 1 - Math.abs(t - 21) / 30); } },
  ];
  const available = raw.filter((r) => r.value !== undefined && r.value !== null);
  const totalWeight = available.reduce((s, r) => s + r.weight, 0);
  const score = Math.round(
    available.reduce((s, r) => s + r.norm() * (r.weight / totalWeight) * 100, 0)
  );
  const label =
    score >= 80 ? "Excellent" :
    score >= 65 ? "Good" :
    score >= 50 ? "Moderate" :
    score >= 35 ? "Elevated" : "Poor";
  const confidence: "High" | "Moderate" | "Limited" =
    available.length >= 5 ? "High" : available.length >= 3 ? "Moderate" : "Limited";
  return { score, label, confidence };
}

// ─── Score gauge ─────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  return score >= 80 ? "var(--color-success)"
    : score >= 65 ? "hsl(90 60% 50%)"
    : score >= 50 ? "hsl(45 90% 55%)"
    : score >= 35 ? "hsl(28 90% 55%)"
    : "var(--color-destructive)";
}

function ScoreGauge({ score, label, reduced }: { score: number; label: string; reduced: boolean }) {
  const [displayed, setDisplayed] = useState(reduced ? score : 0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (reduced) { setDisplayed(score); return; }
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1200, 1);
      setDisplayed(Math.round((1 - Math.pow(1 - p, 3)) * score));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [score, reduced]);

  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (displayed / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2" aria-label={`Score: ${score} — ${label}`}>
      <div className="relative size-36">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: reduced ? "none" : "stroke-dasharray 0.05s linear",
                     filter: `drop-shadow(0 0 5px ${color}60)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>{displayed}</span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      <span className="text-[10px] text-muted-foreground text-center max-w-[160px] leading-relaxed">
        Environmental Health Index
      </span>
    </div>
  );
}

// ─── Key Findings builder ─────────────────────────────────────────────────────

function buildFindings(city: {
  aqi: number; pm25?: number; temp?: number; humidity?: number; windSpeed?: number;
}, history: CityHistoryDay[] | undefined): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  const band = findAqiBand(city.aqi);

  if (city.aqi <= 50) {
    positive.push("Air quality is currently in the Good range — no restrictions on outdoor activity.");
  } else if (city.aqi <= 100) {
    positive.push("Air quality is acceptable for the general population.");
  } else {
    negative.push(`Air quality is ${band.label} — sensitive individuals and children should limit outdoor exposure.`);
  }

  if (typeof city.windSpeed === "number") {
    if (city.windSpeed >= 8 && city.windSpeed < 35) {
      positive.push(`Wind at ${city.windSpeed} km/h is actively dispersing ground-level pollutants.`);
    } else if (city.windSpeed < 5) {
      negative.push(`Calm winds (${city.windSpeed} km/h) may allow pollutants to accumulate locally.`);
    }
  }

  if (typeof city.humidity === "number") {
    if (city.humidity >= 80) {
      negative.push(`High humidity (${city.humidity}%) can trap pollutants and increase discomfort.`);
    } else if (city.humidity >= 35 && city.humidity <= 65) {
      positive.push(`Humidity at ${city.humidity}% is within a comfortable range.`);
    }
  }

  if (typeof city.temp === "number" && city.temp >= 35) {
    negative.push(`Temperature at ${city.temp}°C — heat stress risk. Stay hydrated.`);
  }

  if (history && history.length >= 3) {
    const recentAqiAvg = history.slice(-3).reduce((s, d) => s + d.aqi.avg, 0) / 3;
    const olderAqiAvg = history.slice(0, -3).reduce((s, d) => s + d.aqi.avg, 0) / Math.max(1, history.length - 3);
    if (recentAqiAvg < olderAqiAvg * 0.92) {
      positive.push("Air quality has been trending better over the past 3 days.");
    } else if (recentAqiAvg > olderAqiAvg * 1.08) {
      negative.push("Air quality has been declining over the past 3 days — monitor conditions.");
    }
  }

  return { positive: positive.slice(0, 3), negative: negative.slice(0, 3) };
}

// ─── Section 1 — Intelligence Hero (upgraded) ────────────────────────────────

function IntelligenceHero({
  score, scoreLabel, confidence, reduced, history,
}: {
  score: number; scoreLabel: string; confidence: string; reduced: boolean;
  history: CityHistoryDay[] | undefined;
}) {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);

  const headline =
    score >= 80 ? "Your environment is healthy" :
    score >= 65 ? "Environmental conditions are broadly favourable" :
    score >= 50 ? "Environmental conditions are acceptable" :
    score >= 35 ? "Environmental conditions warrant attention" :
    "Environmental conditions are currently poor";

  const summary = score >= 80
    ? `Air quality is ${band.label.toLowerCase()}, with conditions well-suited for all outdoor activity.`
    : score >= 65
    ? `${band.label} air quality. Most outdoor activity is suitable — sensitive individuals should monitor conditions.`
    : score >= 50
    ? `${band.label} pollution levels detected. Sensitive groups should consider limiting prolonged outdoor exertion.`
    : `${band.label} air quality. Reducing outdoor exposure is advisable until conditions improve.`;

  const { positive, negative } = buildFindings(city, history);

  return (
    <div className="relative glass rounded-2xl p-6 md:p-8 xl:p-10 overflow-hidden">
      {!reduced && (
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full opacity-[0.12] blur-3xl aurora" aria-hidden="true" />
      )}

      <div className="relative space-y-6">
        {/* Header row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                GreenGuard AI · Environmental Analysis
              </span>
              {/* Confidence chip */}
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  color: confidence === "High" ? "var(--color-success)"
                    : confidence === "Moderate" ? "hsl(45 90% 55%)" : "var(--color-muted-foreground)",
                  borderColor: "currentColor",
                  background: "transparent",
                  opacity: 0.85,
                }}
              >
                {confidence} confidence
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">{headline}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{summary}</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ScoreGauge score={score} label={scoreLabel} reduced={reduced} />
          </div>
        </div>

        {/* Key findings — positive and negative */}
        {(positive.length > 0 || negative.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            {/* Positive findings */}
            {positive.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.20em] text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3" style={{ color: "var(--color-success)" }} aria-hidden="true" />
                  Positive findings
                </span>
                <ul className="space-y-1.5">
                  {positive.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-1 size-1.5 rounded-full shrink-0" style={{ background: "var(--color-success)" }} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Negative findings */}
            {negative.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.20em] text-muted-foreground flex items-center gap-1.5">
                  <XCircle className="size-3" style={{ color: "hsl(28 90% 55%)" }} aria-hidden="true" />
                  Areas of concern
                </span>
                <ul className="space-y-1.5">
                  {negative.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-1 size-1.5 rounded-full shrink-0" style={{ background: "hsl(28 90% 55%)" }} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 1b — Environmental Health Analysis (NEW) ────────────────────────

/**
 * Five derived health indicators, each computed from real readings.
 * Displayed as labelled progress bars with plain-language status labels.
 * No medical claims — informational framing throughout.
 */

interface HealthIndicator {
  label: string;
  description: string;
  score: number;          // 0–100 where 100 is best
  statusLabel: string;   // "Low" / "Moderate" / "Elevated" / "High"
  color: string;
}

function buildHealthIndicators(city: {
  aqi: number; pm25?: number; temp?: number; humidity?: number; windSpeed?: number; pressure?: number;
}): HealthIndicator[] {
  // Respiratory Risk (lower AQI + PM2.5 = lower risk = better score)
  const aqiNorm  = Math.max(0, 1 - city.aqi / 300);
  const pm25Norm = city.pm25 != null ? Math.max(0, 1 - city.pm25 / 150) : aqiNorm;
  const respirScore = Math.round(((aqiNorm * 0.6) + (pm25Norm * 0.4)) * 100);
  const respirStatus = respirScore >= 80 ? "Low" : respirScore >= 60 ? "Moderate" : respirScore >= 40 ? "Elevated" : "High";

  // Outdoor Activity Suitability
  const tempNorm = city.temp != null ? Math.max(0, 1 - Math.abs(city.temp - 21) / 28) : 0.75;
  const windNorm = city.windSpeed != null
    ? (city.windSpeed >= 5 && city.windSpeed < 35 ? 1 : Math.max(0, 1 - Math.abs((city.windSpeed ?? 15) - 20) / 40))
    : 0.75;
  const activityScore = Math.round((aqiNorm * 0.45 + tempNorm * 0.30 + windNorm * 0.25) * 100);
  const activityStatus = activityScore >= 75 ? "Suitable" : activityScore >= 55 ? "Moderate" : activityScore >= 35 ? "Limited" : "Inadvisable";

  // Sensitive Group Risk
  const sensitiveScore = Math.round(Math.max(0, aqiNorm * 0.55 + pm25Norm * 0.45) * 100);
  const sensitiveStatus = sensitiveScore >= 80 ? "Low" : sensitiveScore >= 60 ? "Moderate" : sensitiveScore >= 40 ? "Elevated" : "High";

  // Environmental Comfort (temp + humidity combined)
  const humidNorm = city.humidity != null ? Math.max(0, 1 - Math.abs(city.humidity - 50) / 50) : 0.70;
  const comfortScore = Math.round((tempNorm * 0.55 + humidNorm * 0.45) * 100);
  const comfortStatus = comfortScore >= 75 ? "Comfortable" : comfortScore >= 55 ? "Acceptable" : comfortScore >= 35 ? "Uncomfortable" : "Poor";

  // Overall Pollution Load (all available pollutants)
  const pollutionScore = Math.round((aqiNorm * 0.50 + pm25Norm * 0.30 + (1 - (city.pressure != null ? Math.abs(city.pressure - 1013) / 60 : 0)) * 0.20) * 100);
  const pollutionStatus = pollutionScore >= 80 ? "Clean" : pollutionScore >= 60 ? "Moderate" : pollutionScore >= 40 ? "Elevated" : "Heavy";

  const color = (s: number) =>
    s >= 75 ? "var(--color-success)"
    : s >= 55 ? "hsl(90 60% 50%)"
    : s >= 35 ? "hsl(45 90% 55%)"
    : "hsl(28 90% 55%)";

  return [
    { label: "Respiratory Risk",         description: "Risk to the respiratory system based on AQI and PM2.5.",             score: respirScore,   statusLabel: respirStatus,   color: color(respirScore)   },
    { label: "Outdoor Activity",         description: "Suitability for outdoor activities across all demographics.",          score: activityScore, statusLabel: activityStatus, color: color(activityScore) },
    { label: "Sensitive Group Risk",     description: "Risk level for children, elderly, and those with respiratory conditions.", score: sensitiveScore, statusLabel: sensitiveStatus, color: color(sensitiveScore) },
    { label: "Environmental Comfort",    description: "Comfort level considering temperature and humidity.",                  score: comfortScore,  statusLabel: comfortStatus,  color: color(comfortScore)  },
    { label: "Overall Pollution Load",   description: "Composite burden of measured atmospheric pollutants.",                score: pollutionScore,statusLabel: pollutionStatus, color: color(pollutionScore)},
  ];
}

function HealthAnalysisPanel() {
  const { city } = useCity();
  const indicators = buildHealthIndicators(city);

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-75",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Health Analysis</span>
        <h3 className="text-base font-semibold mt-1">Environmental health indicators</h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-lg">
          Derived from current readings — informational only, not medical advice.
        </p>
      </div>
      <div className="space-y-4">
        {indicators.map((ind) => (
          <div key={ind.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium leading-none">{ind.label}</span>
              <span
                className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full"
                style={{
                  color: ind.color,
                  background: `color-mix(in oklab, ${ind.color} 12%, transparent)`,
                }}
              >
                {ind.statusLabel}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${ind.score}%`, background: ind.color }}
                role="progressbar"
                aria-valuenow={ind.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${ind.label}: ${ind.statusLabel}`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{ind.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 2 — What's driving conditions ───────────────────────────────────

type InsightStatus = "positive" | "neutral" | "caution";

interface ImpactInsight {
  icon: LucideIcon;
  category: string;
  title: string;
  explanation: string;
  why: string;   // Phase 3: "Why this matters"
  status: InsightStatus;
}

const STATUS_COLOR: Record<InsightStatus, string> = {
  positive: "var(--color-success)",
  neutral:  "var(--color-muted-foreground)",
  caution:  "hsl(28 90% 55%)",
};
const STATUS_ICON: Record<InsightStatus, LucideIcon> = {
  positive: ShieldCheck,
  neutral:  Info,
  caution:  AlertTriangle,
};

function buildImpactInsights(city: {
  aqi: number; temp?: number; humidity?: number; windSpeed?: number; pm25?: number;
}): ImpactInsight[] {
  const items: ImpactInsight[] = [];
  const band = findAqiBand(city.aqi);

  items.push({
    icon: Activity,
    category: "Air Quality",
    title: band.label === "Good" || band.label === "Moderate"
      ? "Air quality is currently acceptable"
      : "Air quality is the primary concern",
    explanation: HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"],
    why: "AQI is the primary indicator of air safety — it aggregates the concentrations of the most harmful pollutants into a single number.",
    status: city.aqi <= 50 ? "positive" : city.aqi <= 100 ? "neutral" : "caution",
  });

  if (typeof city.temp === "number") {
    const t = city.temp;
    items.push({
      icon: Thermometer,
      category: "Temperature",
      title: t >= 35 ? "High temperature conditions"
        : t >= 28 ? "Warm conditions expected"
        : t >= 18 ? "Comfortable temperature range"
        : t >= 10 ? "Cool conditions"
        : "Cold conditions",
      explanation: t >= 35
        ? `At ${t}°C, heat stress is a consideration — stay hydrated and limit peak-sun exertion.`
        : t >= 28 ? `At ${t}°C, conditions are warm. Outdoor activity is fine but plan for hydration.`
        : t >= 18 ? `${t}°C is comfortable for most outdoor activity.`
        : t >= 10 ? `Cool at ${t}°C — dress appropriately for extended time outdoors.`
        : `Cold at ${t}°C — limit exposure and dress in layers.`,
      why: "High temperatures amplify the health impact of poor air quality and can increase ground-level ozone formation.",
      status: t >= 35 ? "caution" : t >= 18 ? "positive" : "neutral",
    });
  }

  if (typeof city.humidity === "number") {
    const h = city.humidity;
    items.push({
      icon: Droplets,
      category: "Humidity",
      title: h >= 80 ? "High humidity — conditions feel heavier"
        : h >= 60 ? "Elevated humidity"
        : h >= 35 ? "Comfortable humidity"
        : "Low humidity — dry conditions",
      explanation: h >= 80
        ? `At ${h}% humidity, outdoor conditions may feel muggy. High humidity can trap ground-level pollutants.`
        : h >= 60 ? `Humidity at ${h}% is slightly elevated, which may make conditions feel warmer.`
        : h >= 35 ? `Humidity at ${h}% is within a comfortable range.`
        : `At ${h}% humidity, the air is dry. Stay hydrated during outdoor activity.`,
      why: "Humidity affects how the body regulates temperature and how pollutants behave in the atmosphere.",
      status: h >= 80 ? "caution" : h >= 35 ? "positive" : "neutral",
    });
  }

  if (typeof city.windSpeed === "number") {
    const w = city.windSpeed;
    items.push({
      icon: Wind,
      category: "Wind",
      title: w >= 40 ? "Strong wind conditions"
        : w >= 20 ? "Moderate wind — good dispersion"
        : w >= 8  ? "Light breeze — helpful for air quality"
        : "Calm — limited pollutant dispersion",
      explanation: w >= 40
        ? `Wind speeds of ${w} km/h may make outdoor conditions uncomfortable.`
        : w >= 20 ? `Moderate wind at ${w} km/h helps disperse local pollutants and keeps conditions fresh.`
        : w >= 8  ? `A light breeze at ${w} km/h assists in dispersing ground-level pollutants.`
        : `With calm winds at ${w} km/h, pollutants may accumulate locally rather than dispersing.`,
      why: "Wind is one of the most significant natural factors affecting air quality — it disperses or concentrates pollutants.",
      status: w >= 40 ? "caution" : w >= 8 ? "positive" : "neutral",
    });
  }

  return items.slice(0, 4);
}

function ImpactAnalysis() {
  const { city } = useCity();
  const insights = buildImpactInsights(city);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (insights.length === 0) return null;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Factor Analysis</span>
        <h3 className="text-base font-semibold mt-1">What's driving conditions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Tap any factor for a deeper explanation.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((ins) => {
          const Icon = ins.icon;
          const StatusIcon = STATUS_ICON[ins.status];
          const color = STATUS_COLOR[ins.status];
          const isExpanded = expanded === ins.category;
          return (
            <button
              key={ins.category}
              type="button"
              onClick={() => setExpanded(isExpanded ? null : ins.category)}
              aria-expanded={isExpanded}
              className={cn(
                "rounded-xl border border-border bg-card/30 p-4 space-y-2 transition-all duration-200 text-left w-full",
                "hover:shadow-md hover:border-border/80",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="size-7 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{ins.category}</span>
                </div>
                <StatusIcon className="size-3.5 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium leading-snug">{ins.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.explanation}</p>
              {/* Expanded "Why this matters" */}
              {isExpanded && (
                <div
                  className="pt-2 border-t border-border mt-1"
                  style={{ borderColor: `color-mix(in oklab, ${color} 25%, var(--color-border))` }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>
                    Why this matters
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ins.why}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 3 — Trend Intelligence (upgraded with hi/lo/avg) ────────────────

type TrendDir = "Improving" | "Stable" | "Worsening" | "Unavailable";

interface TrendItem {
  label: string;
  icon: LucideIcon;
  direction: TrendDir;
  interpretation: string;
  pctChange?: number;
  min?: number;
  max?: number;
  avg?: number;
  unit?: string;
}

function calcTrend(current: number, history: number[], higherIsBetter: boolean): TrendDir {
  if (history.length < 2) return "Unavailable";
  const avg = history.reduce((s, v) => s + v, 0) / history.length;
  const diff = current - avg;
  if (Math.abs(diff) < avg * 0.05) return "Stable";
  return (higherIsBetter ? diff > 0 : diff < 0) ? "Improving" : "Worsening";
}

function buildTrendItems(
  city: { aqi: number; pm25?: number; temp?: number; humidity?: number },
  history: CityHistoryDay[],
): TrendItem[] {
  const items: TrendItem[] = [];

  {
    const vals = history.map((d) => d.aqi.avg);
    const dir = calcTrend(city.aqi, vals, false);
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : city.aqi;
    const pct = avg > 0 ? Math.round((Math.abs(city.aqi - avg) / avg) * 100) : 0;
    items.push({
      label: "AQI", icon: Activity, direction: dir, unit: "",
      pctChange: pct > 2 ? pct : undefined,
      min: vals.length ? Math.round(Math.min(...vals)) : undefined,
      max: vals.length ? Math.round(Math.max(...vals)) : undefined,
      avg: vals.length ? Math.round(avg) : undefined,
      interpretation: dir === "Improving"
        ? `Air quality has improved over the last ${history.length} days.`
        : dir === "Worsening"
        ? `Air quality has worsened vs the ${history.length}-day average — monitor conditions.`
        : dir === "Stable"
        ? `Air quality has been relatively stable over the last ${history.length} days.`
        : "Trend data unavailable.",
    });
  }

  if (typeof city.pm25 === "number") {
    const vals = history.map((d) => d.pm25).filter((v) => typeof v === "number");
    const dir = calcTrend(city.pm25, vals, false);
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : city.pm25;
    const pct = avg > 0 ? Math.round((Math.abs(city.pm25 - avg) / avg) * 100) : 0;
    items.push({
      label: "PM2.5", icon: Wind, direction: dir, unit: "µg/m³",
      pctChange: pct > 2 ? pct : undefined,
      min: vals.length ? Math.round(Math.min(...vals) * 10) / 10 : undefined,
      max: vals.length ? Math.round(Math.max(...vals) * 10) / 10 : undefined,
      avg: vals.length ? Math.round(avg * 10) / 10 : undefined,
      interpretation: dir === "Improving" ? "PM2.5 fine particle levels have decreased from recent averages."
        : dir === "Worsening" ? "PM2.5 is trending upward and should be monitored."
        : dir === "Stable"    ? "PM2.5 levels have been consistent over the recent period."
        : "Trend data unavailable.",
    });
  }

  if (typeof city.temp === "number" && history.some((d) => typeof d.temp === "number")) {
    const vals = history.map((d) => d.temp).filter((v) => typeof v === "number");
    const dir = calcTrend(city.temp, vals, true);
    items.push({
      label: "Temperature", icon: Thermometer, direction: dir, unit: "°C",
      min: vals.length ? Math.round(Math.min(...vals)) : undefined,
      max: vals.length ? Math.round(Math.max(...vals)) : undefined,
      avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : undefined,
      interpretation: dir === "Improving" ? "Temperatures are warmer than the recent average."
        : dir === "Worsening" ? "Temperatures are cooler than the recent average."
        : dir === "Stable"    ? "Temperatures have been stable over the recent period."
        : "Trend data unavailable.",
    });
  }

  if (typeof city.humidity === "number" && history.some((d) => typeof d.humidity === "number")) {
    const vals = history.map((d) => d.humidity).filter((v) => typeof v === "number");
    const dir = calcTrend(city.humidity, vals, false);
    items.push({
      label: "Humidity", icon: Droplets, direction: dir, unit: "%",
      min: vals.length ? Math.round(Math.min(...vals)) : undefined,
      max: vals.length ? Math.round(Math.max(...vals)) : undefined,
      avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : undefined,
      interpretation: dir === "Improving" ? "Humidity is lower than the recent average — comfortable conditions."
        : dir === "Worsening" ? "Humidity is elevated vs recent averages, which may make conditions feel heavier."
        : dir === "Stable"    ? "Humidity has been consistent over the recent period."
        : "Trend data unavailable.",
    });
  }

  return items.slice(0, 4);
}

function TrendIntelligence({ history }: { history: CityHistoryDay[] | undefined }) {
  const { city } = useCity();
  const items = history && history.length > 1 ? buildTrendItems(city, history) : [];

  const dirColor = (d: TrendDir) =>
    d === "Improving" ? "var(--color-success)"
    : d === "Worsening" ? "hsl(28 90% 55%)"
    : "var(--color-muted-foreground)";
  const DirIcon = (d: TrendDir): LucideIcon =>
    d === "Improving" ? TrendingDown : d === "Worsening" ? TrendingUp : Minus;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">7-Day Trends</span>
        <h3 className="text-base font-semibold mt-1">Environmental trend intelligence</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Historical trend data is currently unavailable.</p>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const Icon = item.icon;
            const color = dirColor(item.direction);
            const DIcon = DirIcon(item.direction);
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="size-8 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{item.label}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color }}>
                        <DIcon className="size-3" aria-hidden="true" />
                        {item.direction !== "Unavailable" ? item.direction : ""}
                        {item.pctChange ? ` · ${item.pctChange}%` : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.interpretation}</p>
                  </div>
                </div>
                {/* 7-day hi / avg / lo context strip */}
                {(item.min !== undefined || item.avg !== undefined || item.max !== undefined) && (
                  <div className="ml-11 flex items-center gap-4 text-[10px] text-muted-foreground">
                    {item.min !== undefined && <span>Low {item.min}{item.unit}</span>}
                    {item.avg !== undefined && <span className="font-medium text-foreground/70">Avg {item.avg}{item.unit}</span>}
                    {item.max !== undefined && <span>High {item.max}{item.unit}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section 4 — Contextual Recommendations (upgraded) ───────────────────────

type Priority = "Low" | "Moderate" | "High";

interface Recommendation {
  icon: LucideIcon;
  audience: string;       // Phase 3: who this applies to
  title: string;
  description: string;
  whyItMatters: string;  // Phase 3: causal explanation
  priority: Priority;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  Low:      "var(--color-success)",
  Moderate: "hsl(45 90% 55%)",
  High:     "hsl(28 90% 55%)",
};

function buildRecommendations(city: {
  aqi: number; temp?: number; humidity?: number; windSpeed?: number; pm25?: number;
}): Recommendation[] {
  const recs: Recommendation[] = [];
  const band = findAqiBand(city.aqi);

  // General outdoor activity
  if (city.aqi <= 50) {
    recs.push({
      icon: Bike,
      audience: "Everyone",
      title: "Outdoor activities are suitable",
      description: "Current air quality is good. No restrictions on outdoor activity for any group.",
      whyItMatters: "AQI below 50 indicates minimal risk from air pollution for all demographics.",
      priority: "Low",
    });
  } else if (city.aqi <= 100) {
    recs.push({
      icon: PersonStanding,
      audience: "General public",
      title: "Outdoor activity is generally suitable",
      description: `${band.label} air quality. Moderate-duration outdoor activity is fine for most people.`,
      whyItMatters: "At this AQI level, the general population is unlikely to experience adverse effects during typical outdoor activity.",
      priority: "Low",
    });
  } else {
    recs.push({
      icon: AlertTriangle,
      audience: "Everyone",
      title: "Limit prolonged outdoor exposure",
      description: `${band.label} air quality. Reduce time spent in high-exertion outdoor activity.`,
      whyItMatters: "Elevated AQI increases the concentration of pollutants inhaled during exertion — reducing time outdoors reduces exposure.",
      priority: "High",
    });
  }

  // Sensitive groups recommendation
  if (city.aqi > 50) {
    recs.push({
      icon: Users,
      audience: "Sensitive groups",
      title: city.aqi <= 100
        ? "Sensitive individuals should monitor conditions"
        : "Sensitive individuals should limit outdoor time",
      description: city.aqi <= 100
        ? "Children, elderly, and those with respiratory or cardiovascular conditions should consider shorter outdoor sessions."
        : "Those with asthma, heart disease, or respiratory conditions should stay indoors or wear appropriate protection.",
      whyItMatters: "Sensitive individuals have lower physiological tolerance for airborne pollutants and experience health effects at lower concentrations.",
      priority: city.aqi <= 100 ? "Moderate" : "High",
    });
  }

  // Temperature
  if (typeof city.temp === "number" && city.temp >= 35) {
    recs.push({
      icon: Thermometer,
      audience: "Everyone",
      title: "Avoid peak-heat outdoor activity",
      description: `${city.temp}°C — avoid prolonged exposure during the hottest part of the day. Stay hydrated.`,
      whyItMatters: "High temperatures combined with poor air quality compound health risks — heat stress and pollution interact to increase cardiovascular and respiratory strain.",
      priority: "High",
    });
  } else if (typeof city.temp === "number" && city.temp >= 28) {
    recs.push({
      icon: Thermometer,
      audience: "Everyone",
      title: "Stay hydrated during outdoor activity",
      description: `Warm conditions at ${city.temp}°C. Take regular breaks and keep fluid intake up.`,
      whyItMatters: "Warmer temperatures increase perspiration, raising the risk of dehydration — particularly for children and the elderly.",
      priority: "Moderate",
    });
  }

  // Humidity
  if (typeof city.humidity === "number" && city.humidity >= 75) {
    recs.push({
      icon: Droplets,
      audience: "Everyone",
      title: "High humidity — pace outdoor exertion",
      description: `At ${city.humidity}% humidity, the air feels heavier and sweat evaporates more slowly.`,
      whyItMatters: "High humidity reduces the body's ability to cool through evaporation, increasing the risk of heat-related illness during exertion.",
      priority: "Moderate",
    });
  }

  // Wind
  if (typeof city.windSpeed === "number" && city.windSpeed >= 40) {
    recs.push({
      icon: Wind,
      audience: "Everyone",
      title: "Strong wind — take care outdoors",
      description: `Wind speeds of ${city.windSpeed} km/h may make outdoor conditions uncomfortable. Secure loose items.`,
      whyItMatters: "Strong winds can increase wind chill and, in combination with dry conditions, may carry particulate matter.",
      priority: "Moderate",
    });
  }

  // Fallback if everything is good
  if (recs.length <= 1 && recs[0]?.priority === "Low") {
    recs.push({
      icon: ShieldCheck,
      audience: "Everyone",
      title: "Monitor air quality updates",
      description: "Conditions are currently favourable. Continue to check updates before extended outdoor activity.",
      whyItMatters: "Air quality can change rapidly due to weather shifts, traffic patterns, and industrial activity.",
      priority: "Low",
    });
  }

  // Sort: High first
  return recs.sort((a, b) => {
    const order: Priority[] = ["High", "Moderate", "Low"];
    return order.indexOf(a.priority) - order.indexOf(b.priority);
  }).slice(0, 4);
}

function SmartRecommendations() {
  const { city } = useCity();
  const recs = buildRecommendations(city);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recommendations</span>
        <h3 className="text-base font-semibold mt-1">Contextual guidance</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Tap any item to see why it matters.</p>
      </div>

      <div className="space-y-3">
        {recs.map((rec) => {
          const Icon = rec.icon;
          const color = PRIORITY_COLOR[rec.priority];
          const isExpanded = expandedKey === rec.title;
          return (
            <button
              key={rec.title}
              type="button"
              onClick={() => setExpandedKey(isExpanded ? null : rec.title)}
              aria-expanded={isExpanded}
              className={cn(
                "flex items-start gap-4 rounded-xl border border-border bg-card/30 p-4 w-full text-left transition-all duration-200",
                "hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <div
                className="size-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
                style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{rec.audience}</div>
                    <span className="text-sm font-medium block">{rec.title}</span>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{
                      color,
                      borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                    }}
                  >
                    {rec.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                {isExpanded && (
                  <div className="pt-2 border-t border-border mt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Why this matters</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.whyItMatters}</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Recommendations are informational only — not medical advice. Consult a healthcare professional for personal health decisions.
      </p>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function IntelligenceSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="glass rounded-2xl p-6 md:p-8 xl:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
          <div className="flex justify-center"><Skeleton className="size-36 rounded-full" /></div>
        </div>
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function EnvironmentalIntelligence({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();
  const reduced = usePrefersReducedMotion();

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["intelligence-history", city.id, 7],
    queryFn: async () => {
      const res = await environmentalApi.getCityHistory(city.id, 7);
      return res.data.history;
    },
    enabled: !!city.id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  if (isCityListLoading || histLoading) return <IntelligenceSkeleton className={className} />;

  if (isCityError) {
    return (
      <EnvErrorState className={className} onRetry={refreshCity} retryDisabled={false}
        message="Unable to load environmental intelligence data." />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState className={className}
        title="Environmental intelligence is temporarily limited — some data is unavailable." />
    );
  }

  const { score, label: scoreLabel, confidence } = computeIntelligenceScore(city);

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1 — Intelligence hero + key findings */}
      <IntelligenceHero
        score={score} scoreLabel={scoreLabel} confidence={confidence}
        reduced={reduced} history={history}
      />

      {/* 2 — Environmental Health Analysis (new in Phase 3) */}
      <HealthAnalysisPanel />

      {/* 3 + 4 — Impact analysis and trend intelligence side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ImpactAnalysis />
        <TrendIntelligence history={history} />
      </div>

      {/* 5 — Contextual recommendations */}
      <SmartRecommendations />
    </div>
  );
}
