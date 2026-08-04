/**
 * ForecastInsightCards — Phase 3
 *
 * Animated insight cards highlighting forecast anomalies:
 *   - Pollution increasing / decreasing
 *   - Rain arriving
 *   - High UV warning
 *   - Strong wind alert
 *   - Temperature anomaly
 *   - Air quality improving
 *
 * Cards are generated from city data. Only relevant insights are shown.
 * Each card has: icon, headline, detail, severity color, hover lift.
 * Staggered entrance animation, prefers-reduced-motion safe.
 */

import { useRef } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  TrendingUp, TrendingDown, CloudRain, Sun,
  Wind, Thermometer, Leaf, AlertTriangle,
} from "lucide-react";
import type { City } from "@/lib/mock-data";
import { STAGGER, HOVER_LIFT, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Insight definition ───────────────────────────────────────────────────────

type InsightLevel = "success" | "warning" | "critical" | "info";

interface ForecastInsight {
  icon:    React.ComponentType<{ className?: string }>;
  level:   InsightLevel;
  title:   string;
  detail:  string;
  animate: boolean;
}

const LEVEL_STYLES: Record<InsightLevel, { bg: string; border: string; text: string }> = {
  success:  {
    bg:     "color-mix(in oklab, var(--color-success) 9%, transparent)",
    border: "color-mix(in oklab, var(--color-success) 22%, transparent)",
    text:   "var(--color-success)",
  },
  warning:  {
    bg:     "color-mix(in oklab, var(--color-warning) 9%, transparent)",
    border: "color-mix(in oklab, var(--color-warning) 22%, transparent)",
    text:   "var(--color-warning)",
  },
  critical: {
    bg:     "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-destructive) 25%, transparent)",
    text:   "var(--color-destructive)",
  },
  info: {
    bg:     "color-mix(in oklab, var(--color-info) 9%, transparent)",
    border: "color-mix(in oklab, var(--color-info) 20%, transparent)",
    text:   "var(--color-info)",
  },
};

// ─── Insight generator ────────────────────────────────────────────────────────

function buildInsights(city: City): ForecastInsight[] {
  const insights: ForecastInsight[] = [];

  // Pollution trend
  if (city.aqi > 150) {
    insights.push({
      icon:   TrendingUp,
      level:  "critical",
      title:  "Pollution increasing",
      detail: `AQI at ${city.aqi} — stagnant air mass forecast to persist for 12–18h. PM2.5 will likely rise above ${Math.round(city.pm25 * 1.15)} µg/m³ by evening.`,
      animate: true,
    });
  } else if (city.aqi > 80) {
    insights.push({
      icon:   TrendingUp,
      level:  "warning",
      title:  "Moderate pollution",
      detail: `AQI ${city.aqi} expected to peak around ${Math.round(city.aqi * 1.12)} in the afternoon as temperature rises. Sensitive groups should plan indoor time after 13:00.`,
      animate: false,
    });
  } else {
    insights.push({
      icon:   TrendingDown,
      level:  "success",
      title:  "Air quality improving",
      detail: `AQI ${city.aqi} is below the moderate threshold and trending lower. Wind speeds supporting dispersion forecast through tomorrow.`,
      animate: false,
    });
  }

  // Rain
  if (city.humidity > 80) {
    insights.push({
      icon:   CloudRain,
      level:  "info",
      title:  "Rain arriving soon",
      detail: `Humidity at ${city.humidity}% — precipitation likely within 6–12 hours. Rain events typically improve AQI by 15–30 points.`,
      animate: true,
    });
  }

  // UV warning (estimated from temp and AQI)
  const uvEstimate = city.aqi < 80 && city.temp > 28 ? 8 : city.temp > 32 ? 7 : 4;
  if (uvEstimate >= 8) {
    insights.push({
      icon:   Sun,
      level:  "warning",
      title:  "High UV warning",
      detail: `UV index estimated at ${uvEstimate}. Sunscreen SPF 50+ required. Seek shade 11:00–15:00 when UV peaks. Risk of sunburn within 15 minutes of direct exposure.`,
      animate: false,
    });
  }

  // Wind
  if ((city.windSpeed ?? 0) > 25) {
    insights.push({
      icon:   Wind,
      level:  "warning",
      title:  "Strong wind advisory",
      detail: `Wind gusts up to ${Math.round((city.windSpeed ?? 0) * 1.3)} km/h forecast. Outdoor events and scaffolding should be secured. Wind will aid pollutant dispersion.`,
      animate: true,
    });
  }

  // Temperature
  if (city.temp > 36) {
    insights.push({
      icon:   Thermometer,
      level:  "critical",
      title:  "Temperature anomaly",
      detail: `${city.temp}°C is above the 35-year average by ~${Math.round((city.temp - 30))}°C for this period. Heat index exceeds safe thresholds for outdoor labour. Hydration critical.`,
      animate: false,
    });
  } else if (city.temp < 5) {
    insights.push({
      icon:   Thermometer,
      level:  "info",
      title:  "Cold spell forecast",
      detail: `Temperatures dropping to ${city.temp}°C overnight. Cold air suppresses convective mixing — expect a modest AQI improvement through morning.`,
      animate: false,
    });
  }

  // Eco / green cover note
  if (city.eco > 70) {
    insights.push({
      icon:   Leaf,
      level:  "success",
      title:  "Green cover helping",
      detail: `${city.name}'s ${city.eco}% eco score supports natural air filtration. Urban green zones are absorbing an estimated ${Math.round(city.eco * 0.08)} tonnes of PM per day.`,
      animate: false,
    });
  }

  // Limit to 4 most relevant
  return insights.slice(0, 4);
}

// ─── Single insight card ──────────────────────────────────────────────────────

const CARD_ITEM = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR_MD, ease: EASE_OUT } },
} as const;

