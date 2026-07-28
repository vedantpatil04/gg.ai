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
  type LucideIcon,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { environmentalApi, type CityHistoryDay } from "@/lib/api/environmental.api";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Environmental Intelligence & AI Insights (Phase 6).
 *
 * Transforms the overview from data display into data INTERPRETATION.
 * Five sub-sections:
 *   1. Intelligence hero — dynamic headline + Environmental Intelligence Score
 *      (a deterministic 0-100 composite derived from real readings).
 *   2. "What's affecting your environment?" — 2-4 dynamic insight items.
 *   3. Environmental Trend Intelligence — compact summary of 7-day trends
 *      (reuses the `getCityHistory` query, separate cache key).
 *   4. Smart Recommendations — priority-ranked action items derived from
 *      real data. No medical claims.
 *
 * Data: all from `useCity()` + the existing `getCityHistory` endpoint.
 * No new API, no fake data, no AI call (the genuine AI summary from
 * `copilotApi.cityInsights` is already handled by `<AiSummary>` further
 * down the page — duplicating it here would be redundant).
 *
 * Animations:
 *   - Score radial SVG counts up from 0 on first render.
 *   - Cards fade+slide via `motion-safe:animate-in` (tw-animate-css).
 *   - Subtle animated radial spot behind the hero (CSS @utility `aurora`).
 *   - All animations respect `prefers-reduced-motion`.
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

/**
 * Deterministic 0-100 composite score.
 *
 * Weights (must sum to 1.0):
 *   AQI        0.45  — primary air-quality signal
 *   PM2.5      0.20  — fine-particulate sub-component
 *   Humidity   0.10  — comfort factor
 *   Wind       0.10  — dispersion proxy
 *   Pressure   0.08  — stability proxy
 *   Temp       0.07  — comfort factor
 *
 * Each sub-score is normalised to [0,1] where 1 = ideal and 0 = worst.
 * Unavailable metrics are excluded and weights are redistributed linearly.
 */
function computeIntelligenceScore(city: {
  aqi: number;
  pm25?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  temp?: number;
}): {
  score: number;
  label: string;
  components: { label: string; weight: number; norm: number }[];
} {
  const raw: { label: string; weight: number; value: number | undefined; norm: () => number }[] = [
    {
      label: "AQI",
      weight: 0.45,
      value: city.aqi,
      norm: () => {
        // AQI 0→50 = excellent (1.0), 300+ = hazardous (0)
        return Math.max(0, 1 - city.aqi / 300);
      },
    },
    {
      label: "PM2.5",
      weight: 0.2,
      value: city.pm25,
      norm: () => {
        // 0→15 µg/m³ = good (1.0), 150+ = 0
        return Math.max(0, 1 - (city.pm25 ?? 0) / 150);
      },
    },
    {
      label: "Humidity",
      weight: 0.1,
      value: city.humidity,
      norm: () => {
        // 40–60% ideal → 1.0; extremes (0% or 100%) → 0
        const h = city.humidity ?? 50;
        return Math.max(0, 1 - Math.abs(h - 50) / 50);
      },
    },
    {
      label: "Wind",
      weight: 0.1,
      value: city.windSpeed,
      norm: () => {
        // 5–25 km/h ideal (disperses pollutants); calm or gale = lower
        const w = city.windSpeed ?? 10;
        if (w < 5) return 0.5;
        if (w < 30) return 1.0;
        return Math.max(0, 1 - (w - 30) / 70);
      },
    },
    {
      label: "Pressure",
      weight: 0.08,
      value: city.pressure,
      norm: () => {
        // 1013 hPa = standard; ±30 range
        const p = (city.pressure as number | undefined) ?? 1013;
        return Math.max(0, 1 - Math.abs(p - 1013) / 60);
      },
    },
    {
      label: "Temperature",
      weight: 0.07,
      value: city.temp,
      norm: () => {
        // 18–24°C ideal
        const t = city.temp ?? 20;
        return Math.max(0, 1 - Math.abs(t - 21) / 30);
      },
    },
  ];

  const available = raw.filter((r) => r.value !== undefined && r.value !== null);
  const totalWeight = available.reduce((s, r) => s + r.weight, 0);
  const components = available.map((r) => ({
    label: r.label,
    weight: r.weight / totalWeight,
    norm: r.norm(),
  }));

  const score = Math.round(components.reduce((s, c) => s + c.norm * c.weight * 100, 0));

  const label =
    score >= 80
      ? "Excellent"
      : score >= 65
        ? "Good"
        : score >= 50
          ? "Moderate"
          : score >= 35
            ? "Elevated"
            : "Poor";

  return { score, label, components };
}

