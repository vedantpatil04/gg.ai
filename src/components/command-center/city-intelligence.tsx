import { useQuery } from "@tanstack/react-query";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Loader2, Globe, TrendingDown, TrendingUp, Minus, MapPinned } from "lucide-react";
import { intelligenceApi, environmentalApi } from "@/lib/api/environmental.api";
import { Panel, Pill, WorkspaceHeader } from "@/components/ui-bits";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="size-3.5 text-destructive" />;
  if (value < 0) return <TrendingDown className="size-3.5 text-success" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

function AqiBand(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "var(--color-success)", tone: "success" as const };
  if (aqi <= 100)
    return { label: "Moderate", color: "var(--color-warning)", tone: "warning" as const };
  if (aqi <= 150)
    return { label: "Unhealthy", color: "var(--color-destructive)", tone: "destructive" as const };
  if (aqi <= 200)
    return {
      label: "Very Unhealthy",
      color: "var(--color-destructive)",
      tone: "destructive" as const,
    };
  return { label: "Hazardous", color: "var(--color-destructive)", tone: "destructive" as const };
}

export function CityIntelligence() {
  const { user } = useAuth();
  const { data: rankRes, isLoading: rankLoading } = useQuery({
    queryKey: ["env-rankings"],
    queryFn: () => environmentalApi.getRankings(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: compRes, isLoading: compLoading } = useQuery({
    queryKey: ["intelligence-compare-all"],
    queryFn: () => intelligenceApi.getCityComparison(),
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = rankLoading || compLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading city intelligence…</span>
      </div>
    );
  }

  const rankings: Array<{
    rank: number;
    cityId: string;
    cityName: string;
    country: string;
    aqi: number;
    pm25: number;
    pm10: number;
    risk: number;
    eco: number;
    carbon: number;
  }> = rankRes?.data?.rankings ?? [];

  const comparison = compRes?.data?.analysis;

  // Derived classification counts — used in workspace header stats
  const hotspots = rankings.filter((c) => c.aqi > 150).length;
  const highRisk = rankings.filter((c) => c.risk > 60).length;
  const leaders = rankings.filter((c) => c.eco > 65).length;

  const barData = rankings.slice(0, 10).map((c) => ({
    name: c.cityName.length > 9 ? c.cityName.slice(0, 8) + "…" : c.cityName,
    AQI: c.aqi,
    PM25: c.pm25,
    Risk: c.risk,
    Eco: c.eco,
  }));

  const scatterData = rankings.map((c) => ({ x: c.aqi, y: c.eco, z: c.risk, name: c.cityName }));

  // Phase 7 §3 — prioritize the Authority's own jurisdiction using data
  // already fetched above (no extra API call). Purely additive: renders
  // nothing when the account has no assignedCities or none appear in the
  // current rankings.
  const jurisdictionCities = user?.assignedCities ?? [];
  const jurisdictionRankings = rankings.filter((c) => jurisdictionCities.includes(c.cityId));

  return (
    <div className="space-y-6">
      {/* ── Workspace Header ─────────────────────────────────────────────── */}
      {/* Phase 3A.3: replaces SectionTitle. Stats give instant sense of     */}
      {/* network-wide classification before the table loads fully.          */}
      <WorkspaceHeader
        eyebrow="ENVIRONMENTAL MONITORING · CITY INTELLIGENCE"
        title="Cross-City Analysis"
        description={`Comparative pollution, risk, and eco-score rankings across ${rankings.length} monitored cities.`}
        stats={[
          { label: "Cities", value: rankings.length, tone: "primary" },
          { label: "Hotspots", value: hotspots, tone: hotspots > 2 ? "destructive" : "warning" },
          { label: "High Risk", value: highRisk, tone: highRisk > 2 ? "destructive" : "warning" },
          { label: "Leaders", value: leaders, tone: "success" },
        ]}
      />

      {jurisdictionRankings.length > 0 && (
        <Panel eyebrow="Your Jurisdiction" title="Assigned Cities — Current Readings">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jurisdictionRankings.map((c) => {
              const band = AqiBand(c.aqi);
              return (
                <div
                  key={c.cityId}
                  className="rounded-xl border border-border/60 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                      <MapPinned className="size-3.5 text-primary shrink-0" />
                      {c.cityName}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      PM2.5 {c.pm25} · Risk {c.risk}
                    </div>
                  </div>
                  <Pill tone={band.tone}>AQI {c.aqi}</Pill>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Rankings table */}
      <Panel eyebrow="Pollution Rankings" title="All Cities — Current Readings">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Rank", "City", "Country", "AQI", "PM2.5", "PM10", "Risk", "Eco", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium first:pl-0"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rankings.map((c) => {
                const band = AqiBand(c.aqi);
                return (
                  <tr
                    key={c.cityId}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 px-2 pl-0 font-semibold tabular-nums text-muted-foreground">
                      {c.rank}
                    </td>
                    <td className="py-2 px-2 font-medium">{c.cityName}</td>
                    <td className="py-2 px-2 text-muted-foreground text-xs">{c.country}</td>
                    <td
                      className="py-2 px-2 tabular-nums font-semibold"
                      style={{ color: band.color }}
                    >
                      {c.aqi}
                    </td>
                    <td className="py-2 px-2 tabular-nums text-muted-foreground">{c.pm25}</td>
                    <td className="py-2 px-2 tabular-nums text-muted-foreground">{c.pm10}</td>
                    <td className="py-2 px-2 tabular-nums">
                      <span
                        className={cn(
                          "font-medium",
                          c.risk > 65
                            ? "text-destructive"
                            : c.risk > 40
                              ? "text-warning"
                              : "text-success",
                        )}
                      >
                        {c.risk}
                      </span>
                    </td>
                    <td className="py-2 px-2 tabular-nums text-success">{c.eco}</td>
                    <td className="py-2 px-2">
                      <Pill tone={band.tone}>{band.label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel eyebrow="Comparative Analysis" title="AQI vs Risk — Top 10 Cities">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="AQI" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="PM25" fill="var(--color-info)" radius={[3, 3, 0, 0]} />
              <Bar
                dataKey="Risk"
                fill="var(--color-destructive)"
                radius={[3, 3, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Trade-off Analysis" title="AQI vs EcoScore Correlation">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="x"
                name="AQI"
                type="number"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                label={{
                  value: "AQI",
                  position: "insideBottom",
                  offset: -2,
                  fontSize: 10,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <YAxis
                dataKey="y"
                name="EcoScore"
                type="number"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                label={{
                  value: "Eco",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fontSize: 10,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <ZAxis dataKey="z" range={[40, 200]} name="Risk" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
                      <div className="font-semibold mb-1">{d.name}</div>
                      <div>AQI: {d.x}</div>
                      <div>EcoScore: {d.y}</div>
                      <div>Risk: {d.z}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} fill="var(--color-primary)" opacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Gemini comparison narrative */}
      {comparison && (
        <Panel eyebrow="AI Comparative Analysis" title="Gemini City Intelligence">
          <div className="space-y-4 text-sm">
            {comparison.overallAssessment && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Overall Assessment
                </div>
                <p className="text-foreground leading-relaxed">{comparison.overallAssessment}</p>
              </div>
            )}
            {comparison.topPerformers?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Top Performers
                </div>
                <ul className="space-y-1">
                  {comparison.topPerformers.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <TrendingDown className="size-3.5 text-success mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {comparison.citiesNeedingAttention?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Cities Needing Attention
                </div>
                <ul className="space-y-1">
                  {comparison.citiesNeedingAttention.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <TrendingUp className="size-3.5 text-destructive mt-0.5 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {comparison.crossCityInsights?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Cross-City Insights
                </div>
                <ul className="space-y-1">
                  {comparison.crossCityInsights.map((insight: string, i: number) => (
                    <li key={i} className="text-muted-foreground">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
