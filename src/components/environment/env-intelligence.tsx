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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Environmental Intelligence — Phase 1 Enterprise UI/UX.
 *
 * All business logic preserved exactly. Only presentation layer improved:
 *  - IntelligenceHero: larger, more editorial, better gauge integration
 *  - ImpactAnalysis: clearer visual hierarchy per card, stronger section identity
 *  - TrendIntelligence: cleaner list layout, better data emphasis
 *  - SmartRecommendations: priority hierarchy more visually distinct
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
// (Identical computation — only presentation changed)

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
      norm: () => Math.max(0, 1 - city.aqi / 300),
    },
    {
      label: "PM2.5",
      weight: 0.2,
      value: city.pm25,
      norm: () => Math.max(0, 1 - (city.pm25 ?? 0) / 150),
    },
    {
      label: "Humidity",
      weight: 0.1,
      value: city.humidity,
      norm: () => {
        const h = city.humidity ?? 50;
        return Math.max(0, 1 - Math.abs(h - 50) / 50);
      },
    },
    {
      label: "Wind",
      weight: 0.1,
      value: city.windSpeed,
      norm: () => {
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
        const p = (city.pressure as number | undefined) ?? 1013;
        return Math.max(0, 1 - Math.abs(p - 1013) / 60);
      },
    },
    {
      label: "Temperature",
      weight: 0.07,
      value: city.temp,
      norm: () => {
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

// ─── Score color helper ──────────────────────────────────────────────────────

function scoreColor(score: number): string {
  return score >= 80
    ? "var(--color-success)"
    : score >= 65
      ? "hsl(90 60% 50%)"
      : score >= 50
        ? "hsl(45 90% 55%)"
        : score >= 35
          ? "hsl(28 90% 55%)"
          : "var(--color-destructive)";
}

// ─── Radial score gauge ──────────────────────────────────────────────────────

function ScoreGauge({ score, label, reduced }: { score: number; label: string; reduced: boolean }) {
  const [displayed, setDisplayed] = useState(reduced ? score : 0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (reduced) { setDisplayed(score); return; }
    let start: number | null = null;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [score, reduced]);

  const r = 56;
  const circ = 2 * Math.PI * r;
  const pct = displayed / 100;
  const dash = pct * circ;
  const gap = circ - dash;
  const color = scoreColor(score);

  return (
    <div
      className="flex flex-col items-center gap-3"
      aria-label={`Environmental Intelligence Score: ${score} — ${label}`}
    >
      <div className="relative size-40">
        {/* Soft glow behind gauge */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ background: color }}
          aria-hidden="true"
        />
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
          {/* Track */}
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke="oklch(1 0 0 / 0.07)"
            strokeWidth="7"
          />
          {/* Progress */}
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            style={{
              transition: reduced ? "none" : "stroke-dasharray 0.05s linear",
              filter: `drop-shadow(0 0 6px ${color}60)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className="text-[2.4rem] font-bold tabular-nums leading-none tracking-tighter"
            style={{ color }}
          >
            {displayed}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "oklch(0.46 0.012 230)" }}
          >
            / 100
          </span>
        </div>
      </div>

      {/* Status label */}
      <div className="text-center space-y-0.5">
        <div className="text-sm font-semibold" style={{ color }}>
          {label}
        </div>
        <div
          className="text-[10px] leading-relaxed max-w-[160px] text-center"
          style={{ color: "oklch(0.46 0.012 230)" }}
        >
          Environmental Intelligence Score
        </div>
      </div>
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
  const color = scoreColor(score);

  const headline =
    score >= 80
      ? "Your environment looks healthy"
      : score >= 65
        ? "Environmental conditions are broadly favourable"
        : score >= 50
          ? "Environmental conditions are acceptable"
          : score >= 35
            ? "Environmental conditions warrant attention"
            : "Environmental conditions are currently poor";

  const summary =
    score >= 80
      ? `Air quality is ${band.label.toLowerCase()}, with conditions well-suited for outdoor activity.`
      : score >= 65
        ? `Air quality is ${band.label.toLowerCase()}. Most outdoor activity remains suitable — sensitive individuals should stay mindful.`
        : score >= 50
          ? `Elevated ${band.label.toLowerCase()} pollution levels may affect sensitive individuals.`
          : `${band.label} air quality detected. Consider limiting prolonged outdoor exposure until conditions improve.`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(145deg,
          oklch(1 0 0 / 0.07) 0%,
          color-mix(in oklab, ${color} 5%, oklch(1 0 0 / 0.03)) 100%)`,
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        border: `1px solid color-mix(in oklab, ${color} 18%, oklch(1 0 0 / 0.07))`,
        boxShadow: `0 0 0 1px oklch(1 0 0 / 0.04) inset, 0 0 60px -20px ${color}20`,
        padding: "2rem 2rem 2rem",
      }}
    >
      {/* Ambient glow — top-right */}
      {!reduced && (
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-[22rem] rounded-full opacity-[0.13] blur-3xl"
          style={{ background: color }}
          aria-hidden="true"
        />
      )}

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
        <div className="space-y-4">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <Sparkles
              className="size-3.5 shrink-0"
              style={{ color: "oklch(0.55 0.012 230)" }}
              aria-hidden="true"
            />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "oklch(0.50 0.012 230)" }}
            >
              GreenGuard AI · Intelligence Report
            </span>
          </div>

          {/* Headline */}
          <h3
            className="text-2xl md:text-3xl xl:text-[2rem] font-bold tracking-[-0.025em] leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "oklch(0.95 0.008 220)",
            }}
          >
            {headline}
          </h3>

          {/* Summary */}
          <p
            className="text-sm md:text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: "oklch(0.60 0.012 230)" }}
          >
            {summary}
          </p>

          {/* AQI status pill */}
          <div className="pt-1">
            <span
              className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-1.5 rounded-full border"
              style={{
                color: band.color,
                borderColor: `color-mix(in oklab, ${band.color} 30%, transparent)`,
                background: `color-mix(in oklab, ${band.color} 10%, transparent)`,
              }}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ background: band.color }}
                aria-hidden="true"
              />
              AQI {city.aqi} · {band.label}
            </span>
          </div>
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
  neutral: "oklch(0.55 0.012 230)",
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

  return items.slice(0, 4);
}

