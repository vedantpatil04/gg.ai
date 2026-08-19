/**
 * Aqi24hChart — Section 4: AQI Today / Quick Trend
 *
 * Compact trend visualization answering: "Is air quality getting better or worse today?"
 * Displays:
 *   - Current AQI + status
 *   - Trend direction (Improving / Worsening / Stable)
 *   - 24h Range (Min – Max AQI)
 *   - Clean, readable 24h hourly chart with moderate threshold line
 *   - Action link: "Explore environmental trends →" routing to /environment
 */

import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { aqiBand, findAqiBand } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useMemo } from "react";

export interface Aqi24hPoint {
  timestamp: string;
  aqi: number;
  label: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Aqi24hPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const d = new Date(p.timestamp);
  const timeLabel = Number.isNaN(d.getTime())
    ? p.label
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  const band = aqiBand(p.aqi);

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs"
      style={{
        background: "var(--color-popover)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-elev)",
      }}
    >
      <div className="text-muted-foreground mb-0.5">{timeLabel}</div>
      <div className="flex items-center gap-1.5 font-semibold tabular-nums">
        <span className="size-2 rounded-full" style={{ background: band.color }} />
        <span>AQI {p.aqi}</span>
        <span className="text-[10px] font-normal text-muted-foreground">({band.label})</span>
      </div>
    </div>
  );
}

export function Aqi24hChart({
  points,
  currentAqi,
  isLoading,
}: {
  points: Aqi24hPoint[];
  currentAqi?: number;
  isLoading?: boolean;
}) {
  const last = points[points.length - 1];
  const effectiveAqi = currentAqi ?? (last ? last.aqi : 50);
  const currentBand = findAqiBand(effectiveAqi);
  const color = currentBand.color;

  const { minAqi, maxAqi, trendDirection, trendTone } = useMemo(() => {
    if (!points.length) {
      return {
        minAqi: effectiveAqi,
        maxAqi: effectiveAqi,
        trendDirection: "Stable" as const,
        trendTone: "var(--color-success)",
      };
    }

    const values = points.map((p) => p.aqi);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Compute trend direction from first vs second half
    const mid = Math.floor(points.length / 2);
    const firstHalfAvg = points.slice(0, mid).reduce((s, p) => s + p.aqi, 0) / (mid || 1);
    const secondHalfAvg =
      points.slice(mid).reduce((s, p) => s + p.aqi, 0) / (points.length - mid || 1);

    const diff = secondHalfAvg - firstHalfAvg;
    if (diff <= -4) {
      return {
        minAqi: min,
        maxAqi: max,
        trendDirection: "Improving" as const,
        trendTone: "var(--color-success)",
      };
    }
    if (diff >= 4) {
      return {
        minAqi: min,
        maxAqi: max,
        trendDirection: "Worsening" as const,
        trendTone: "var(--color-destructive)",
      };
    }
    return {
      minAqi: min,
      maxAqi: max,
      trendDirection: "Stable" as const,
      trendTone: "var(--color-info)",
    };
  }, [points, effectiveAqi]);

  const TARGET_TICKS = 8;
  const tickInterval =
    points.length > TARGET_TICKS ? Math.ceil(points.length / TARGET_TICKS) - 1 : 0;

  return (
    <Panel
      eyebrow="Quick Trend"
      title="AQI Today"
      surface="card"
      action={
        <Link
          to="/environment"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>Explore environmental trends</span>
          <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : points.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="size-4" />}
          title="Hourly trend data unavailable"
          description="Readings will appear here as telemetry is recorded throughout the day."
        />
      ) : (
        <div className="space-y-4">
          {/* Top Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/50 text-xs">
            <div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Current AQI
              </div>
              <div className="mt-0.5 font-bold text-sm flex items-center gap-1.5 tabular-nums">
                <span className="size-2 rounded-full shrink-0" style={{ background: color }} />
                <span>{effectiveAqi}</span>
                <span className="text-[11px] font-normal" style={{ color }}>
                  {currentBand.label}
                </span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Trend
              </div>
              <div
                className="mt-0.5 font-semibold text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-0.5"
                style={{
                  background: `color-mix(in oklab, ${trendTone} 14%, transparent)`,
                  color: trendTone,
                }}
              >
                {trendDirection === "Improving" ? (
                  <TrendingDown className="size-3 shrink-0" />
                ) : trendDirection === "Worsening" ? (
                  <TrendingUp className="size-3 shrink-0" />
                ) : (
                  <Minus className="size-3 shrink-0" />
                )}
                <span>{trendDirection}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                24h Range
              </div>
              <div className="mt-0.5 font-semibold text-sm tabular-nums text-foreground/90">
                {minAqi} – {maxAqi} <span className="text-[10px] font-normal text-muted-foreground">AQI</span>
              </div>
            </div>
          </div>

          {/* Area Chart */}
          <div className="h-52 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="aqi24hGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                  minTickGap={20}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <ReferenceLine
                  y={100}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Moderate (100)",
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "var(--color-muted-foreground)",
                  }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="aqi"
                  stroke={color}
                  strokeWidth={2.5}
                  fill="url(#aqi24hGrad)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: color,
                    stroke: "var(--color-background)",
                    strokeWidth: 2,
                  }}
                  isAnimationActive
                  animationDuration={800}
                />
                {last && (
                  <ReferenceDot
                    x={last.label}
                    y={last.aqi}
                    r={4}
                    fill={color}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                    isFront
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Panel>
  );
}
