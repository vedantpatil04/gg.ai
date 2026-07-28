import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { trendSeries } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { environmentalApi } from "@/lib/api/environmental.api";
import { copilotApi } from "@/lib/api/services.api";
import { Leaf, TreePine, Wind, Droplets, Zap, Recycle, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <Sustainability />
    </AppLayout>
  ),
});

function Sustainability() {
  const { city, isApiConnected } = useCity();

  const { data: trendData } = useQuery({
    queryKey: ["city-trend", city.id],
    queryFn: () => environmentalApi.getCityTrend(city.id, 24).then((r) => r.data.trend),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: aiInsightsData } = useQuery({
    queryKey: ["city-ai-insights", city.id],
    queryFn: () => copilotApi.cityInsights(city.id).then((r) => r.data.insights),
    staleTime: 30 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  // Build 12-month eco trend from mock or API data
  const monthlyTrend = trendSeries(city.eco + 3, 60, 12, 12).map((d, i) => ({
    m: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i],
    score: 50 + (d.aqi % 40),
  }));

  const mix = [
    {
      name: "Solar",
      v: city.id === "singapore" ? 28 : city.id === "london" ? 22 : 18,
      c: "var(--color-warning)",
    },
    {
      name: "Wind",
      v: city.id === "london" ? 38 : city.id === "tokyo" ? 18 : 12,
      c: "var(--color-info)",
    },
    { name: "Hydro", v: city.id === "bengaluru" ? 14 : 8, c: "var(--color-primary)" },
    { name: "Fossil", v: 0, c: "var(--color-destructive)" },
  ];
  const renewable = mix.slice(0, 3).reduce((s, m) => s + m.v, 0);
  mix[3].v = 100 - renewable;

  const renewableShare =
    city.id === "london" ? 48 : city.id === "singapore" ? 42 : city.id === "tokyo" ? 44 : 38;
  const greenCover =
    city.id === "singapore" ? 46 : city.id === "london" ? 42 : city.id === "tokyo" ? 38 : 27;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Sustainability analytics
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">EcoScore · {city.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isApiConnected ? "Live data" : "Mock data"} · Carbon: {city.carbon} tCO₂e/capita ·{" "}
            {city.country}
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* EcoScore gauge */}
        <Panel className="lg:col-span-4" eyebrow="Composite" title="EcoScore">
          <div className="relative h-56 grid place-items-center">
            <svg viewBox="0 0 200 200" className="w-56 h-56 -rotate-90">
              <circle
                cx="100"
                cy="100"
                r="78"
                stroke="var(--color-muted)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="100"
                cy="100"
                r="78"
                stroke="url(#egr)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(city.eco / 100) * 490} 490`}
              />
              <defs>
                <linearGradient id="egr" x1="0" x2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-info)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <div className="text-5xl font-semibold tabular-nums">{city.eco}</div>
              <div className="text-xs text-muted-foreground mt-1">out of 100</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ["Air", city.aqi < 80 ? "A−" : city.aqi < 130 ? "B+" : "C"],
              ["Water", city.water > 80 ? "A" : city.water > 65 ? "B+" : "C+"],
              ["Energy", renewableShare > 40 ? "B+" : "C"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-muted/40 p-2">
                <div className="text-muted-foreground">{l}</div>
                <div className="font-semibold mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* KPI grid */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { i: Leaf, l: "Green cover", v: `${greenCover}%`, a: "var(--color-primary)" },
            {
              i: TreePine,
              l: "Sequestration",
              v: `${Math.round(greenCover * 3)} ktCO₂`,
              a: "var(--color-success)",
            },
            { i: Wind, l: "Renewables", v: `${renewableShare}%`, a: "var(--color-info)" },
            {
              i: Droplets,
              l: "Water reuse",
              v: `${Math.round(city.water * 0.56)}%`,
              a: "var(--color-info)",
            },
            {
              i: Zap,
              l: "Energy/cap",
              v: `${(city.carbon * 0.4).toFixed(1)} MWh`,
              a: "var(--color-warning)",
            },
            {
              i: Recycle,
              l: "Waste diverted",
              v: `${Math.round(50 + city.eco * 0.15)}%`,
              a: "var(--color-primary)",
            },
            {
              i: Leaf,
              l: "EV share",
              v: `${Math.round(renewableShare * 0.28)}%`,
              a: "var(--color-success)",
            },
            {
              i: TreePine,
              l: "Trees planted",
              v: `${Math.round(greenCover * 6.8)}k`,
              a: "var(--color-primary)",
            },
          ].map((k, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div
                  className="size-9 rounded-lg grid place-items-center"
                  style={{ background: `color-mix(in oklab, ${k.a} 18%, transparent)`, color: k.a }}
                >
                  <k.i className="size-4" />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {k.l}
                </div>
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-3">{k.v}</div>
            </div>
          ))}
        </div>

        {/* 12-month trend */}
        <Panel className="lg:col-span-8" eyebrow="Trend" title="12-month EcoScore">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthlyTrend}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="m"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Energy mix */}
        <Panel className="lg:col-span-4" eyebrow="Energy" title="Generation mix">
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mix} dataKey="v" innerRadius={48} outerRadius={84} paddingAngle={3}>
                  {mix.map((m, i) => (
                    <Cell key={i} fill={m.c} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2 text-xs">
            {mix.map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: m.c }} />
                  {m.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{m.v}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Live 24h trend if API is connected */}
        {trendData && Array.isArray(trendData) && trendData.length > 0 && (
          <Panel className="lg:col-span-12" eyebrow="Live" title="24h AQI vs Water Quality">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart
                  data={trendData
                    .slice(-12)
                    .map((d: { timestamp: string; aqi: number; water: number }) => ({
                      t: new Date(d.timestamp).getHours() + ":00",
                      aqi: d.aqi,
                      water: d.water,
                    }))}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="aqi" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="water" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}

        {/* AI City Insights (Phase 3 — Feature 4) */}
        {aiInsightsData && (
          <Panel
            className="lg:col-span-12"
            eyebrow="Gemini AI · City Insights"
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                AI sustainability intelligence · {city.name}
              </div>
            }
          >
            <div className="grid md:grid-cols-2 gap-4">
              {(Array.isArray(aiInsightsData) ? aiInsightsData : []).map(
                (insight: { title: string; body: string; tag: string }) => (
                  <div
                    key={insight.title}
                    className="rounded-xl bg-muted/30 border border-border p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {insight.tag}
                    </div>
                    <div className="text-sm font-medium mt-1">{insight.title}</div>
                    <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {insight.body}
                    </div>
                  </div>
                ),
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