function ImpactAnalysis() {
  const { city } = useCity();
  const insights = buildImpactInsights(city);

  if (insights.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
      )}
      style={{
        background: "oklch(1 0 0 / 0.05)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      {/* Section header */}
      <div
        className="px-5 pt-5 pb-4 border-b"
        style={{ borderColor: "oklch(1 0 0 / 0.07)" }}
      >
        <span
          className="block text-[9.5px] font-bold uppercase tracking-[0.22em] mb-1.5"
          style={{ color: "oklch(0.46 0.012 230)" }}
        >
          Factor Analysis
        </span>
        <h4
          className="text-base font-semibold tracking-tight"
          style={{ color: "oklch(0.90 0.010 220)", fontFamily: "var(--font-display)" }}
        >
          What's affecting your environment?
        </h4>
      </div>

      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {insights.map((ins) => {
          const Icon = ins.icon;
          const StatusIcon = STATUS_ICON[ins.status];
          const color = STATUS_COLOR[ins.status];
          return (
            <div
              key={ins.category}
              className="rounded-xl p-4 space-y-2.5 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: `color-mix(in oklab, ${color} 5%, oklch(1 0 0 / 0.03))`,
                border: `1px solid color-mix(in oklab, ${color} 16%, oklch(1 0 0 / 0.06))`,
              }}
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
                  <span
                    className="text-[9.5px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "oklch(0.48 0.012 230)" }}
                  >
                    {ins.category}
                  </span>
                </div>
                <StatusIcon
                  className="size-3.5 shrink-0 mt-0.5"
                  style={{ color }}
                  aria-label={ins.status}
                />
              </div>
              <p
                className="text-[0.825rem] font-semibold leading-snug"
                style={{ color: "oklch(0.88 0.010 220)" }}
              >
                {ins.title}
              </p>
              <p
                className="text-[0.78rem] leading-relaxed"
                style={{ color: "oklch(0.54 0.012 230)" }}
              >
                {ins.explanation}
              </p>
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

const TREND_COLOR: Record<TrendDir, string> = {
  Improving: "var(--color-success)",
  Stable: "oklch(0.55 0.012 230)",
  Worsening: "hsl(28 90% 55%)",
  Unavailable: "oklch(0.44 0.012 230)",
};

function TrendChip({ direction, pctChange }: { direction: TrendDir; pctChange?: number }) {
  const Icon =
    direction === "Improving"
      ? TrendingDown
      : direction === "Worsening"
        ? TrendingUp
        : Minus;
  const color = TREND_COLOR[direction];

  if (direction === "Unavailable") {
    return (
      <span
        className="text-[9.5px] font-medium"
        style={{ color: "oklch(0.44 0.012 230)" }}
      >
        —
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full"
      style={{
        color,
        background: `color-mix(in oklab, ${color} 11%, transparent)`,
      }}
    >
      <Icon className="size-2.5" aria-hidden="true" />
      {direction}
      {pctChange ? ` · ${pctChange}%` : ""}
    </span>
  );
}

function TrendIntelligence({ history }: { history: CityHistoryDay[] | undefined }) {
  const { city } = useCity();
  const items = history && history.length > 1 ? buildTrendItems(city, history) : [];

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150",
      )}
      style={{
        background: "oklch(1 0 0 / 0.05)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div
        className="px-5 pt-5 pb-4 border-b"
        style={{ borderColor: "oklch(1 0 0 / 0.07)" }}
      >
        <span
          className="block text-[9.5px] font-bold uppercase tracking-[0.22em] mb-1.5"
          style={{ color: "oklch(0.46 0.012 230)" }}
        >
          7-Day Trend Analysis
        </span>
        <h4
          className="text-base font-semibold tracking-tight"
          style={{ color: "oklch(0.90 0.010 220)", fontFamily: "var(--font-display)" }}
        >
          Environmental trends
        </h4>
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "oklch(0.52 0.012 230)" }}
          >
            Historical trend data is currently unavailable.
          </p>
        ) : (
          <div className="space-y-5">
            {items.map((item, i) => {
              const Icon = item.icon;
              const color = TREND_COLOR[item.direction];
              return (
                <div
                  key={item.label}
                  className={cn("flex items-start gap-4", i > 0 && "pt-5 border-t")}
                  style={i > 0 ? { borderColor: "oklch(1 0 0 / 0.06)" } : undefined}
                >
                  <div
                    className="size-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
                    style={{
                      background: `color-mix(in oklab, ${color} 13%, transparent)`,
                      color,
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[0.82rem] font-semibold"
                        style={{ color: "oklch(0.88 0.010 220)" }}
                      >
                        {item.label}
                      </span>
                      <TrendChip direction={item.direction} pctChange={item.pctChange} />
                    </div>
                    <p
                      className="text-[0.78rem] leading-relaxed"
                      style={{ color: "oklch(0.54 0.012 230)" }}
                    >
                      {item.interpretation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

const PRIORITY_ORDER: Priority[] = ["High", "Moderate", "Low"];

function buildRecommendations(city: {
  aqi: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  pm25?: number;
}): Recommendation[] {
  const recs: Recommendation[] = [];
  const band = findAqiBand(city.aqi);

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

  if (typeof city.humidity === "number" && city.humidity >= 75) {
    recs.push({
      icon: Droplets,
      title: "High humidity — pace outdoor exertion",
      description: `At ${city.humidity}% humidity, the air feels heavier. Consider taking breaks during extended outdoor activity.`,
      priority: "Moderate",
    });
  }

  if (typeof city.windSpeed === "number" && city.windSpeed >= 40) {
    recs.push({
      icon: Wind,
      title: "Strong wind — take care outdoors",
      description: `Wind speeds of ${city.windSpeed} km/h may make outdoor conditions uncomfortable. Secure loose items.`,
      priority: "Moderate",
    });
  }

  if (recs.length === 1 && recs[0].priority === "Low") {
    recs.push({
      icon: ShieldCheck,
      title: "Monitor air quality updates",
      description:
        "Environmental conditions are currently favourable. Continue to check updates, especially before extended outdoor activity.",
      priority: "Low",
    });
  }

  // Sort by priority: High first
  const sorted = [...recs].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );

  return sorted.slice(0, 4);
}

function SmartRecommendations() {
  const { city } = useCity();
  const recs = buildRecommendations(city);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200",
      )}
      style={{
        background: "oklch(1 0 0 / 0.05)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div
        className="px-6 pt-5 pb-4 border-b"
        style={{ borderColor: "oklch(1 0 0 / 0.07)" }}
      >
        <span
          className="block text-[9.5px] font-bold uppercase tracking-[0.22em] mb-1.5"
          style={{ color: "oklch(0.46 0.012 230)" }}
        >
          Priority Guidance
        </span>
        <h4
          className="text-base font-semibold tracking-tight"
          style={{ color: "oklch(0.90 0.010 220)", fontFamily: "var(--font-display)" }}
        >
          Smart recommendations
        </h4>
      </div>

      <div className="p-4 space-y-2.5">
        {recs.map((rec) => {
          const Icon = rec.icon;
          const color = PRIORITY_COLOR[rec.priority];
          return (
            <div
              key={rec.title}
              className="flex items-start gap-4 rounded-xl p-4 transition-all duration-200 hover:scale-[1.005]"
              style={{
                background: `color-mix(in oklab, ${color} 5%, oklch(1 0 0 / 0.025))`,
                border: `1px solid color-mix(in oklab, ${color} 14%, oklch(1 0 0 / 0.06))`,
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div
                className="size-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
                style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[0.85rem] font-semibold"
                    style={{ color: "oklch(0.88 0.010 220)" }}
                  >
                    {rec.title}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      color,
                      background: `color-mix(in oklab, ${color} 13%, transparent)`,
                    }}
                  >
                    {rec.priority}
                  </span>
                </div>
                <p
                  className="text-[0.78rem] leading-relaxed"
                  style={{ color: "oklch(0.54 0.012 230)" }}
                >
                  {rec.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="px-6 pb-5 pt-2"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}
      >
        <p
          className="text-[10px]"
          style={{ color: "oklch(0.42 0.010 230)" }}
        >
          Informational only — not medical advice.
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function IntelligenceSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="rounded-2xl p-7 md:p-10"
        style={{
          background: "oklch(1 0 0 / 0.05)",
          border: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="space-y-4">
            <Skeleton className="h-2.5 w-36 rounded-full" />
            <Skeleton className="h-9 w-80 rounded-xl" />
            <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="size-40 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
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
