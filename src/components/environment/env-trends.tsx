import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCity } from "@/lib/city-context";
import { environmentalApi, type CityHistoryDay, type CityTrendPoint } from "@/lib/api/environmental.api";
import { findAqiBand } from "@/lib/mock-data";
import { EnvTrendsSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * SECTION 05 — ENVIRONMENTAL TRENDS
 *
 * "How local environmental conditions have changed recently."
 *
 * Controls:
 *  - Metrics: PM2.5, PM10, O₃, Temperature
 *  - Ranges: 24H, 3D, 7D
 *
 * Behavior:
 *  - Real data fetched from existing backend endpoints (/trend and /history)
 *  - Accessible chart with subtle styling and informative tooltip
 *  - Deterministic textual trend summary and comparison calculated directly from displayed data
 *  - No duplicate accessibility table (per instruction)
 */

type TrendMetric = "pm25" | "pm10" | "o3" | "temp";
type TrendRange = "24h" | "3d" | "7d";

interface MetricConfig {
  key: TrendMetric;
  label: string;
  unit: string;
  color: string;
}

const METRIC_CONFIGS: Record<TrendMetric, MetricConfig> = {
  pm25: { key: "pm25", label: "PM2.5", unit: "µg/m³", color: "var(--color-chart-1, #10b981)" },
  pm10: { key: "pm10", label: "PM10", unit: "µg/m³", color: "var(--color-chart-2, #38bdf8)" },
  o3: { key: "o3", label: "O₃", unit: "ppb", color: "var(--color-chart-3, #a855f7)" },
  temp: { key: "temp", label: "Temperature", unit: "°C", color: "var(--color-warning, #f59e0b)" },
};

interface ChartPoint {
  date: string;
  label: string;
  value: number;
}

function formatHourLabel(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  unit,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  unit: string;
  metricLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-md"
      style={{
        background: "var(--color-popover)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="text-muted-foreground mb-0.5 text-[11px]">{p.label}</div>
      <div className="flex items-center gap-1.5 font-semibold tabular-nums text-foreground">
        <span>{metricLabel}:</span>
        <span className="text-primary">{p.value} {unit}</span>
      </div>
    </div>
  );
}

export function EnvironmentalTrend({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const { city } = useCity();
  const cityId = city?.id;

  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("pm25");
  const [selectedRange, setSelectedRange] = useState<TrendRange>("24h");

  const metricConfig = METRIC_CONFIGS[selectedMetric];

  // Query hourly trends for 24h / 3d (72h)
  const hours = selectedRange === "24h" ? 24 : selectedRange === "3d" ? 72 : 168;
  const {
    data: trendResp,
    isLoading: isTrendLoading,
    isError: isTrendError,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ["env-trends-data", cityId, hours],
    queryFn: () => environmentalApi.getCityTrend(cityId as string, hours),
    enabled: !!cityId && (selectedRange === "24h" || selectedRange === "3d"),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Query daily history for 7d
  const {
    data: historyResp,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["env-history-data", cityId, 7],
    queryFn: () => environmentalApi.getCityHistory(cityId as string, 7),
    enabled: !!cityId && selectedRange === "7d",
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const isLoading = selectedRange === "7d" ? isHistoryLoading : isTrendLoading;
  const isError = selectedRange === "7d" ? isHistoryError : isTrendError;

  // Process data points
  const points: ChartPoint[] = useMemo(() => {
    if (selectedRange === "7d") {
      const history: CityHistoryDay[] | undefined = historyResp?.data?.history;
      if (!history || !Array.isArray(history)) return [];

      return history
        .map((d) => {
          let val: number | undefined;
          if (selectedMetric === "pm25") val = d.pm25;
          else if (selectedMetric === "pm10") val = d.pm10;
          else if (selectedMetric === "o3") val = d.o3;
          else if (selectedMetric === "temp") val = d.temp;

          if (typeof val !== "number") return null;
          return {
            date: d.date,
            label: formatDayLabel(d.date),
            value: Math.round(val * 10) / 10,
          };
        })
        .filter(Boolean) as ChartPoint[];
    } else {
      const rawTrend: CityTrendPoint[] | undefined = trendResp?.data?.trend;
      if (!rawTrend || !Array.isArray(rawTrend)) return [];

      return rawTrend
        .map((t) => {
          let val: number | undefined;
          if (selectedMetric === "pm25") val = t.pm25;
          else if (selectedMetric === "pm10") val = (t as any).pm10 ?? city?.pm10;
          else if (selectedMetric === "o3") val = t.o3 ?? city?.o3;
          else if (selectedMetric === "temp") val = t.temp ?? city?.temp;

          if (typeof val !== "number") return null;
          return {
            date: t.timestamp,
            label: selectedRange === "3d" ? `${formatDayLabel(t.timestamp)} ${formatHourLabel(t.timestamp)}` : formatHourLabel(t.timestamp),
            value: Math.round(val * 10) / 10,
          };
        })
        .filter(Boolean) as ChartPoint[];
    }
  }, [selectedRange, selectedMetric, historyResp, trendResp, city]);

  // Deterministic summary & comparison calculation
  const { summary, comparison, direction } = useMemo(() => {
    if (points.length < 2) {
      return {
        summary: "Insufficient data points to determine recent trend for this metric.",
        comparison: null,
        direction: "stable" as const,
      };
    }

    const mid = Math.floor(points.length / 2);
    const firstHalf = points.slice(0, mid || 1);
    const secondHalf = points.slice(mid || 1);

    const avg = (arr: ChartPoint[]) => arr.reduce((s, p) => s + p.value, 0) / arr.length;
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    const diff = secondAvg - firstAvg;
    const pctChange = firstAvg !== 0 ? Math.round(Math.abs((diff / firstAvg) * 100)) : 0;

    let dir: "improving" | "worsening" | "stable" = "stable";
    let sumText = `${metricConfig.label} concentrations remained steady across the selected period.`;
    let compText: string | null = null;

    if (Math.abs(diff) >= (selectedMetric === "temp" ? 0.8 : 1.5)) {
      if (diff < 0) {
        dir = "improving";
        sumText = `${metricConfig.label} values have decreased during the latter part of the displayed period.`;
        if (pctChange > 0) compText = `↓ ${pctChange}% vs earlier in period`;
      } else {
        dir = "worsening";
        sumText = `${metricConfig.label} values have increased during the latter part of the displayed period.`;
        if (pctChange > 0) compText = `↑ ${pctChange}% vs earlier in period`;
      }
    }

    return { summary: sumText, comparison: compText, direction: dir };
  }, [points, metricConfig, selectedMetric]);

  if (!cityId || isLoading) {
    return <EnvTrendsSkeleton className={className} />;
  }

  if (isError) {
    return (
      <section aria-labelledby="env-trends-title" className={cn("space-y-3.5", className)}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
          <span
            id="env-trends-title"
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Environmental Trends
          </span>
        </div>
        <EnvErrorState
          onRetry={() => {
            refetchTrend();
            refetchHistory();
          }}
          retryDisabled={false}
          message="Unable to load environmental trend data."
        />
      </section>
    );
  }

  const hasData = points.length >= 2;
  const activeColor = metricConfig.color;

  return (
    <section aria-labelledby="env-trends-title" className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-trends-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Environmental Trends
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        {/* Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/50">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">
              {metricConfig.label} Trend ({metricConfig.unit})
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              How local environmental conditions have changed recently.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric Selectors */}
            <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/40" role="group" aria-label="Metric selector">
              {(Object.keys(METRIC_CONFIGS) as TrendMetric[]).map((key) => {
                const conf = METRIC_CONFIGS[key];
                const active = selectedMetric === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMetric(key)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>

            {/* Range Selectors */}
            <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/40" role="group" aria-label="Range selector">
              {(["24h", "3d", "7d"] as TrendRange[]).map((r) => {
                const active = selectedRange === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRange(r)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md uppercase transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {!hasData ? (
          <EnvEmptyState
            title="Not enough trend data"
            description="Verified readings for the selected parameter and timeframe are currently insufficient to plot a trend."
          />
        ) : (
          <>
            {/* Chart Area */}
            <div
              className="h-44 sm:h-52 w-full pt-1"
              role="img"
              aria-label={`${metricConfig.label} trend chart over ${selectedRange}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="envMetricGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={activeColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={activeColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    content={<CustomTooltip unit={metricConfig.unit} metricLabel={metricConfig.label} />}
                    cursor={{
                      stroke: "var(--color-border)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={activeColor}
                    strokeWidth={2.2}
                    fill="url(#envMetricGrad)"
                    dot={{ r: 2, fill: activeColor }}
                    activeDot={{
                      r: 4,
                      fill: activeColor,
                      stroke: "var(--color-background)",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom deterministic summary & comparison */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border/50 text-xs">
              <p className="text-muted-foreground leading-relaxed flex-1">{summary}</p>

              {comparison && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-foreground font-semibold shrink-0">
                  {direction === "improving" ? (
                    <TrendingDown className="size-3.5 text-emerald-500" aria-hidden="true" />
                  ) : direction === "worsening" ? (
                    <TrendingUp className="size-3.5 text-rose-500" aria-hidden="true" />
                  ) : (
                    <Minus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span>{comparison}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