function InsightCard({
  insight,
  prefersReduced,
}: {
  insight:        ForecastInsight;
  prefersReduced: boolean;
}) {
  const style = LEVEL_STYLES[insight.level];
  const Icon  = insight.icon;

  return (
    <motion.div
      variants={CARD_ITEM}
      whileHover={prefersReduced ? undefined : HOVER_LIFT}
      className="rounded-2xl p-4 flex gap-3 cursor-default"
      style={{
        background: style.bg,
        border:     `1px solid ${style.border}`,
      }}
    >
      {/* Icon */}
      <div
        className="size-8 rounded-xl grid place-items-center shrink-0 mt-0.5"
        style={{
          background: `color-mix(in oklab, ${style.text} 14%, transparent)`,
          color:      style.text,
        }}
      >
        <Icon
          className={`size-4 ${insight.animate && !prefersReduced ? "insight-icon-pulse" : ""}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold mb-1" style={{ color: style.text }}>
          {insight.title}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.detail}</p>
      </div>

      {insight.level === "critical" && (
        <AlertTriangle
          className="size-3.5 shrink-0 mt-0.5"
          style={{ color: style.text, opacity: 0.6 }}
        />
      )}
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ForecastInsightCards({ city }: { city: City }) {
  const ref            = useRef<HTMLDivElement>(null);
  const inView         = useInView(ref, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion() ?? false;
  const insights       = buildInsights(city);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Forecast signals
        </div>
        <h3 className="text-base font-semibold mt-0.5">Forecast Insights</h3>
      </div>

      <motion.div
        ref={ref}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        variants={STAGGER(0.08)}
        initial={prefersReduced ? false : "hidden"}
        animate={inView ? "show" : "hidden"}
      >
        {insights.map((insight, i) => (
          <InsightCard key={i} insight={insight} prefersReduced={prefersReduced} />
        ))}
      </motion.div>

      <style>{`
        @keyframes insight-icon-pulse {
          0%,100% { transform: scale(1); opacity:1; }
          50%      { transform: scale(1.18); opacity:0.75; }
        }
        .insight-icon-pulse { animation: insight-icon-pulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .insight-icon-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