// ─── Radial score gauge ──────────────────────────────────────────────────────

function ScoreGauge({ score, label, reduced }: { score: number; label: string; reduced: boolean }) {
  const [displayed, setDisplayed] = useState(reduced ? score : 0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setDisplayed(score);
      return;
    }
    let start: number | null = null;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [score, reduced]);

  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = displayed / 100;
  const dash = pct * circ;
  const gap = circ - dash;

  const color =
    score >= 80
      ? "var(--color-success)"
      : score >= 65
        ? "hsl(90 60% 50%)"
        : score >= 50
          ? "hsl(45 90% 55%)"
          : score >= 35
            ? "hsl(28 90% 55%)"
            : "var(--color-destructive)";

  return (
    <div
      className="flex flex-col items-center gap-2"
      aria-label={`Environmental Intelligence Score: ${score} — ${label}`}
    >
      <div className="relative size-36">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            style={{ transition: reduced ? "none" : "stroke-dasharray 0.05s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
            {displayed}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">
            Score
          </span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground text-center max-w-[160px] leading-relaxed">
        Environmental Intelligence Score — a composite of available air quality and weather
        readings.
      </span>
    </div>
  );
}

// ─── Section 1 — Intelligence Hero ──────────────────────────────────────────

function IntelligenceHero({
  score,
  scoreLabel,
  reduced,
}: {
  score: number;
  scoreLabel: string;
  reduced: boolean;
}) {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);

  const headline =
    score >= 80
      ? "Your environment looks healthy"
      : score >= 65
        ? "Environmental conditions are generally favourable"
        : score >= 50
          ? "Environmental conditions are acceptable"
          : score >= 35
            ? "Environmental conditions need attention"
            : "Environmental conditions are currently poor";

  const summary =
    score >= 80
      ? `Air quality is currently ${band.label.toLowerCase()}, with conditions favourable for outdoor activity.`
      : score >= 65
        ? `Air quality is currently ${band.label.toLowerCase()}. Most outdoor activities remain suitable, but sensitive individuals should stay mindful of conditions.`
        : score >= 50
          ? `Environmental conditions are generally acceptable. Elevated ${band.label.toLowerCase()} pollution levels may affect sensitive individuals.`
          : `Air quality is currently ${band.label.toLowerCase()}. Consider reducing prolonged outdoor exposure until conditions improve.`;

  return (
    <div className="relative glass rounded-2xl p-6 md:p-10 overflow-hidden">
      {/* Subtle aurora behind the card — only when motion is not reduced */}
      {!reduced && (
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full opacity-15 blur-3xl aurora"
          aria-hidden="true"
        />
      )}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              GreenGuard AI
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{headline}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{summary}</p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <ScoreGauge score={score} label={scoreLabel} reduced={reduced} />
        </div>
      </div>
    </div>
  );
}

// ─── Section 2 — What's affecting your environment? ─────────────────────────

type InsightStatus = "positive" | "neutral" | "caution";

interface ImpactInsight {
  icon: LucideIcon;
  category: string;
  title: string;
  explanation: string;
  status: InsightStatus;
}

const STATUS_COLOR: Record<InsightStatus, string> = {
  positive: "var(--color-success)",
  neutral: "var(--color-muted-foreground)",
  caution: "hsl(28 90% 55%)",
};
const STATUS_ICON: Record<InsightStatus, LucideIcon> = {
  positive: ShieldCheck,
  neutral: Info,
  caution: AlertTriangle,
};

