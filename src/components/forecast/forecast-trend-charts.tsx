/**
 * ForecastTrendCharts — Phase 3
 *
 * Multi-metric tabbed trend charts for:
 *   AQI · PM2.5 · PM10 · Temperature · Humidity · Wind
 *
 * Each tab shows:
 *   - A smooth Recharts AreaChart
 *   - Current value badge
 *   - Min / Avg / Max summary
 *   - Animated entrance
 *
 * Data: forecastSeries() + trendSeries() from mock-data.ts.
 * Falls back gracefully if API history is provided.
 * Time range selector: 24h / 7d / 30d.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import type { City } from "@/lib/mock-data";
import { forecastSeries, trendSeries } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { FADE, DUR_SM } from "@/lib/motion";

// ─── Metric definitions ───────────────────────────────────────────────────────

interface MetricDef {
  id:     string;
  label:  string;
  unit:   string;
  color:  string;
  base:   (city: City) => number;
  series: (city: City, hours: number) => Array<{ label: string; value: number }>;
}

const METRICS: MetricDef[] = [
  {
    id:    "aqi",
    label: "AQI",
    unit:  "",
    color: "var(--color-primary)",
    base:  (c) => c.aqi,
    series: (c, h) =>
      forecastSeries(c.aqi, c.aqi, h).map((d) => ({
        label: d.label ?? `+${d.hour}h`,
        value: d.predicted,
      })),
  },
  {
    id:    "pm25",
    label: "PM2.5",
    unit:  "µg/m³",
    color: "oklch(0.70 0.16 55)",
    base:  (c) => c.pm25,
    series: (c, h) =>
      trendSeries(c.pm25 * 17, c.pm25, Math.min(h, 24), Math.round(c.pm25 * 0.3)).map((d, i) => ({
        label: `+${i}h`,
        value: d.aqi,
      })),
  },
  {
    id:    "pm10",
    label: "PM10",
    unit:  "µg/m³",
    color: "oklch(0.72 0.18 45)",
    base:  (c) => c.pm10,
    series: (c, h) =>
      trendSeries(c.pm10 * 11, c.pm10, Math.min(h, 24), Math.round(c.pm10 * 0.25)).map((d, i) => ({
        label: `+${i}h`,
        value: d.aqi,
      })),
  },
  {
    id:    "temp",
    label: "Temperature",
    unit:  "°C",
    color: "oklch(0.72 0.18 50)",
    base:  (c) => c.temp,
    series: (c, h) =>
      trendSeries(c.temp * 31, c.temp, Math.min(h, 24), 3).map((d, i) => ({
        label: `+${i}h`,
        value: d.aqi,
      })),
  },
  {
    id:    "humidity",
    label: "Humidity",
    unit:  "%",
    color: "var(--color-info)",
    base:  (c) => c.humidity,
    series: (c, h) =>
      trendSeries(c.humidity * 7, c.humidity, Math.min(h, 24), 8).map((d, i) => ({
        label: `+${i}h`,
        value: Math.min(100, Math.max(0, d.aqi)),
      })),
  },
  {
    id:    "wind",
    label: "Wind",
    unit:  "km/h",
    color: "oklch(0.72 0.14 230)",
    base:  (c) => c.windSpeed ?? 12,
    series: (c, h) => {
      const base = c.windSpeed ?? 12;
      return trendSeries(base * 23, base, Math.min(h, 24), Math.round(base * 0.4)).map((d, i) => ({
        label: `+${i}h`,
        value: Math.max(0, d.aqi),
      }));
    },
  },
];

const RANGES = [
  { id: "24h", label: "24h",  hours: 24  },
  { id: "7d",  label: "7d",   hours: 168 },
] as const;

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label, unit, color,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?:  string;
  unit:    string;
  color:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg border border-border">
      <div className="text-muted-foreground mb-1">{label}</div>
      <div className="font-semibold tabular-nums" style={{ color }}>
        {payload[0].value.toFixed(metric_decimals(unit))}{unit && ` ${unit}`}
      </div>
    </div>
  );
}

function metric_decimals(unit: string): number {
  return unit === "°C" || unit === "km/h" ? 1 : 0;
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function ChartStats({
  data, unit, color,
}: {
  data:  Array<{ value: number }>;
  unit:  string;
  color: string;
}) {
  const vals = data.map((d) => d.value).filter(Boolean);
  if (!vals.length) return null;
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const avg  = vals.reduce((a, b) => a + b, 0) / vals.length;
  const dec  = metric_decimals(unit);

  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      {[
        { label: "Min", value: min },
        { label: "Avg", value: avg },
        { label: "Max", value: max },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="font-semibold tabular-nums" style={{ color }}>
            {value.toFixed(dec)}{unit ? ` ${unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ForecastTrendCharts({
  city,
}: {
  city: City;
}) {
  const [activeMetric, setActiveMetric] = useState("aqi");
  const [activeRange,  setActiveRange]  = useState<typeof RANGES[number]["id"]>("24h");
  const prefersReduced = useReducedMotion() ?? false;

  const metric  = METRICS.find((m) => m.id === activeMetric) ?? METRICS[0];
  const range   = RANGES.find((r) => r.id === activeRange)   ?? RANGES[0];
  const current = metric.base(city);

  const chartData = useMemo(
    () => metric.series(city, range.hours),
    [metric, city, range.hours],
  );

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Environmental trends
            </div>
            <h3 className="text-base font-semibold mt-0.5">
              {metric.label}
              {metric.unit && (
                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                  {metric.unit}
                </span>
              )}
            </h3>
          </div>

          {/* Time range selector */}
          <div className="flex glass rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRange(r.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs transition-all",
                  activeRange === r.id
                    ? "aurora text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric tabs */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-150",
                activeMetric === m.id
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
              style={
                activeMetric === m.id
                  ? { background: m.color, color: "white" }
                  : undefined
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeMetric}-${activeRange}`}
          variants={FADE}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
          exit={{ opacity: 0, transition: { duration: DUR_SM } }}
          className="p-5"
        >
          {/* Current value */}
          <div className="flex items-baseline gap-2 mb-4">
            <span
              className="text-4xl font-bold tabular-nums tracking-tight"
              style={{ color: metric.color }}
            >
              {current.toFixed(metric_decimals(metric.unit))}
            </span>
            {metric.unit && (
              <span className="text-lg text-muted-foreground">{metric.unit}</span>
            )}
            <span className="text-xs text-muted-foreground ml-1">current</span>
          </div>

          {/* Recharts */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id={`grad-${metric.id}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%"   stopColor={metric.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  content={
                    <ChartTooltip unit={metric.unit} color={metric.color} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metric.color}
                  strokeWidth={2}
                  fill={`url(#grad-${metric.id})`}
                  dot={false}
                  activeDot={{ r: 4, fill: metric.color, strokeWidth: 0 }}
                  isAnimationActive={!prefersReduced}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats row */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <ChartStats data={chartData} unit={metric.unit} color={metric.color} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
