import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  Bar,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { commandApi, type TrendIntelligenceData } from "@/lib/api/command.api";
import { Panel, WorkspaceHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";

type Granularity = "daily" | "weekly" | "monthly";

const GRANULARITY_LABELS: Record<Granularity, string> = {
  daily: "Daily (30 days)",
  weekly: "Weekly (90 days)",
  monthly: "Monthly (12 months)",
};

function formatPeriod(period: string, granularity: Granularity): string {
  if (granularity === "monthly") {
    const [y, m] = period.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  if (granularity === "weekly") return `W${period.split("-W")[1] ?? period}`;
  const parts = period.split("-");
  return `${parts[1]}/${parts[2]}`;
}

export function TrendIntelligence() {
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const { data: res, isLoading } = useQuery({
    queryKey: ["command-trends", granularity],
    queryFn: () => commandApi.getTrendIntelligence(granularity),
    staleTime: 5 * 60 * 1000,
  });

  const d = res?.data as TrendIntelligenceData | undefined;

  const aqiData = (d?.aqiTrend ?? []).map((p) => ({
    ...p,
    period: formatPeriod(p.period, granularity),
  }));

  const complaintData = (d?.complaintTrend ?? []).map((p) => ({
    ...p,
    period: formatPeriod(p.period, granularity),
  }));

  const alertData = (d?.alertTrend ?? []).map((p) => ({
    ...p,
    period: formatPeriod(p.period, granularity),
  }));

  const tickStyle = { fontSize: 10, fill: "var(--color-muted-foreground)" };
  const tooltipStyle = {
    contentStyle: {
      background: "var(--color-card)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      fontSize: 12,
    },
  };

  return (
    <div className="space-y-6">
      {/* ── Workspace Header ─────────────────────────────────────────────── */}
      {/* Phase 3A.3: replaces the flex row that mixed SectionTitle with the  */}
      {/* granularity buttons. Buttons move into the action slot so the page  */}
      {/* context and controls share one compact line.                        */}
      <WorkspaceHeader
        eyebrow="ANALYTICS · INSIGHTS & TRENDS"
        title="Network-Wide Environmental Trends"
        description="Analyse pollution, risk, and complaint patterns across time."
        action={
          <div className="flex gap-1.5">
            {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? "default" : "outline"}
                onClick={() => setGranularity(g)}
                className="text-xs capitalize"
              >
                {g}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading {granularity} trends…</span>
        </div>
      ) : (
        <>
          {/* AQI + PM2.5 Trend */}
          <Panel
            eyebrow={GRANULARITY_LABELS[granularity]}
            title="AQI & Pollution Trends — Network Average"
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={aqiData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <defs>
                  <linearGradient id="aqi-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pm25-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" tick={tickStyle} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="avgAqi"
                  name="Avg AQI"
                  stroke="var(--color-primary)"
                  fill="url(#aqi-grad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="avgPm25"
                  name="Avg PM2.5"
                  stroke="var(--color-destructive)"
                  fill="url(#pm25-grad)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Risk + Eco */}
          <Panel eyebrow={GRANULARITY_LABELS[granularity]} title="Risk Score & EcoScore Trends">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={aqiData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" tick={tickStyle} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="avgRisk"
                  name="Avg Risk Score"
                  stroke="var(--color-destructive)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avgEco"
                  name="Avg Eco Score"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {/* Complaint + Alert trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel eyebrow={GRANULARITY_LABELS[granularity]} title="Complaint Trend">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart
                  data={complaintData}
                  margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="period"
                    tick={{ ...tickStyle, fontSize: 9 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={tickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="total"
                    name="Total"
                    fill="var(--color-warning)"
                    radius={[2, 2, 0, 0]}
                    opacity={0.8}
                  />
                  <Line
                    dataKey="resolved"
                    name="Resolved"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>

            <Panel eyebrow={GRANULARITY_LABELS[granularity]} title="Alert Frequency">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={alertData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="period"
                    tick={{ ...tickStyle, fontSize: 9 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={tickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="total"
                    name="Total"
                    fill="var(--color-info)"
                    radius={[2, 2, 0, 0]}
                    opacity={0.8}
                  />
                  <Bar
                    dataKey="critical"
                    name="Critical"
                    fill="var(--color-destructive)"
                    radius={[2, 2, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Carbon trend — conditional on data availability */}
          {aqiData.some((d) => d.avgCarbon > 0) && (
            <Panel
              eyebrow={GRANULARITY_LABELS[granularity]}
              title="Carbon Impact Trend (tCO₂e per capita)"
            >
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={aqiData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                  <defs>
                    <linearGradient id="carbon-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="period" tick={tickStyle} interval="preserveStartEnd" />
                  <YAxis tick={tickStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="avgCarbon"
                    name="Avg Carbon"
                    stroke="var(--color-warning)"
                    fill="url(#carbon-grad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
