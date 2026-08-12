import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import {
  Wind, Droplets, Thermometer, Gauge, Activity,
  ArrowRight, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { environmentalApi, type CityHistoryDay } from "@/lib/api/environmental.api";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Phase 5 — Interactive Environmental Intelligence:
 * AQI & Weather Intelligence (replaces all placeholder cards).
 *
 * Three panels:
 *
 *  1. AQI Trend Chart — 7-day animated area chart with gradient fill.
 *     Animated drawing on mount (strokeDashoffset technique via CSS).
 *     Hover tooltip with date + AQI + band label.
 *
 *  2. Environmental Storytelling Flow — animated vertical causation diagram:
 *     Wind → Humidity → Particle Growth → AQI → Health Impact.
 *     Each step highlights based on real values. Click to expand explanation.
 *
 *  3. Weather × AQI Correlation — four metric cards with sparkline
 *     mini-chart and plain-language causal explanation.
 *
 * All data: useCity() + getCityHistory (same endpoint as intelligence section,
 * cached by TanStack Query — zero extra network traffic after first load).
 *
 * Animations: GPU-only (transform/opacity). prefers-reduced-motion respected.
 * No new dependencies beyond Recharts (already present in env-pollutants.tsx).
 */

// ─── Reduced motion ───────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
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

// ─── Count-up ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, reduced: boolean, duration = 900) {
  const [val, set] = useState(reduced ? target : 0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (reduced) { set(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      set(Math.round((1 - (1 - p) ** 3) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced, duration]);
  return val;
}

// ─── 1. AQI Trend Chart ────────────────────────────────────────────────────────

interface ChartDay { date: string; aqi: number; label: string; color: string; }

function buildChartData(history: CityHistoryDay[]): ChartDay[] {
  return history.map((d) => {
    const band = findAqiBand(d.aqi.avg);
    return {
      date: d.date,
      aqi: Math.round(d.aqi.avg),
      label: band.label,
      color: band.colorRaw,
    };
  });
}

function AqiTrendChart({ history, reduced }: { history: CityHistoryDay[]; reduced: boolean }) {
  const data = buildChartData(history);
  const band = findAqiBand(data.at(-1)?.aqi ?? 0);
  const maxAqi = Math.max(...data.map((d) => d.aqi), 1);
  const minAqi = Math.min(...data.map((d) => d.aqi));
  const gradId = "aqi-area-grad";

  // Trend
  const first = data.slice(0, 2).reduce((s, d) => s + d.aqi, 0) / 2;
  const last  = data.slice(-2).reduce((s, d) => s + d.aqi, 0)  / 2;
  const diff  = last - first;
  const TrendIcon = Math.abs(diff) < 3 ? Minus : diff < 0 ? TrendingDown : TrendingUp;
  const trendColor = diff < -3 ? "var(--color-success)" : diff > 3 ? "hsl(28 90% 55%)" : "var(--color-muted-foreground)";
  const trendLabel = diff < -3 ? "Improving" : diff > 3 ? "Worsening" : "Stable";

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-4",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">7-Day AQI Trend</span>
          <h3 className="text-base font-semibold mt-1">Air quality timeline</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: trendColor }}>
          <TrendIcon className="size-3.5" aria-hidden="true" />
          {trendLabel}
        </span>
      </div>

      {/* Chart */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={band.colorRaw} stopOpacity={0.35} />
                <stop offset="95%" stopColor={band.colorRaw} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0/0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => { try { return format(new Date(v), "MMM d"); } catch { return v; } }}
              tick={{ fontSize: 10, fill: "oklch(0.52 0.012 230)" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              domain={[Math.max(0, minAqi - 10), maxAqi + 10]}
              tick={{ fontSize: 10, fill: "oklch(0.52 0.012 230)" }}
              axisLine={false} tickLine={false} width={30}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 10, fontSize: 12,
              }}
              formatter={(v: number, _: string, entry: { payload?: ChartDay }) => [
                `AQI ${v}`,
                entry?.payload?.label ?? "",
              ]}
              labelFormatter={(l: string) => { try { return format(new Date(l), "EEEE, MMM d"); } catch { return l; } }}
            />
            <Area
              type="monotone" dataKey="aqi"
              stroke={band.colorRaw} strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false} activeDot={{ r: 4, fill: band.colorRaw }}
              isAnimationActive={!reduced}
              animationDuration={1000} animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Min / avg / max strip */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span>Low {minAqi}</span>
        <span className="font-medium text-foreground/70">Avg {Math.round(data.reduce((s, d) => s + d.aqi, 0) / data.length)}</span>
        <span>High {maxAqi}</span>
      </div>
    </div>
  );
}

