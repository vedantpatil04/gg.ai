import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCity } from "@/lib/city-context";
import { environmentalApi, type CityHistoryDay } from "@/lib/api/environmental.api";
import { findAqiBand } from "@/lib/mock-data";
import { EnvTrendsSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * EnvironmentalTrend — Environmental Overview, Phase 3: Relationships & Trends.
 *
 * "What has changed?" and, only where the real data genuinely supports it,
 * a data-grounded (never causal) observation about the change.
 *
 * Data integrity rules (hard requirements, not stylistic choices):
 *  — Both `/environmental/history/:cityId` and `/environmental/trends/:cityId`
 *    are filtered server-side to `source: "api"` — seeded/demo readings
 *    (`source: "sensor"`) are never counted toward history, direction, or
 *    the comparison summary.
 *  — Nothing here is interpolated, fabricated, or estimated. If there are
 *    fewer than two genuine daily data points, the section says so plainly
 *    instead of drawing a chart.
 *  — The comparison card only renders when the 7-day trend is itself
 *    `sufficient` (>= 2 verified readings) — a single reading is not "a
 *    week's average".
 *  — "Relationships" copy is restricted to observational, data-grounded
 *    statements about what the numbers show (e.g. "PM2.5 was lower in the
 *    later half of this period") — never a causal claim ("wind caused...").
 *
 * Restrained by design: one chart, one optional comparison line, one
 * optional observation. Not a dashboard. Map/Nearby/Compare/AI
 * investigation/forecasting are explicitly out of scope for this phase.
 */

const HISTORY_DAYS = 14;
const MIN_CHART_POINTS = 2;

interface ChartPoint {
  date: string;
  label: string;
  aqi: number;
  pm25: number | null;
}

function parseLocalDate(dateStr: string): Date {
  // history[].date is "YYYY-MM-DD" — parse as local midnight rather than
  // letting the bare string be interpreted as UTC (which can shift the
  // displayed day by one in negative-UTC-offset time zones).
  return new Date(`${dateStr}T00:00:00`);
}

function formatDayLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DirectionBadge({
  direction,
}: {
  direction: "improving" | "worsening" | "stable" | "insufficient-data";
}) {
  if (direction === "insufficient-data") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
        <Minus className="size-3.5" aria-hidden="true" />
        Not enough data yet
      </span>
    );
  }
  const config = {
    improving: { Icon: TrendingDown, label: "Improving", color: "var(--color-chart-2, #22c55e)" },
    worsening: { Icon: TrendingUp, label: "Worsening", color: "var(--color-destructive)" },
    stable: { Icon: Minus, label: "Stable", color: "var(--color-muted-foreground)" },
  }[direction];
  const { Icon, label, color } = config;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const band = findAqiBand(p.aqi);
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs"
      style={{
        background: "var(--color-popover)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-elev)",
      }}
    >
      <div className="text-muted-foreground mb-0.5">{p.label}</div>
      <div className="flex items-center gap-1.5 font-semibold tabular-nums">
        <span
          className="size-2 rounded-full"
          style={{ background: band.color }}
          aria-hidden="true"
        />
        AQI {p.aqi} · {band.label}
      </div>
      {typeof p.pm25 === "number" && (
        <div className="text-muted-foreground mt-0.5">PM2.5 {p.pm25} µg/m³</div>
      )}
    </div>
  );
}

// Observational-only comparison of the first vs second half of the visible
// period. Deliberately phrased as a description of what happened, never a
// cause ("PM2.5 was lower in the later half" — not "wind lowered PM2.5").
function buildObservation(points: ChartPoint[]): string | null {
  const withPm25 = points.filter((p) => typeof p.pm25 === "number") as Array<
    ChartPoint & { pm25: number }
  >;
  if (withPm25.length < MIN_CHART_POINTS) return null;

  const mid = Math.floor(withPm25.length / 2);
  const firstHalf = withPm25.slice(0, mid || 1);
  const secondHalf = withPm25.slice(mid || 1);
  if (firstHalf.length === 0 || secondHalf.length === 0) return null;

  const avg = (arr: typeof withPm25) => arr.reduce((s, p) => s + p.pm25, 0) / arr.length;
  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  const diff = secondAvg - firstAvg;

  // Small differences aren't a meaningful observation — stay silent rather
  // than manufacture a sentence out of noise.
  if (Math.abs(diff) < 2) return null;

  return diff < 0
    ? "PM2.5 concentrations were lower during the later part of the displayed period."
    : "PM2.5 concentrations were higher during the later part of the displayed period.";
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
      <span
        id="env-trends-title"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
      >
        Environmental Trend
      </span>
    </div>
  );
}

