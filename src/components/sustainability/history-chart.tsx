/**
 * history-chart.tsx — Phase 4: Advanced Environmental Analytics & Historical
 * Intelligence
 *
 * The Sustainability page's one primary historical chart, extended with:
 *   - sparse-data-honest rendering (visible per-reading dots; a dashed line
 *     when coverage is thin, so smoothness never implies data that isn't
 *     there)
 *   - a humanized trend sentence ("EcoScore is improving / holding steady /
 *     declining", or "Trend unavailable" when there's not enough data)
 *   - a compact "What changed?" table across all six tracked metrics
 *   - a period-over-period comparison ("Compared with the previous 7 days")
 *   - a small, unobtrusive data-coverage / last-recorded line
 *
 * Data sources (both real, both already existing on the backend — see
 * getCityTrend / getCityHistory in environmental.controller.ts). No new
 * backend endpoints were needed for this pass: the previous-period
 * comparison is built by requesting a window twice the selected range from
 * the SAME existing endpoints and splitting it client-side into "this
 * period" / "the period before it." One fetch per range selection, reused
 * for the chart, the table, the comparison, and the coverage line alike.
 *
 * Nothing here is fabricated: every number traces back to a real
 * EnvironmentalData reading. Where there isn't enough real data to say
 * something honestly, the UI says so instead of guessing.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot,
} from "recharts";
import { History, TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";
import { Panel, EmptyState } from "@/components/ui-bits";
import { environmentalApi, type CityHistoryDay, type CityTrendPoint } from "@/lib/api/environmental.api";
import { formatRelativeTime } from "@/lib/format-time";

type RangeKey = "24h" | "7d" | "30d";
type RawPoint = CityTrendPoint | CityHistoryDay;

const RANGE_CONFIG: Record<RangeKey, { label: string; compareLabel: string; days?: number; hours?: number }> = {
  "24h": { label: "24 Hours", compareLabel: "the previous 24 hours", hours: 24 },
  "7d":  { label: "7 Days",   compareLabel: "the previous 7 days",   days: 7 },
  "30d": { label: "30 Days",  compareLabel: "the previous 30-day period", days: 30 },
};
const RANGES: RangeKey[] = ["24h", "7d", "30d"];

type MetricKey = "ecoScore" | "aqi" | "water" | "renewableShare" | "carbon" | "greenCover";

interface MetricConfig {
  key: MetricKey;
  label: string;
  suffix: string;
  decimals: number;
  color: string;
  /** Whether a rising value is a good thing (used only to color/word the
   *  summaries below — never to alter the real numbers). */
  higherIsBetter: boolean;
  /** Below this absolute change, the trend is described as "holding
   *  steady" rather than improving/declining — a presentation-layer
   *  judgment call, not a data value. */
  stableThreshold: number;
}

const METRICS: MetricConfig[] = [
  { key: "ecoScore",      label: "EcoScore",         suffix: "",      decimals: 0, color: "var(--color-primary)", higherIsBetter: true,  stableThreshold: 2 },
  { key: "aqi",            label: "AQI",              suffix: "",      decimals: 0, color: "var(--color-info)",    higherIsBetter: false, stableThreshold: 3 },
  { key: "water",          label: "Water Quality",    suffix: "%",     decimals: 0, color: "var(--color-info)",    higherIsBetter: true,  stableThreshold: 2 },
  { key: "renewableShare", label: "Renewable Energy", suffix: "%",     decimals: 0, color: "var(--color-success)", higherIsBetter: true,  stableThreshold: 2 },
  { key: "carbon",         label: "Carbon Intensity", suffix: " tCO₂", decimals: 2, color: "var(--color-warning)", higherIsBetter: false, stableThreshold: 0.1 },
  { key: "greenCover",     label: "Green Cover",      suffix: "%",     decimals: 0, color: "var(--color-success)", higherIsBetter: true,  stableThreshold: 1 },
];

interface ChartPoint {
  label: string;
  timestamp: string;
  value: number;
}

// Extracts a single metric's value from a raw 24h reading or an aggregated
// history day — the only place that needs to know the two source shapes
// differ (aqi is nested as {avg,max,min} on a history day, but a plain
// number on a raw 24h reading).
function extractValue(metric: MetricKey, point: RawPoint): number | null {
  if ("timestamp" in point) {
    if (metric === "ecoScore") return typeof point.eco === "number" ? point.eco : null;
    const v = (point as any)[metric];
    return typeof v === "number" ? v : null;
  }
  if (metric === "aqi") return point.aqi?.avg ?? null;
  if (metric === "ecoScore") return typeof point.eco === "number" ? point.eco : null;
  const v = (point as any)[metric];
  return typeof v === "number" ? v : null;
}