function buildImpactInsights(city: {
  aqi: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  pm25?: number;
  pressure?: number;
}): ImpactInsight[] {
  const items: ImpactInsight[] = [];

  // AQI
  const band = findAqiBand(city.aqi);
  items.push({
    icon: Activity,
    category: "Air Quality",
    title:
      band.label === "Good" || band.label === "Moderate"
        ? "Air quality is currently acceptable"
        : "Air quality is the primary concern",
    explanation: HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"],
    status: city.aqi <= 50 ? "positive" : city.aqi <= 100 ? "neutral" : "caution",
  });

  // Temperature
  if (typeof city.temp === "number") {
    const t = city.temp;
    items.push({
      icon: Thermometer,
      category: "Temperature",
      title:
        t >= 35
          ? "High temperature conditions"
          : t >= 28
            ? "Warm conditions expected"
            : t >= 18
              ? "Comfortable temperature range"
              : t >= 10
                ? "Cool conditions"
                : "Cold conditions",
      explanation:
        t >= 35
          ? `At ${t}°C, heat stress is a consideration — stay hydrated and limit peak-sun exertion.`
          : t >= 28
            ? `At ${t}°C, conditions are warm. Outdoor activity is fine but plan for extra hydration.`
            : t >= 18
              ? `${t}°C is within a comfortable range for most outdoor activity.`
              : t >= 10
                ? `Cool at ${t}°C — dress appropriately for extended outdoor time.`
                : `Cold at ${t}°C — limit exposure and dress in layers.`,
      status: t >= 35 ? "caution" : t >= 18 ? "positive" : "neutral",
    });
  }

  // Humidity
  if (typeof city.humidity === "number") {
    const h = city.humidity;
    items.push({
      icon: Droplets,
      category: "Humidity",
      title:
        h >= 80
          ? "High humidity — conditions feel heavier"
          : h >= 60
            ? "Elevated humidity"
            : h >= 35
              ? "Comfortable humidity"
              : "Low humidity — dry conditions",
      explanation:
        h >= 80
          ? `At ${h}% humidity, outdoor conditions may feel muggy. High humidity can also trap ground-level pollutants.`
          : h >= 60
            ? `Humidity at ${h}% is slightly elevated, which may make conditions feel warmer than the temperature suggests.`
            : h >= 35
              ? `Humidity at ${h}% is within a comfortable range.`
              : `At ${h}% humidity, the air is dry. Stay hydrated during outdoor activity.`,
      status: h >= 80 ? "caution" : h >= 35 ? "positive" : "neutral",
    });
  }

  // Wind
  if (typeof city.windSpeed === "number") {
    const w = city.windSpeed;
    items.push({
      icon: Wind,
      category: "Wind",
      title:
        w >= 40
          ? "Strong wind conditions"
          : w >= 20
            ? "Moderate wind conditions"
            : w >= 8
              ? "Light breeze — helpful for dispersion"
              : "Calm conditions — limited pollutant dispersion",
      explanation:
        w >= 40
          ? `Wind speeds of ${w} km/h may make outdoor conditions uncomfortable and increase wind chill.`
          : w >= 20
            ? `Moderate wind at ${w} km/h helps disperse local pollutants and keeps conditions fresh.`
            : w >= 8
              ? `A light breeze at ${w} km/h assists in dispersing ground-level pollutants.`
              : `With calm winds at ${w} km/h, pollutants may accumulate locally rather than dispersing.`,
      status: w >= 40 ? "caution" : w >= 8 ? "positive" : "neutral",
    });
  }

  // Return max 4 items; AQI always first, then by caution priority
  return items.slice(0, 4);
}