export function EnvironmentalTrend({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const { city } = useCity();
  const cityId = city?.id;

  const {
    data: historyResp,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["env-trends-history", cityId, HISTORY_DAYS],
    queryFn: () => environmentalApi.getCityHistory(cityId as string, HISTORY_DAYS),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
    throwOnError: false,
  });

  const {
    data: trendsResp,
    isLoading: isTrendsLoading,
    isError: isTrendsError,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ["env-trends-summary", cityId],
    queryFn: () => environmentalApi.getTrends(cityId as string),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
    throwOnError: false,
  });

  const history: CityHistoryDay[] | undefined = historyResp?.data?.history;

  const points: ChartPoint[] = useMemo(
    () =>
      (history ?? [])
        .filter((d) => typeof d.aqi?.avg === "number")
        .map((d) => ({
          date: d.date,
          label: formatDayLabel(d.date),
          aqi: Math.round(d.aqi.avg),
          pm25: typeof d.pm25 === "number" ? d.pm25 : null,
        })),
    [history],
  );

  const isLoading = isHistoryLoading || isTrendsLoading;
  const isError = isHistoryError || isTrendsError;

  if (!cityId || isLoading) {
    return <EnvTrendsSkeleton className={className} />;
  }

  if (isError) {
    return (
      <section aria-labelledby="env-trends-title" className={cn("space-y-4", className)}>
        <SectionHeader />
        <EnvErrorState
          onRetry={() => {
            refetchHistory();
            refetchTrends();
          }}
          retryDisabled={false}
          message="Unable to load environmental trend data."
        />
      </section>
    );
  }

  const hasEnoughHistory = points.length >= MIN_CHART_POINTS;
  const trends = trendsResp?.data;
  const observation = hasEnoughHistory ? buildObservation(points) : null;
  const latestColor = hasEnoughHistory
    ? findAqiBand(points[points.length - 1].aqi).color
    : "var(--color-primary)";

  return (
    <section aria-labelledby="env-trends-title" className={cn("space-y-4", className)}>
      <SectionHeader />

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-5">
        {!hasEnoughHistory ? (
          <EnvEmptyState
            title="Not enough historical data"
            description="There isn't enough verified historical data yet to show a meaningful trend for this city. Trends will appear here once more readings have been collected over time."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Air Quality · Last {points.length} Days</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified readings only — demo/seed data is excluded.
                </p>
              </div>
              {trends?.trend7d && <DirectionBadge direction={trends.trend7d.direction} />}
            </div>

            {/* Chart title/description are exposed to assistive tech via
                aria-labelledby/aria-describedby on the chart region, and the
                same data is repeated as an accessible table below — so
                nothing here depends on hover/tooltip interaction alone. */}
            <div
              role="img"
              aria-labelledby="env-trends-chart-title"
              aria-describedby="env-trends-chart-desc"
            >
              <span id="env-trends-chart-title" className="sr-only">
                Daily average Air Quality Index trend
              </span>
              <span id="env-trends-chart-desc" className="sr-only">
                {points.map((p) => `${p.label}: AQI ${p.aqi}`).join(". ")}
              </span>
              <div className="h-48 sm:h-56" aria-hidden="true">
                <ResponsiveContainer>
                  <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="envTrendGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={latestColor} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={latestColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                    />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "var(--color-border)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="aqi"
                      stroke={latestColor}
                      strokeWidth={2.5}
                      fill="url(#envTrendGrad)"
                      dot={{ r: 2.5, fill: latestColor }}
                      activeDot={{
                        r: 4,
                        fill: latestColor,
                        stroke: "var(--color-background)",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Visually hidden accessible data table — same values as the
                  chart, reachable without relying on pointer/tooltip. */}
              <table className="sr-only">
                <caption>Daily average AQI by date</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Average AQI</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.date}>
                      <td>{p.label}</td>
                      <td>{p.aqi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compact comparison — only when the 7-day trend itself has
                enough verified readings to be meaningful. */}
            {trends?.trend7d?.sufficient && typeof trends.trend7d.avgAqi === "number" && (
              <div className="rounded-xl border border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Today vs 7-day average</span>
                <span className="font-semibold tabular-nums">
                  {trends.current.aqi} AQI
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    vs {trends.trend7d.avgAqi} AQI avg
                  </span>
                </span>
              </div>
            )}

            {observation && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {observation}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