function pointTimestamp(point: RawPoint): string {
  return "timestamp" in point ? point.timestamp : point.date;
}

function formatTickLabel(iso: string, range: RangeKey) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return range === "24h"
    ? d.toLocaleTimeString(undefined, { hour: "numeric" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmt(value: number, m: MetricConfig): string {
  return `${value.toFixed(m.decimals)}${m.suffix}`;
}

// A metric "improved", "declined", or is "steady" based on real magnitude
// vs. that metric's own stable-threshold — never on sign alone, and never
// on a change too small to mean anything.
function classifyChange(change: number, m: MetricConfig): "up" | "down" | "steady" {
  if (Math.abs(change) < m.stableThreshold) return "steady";
  const rising = change > 0;
  return (rising && m.higherIsBetter) || (!rising && !m.higherIsBetter) ? "up" : "down";
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function CustomTooltip({
  active, payload, metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  metric: MetricConfig;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const d = new Date(p.timestamp);
  const timeLabel = Number.isNaN(d.getTime())
    ? p.label
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs"
      style={{ background: "var(--color-popover)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-elev)" }}
    >
      <div className="text-muted-foreground mb-0.5">{timeLabel}</div>
      <div className="flex items-center gap-1.5 font-semibold tabular-nums">
        <span className="size-2 rounded-full" style={{ background: metric.color }} />
        {fmt(p.value, metric)} {metric.label}
      </div>
    </div>
  );
}

function DirectionTag({ dir }: { dir: "up" | "down" | "steady" }) {
  const Icon = dir === "steady" ? Minus : dir === "up" ? TrendingUp : TrendingDown;
  const color = dir === "steady" ? "var(--color-muted-foreground)" : dir === "up" ? "var(--color-success)" : "var(--color-warning)";
  const word = dir === "steady" ? "Stable" : dir === "up" ? "Improving" : "Declining";
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-[11px]" style={{ color }}>
      <Icon className="size-3.5" aria-hidden="true" />
      {word}
    </span>
  );
}

export function SustainabilityHistoryChart({ cityId, cityName }: { cityId: string; cityName: string }) {
  const [range, setRange] = useState<RangeKey>("7d");
  const [metricKey, setMetricKey] = useState<MetricKey>("ecoScore");
  const metric = METRICS.find((m) => m.key === metricKey)!;
  const cfg = RANGE_CONFIG[range];

  // One fetch per range — a window TWICE the selected range, so the same
  // response can be split client-side into "this period" and "the period
  // before it." Reused below for the chart, the What-Changed table, the
  // period comparison, and the coverage line — never fetched again per
  // metric or per sub-section.
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["sustainability-trend-24h", cityId],
    queryFn: () => environmentalApi.getCityTrendTyped(cityId, 48),
    staleTime: 5 * 60 * 1000,
    enabled: range === "24h" && !!cityId,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["sustainability-history", cityId, range],
    queryFn: () => environmentalApi.getCityHistory(cityId, range === "30d" ? 60 : 14),
    staleTime: 15 * 60 * 1000,
    enabled: range !== "24h" && !!cityId,
  });

  const isLoading = range === "24h" ? trendLoading : historyLoading;

  // Split the fetched double-window into the selected period and the
  // equivalent period immediately before it.
  const { currentRaw, previousRaw } = useMemo(() => {
    if (range === "24h") {
      const all: RawPoint[] = trendData?.data?.trend ?? [];
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return {
        currentRaw: all.filter((p: RawPoint) => new Date(pointTimestamp(p)).getTime() >= cutoff),
        previousRaw: all.filter((p: RawPoint) => new Date(pointTimestamp(p)).getTime() < cutoff),
      };
    }
    const all: RawPoint[] = historyData?.data?.history ?? [];
    const days = cfg.days ?? 7;
    return {
      currentRaw: all.slice(-days),
      previousRaw: all.slice(0, Math.max(0, all.length - days)),
    };
  }, [range, cfg.days, trendData, historyData]);

  // ── Chart series for the selected metric (current period only) ────────
  const points: ChartPoint[] = useMemo(
    () =>
      currentRaw
        .map((p: RawPoint) => {
          const value = extractValue(metricKey, p);
          const ts = pointTimestamp(p);
          return value == null ? null : { label: formatTickLabel(ts, range), timestamp: ts, value };
        })
        .filter((p: ChartPoint | null): p is ChartPoint => p !== null),
    [currentRaw, metricKey, range],
  );

  const current = points[points.length - 1] ?? null;
  const previous = points[0] ?? null;
  const change = current && previous ? current.value - previous.value : null;
  const direction = change == null ? null : classifyChange(change, metric);

  // ── Coverage / freshness (drives from the same currentRaw, no extra fetch) ──
  const coverageLabel =
    range === "24h"
      ? `Based on ${currentRaw.length} recorded reading${currentRaw.length === 1 ? "" : "s"}`
      : `Historical coverage: ${currentRaw.length} of the last ${cfg.days} days`;
  const lastRecordedIso = currentRaw.length ? pointTimestamp(currentRaw[currentRaw.length - 1]) : null;

  // ── "What changed?" — all six metrics, current-period start vs end ────
  const whatChanged = useMemo(
    () =>
      METRICS.map((m) => {
        const vals = currentRaw
          .map((p: RawPoint) => extractValue(m.key, p))
          .filter((v: number | null): v is number => v != null);
        if (vals.length < 2) return null;
        const prev = vals[0];
        const curr = vals[vals.length - 1];
        return { metric: m, previous: prev, current: curr, change: curr - prev, direction: classifyChange(curr - prev, m) };
      }).filter((r: any): r is NonNullable<typeof r> => r !== null),
    [currentRaw],
  );

  // ── Period-over-period comparison — average of this period vs average
  //    of the equivalent prior period, per metric ─────────────────────
  const comparison = useMemo(
    () =>
      METRICS.map((m) => {
        const currVals = currentRaw.map((p: RawPoint) => extractValue(m.key, p)).filter((v: number | null): v is number => v != null);
        const prevVals = previousRaw.map((p: RawPoint) => extractValue(m.key, p)).filter((v: number | null): v is number => v != null);
        if (currVals.length < 2 || prevVals.length < 2) return null;
        const currAvg = average(currVals)!;
        const prevAvg = average(prevVals)!;
        if (prevAvg === 0) return null;
        const pct = ((currAvg - prevAvg) / Math.abs(prevAvg)) * 100;
        return { metric: m, pct, direction: classifyChange(currAvg - prevAvg, m) };
      }).filter((r: any): r is NonNullable<typeof r> => r !== null),
    [currentRaw, previousRaw],
  );

  const TARGET_TICKS = range === "24h" ? 6 : 7;
  const tickInterval = points.length > TARGET_TICKS ? Math.ceil(points.length / TARGET_TICKS) - 1 : 0;

  // Sparse-data honesty: if we have well under the readings a full window
  // would show, don't let a smooth line imply continuity that isn't real —
  // dash the stroke and rely on visible per-point dots rather than an
  // unbroken curve. (Coverage text above is the primary, accessible
  // signal; this is a secondary visual reinforcement.)
  const expectedPoints = range === "24h" ? 24 : (cfg.days ?? 7);
  const isSparse = points.length > 0 && points.length < expectedPoints * 0.5;

  const trendSentence = (() => {
    if (points.length < 2 || change == null || direction == null) {
      return { headline: "Trend unavailable", body: "There isn't enough historical data to confidently describe this metric's direction yet." };
    }
    const changeStr = `${change > 0 ? "+" : ""}${change.toFixed(metric.decimals)}${metric.suffix}`;
    if (direction === "steady") {
      return { headline: `${metric.label} is holding steady`, body: `${cityName}'s ${metric.label.toLowerCase()} has remained broadly stable over the selected period.` };
    }
    if (direction === "up") {
      return { headline: `${metric.label} is improving`, body: `${cityName}'s ${metric.label.toLowerCase()} changed by ${changeStr} over the selected period, an overall improvement.` };
    }
    return { headline: `${metric.label} is declining`, body: `${cityName}'s ${metric.label.toLowerCase()} changed by ${changeStr} over the selected period and may need closer attention.` };
  })();

  const chartA11ySummary =
    points.length < 2
      ? `Not enough historical data to chart ${metric.label} for ${cityName} over ${cfg.label.toLowerCase()}.`
      : `${metric.label} for ${cityName} over ${cfg.label.toLowerCase()}: from ${fmt(previous!.value, metric)} to ${fmt(current!.value, metric)}, a change of ${change! > 0 ? "+" : ""}${change!.toFixed(metric.decimals)}${metric.suffix}.`;

  return (
    <Panel
      eyebrow="Environmental History"
      title={`How ${cityName} has changed over time`}
      action={
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/30 p-0.5" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_CONFIG[r].label}
            </button>
          ))}
        </div>
      }
    >
      {/* Metric toggle */}
      <div className="flex flex-wrap gap-1.5 mb-4 overflow-x-auto" role="group" aria-label="Metric">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetricKey(m.key)}
            aria-pressed={metricKey === m.key}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              metricKey === m.key
                ? "border-transparent text-white"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
            style={metricKey === m.key ? { background: m.color } : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-56 sm:h-64 grid place-items-center">
          <span className="text-xs text-muted-foreground">Loading history…</span>
        </div>
      ) : points.length < 2 ? (
        <EmptyState
          icon={<History className="size-4" />}
          title="Not enough historical data"
          description={`Historical data isn't available for ${metric.label} yet. Check back once more readings have been recorded.`}
        />
      ) : (
        <>
          <p className="sr-only">{chartA11ySummary}</p>
          <div className="h-56 sm:h-64" aria-hidden="true">
            <ResponsiveContainer>
              <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="historyChartGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={metric.color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                  minTickGap={24}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  content={<CustomTooltip metric={metric} />}
                  cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metric.color}
                  strokeWidth={2.5}
                  strokeDasharray={isSparse ? "5 4" : undefined}
                  fill="url(#historyChartGrad)"
                  dot={{ r: 2.5, fill: metric.color, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: metric.color, stroke: "var(--color-background)", strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={700}
                />
                {current && (
                  <ReferenceDot
                    x={current.label}
                    y={current.value}
                    r={4}
                    fill={metric.color}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                    isFront
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Coverage / freshness — small, unobtrusive */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Radio className="size-3 shrink-0" aria-hidden="true" />
            <span>{coverageLabel}</span>
            {lastRecordedIso && <span>· Last recorded {formatRelativeTime(lastRecordedIso)}</span>}
          </div>

          {/* Previous / Current / Change for the selected period */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/60 pt-3">
            <span>
              Previous: <span className="font-medium text-foreground">{fmt(previous!.value, metric)}</span>
            </span>
            <span>
              Current: <span className="font-medium text-foreground">{fmt(current!.value, metric)}</span>
            </span>
            <span
              className="flex items-center gap-1 font-semibold"
              style={{ color: direction === "steady" ? "var(--color-muted-foreground)" : direction === "up" ? "var(--color-success)" : "var(--color-warning)" }}
            >
              {change! > 0 ? "+" : ""}{change!.toFixed(metric.decimals)}{metric.suffix}
            </span>
          </div>

          {/* Humanized trend summary */}
          <div className="mt-4 rounded-xl bg-muted/30 border border-border/60 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{trendSentence.headline}</span>
              {direction && <DirectionTag dir={direction} />}
            </div>
            <p className="text-xs text-muted-foreground">{trendSentence.body}</p>
          </div>
        </>
      )}

      {/* ── What changed? ─────────────────────────────────────────── */}
      {whatChanged.length > 0 && (
        <div className="mt-6 border-t border-border/60 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">What changed?</div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[420px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium py-1.5 px-1">Metric</th>
                  <th className="text-right font-medium py-1.5 px-1">Previous</th>
                  <th className="text-right font-medium py-1.5 px-1">Current</th>
                  <th className="text-right font-medium py-1.5 px-1">Change</th>
                </tr>
              </thead>
              <tbody>
                {whatChanged.map((row) => (
                  <tr key={row.metric.key} className="border-t border-border/40">
                    <td className="py-1.5 px-1 font-medium">{row.metric.label}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-muted-foreground">{fmt(row.previous, row.metric)}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums font-medium">{fmt(row.current, row.metric)}</td>
                    <td className="py-1.5 px-1 text-right">
                      <DirectionTag dir={row.direction} />
                      <span className="ml-1 tabular-nums text-muted-foreground">
                        {row.change > 0 ? "+" : ""}{row.change.toFixed(row.metric.decimals)}{row.metric.suffix}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Compared with the previous period ─────────────────────── */}
      <div className="mt-6 border-t border-border/60 pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Compared with {cfg.compareLabel}
        </div>
        {comparison.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {comparison.map((row) => (
              <div key={row.metric.key} className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{row.metric.label}:</span>
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: row.direction === "steady" ? "var(--color-muted-foreground)" : row.direction === "up" ? "var(--color-success)" : "var(--color-warning)" }}
                >
                  {row.pct > 0 ? "+" : ""}{row.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Not enough historical data</p>
        )}
      </div>
    </Panel>
  );
}
