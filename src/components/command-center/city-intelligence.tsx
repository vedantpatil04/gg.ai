import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  MapPinned,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { intelligenceApi, environmentalApi } from "@/lib/api/environmental.api";
import { Pill } from "@/components/ui-bits";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center justify-center h-64 gap-2.5">
        <Loader2 className="size-5 animate-spin text-emerald-500" />
        <span className="text-sm text-muted-foreground font-medium">Loading city intelligence…</span>
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

  // Derived classification counts
  const hotspots = rankings.filter((c) => c.aqi > 150).length;
  const highRisk = rankings.filter((c) => c.risk > 60).length;
  const leaders = rankings.filter((c) => c.eco > 65).length;

  // Jurisdiction city identification
  const jurisdictionCities = user?.assignedCities ?? [];
  const isCityAssigned = (cityId: string, cityName: string) =>
    jurisdictionCities.some(
      (jc) =>
        jc.toLowerCase() === cityId.toLowerCase() ||
        jc.toLowerCase() === cityName.toLowerCase(),
    );

  const jurisdictionRankings = rankings.filter((c) => isCityAssigned(c.cityId, c.cityName));

  // Chart data formatting with assigned-city distinction
  const barData = rankings.slice(0, 10).map((c) => ({
    name: c.cityName.length > 10 ? c.cityName.slice(0, 9) + "…" : c.cityName,
    fullName: c.cityName,
    country: c.country,
    AQI: c.aqi,
    PM25: c.pm25,
    Risk: c.risk,
    Eco: c.eco,
    isAssigned: isCityAssigned(c.cityId, c.cityName),
  }));

  const nonAssignedScatter = rankings
    .filter((c) => !isCityAssigned(c.cityId, c.cityName))
    .map((c) => ({
      x: c.aqi,
      y: c.eco,
      z: c.risk,
      name: c.cityName,
      country: c.country,
      pm25: c.pm25,
      isAssigned: false,
    }));

  const assignedScatter = rankings
    .filter((c) => isCityAssigned(c.cityId, c.cityName))
    .map((c) => ({
      x: c.aqi,
      y: c.eco,
      z: c.risk,
      name: c.cityName,
      country: c.country,
      pm25: c.pm25,
      isAssigned: true,
    }));

  return (
    <div className="space-y-5 pb-8 w-full min-w-0">
      {/* ── 1. PAGE HEADER ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4 pb-3.5 border-b border-border/70 min-w-0">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-muted-foreground">
            ENVIRONMENTAL MONITORING · CITY INTELLIGENCE
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Cross-City Analysis
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug break-words">
            Comparative pollution, risk, and eco-score intelligence across {rankings.length} monitored cities.
          </p>
        </div>

        {/* Summary Metrics Bar (2x2 on mobile, 1x4 on sm+) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0 min-w-0">
          <div className="px-3 py-2 sm:px-3.5 rounded-lg bg-card/70 border border-border/70 text-center shadow-2xs">
            <div className="text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
              {rankings.length}
            </div>
            <div className="text-[11px] sm:text-xs uppercase font-semibold text-muted-foreground mt-0.5">
              Cities
            </div>
          </div>
          <div className="px-3 py-2 sm:px-3.5 rounded-lg bg-card/70 border border-border/70 text-center shadow-2xs">
            <div className={cn("text-base sm:text-lg font-bold font-mono tabular-nums", hotspots > 0 ? "text-amber-500" : "text-foreground")}>
              {hotspots}
            </div>
            <div className="text-[11px] sm:text-xs uppercase font-semibold text-muted-foreground mt-0.5">
              Hotspots
            </div>
          </div>
          <div className="px-3 py-2 sm:px-3.5 rounded-lg bg-card/70 border border-border/70 text-center shadow-2xs">
            <div className={cn("text-base sm:text-lg font-bold font-mono tabular-nums", highRisk > 0 ? "text-red-500" : "text-foreground")}>
              {highRisk}
            </div>
            <div className="text-[11px] sm:text-xs uppercase font-semibold text-muted-foreground mt-0.5">
              High Risk
            </div>
          </div>
          <div className="px-3 py-2 sm:px-3.5 rounded-lg bg-card/70 border border-border/70 text-center shadow-2xs">
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-500 tabular-nums">
              {leaders}
            </div>
            <div className="text-[11px] sm:text-xs uppercase font-semibold text-muted-foreground mt-0.5">
              Eco Leaders
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. YOUR JURISDICTION FOCUS MODULE ────────────────────────────── */}
      {jurisdictionRankings.length > 0 && (
        <section className="space-y-2.5 w-full min-w-0">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Your Jurisdiction
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {jurisdictionRankings.length} Assigned City
              </span>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
              Primary operational boundary
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full min-w-0">
            {jurisdictionRankings.map((c) => {
              const band = AqiBand(c.aqi);
              return (
                <div
                  key={c.cityId}
                  className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 shadow-xs w-full min-w-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPinned className="size-4 text-emerald-500 shrink-0" />
                        <span className="text-base sm:text-lg font-bold text-foreground truncate">
                          {c.cityName}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">
                          ({c.country})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rank #{c.rank} of {rankings.length}
                        </span>
                        <span>·</span>
                        <span>Assigned Authority Area</span>
                      </div>
                    </div>
                    <Pill tone={band.tone} className="text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 self-start sm:self-auto shrink-0">
                      AQI {c.aqi} · {band.label}
                    </Pill>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-3 border-t border-emerald-500/20 text-center font-mono">
                    <div className="bg-card/80 p-2 rounded-lg border border-border/60">
                      <div className="text-xs uppercase font-semibold text-muted-foreground">
                        PM2.5
                      </div>
                      <div className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
                        {c.pm25}
                      </div>
                      <div className="text-[10px] text-muted-foreground">µg/m³</div>
                    </div>
                    <div className="bg-card/80 p-2 rounded-lg border border-border/60">
                      <div className="text-xs uppercase font-semibold text-muted-foreground">
                        PM10
                      </div>
                      <div className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
                        {c.pm10}
                      </div>
                      <div className="text-[10px] text-muted-foreground">µg/m³</div>
                    </div>
                    <div className="bg-card/80 p-2 rounded-lg border border-border/60">
                      <div className="text-xs uppercase font-semibold text-muted-foreground">
                        Risk
                      </div>
                      <div
                        className={cn(
                          "text-sm sm:text-base font-bold tabular-nums mt-0.5",
                          c.risk > 65
                            ? "text-red-500"
                            : c.risk > 40
                              ? "text-amber-500"
                              : "text-emerald-500",
                        )}
                      >
                        {c.risk}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/ 100</div>
                    </div>
                    <div className="bg-card/80 p-2 rounded-lg border border-border/60">
                      <div className="text-xs uppercase font-semibold text-muted-foreground">
                        Eco Score
                      </div>
                      <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                        {c.eco}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 3. ALL CITIES COMPARISON TABLE ───────────────────────────────── */}
      <section className="space-y-2.5 w-full min-w-0">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              All Cities — Current Readings
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-muted text-muted-foreground border border-border/50">
              {rankings.length} Monitored
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
            Ranked by composite environmental performance
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 overflow-hidden shadow-2xs w-full min-w-0">
          <div className="overflow-x-auto scrollbar-thin touch-pan-x">
            <table className="w-full min-w-[700px] text-sm text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/70 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-14 sm:w-16 font-mono text-center">Rank</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 min-w-[150px] sm:min-w-[180px]">City</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-28 sm:w-32">Country</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-20 sm:w-24 text-right font-mono">AQI</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-20 sm:w-24 text-right font-mono">PM2.5</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-20 sm:w-24 text-right font-mono">PM10</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-20 sm:w-24 text-right font-mono">Risk</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-24 sm:w-28 text-right font-mono">Eco Score</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-3.5 w-28 sm:w-32 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rankings.map((c) => {
                  const band = AqiBand(c.aqi);
                  const isAssigned = isCityAssigned(c.cityId, c.cityName);

                  return (
                    <tr
                      key={c.cityId}
                      className={cn(
                        "transition-colors group",
                        isAssigned
                          ? "bg-emerald-500/[0.09] dark:bg-emerald-500/[0.15] border-l-4 border-l-emerald-500 hover:bg-emerald-500/[0.13] dark:hover:bg-emerald-500/[0.19]"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 font-mono font-bold tabular-nums text-muted-foreground text-center">
                        #{c.rank}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm sm:text-base font-semibold whitespace-nowrap",
                              isAssigned
                                ? "text-foreground font-bold"
                                : "text-foreground group-hover:text-primary transition-colors",
                            )}
                          >
                            {c.cityName}
                          </span>
                          {isAssigned && (
                            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/40 shrink-0">
                              <Shield className="size-3" />
                              Your Jurisdiction
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                        {c.country}
                      </td>
                      <td
                        className="py-2.5 sm:py-3 px-3 sm:px-3.5 font-mono font-bold text-sm sm:text-base tabular-nums text-right"
                        style={{ color: band.color }}
                      >
                        {c.aqi}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 font-mono text-xs sm:text-sm tabular-nums text-right text-muted-foreground">
                        {c.pm25}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 font-mono text-xs sm:text-sm tabular-nums text-right text-muted-foreground">
                        {c.pm10}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 font-mono font-bold text-xs sm:text-sm tabular-nums text-right">
                        <span
                          className={cn(
                            c.risk > 65
                              ? "text-red-500"
                              : c.risk > 40
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {c.risk}
                        </span>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 font-mono font-bold text-xs sm:text-sm tabular-nums text-right text-emerald-600 dark:text-emerald-400">
                        {c.eco}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-3.5 text-center whitespace-nowrap">
                        <Pill tone={band.tone} className="text-[11px] sm:text-xs py-0.5 px-2 sm:px-2.5 font-semibold">
                          {band.label}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 4. COMPARATIVE ANALYTICS CHARTS (Meaningful Analytics Grid) ───── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start w-full min-w-0">
        {/* Chart 1: AQI vs Risk */}
        <div className="space-y-2 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between pb-1.5 border-b border-border/60 gap-1">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              AQI vs Risk — Top 10 Cities
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Comparing ambient air pollution with risk indices
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3 sm:p-4 shadow-2xs space-y-2 w-full min-w-0 overflow-hidden">
            <div className="w-full min-w-0 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 12, right: 8, left: -14, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "var(--color-foreground)" }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    label={{
                      value: "Index Value",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border/80 rounded-lg p-3 text-xs shadow-lg space-y-1.5 min-w-[160px]">
                          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1">
                            <span className="font-bold text-sm text-foreground">{d.fullName}</span>
                            {d.isAssigned && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                Assigned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>AQI:</span>
                            <span className="font-mono font-bold text-foreground">{d.AQI}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>PM2.5:</span>
                            <span className="font-mono font-bold text-sky-500">{d.PM25} µg/m³</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Risk Index:</span>
                            <span className="font-mono font-bold text-red-500">{d.Risk} / 100</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Eco Score:</span>
                            <span className="font-mono font-bold text-emerald-500">{d.Eco} / 100</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="AQI" name="AQI (Air Quality)" fill="var(--color-primary)" radius={[3, 3, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`bar-aqi-${index}`}
                        fill={entry.isAssigned ? "#10b981" : "var(--color-primary)"}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="PM25"
                    name="PM2.5 (Particulates)"
                    fill="var(--color-info)"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="Risk"
                    name="Risk Index"
                    fill="var(--color-destructive)"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend & Context Note */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-medium text-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-primary" /> AQI
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-info" /> PM2.5
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-destructive" /> Risk Index
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-emerald-500" /> Assigned Jurisdiction
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Higher AQI and higher Risk Index indicate greater environmental pressure on urban infrastructure.
              </p>
            </div>
          </div>
        </div>

        {/* Chart 2: Correlation Plot */}
        <div className="space-y-2 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between pb-1.5 border-b border-border/60 gap-1">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              AQI vs EcoScore Correlation
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Evaluating air quality impact on ecological performance
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3 sm:p-4 shadow-2xs space-y-2 w-full min-w-0 overflow-hidden">
            <div className="w-full min-w-0 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 12, left: -14, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                  <XAxis
                    dataKey="x"
                    name="AQI"
                    type="number"
                    domain={[0, 200]}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    label={{
                      value: "AQI (Air Quality Index)",
                      position: "insideBottom",
                      offset: -4,
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    name="EcoScore"
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    label={{
                      value: "Eco Score (0–100)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                  <ZAxis dataKey="z" range={[60, 220]} name="Risk" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border/80 rounded-lg p-3 text-xs shadow-lg space-y-1.5 min-w-[170px]">
                          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1">
                            <span className="font-bold text-sm text-foreground">{d.name}</span>
                            {d.isAssigned && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                Assigned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>AQI:</span>
                            <span className="font-mono font-bold text-foreground">{d.x}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Eco Score:</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{d.y} / 100</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Risk Index:</span>
                            <span className="font-mono font-bold text-destructive">{d.z} / 100</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={nonAssignedScatter}
                    fill="var(--color-primary)"
                    opacity={0.65}
                    name="Monitored Cities"
                  />
                  {assignedScatter.length > 0 && (
                    <Scatter
                      data={assignedScatter}
                      fill="#10b981"
                      opacity={1}
                      name="Your Jurisdiction"
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Legend & Context Note */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-medium text-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" /> Monitored Cities
                </span>
                {assignedScatter.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40" /> Your Jurisdiction ({assignedScatter[0].name})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Inverse distribution: cities maintaining lower AQI levels consistently achieve higher sustainability ratings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. AI CITY INTELLIGENCE ──────────────────────────────────────── */}
      <section className="space-y-2.5 w-full min-w-0">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Gemini City Intelligence
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">
              <Sparkles className="size-3" /> AI Synthesis
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
            Automated cross-city environmental telemetry synthesis
          </span>
        </div>

        {comparison ? (
          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 sm:p-5 space-y-4 shadow-2xs w-full min-w-0">
            {/* 1. What is happening: Overall Assessment */}
            {comparison.overallAssessment && (
              <div className="space-y-1.5">
                <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-3.5 text-primary shrink-0" />
                  <span>What is Happening · Overall Assessment</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed pl-3 sm:pl-4 border-l-2 border-emerald-500/60 font-normal break-words">
                  {comparison.overallAssessment}
                </p>
              </div>
            )}

            {/* 2. Why it matters: Cross-City Insights */}
            {comparison.crossCityInsights?.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-emerald-500 shrink-0" />
                  <span>Why it Matters · Cross-City Dynamics</span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {comparison.crossCityInsights.map((insight: string, i: number) => (
                    <li
                      key={i}
                      className="p-3 rounded-lg bg-muted/20 border border-border/40 text-sm text-muted-foreground leading-relaxed flex items-start gap-2.5 break-words"
                    >
                      <span className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span className="text-foreground/90">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. What requires attention: Cities & Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/50">
              {comparison.citiesNeedingAttention?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase font-bold tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>What Requires Attention · Priority Hotspots</span>
                  </div>
                  <ul className="space-y-1.5">
                    {comparison.citiesNeedingAttention.map((c: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-red-500/[0.05] border border-red-500/20 text-sm text-foreground font-medium break-words"
                      >
                        <TrendingUp className="size-3.5 text-red-500 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {comparison.topPerformers?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>Eco Leaders · Top Performers</span>
                  </div>
                  <ul className="space-y-1.5">
                    {comparison.topPerformers.map((p: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 text-sm text-foreground font-medium break-words"
                      >
                        <TrendingDown className="size-3.5 text-emerald-500 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-lg border border-border/60 bg-card/30 text-xs sm:text-sm text-muted-foreground">
            <Sparkles className="size-4 text-emerald-500 shrink-0" />
            <span>AI comparative synthesis is synchronizing live cross-city sensor metrics.</span>
          </div>
        )}
      </section>
    </div>
  );
}
