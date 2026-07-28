import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Droplets,
  Wind,
  ArrowUp,
  ArrowDown,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { environmentalApi, type DailyForecast } from "@/lib/api/environmental.api";
import { EnvForecastOverviewSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Advanced Weather Forecast Center (Phase 4).
 *
 * Upgrades the plain card-row from Phase 1 into a four-panel analytics
 * experience:
 *   1. Premium 7-day daily forecast cards (scrollable on mobile).
 *   2. Temperature trend area chart (high/low overlay, Recharts — no new
 *      library).
 *   3. Precipitation intelligence panel — only shown when any day has a
 *      real `pop` value.
 *   4. Outdoor planning insight — static copy derived from real forecast
 *      data (best/worst day, rain risk), no AI call.
 *
 * All data comes from the existing `getCityWeatherForecast` query already
 * used by this component — no new API call, no duplicate fetch.
 *
 * Hourly forecast data is NOT available in the current API surface
 * (`forecastApi.getForecast` returns AQI-based series, not hourly weather)
 * so the hourly timeline is gracefully omitted rather than fabricated.
 * This follows the project's established "never show a fake value" rule.
 *
 * `prefers-reduced-motion` is respected for all chart animations.
 */

// ─── Reduced motion ────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener("change", h);
    return () => q.removeEventListener("change", h);
  }, []);
  return reduced;
}

// ─── Weather icon mapping ──────────────────────────────────────────────────────

/** Maps an OpenWeather icon code (e.g. "02d") to a semantic Lucide icon.
 *  Reuses the same mapping table from `env-forecast-overview.tsx` before
 *  this phase — no new mapping system. */
function iconForCode(code: string): LucideIcon {
  const group = code.slice(0, 2);
  const isNight = code.endsWith("n");
  switch (group) {
    case "01":
      return isNight ? Moon : Sun;
    case "02":
      return isNight ? CloudMoon : CloudSun;
    case "03":
    case "04":
      return Cloud;
    case "09":
      return CloudDrizzle;
    case "10":
      return CloudRain;
    case "11":
      return CloudLightning;
    case "13":
      return CloudSnow;
    case "50":
      return CloudFog;
    default:
      return Cloud;
  }
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE");
}

function shortDate(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), "d MMM");
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const tickStyle = { fontSize: 11, fill: "var(--color-muted-foreground)" };

function DailyCard({ day, highlight }: { day: DailyForecast; highlight?: boolean }) {
  const Icon = iconForCode(day.icon);
  const label = dayLabel(day.date);
  const conditionText = day.description || day.condition;

  const a11yLabel = [
    label,
    shortDate(day.date),
    conditionText,
    `High ${day.high}°C`,
    `Low ${day.low}°C`,
    typeof day.pop === "number" ? `${day.pop}% chance of rain` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn(
        "flex-1 min-w-[104px] flex flex-col items-center gap-2.5 rounded-xl border p-4",
        "transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        highlight ? "glass border-primary/30 bg-primary/5" : "glass border-border",
      )}
      aria-label={a11yLabel}
    >
      <div className="text-center">
        <span
          className={cn(
            "text-xs font-semibold",
            highlight ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <div className="text-[10px] text-muted-foreground">{shortDate(day.date)}</div>
      </div>

      <Icon
        className={cn("size-7", highlight ? "text-foreground" : "text-muted-foreground")}
        aria-hidden="true"
      />

      {conditionText && (
        <span
          className="text-[10px] text-muted-foreground text-center capitalize leading-tight"
          aria-hidden="true"
        >
          {conditionText}
        </span>
      )}

      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums">
          <ArrowUp className="size-2.5 text-muted-foreground" />
          {day.high}°
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
          <ArrowDown className="size-2.5" />
          {day.low}°
        </span>
      </div>

      {typeof day.pop === "number" && (
        <span
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          aria-hidden="true"
        >
          <Droplets className="size-3" />
          {day.pop}%
        </span>
      )}

      {day.windSpeed != null && (
        <span
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          aria-hidden="true"
        >
          <Wind className="size-3" />
          {day.windSpeed} km/h
        </span>
      )}
    </div>
  );
}

// ─── Temperature trend chart ───────────────────────────────────────────────────

function TemperatureTrendChart({
  days,
  prefersReducedMotion,
}: {
  days: DailyForecast[];
  prefersReducedMotion: boolean;
}) {
  const chartData = days.map((d) => ({
    date: d.date,
    high: d.high,
    low: d.low,
  }));

  const a11ySummary = (() => {
    const highs = days.map((d) => d.high);
    const max = Math.max(...highs);
    const min = Math.min(...highs);
    const first = highs[0];
    const last = highs[highs.length - 1];
    if (last > first + 2)
      return `Temperatures are trending warmer over the forecast period (highs up to ${max}°C).`;
    if (last < first - 2)
      return `Temperatures are trending cooler over the forecast period (highs down to ${min}°C).`;
    return `Temperatures remain relatively stable over the forecast period (highs between ${min}°C and ${max}°C).`;
  })();

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-4 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Temperature Trend
        </span>
        <h3 className="text-sm font-medium text-muted-foreground mt-0.5">High / low forecast</h3>
      </div>

      <p className="sr-only">{a11ySummary}</p>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
          <defs>
            <linearGradient id="temp-high-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="temp-low-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-muted-foreground)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={(d: string) => dayLabel(d)}
          />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={32} unit="°" />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(d: string) => `${dayLabel(d)} · ${shortDate(d)}`}
            formatter={(value: number, name: string) => [
              `${value}°C`,
              name === "high" ? "High" : "Low",
            ]}
          />
          <Area
            type="monotone"
            dataKey="high"
            name="high"
            stroke="var(--color-primary)"
            fill="url(#temp-high-grad)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={!prefersReducedMotion}
          />
          <Area
            type="monotone"
            dataKey="low"
            name="low"
            stroke="var(--color-muted-foreground)"
            fill="url(#temp-low-grad)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 2, fill: "var(--color-muted-foreground)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={!prefersReducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground" aria-hidden="true">
        {a11ySummary}
      </p>
    </div>
  );
}