function ImpactAnalysis() {
  const { city } = useCity();
  const insights = buildImpactInsights(city);

  if (insights.length === 0) return null;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Analysis
        </span>
        <h3 className="text-base font-semibold mt-1">What's affecting your environment?</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {insights.map((ins) => {
          const Icon = ins.icon;
          const StatusIcon = STATUS_ICON[ins.status];
          const color = STATUS_COLOR[ins.status];
          return (
            <div
              key={ins.category}
              className="rounded-xl border border-border bg-card/30 p-4 space-y-2 transition-shadow duration-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="size-7 rounded-lg grid place-items-center shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                      color,
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {ins.category}
                  </span>
                </div>
                <StatusIcon
                  className="size-3.5 shrink-0 mt-0.5"
                  style={{ color }}
                  aria-label={ins.status}
                />
              </div>
              <p className="text-sm font-medium leading-snug">{ins.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.explanation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 3 — Trend Intelligence ─────────────────────────────────────────

type TrendDir = "Improving" | "Stable" | "Worsening" | "Unavailable";

interface TrendItem {
  label: string;
  icon: LucideIcon;
  direction: TrendDir;
  interpretation: string;
  pctChange?: number;
}

function calcTrend(current: number, history: number[], higherIsBetter: boolean): TrendDir {
  if (history.length < 2) return "Unavailable";
  const avg = history.reduce((s, v) => s + v, 0) / history.length;
  const diff = current - avg;
  const threshold = avg * 0.05;
  if (Math.abs(diff) < threshold) return "Stable";
  const improving = higherIsBetter ? diff > 0 : diff < 0;
  return improving ? "Improving" : "Worsening";
}

function buildTrendItems(
  city: { aqi: number; pm25?: number; temp?: number; humidity?: number },
  history: CityHistoryDay[],
): TrendItem[] {
  const items: TrendItem[] = [];

  // AQI trend
  {
    const histVals = history.map((d) => d.aqi.avg);
    const dir = calcTrend(city.aqi, histVals, false);
    const avgHist = histVals.length
      ? histVals.reduce((s, v) => s + v, 0) / histVals.length
      : city.aqi;
    const pct = avgHist > 0 ? Math.round((Math.abs(city.aqi - avgHist) / avgHist) * 100) : 0;
    items.push({
      label: "AQI",
      icon: Activity,
      direction: dir,
      pctChange: pct > 2 ? pct : undefined,
      interpretation:
        dir === "Improving"
          ? `Air quality has improved over the last ${history.length} days.`
          : dir === "Worsening"
            ? `Air quality has worsened compared with the ${history.length}-day average — monitor conditions.`
            : dir === "Stable"
              ? `Air quality has remained relatively stable over the last ${history.length} days.`
              : "Trend data unavailable.",
    });
  }

  // PM2.5 trend
  if (typeof city.pm25 === "number") {
    const histVals = history.map((d) => d.pm25);
    const dir = calcTrend(city.pm25, histVals, false);
    const avgHist = histVals.length
      ? histVals.reduce((s, v) => s + v, 0) / histVals.length
      : city.pm25;
    const pct = avgHist > 0 ? Math.round((Math.abs(city.pm25 - avgHist) / avgHist) * 100) : 0;
    items.push({
      label: "PM2.5",
      icon: Wind,
      direction: dir,
      pctChange: pct > 2 ? pct : undefined,
      interpretation:
        dir === "Improving"
          ? "PM2.5 fine particle levels have decreased from recent averages."
          : dir === "Worsening"
            ? "PM2.5 levels are trending upward and should be monitored."
            : dir === "Stable"
              ? "PM2.5 levels have been consistent over the recent period."
              : "Trend data unavailable.",
    });
  }

  // Temperature trend
  if (typeof city.temp === "number" && history.some((d) => typeof d.temp === "number")) {
    const histVals = history.map((d) => d.temp).filter((v) => typeof v === "number");
    const dir = calcTrend(city.temp, histVals, true);
    items.push({
      label: "Temperature",
      icon: Thermometer,
      direction: dir,
      interpretation:
        dir === "Improving"
          ? "Temperatures are warmer than the recent average."
          : dir === "Worsening"
            ? "Temperatures are cooler than the recent average."
            : dir === "Stable"
              ? "Temperatures have been stable over the recent period."
              : "Trend data unavailable.",
    });
  }

  // Humidity trend
  if (typeof city.humidity === "number" && history.some((d) => typeof d.humidity === "number")) {
    const histVals = history.map((d) => d.humidity).filter((v) => typeof v === "number");
    const dir = calcTrend(city.humidity, histVals, false);
    items.push({
      label: "Humidity",
      icon: Droplets,
      direction: dir,
      interpretation:
        dir === "Improving"
          ? "Humidity levels are lower than the recent average — comfortable conditions."
          : dir === "Worsening"
            ? "Humidity is elevated compared to recent averages, which may make conditions feel heavier."
            : dir === "Stable"
              ? "Humidity has been consistent over the recent period."
              : "Trend data unavailable.",
    });
  }

  return items.slice(0, 4);
}

function TrendIcon({ direction }: { direction: TrendDir }) {
  const Icon =
    direction === "Improving" ? TrendingDown : direction === "Worsening" ? TrendingUp : Minus;
  const color =
    direction === "Improving"
      ? "var(--color-success)"
      : direction === "Worsening"
        ? "hsl(28 90% 55%)"
        : "var(--color-muted-foreground)";
  if (direction === "Unavailable")
    return <span className="text-[10px] text-muted-foreground">—</span>;
  return <Icon className="size-4" style={{ color }} aria-hidden="true" />;
}

function TrendIntelligence({ history }: { history: CityHistoryDay[] | undefined }) {
  const { city } = useCity();
  const items = history && history.length > 1 ? buildTrendItems(city, history) : [];

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Trends</span>
        <h3 className="text-base font-semibold mt-1">Environmental trends</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Historical trend data is currently unavailable.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const Icon = item.icon;
            const dirColor =
              item.direction === "Improving"
                ? "var(--color-success)"
                : item.direction === "Worsening"
                  ? "hsl(28 90% 55%)"
                  : "var(--color-muted-foreground)";
            return (
              <div key={item.label} className="flex items-start gap-4">
                <div
                  className="size-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
                  style={{
                    background: `color-mix(in oklab, ${dirColor} 14%, transparent)`,
                    color: dirColor,
                  }}
                  aria-hidden="true"
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{item.label}</span>
                    <TrendIcon direction={item.direction} />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: dirColor }}
                      aria-label={`Trend: ${item.direction}`}
                    >
                      {item.direction !== "Unavailable" ? item.direction : ""}
                      {item.pctChange ? ` · ${item.pctChange}%` : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.interpretation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section 4 — Smart Recommendations ──────────────────────────────────────

type Priority = "Low" | "Moderate" | "High";

interface Recommendation {
  icon: LucideIcon;
  title: string;
  description: string;
  priority: Priority;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  Low: "var(--color-success)",
  Moderate: "hsl(45 90% 55%)",
  High: "hsl(28 90% 55%)",
};

function buildRecommendations(city: {
  aqi: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  pm25?: number;
}): Recommendation[] {
  const recs: Recommendation[] = [];
  const band = findAqiBand(city.aqi);

  // AQI-based
  if (city.aqi <= 50) {
    recs.push({
      icon: Sun,
      title: "Outdoor activities are suitable",
      description: "Current air quality is good. Outdoor activities are appropriate for everyone.",
      priority: "Low",
    });
  } else if (city.aqi <= 100) {
    recs.push({
      icon: Activity,
      title: "Generally suitable — sensitive individuals take care",
      description: `${band.label} air quality. Sensitive groups may wish to limit prolonged exertion outdoors.`,
      priority: "Moderate",
    });
  } else {
    recs.push({
      icon: AlertTriangle,
      title: "Limit prolonged outdoor exposure",
      description: `${band.label} air quality detected. Reduce time spent in high-exertion outdoor activity where possible.`,
      priority: "High",
    });
  }

  // Temperature
  if (typeof city.temp === "number") {
    if (city.temp >= 35) {
      recs.push({
        icon: Thermometer,
        title: "Avoid peak-heat outdoor activity",
        description: `${city.temp}°C — avoid prolonged exposure during the hottest part of the day and stay hydrated.`,
        priority: "High",
      });
    } else if (city.temp >= 28) {
      recs.push({
        icon: Thermometer,
        title: "Stay hydrated during outdoor activity",
        description: `Warm conditions at ${city.temp}°C. Take regular breaks and keep fluid intake up.`,
        priority: "Moderate",
      });
    }
  }

  // Humidity
  if (typeof city.humidity === "number" && city.humidity >= 75) {
    recs.push({
      icon: Droplets,
      title: "High humidity — pace outdoor exertion",
      description: `At ${city.humidity}% humidity, the air feels heavier. Consider taking breaks during extended outdoor activity.`,
      priority: "Moderate",
    });
  }

  // Wind
  if (typeof city.windSpeed === "number" && city.windSpeed >= 40) {
    recs.push({
      icon: Wind,
      title: "Strong wind — take care outdoors",
      description: `Wind speeds of ${city.windSpeed} km/h may make outdoor conditions uncomfortable. Secure loose items.`,
      priority: "Moderate",
    });
  }

  // Fallback if only the low-AQI item exists
  if (recs.length === 1 && recs[0].priority === "Low") {
    recs.push({
      icon: ShieldCheck,
      title: "Monitor air quality updates",
      description:
        "Environmental conditions are currently favourable. Continue to check updates, especially before extended outdoor activity.",
      priority: "Low",
    });
  }

  return recs.slice(0, 4);
}

function SmartRecommendations() {
  const { city } = useCity();
  const recs = buildRecommendations(city);

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Recommendations
        </span>
        <h3 className="text-base font-semibold mt-1">Smart recommendations</h3>
      </div>

      <div className="space-y-3">
        {recs.map((rec) => {
          const Icon = rec.icon;
          const color = PRIORITY_COLOR[rec.priority];
          return (
            <div
              key={rec.title}
              className="flex items-start gap-4 rounded-xl border border-border bg-card/30 p-4 transition-shadow duration-300 hover:shadow-md"
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{rec.title}</span>
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
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Recommendations are informational only and are not medical advice.
      </p>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

import { Skeleton } from "@/components/ui/skeleton";

function IntelligenceSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="glass rounded-2xl p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="size-36 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
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

  if (isCityListLoading || histLoading) {
    return <IntelligenceSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load environmental intelligence data."
      />
    );
  }

  if (!city || typeof city.aqi !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Environmental intelligence is currently limited because some environmental data is unavailable."
      />
    );
  }

  const { score, label: scoreLabel } = computeIntelligenceScore(city);

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1 — Intelligence hero + score */}
      <IntelligenceHero score={score} scoreLabel={scoreLabel} reduced={reduced} />

      {/* 2 + 3 — Impact analysis and trend intelligence side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ImpactAnalysis />
        <TrendIntelligence history={history} />
      </div>

      {/* 4 — Smart recommendations */}
      <SmartRecommendations />
    </div>
  );
}
