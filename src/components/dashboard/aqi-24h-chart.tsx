/**
 * Aqi24hChart — Phase 1: Dashboard Foundation & Realism
 *
 * The Dashboard's one major chart. Sourced from the existing
 * `environmentalApi.getCityTrend` endpoint (real hourly readings) — no new
 * backend work, no mock series. If there's no real 24h history yet (e.g.
 * offline/demo mode), this shows an honest "Data unavailable" state rather
 * than a fabricated sine-wave trend.
 */

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
import { aqiBand } from "@/lib/mock-data";
import { TrendingUp } from "lucide-react";

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
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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
        <span className="size-2 rounded-full" style={{ background: aqiBand(p.aqi).color }} />
        AQI {p.aqi}
      </div>
    </div>
  );
}

export function Aqi24hChart({
  points,
  isLoading,
}: {
  points: Aqi24hPoint[];
  isLoading?: boolean;
}) {
  const last = points[points.length - 1];
  const color = last ? aqiBand(last.aqi).color : "var(--color-primary)";

  // Sample ticks by index rather than letting recharts render one per data
  // point. Backend readings can arrive more than once an hour, which
  // previously produced repeated-looking labels (e.g. "11 PM, 11 PM").
  // Skipping to a fixed stride guarantees evenly spaced, readable labels
  // regardless of how dense the underlying data is.
  const TARGET_TICKS = 8;
  const tickInterval =
    points.length > TARGET_TICKS ? Math.ceil(points.length / TARGET_TICKS) - 1 : 0;

  return (
    <Panel title="Air Quality · 24 Hours">
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : points.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="size-4" />}
          title="Data unavailable"
          description="Hourly air quality history will appear here once readings are available."
        />
      ) : (
        <>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer>
              <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aqi24hGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
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
                <ReferenceLine
                  y={100}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Moderate",
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
                  activeDot={{ r: 4, fill: color, stroke: "var(--color-background)", strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={900}
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
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Threshold shown: Moderate ≥ 100 AQI</span>
            <span>
              Current: <span className="font-medium" style={{ color }}>{last.aqi} AQI</span>
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}