// ─── 2. Environmental Storytelling Flow ────────────────────────────────────────

interface FlowStep {
  icon: typeof Wind;
  key: string;
  label: string;
  value: string;
  effect: "positive" | "neutral" | "negative";
  explanation: string;
}

function buildFlowSteps(city: {
  aqi: number; windSpeed?: number; humidity?: number; pm25?: number; temp?: number;
}): FlowStep[] {
  const windEffect: "positive" | "neutral" | "negative" =
    typeof city.windSpeed === "number"
      ? city.windSpeed >= 10 ? "positive" : city.windSpeed < 4 ? "negative" : "neutral"
      : "neutral";

  const humidEffect: "positive" | "neutral" | "negative" =
    typeof city.humidity === "number"
      ? city.humidity >= 78 ? "negative" : city.humidity >= 35 ? "neutral" : "neutral"
      : "neutral";

  const band = findAqiBand(city.aqi);
  const aqiEffect: "positive" | "neutral" | "negative" =
    city.aqi <= 50 ? "positive" : city.aqi <= 100 ? "neutral" : "negative";

  const healthEffect: "positive" | "neutral" | "negative" =
    city.aqi <= 50 ? "positive" : city.aqi <= 100 ? "neutral" : "negative";

  return [
    {
      icon: Wind, key: "wind", label: "Wind",
      value: typeof city.windSpeed === "number" ? `${city.windSpeed} km/h` : "—",
      effect: windEffect,
      explanation: typeof city.windSpeed === "number"
        ? city.windSpeed >= 10
          ? `Wind at ${city.windSpeed} km/h actively disperses ground-level pollutants — a significant natural air quality improvement mechanism.`
          : city.windSpeed < 4
            ? `Near-calm wind (${city.windSpeed} km/h) allows pollutants to accumulate locally without being carried away.`
            : `Light wind at ${city.windSpeed} km/h provides limited but some dispersion of local pollutants.`
        : "Wind data unavailable.",
    },
    {
      icon: Droplets, key: "humidity", label: "Humidity",
      value: typeof city.humidity === "number" ? `${city.humidity}%` : "—",
      effect: humidEffect,
      explanation: typeof city.humidity === "number"
        ? city.humidity >= 78
          ? `High humidity (${city.humidity}%) causes fine particles to absorb moisture and swell — increasing their effective AQI impact without any additional emissions.`
          : `Humidity at ${city.humidity}% is within a normal range — not significantly altering particle behaviour.`
        : "Humidity data unavailable.",
    },
    {
      icon: Activity, key: "particles", label: "Particle Growth",
      value: typeof city.pm25 === "number" ? `PM2.5 ${city.pm25} µg/m³` : "—",
      effect: typeof city.pm25 === "number"
        ? city.pm25 <= 12 ? "positive" : city.pm25 <= 35 ? "neutral" : "negative"
        : "neutral",
      explanation: typeof city.pm25 === "number"
        ? `PM2.5 at ${city.pm25} µg/m³ represents the fine particle load — the primary driver of the current AQI reading.`
        : "Fine particle data unavailable.",
    },
    {
      icon: Gauge, key: "aqi", label: "AQI",
      value: `${city.aqi}`,
      effect: aqiEffect,
      explanation: `${band.label} conditions — AQI ${city.aqi}. ${HEALTH_STATUS_BY_BAND[band.label] ?? ""}`,
    },
    {
      icon: Thermometer, key: "health", label: "Health Impact",
      value: band.label,
      effect: healthEffect,
      explanation: city.aqi <= 50
        ? "No health restrictions. All outdoor activities are suitable."
        : city.aqi <= 100
          ? "Sensitive individuals may wish to moderate prolonged outdoor exertion."
          : "Consider limiting outdoor activity — particularly for sensitive groups.",
    },
  ];
}