// ─── Precipitation panel ───────────────────────────────────────────────────────

function PrecipitationPanel({ days }: { days: DailyForecast[] }) {
  const daysWithPop = days.filter((d) => typeof d.pop === "number");
  if (daysWithPop.length === 0) return null;

  const maxPopDay = daysWithPop.reduce((a, b) => (b.pop! > a.pop! ? b : a));
  const hasRainToday = (() => {
    const today = days.find((d) => isToday(new Date(`${d.date}T00:00:00`)));
    return today && typeof today.pop === "number" && today.pop >= 30;
  })();
  const hasRainTomorrow = (() => {
    const tom = days.find((d) => isTomorrow(new Date(`${d.date}T00:00:00`)));
    return tom && typeof tom.pop === "number" && tom.pop >= 30;
  })();

  const timingLabel = hasRainToday
    ? "Rain possible today"
    : hasRainTomorrow
      ? "Rain possible tomorrow"
      : `Highest chance on ${dayLabel(maxPopDay.date)}`;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-4 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Umbrella className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Precipitation Intelligence
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Peak chance
          </span>
          <span className="text-2xl font-bold tabular-nums">{maxPopDay.pop}%</span>
          <span className="text-xs text-muted-foreground">{dayLabel(maxPopDay.date)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Timing</span>
          <span className="text-sm font-medium mt-1">{timingLabel}</span>
        </div>
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Daily outlook
          </span>
          {daysWithPop.slice(0, 5).map((d) => (
            <div key={d.date} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16 truncate">
                {dayLabel(d.date)}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${d.pop}%` }}
                  role="progressbar"
                  aria-valuenow={d.pop ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${dayLabel(d.date)}: ${d.pop}% rain probability`}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                {d.pop}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Outdoor planning insight ──────────────────────────────────────────────────

function OutdoorPlanningInsight({ days }: { days: DailyForecast[] }) {
  // Derive a plain-language insight from real forecast data only.
  // Never fabricate; if no reliable conclusion can be drawn, return null.
  const today = days.find((d) => isToday(new Date(`${d.date}T00:00:00`)));
  const tomorrow = days.find((d) => isTomorrow(new Date(`${d.date}T00:00:00`)));

  const insights: string[] = [];

  // Rain risk
  if (today && typeof today.pop === "number" && today.pop >= 50) {
    insights.push(`Rain is likely today (${today.pop}% chance) — consider carrying an umbrella.`);
  } else if (today && typeof today.pop === "number" && today.pop >= 30) {
    insights.push(`There is a ${today.pop}% chance of rain today — an umbrella could be handy.`);
  }

  // Temperature context
  if (today && today.high >= 35) {
    insights.push(`High of ${today.high}°C today — stay hydrated and limit peak-sun exertion.`);
  } else if (today && today.high >= 28) {
    insights.push(
      `Warm conditions expected today (high ${today.high}°C) — plan outdoor activity for cooler hours.`,
    );
  } else if (today && today.high <= 12) {
    insights.push(
      `Cool conditions today (high ${today.high}°C) — dress in layers for outdoor activity.`,
    );
  }

  // Tomorrow outlook
  if (insights.length === 0 && tomorrow && typeof tomorrow.pop === "number" && tomorrow.pop >= 40) {
    insights.push(
      `Rain is possible tomorrow (${tomorrow.pop}% chance) — a good day to plan indoor activity.`,
    );
  }

  // Best day in the week
  const daysWithPop = days.filter((d) => typeof d.pop === "number");
  if (insights.length === 0 && daysWithPop.length > 1) {
    const bestDay = daysWithPop.reduce((a, b) => (b.pop! < a.pop! ? b : a));
    if (!isToday(new Date(`${bestDay.date}T00:00:00`)) && bestDay.pop! < 10) {
      insights.push(
        `${dayLabel(bestDay.date)} looks like the best day for outdoor plans (${bestDay.pop}% rain chance).`,
      );
    }
  }

  // Stable/good conditions fallback
  if (insights.length === 0 && today) {
    const condition = (today.description || today.condition || "").toLowerCase();
    if (condition.includes("clear") || condition.includes("sunny")) {
      insights.push("Clear conditions are expected today — good for outdoor activities.");
    } else if (condition.includes("cloud")) {
      insights.push("Partly cloudy conditions today — comfortable for most outdoor activities.");
    }
  }

  if (insights.length === 0) return null;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-3 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Sun className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Outdoor Planning
        </span>
      </div>
      <ul className="space-y-2">
        {insights.map((text, i) => (
          <li
            key={i}
            className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2"
          >
            <span
              className="mt-1.5 size-1.5 rounded-full bg-primary/60 shrink-0"
              aria-hidden="true"
            />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function ForecastOverview({ className }: { className?: string }) {
  const { city, cityDataUpdatedAt, isApiConnected } = useCity();
  const prefersReducedMotion = usePrefersReducedMotion();

  const {
    data: days,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["weather-forecast", city.id],
    queryFn: async () => {
      const res = await environmentalApi.getCityWeatherForecast(city.id);
      return res.data.days;
    },
    enabled: !!city.id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  if (isLoading) {
    return <EnvForecastOverviewSkeleton className={className} />;
  }

  if (isError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refetch}
        retryDisabled={false}
        message="Unable to load the weather forecast."
      />
    );
  }

  if (!days || days.length === 0) {
    return (
      <EnvEmptyState
        className={className}
        title="No forecast data is currently available."
        description="This section will update once a live forecast reading is available."
      />
    );
  }

  const updatedLabel =
    isApiConnected && cityDataUpdatedAt
      ? `Updated ${format(cityDataUpdatedAt, "h:mm a")}`
      : undefined;

  // Only show temp trend chart when we have ≥ 3 days with real high/low data.
  const hasTempData =
    days.length >= 3 &&
    days.every((d: DailyForecast) => typeof d.high === "number" && typeof d.low === "number");

  // Note: hourly forecast data is NOT available in the current API surface.
  // `forecastApi.getForecast` returns AQI-based series (not hourly weather),
  // so the hourly timeline is gracefully omitted. No fabricated values.

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header strip — forecast range + last updated */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {days.length}-Day Forecast · {city.name}
          </span>
        </div>
        {updatedLabel && (
          <span className="text-[10px] text-muted-foreground px-2.5 py-1 rounded-full border border-border">
            {updatedLabel}
          </span>
        )}
      </div>

      {/* 1. Daily forecast cards — horizontally scrollable on mobile */}
      <div
        className="glass rounded-2xl p-5 md:p-6"
        aria-label={`${days.length}-day weather forecast for ${city.name}`}
      >
        <div className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory">
          {days.map((day: DailyForecast) => (
            <div key={day.date} className="snap-start shrink-0 flex-1 min-w-[104px] max-w-[140px]">
              <DailyCard day={day} highlight={isToday(new Date(`${day.date}T00:00:00`))} />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Temperature trend chart */}
      {hasTempData && (
        <TemperatureTrendChart days={days} prefersReducedMotion={prefersReducedMotion} />
      )}

      {/* 3. Precipitation intelligence — only when pop data exists */}
      <PrecipitationPanel days={days} />

      {/* 4. Outdoor planning insight — derived from real data only */}
      <OutdoorPlanningInsight days={days} />
    </div>
  );
}