const EFFECT_COLOR: Record<"positive" | "neutral" | "negative", string> = {
  positive: "var(--color-success)",
  neutral:  "var(--color-muted-foreground)",
  negative: "hsl(28 90% 55%)",
};

function StorytellFlow({ city, reduced }: {
  city: { aqi: number; windSpeed?: number; humidity?: number; pm25?: number; temp?: number };
  reduced: boolean;
}) {
  const steps = buildFlowSteps(city);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-75",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Environmental Storytelling</span>
        <h3 className="text-base font-semibold mt-1">How conditions lead to today's AQI</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Tap any step to learn more about its role.</p>
      </div>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const color = EFFECT_COLOR[step.effect];
          const isLast = i === steps.length - 1;
          const isExp = expanded === step.key;

          return (
            <div key={step.key}>
              <button
                type="button"
                onClick={() => setExpanded(isExp ? null : step.key)}
                aria-expanded={isExp}
                className={cn(
                  "w-full flex items-center gap-4 text-left rounded-xl p-3.5 transition-all duration-200",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  "hover:bg-muted/30",
                  isExp && "bg-muted/20",
                )}
                style={{
                  animationDelay: reduced ? "0ms" : `${i * 80}ms`,
                  animation: reduced ? "none" : "motion-safe:animate-in motion-safe:fade-in-0",
                }}
              >
                {/* Step number + icon */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className="size-9 rounded-xl grid place-items-center transition-all duration-200"
                    style={{
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                      color,
                      boxShadow: isExp ? `0 0 12px ${color}40` : "none",
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="size-4.5" />
                  </div>
                </div>

                {/* Label + value */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <span
                      className="text-sm font-bold tabular-nums shrink-0"
                      style={{ color }}
                    >
                      {step.value}
                    </span>
                  </div>
                  {isExp && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 pr-2">{step.explanation}</p>
                  )}
                </div>
              </button>

              {/* Arrow connector between steps */}
              {!isLast && (
                <div className="flex justify-start pl-7 py-0.5" aria-hidden="true">
                  <ArrowRight
                    className="size-3 rotate-90 text-muted-foreground/40"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Weather metric card with mini sparkline ───────────────────────────────

interface WeatherCardProps {
  icon: typeof Wind;
  label: string;
  value: string;
  status: string;
  statusColor: string;
  description: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
  index: number;
  reduced: boolean;
}

function WeatherCard({
  icon: Icon, label, value, status, statusColor, description,
  sparkData, sparkColor, index, reduced,
}: WeatherCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-4 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
      style={{ animationDelay: reduced ? "0ms" : `${index * 70}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-lg grid place-items-center"
            style={{ background: `color-mix(in oklab, ${statusColor} 14%, transparent)`, color: statusColor }}
            aria-hidden="true"
          >
            <Icon className="size-3.5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: statusColor, background: `color-mix(in oklab, ${statusColor} 12%, transparent)` }}
        >
          {status}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold tabular-nums leading-none">{value}</div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 max-w-[180px]">{description}</p>
        </div>

        {/* Mini sparkline */}
        {sparkData && sparkData.length > 1 && (
          <div className="shrink-0 w-20" style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={sparkColor ?? statusColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={sparkColor ?? statusColor} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone" dataKey="v"
                  stroke={sparkColor ?? statusColor} strokeWidth={1.5}
                  fill={`url(#spark-${label})`}
                  dot={false}
                  isAnimationActive={!reduced}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function buildWeatherCards(
  city: { aqi: number; temp?: number; humidity?: number; windSpeed?: number; pressure?: number },
  history: CityHistoryDay[],
  reduced: boolean,
): WeatherCardProps[] {
  const cards: WeatherCardProps[] = [];
  let idx = 0;

  if (typeof city.temp === "number") {
    const c = city.temp;
    const status = c >= 35 ? "Hot" : c >= 28 ? "Warm" : c >= 18 ? "Comfortable" : c >= 10 ? "Cool" : "Cold";
    const color  = c >= 35 ? "hsl(28 90% 55%)" : c >= 28 ? "hsl(40 85% 55%)" : c >= 18 ? "var(--color-success)" : "oklch(0.65 0.12 240)";
    const spark  = history.map((d) => ({ v: typeof d.temp === "number" ? d.temp : c }));
    cards.push({ icon: Thermometer, label: "Temperature", value: `${c}°C`, status, statusColor: color,
      description: c >= 35 ? "Heat stress risk — limit peak-sun activity." : c >= 28 ? "Warm — stay hydrated." : c >= 18 ? "Comfortable for outdoor activity." : "Cool — dress in layers.",
      sparkData: spark, sparkColor: color, index: idx++, reduced });
  }

  if (typeof city.humidity === "number") {
    const h = city.humidity;
    const status = h >= 80 ? "High" : h >= 60 ? "Elevated" : h >= 35 ? "Comfortable" : "Low";
    const color  = h >= 80 ? "hsl(28 90% 55%)" : h >= 60 ? "hsl(45 85% 55%)" : "var(--color-success)";
    const spark  = history.map((d) => ({ v: typeof d.humidity === "number" ? d.humidity : h }));
    cards.push({ icon: Droplets, label: "Humidity", value: `${h}%`, status, statusColor: color,
      description: h >= 80 ? "High humidity traps particles and increases AQI impact." : h >= 35 ? "Humidity within a comfortable range." : "Low humidity — particles stay suspended longer.",
      sparkData: spark, sparkColor: color, index: idx++, reduced });
  }

  if (typeof city.windSpeed === "number") {
    const w = city.windSpeed;
    const status = w >= 30 ? "Strong" : w >= 10 ? "Moderate" : w >= 4 ? "Light" : "Calm";
    const color  = w >= 10 ? "var(--color-success)" : w < 4 ? "hsl(28 90% 55%)" : "hsl(45 85% 55%)";
    cards.push({ icon: Wind, label: "Wind Speed", value: `${w} km/h`, status, statusColor: color,
      description: w >= 10 ? "Wind is actively dispersing local pollutants." : w < 4 ? "Near-calm — pollutants accumulating locally." : "Light breeze — limited dispersion.",
      sparkData: undefined, index: idx++, reduced });
  }

  if (typeof city.pressure === "number") {
    const p = city.pressure;
    const status = p >= 1020 ? "High" : p >= 1000 ? "Normal" : "Low";
    const color  = p >= 1020 ? "hsl(45 85% 55%)" : p >= 1000 ? "var(--color-success)" : "oklch(0.65 0.12 240)";
    cards.push({ icon: Gauge, label: "Pressure", value: `${p} hPa`, status, statusColor: color,
      description: p >= 1020 ? "High pressure suppresses vertical mixing — can trap pollutants near surface." : p >= 1000 ? "Normal pressure — typical atmospheric mixing." : "Low pressure promotes dispersion and may signal precipitation.",
      sparkData: undefined, index: idx++, reduced });
  }

  return cards;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function IntelligenceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6 space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AqiWeatherIntelligence({ className }: { className?: string }) {
  const { city, isCityListLoading } = useCity();
  const reduced = usePrefersReducedMotion();

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["aqi-weather-history", city.id, 7],
    queryFn: async () => {
      const res = await environmentalApi.getCityHistory(city.id, 7);
      return res.data.history;
    },
    enabled: !!city.id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  if (isCityListLoading || histLoading) return <IntelligenceSkeleton />;

  const safeHistory: CityHistoryDay[] = Array.isArray(history) && history.length > 0 ? history : [];
  const weatherCards = buildWeatherCards(city, safeHistory, reduced);

  return (
    <div className={cn("space-y-4", className)}>
      {/* AQI Trend Chart */}
      {safeHistory.length >= 2 && (
        <AqiTrendChart history={safeHistory} reduced={reduced} />
      )}

      {/* Environmental Storytelling Flow */}
      <StorytellFlow city={city} reduced={reduced} />

      {/* Weather metric cards with sparklines */}
      {weatherCards.length > 0 && (
        <div className={cn(
          "glass rounded-2xl p-6 md:p-8 space-y-5",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
        )}>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Weather Conditions</span>
            <h3 className="text-base font-semibold mt-1">Atmospheric readings & their AQI impact</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weatherCards.map((c) => <WeatherCard key={c.label} {...c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Legacy exports (backward compat) ────────────────────────────────────────

export function WeatherOverview()     { return null; }
export function AqiTrendOverview()    { return null; }
export function EnvironmentalContext(){ return null; }
