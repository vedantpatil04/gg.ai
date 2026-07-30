import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Panel } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { trendSeries, findAqiBand } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { environmentalApi } from "@/lib/api/environmental.api";
import { copilotApi } from "@/lib/api/services.api";
import {
  Leaf, TreePine, Wind, Droplets, Zap, Recycle, Sparkles,
  BarChart3, Radio, Factory, TrendingUp, TrendingDown, Minus,
  FlameKindling, Globe, CloudLightning, Bug, Clock, BotMessageSquare,
  Brain, ShieldAlert, Lightbulb, Award, Target, Building2,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { motion } from "framer-motion";
import type { Tone } from "@/components/map/intelligence-ui";
import { cn } from "@/lib/utils";

// Phase 1 components
import { SustainabilityBackground }       from "@/components/sustainability/background";
import { SustainabilityHero }              from "@/components/sustainability/hero";
import { LiveStatusRibbon }                from "@/components/sustainability/status-ribbon";
import { ExecutiveKpiStrip, type KpiItem } from "@/components/sustainability/kpi-strip";
import { SustainabilitySectionHeading }    from "@/components/sustainability/section-heading";
import { GlassPanelSkeleton }             from "@/components/sustainability/skeleton";

// Phase 2 components
import { EcoScoreCard }       from "@/components/sustainability/ecoscore-card";
import { AiExecutiveSummary } from "@/components/sustainability/ai-summary";

// Phase 3 components
import { CarbonCard, TOOLTIP_STYLE }  from "@/components/sustainability/carbon-card";
import { RenewableCard }              from "@/components/sustainability/renewable-card";
import { WaterCard }                  from "@/components/sustainability/water-card";
import { WasteCard }                  from "@/components/sustainability/waste-card";
import { GreenCoverCard }             from "@/components/sustainability/green-cover-card";

// Phase 4 components
import { DigitalTwin }       from "@/components/sustainability/digital-twin";
import { ClimateCard }       from "@/components/sustainability/climate-card";
import { BiodiversityCard, RiskWheel } from "@/components/sustainability/biodiversity-card";
import { EnvTimeline }       from "@/components/sustainability/env-timeline";

// Phase 5 components
import { SustainabilityCopilot } from "@/components/sustainability/copilot-panel";

// Phase 6 components
import { ForecastDashboard, EnvForecastCards, ForecastTimeline } from "@/components/sustainability/forecast-dashboard";
import { ScenarioSimulator }    from "@/components/sustainability/scenario-simulator";
import { RiskPredictions, OpportunityCards } from "@/components/sustainability/risk-opportunity";

// Phase 7 components
import { EsgScoreCard, EsgPillars, ExecutiveEsgSummary } from "@/components/sustainability/esg-dashboard";
import { SdgAlignmentCenter, SdgProgressMatrix }         from "@/components/sustainability/sdg-center";
import { BenchmarkIntelligence, BenchmarkInsights, SustainabilityRadar } from "@/components/sustainability/benchmarking";

export const Route = createFileRoute("/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability — GreenGuard AI" }] }),
  component: () => (<AppLayout><Sustainability /></AppLayout>),
});

// ─── helpers (unchanged) ─────────────────────────────────────────────────────

function bandTone(label: string): Tone {
  if (label === "Good") return "good";
  if (label === "Moderate" || label === "Unhealthy (SG)") return "warning";
  return "critical";
}

function ecoGrade(eco: number) {
  if (eco >= 85) return "A+";
  if (eco >= 75) return "A";
  if (eco >= 65) return "B+";
  if (eco >= 55) return "B";
  if (eco >= 45) return "C+";
  return "C";
}

function kpiStatus(value: number, target: number): KpiItem["status"] {
  const pct = value / target;
  if (pct >= 0.95) return { label: "On target",   tone: "good" };
  if (pct >= 0.7)  return { label: "Near target",  tone: "warning" };
  return              { label: "Below target", tone: "critical" };
}

// ─── Phase 3 time-range selector (unchanged) ─────────────────────────────────

type TimeRange = "1M" | "3M" | "6M" | "1Y";
const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y"];

function TimeRangeSelector({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1" role="group" aria-label="Time range">
      {TIME_RANGES.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            value === r
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
          aria-pressed={value === r}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Phase 3 trend analysis panel (unchanged) ────────────────────────────────

interface TrendMetric { label: string; direction: "up" | "down" | "flat"; value: number; unit: string }

function TrendAnalysisPanel({ metrics }: { metrics: TrendMetric[] }) {
  const improving = metrics.filter(m => m.direction === "up");
  const stable    = metrics.filter(m => m.direction === "flat");
  const declining = metrics.filter(m => m.direction === "down");
  const groups = [
    { label: "Improving",  items: improving, icon: TrendingUp,   color: "var(--color-success)" },
    { label: "Stable",     items: stable,    icon: Minus,        color: "var(--color-muted-foreground)" },
    { label: "Needs work", items: declining, icon: TrendingDown, color: "var(--color-destructive)" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-5"
    >
      <div className="grid md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
        {groups.map(g => (
          <div key={g.label} className="pt-4 md:pt-0 md:pl-6 first:pl-0 first:pt-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, ${g.color} 16%, transparent)`, color: g.color }}>
                <g.icon className="size-3.5" aria-hidden="true" />
              </div>
              <span className="text-xs font-medium" style={{ color: g.color }}>{g.label}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{g.items.length}</span>
            </div>
            {g.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-2">
                {g.items.map(m => (
                  <li key={m.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="tabular-nums font-medium" style={{ color: g.color }}>
                      {m.direction !== "flat" ? (m.direction === "up" ? "+" : "−") : ""}{m.value}{m.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Phase 3 gradient area chart (unchanged) ─────────────────────────────────

function EcoTrendChart({ data }: { data: { m: string; score: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eco-trend-gr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="m" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "EcoScore"]} />
          <Area type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2}
            fill="url(#eco-trend-gr)" dot={false}
            isAnimationActive animationDuration={1000} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

function Sustainability() {
  const { city, isApiConnected } = useCity();
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["city-trend", city.id],
    queryFn:  () => environmentalApi.getCityTrend(city.id, 24).then(r => r.data.trend),
    staleTime: 5 * 60_000,
    enabled:   isApiConnected,
    throwOnError: false,
  });

  const { data: aiInsightsData, isLoading: aiLoading } = useQuery({
    queryKey: ["city-ai-insights", city.id],
    queryFn:  () => copilotApi.cityInsights(city.id).then(r => r.data.insights),
    staleTime: 30 * 60_000,
    enabled:   isApiConnected,
    throwOnError: false,
  });

  const allMonthlyTrend = useMemo(() =>
    trendSeries(city.eco + 3, 60, 12, 12).map((d, i) => ({
      m:     ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
      score: 50 + (d.aqi % 40),
    })),
  [city.eco]);

  const monthlyTrend = useMemo(() => {
    const counts: Record<TimeRange, number> = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };
    return allMonthlyTrend.slice(-counts[timeRange]);
  }, [allMonthlyTrend, timeRange]);

  const mix = useMemo(() => {
    const arr = [
      { name: "Solar",  v: city.id === "singapore" ? 28 : city.id === "london" ? 22 : 18, c: "var(--color-warning)" },
      { name: "Wind",   v: city.id === "london" ? 38 : city.id === "tokyo" ? 18 : 12,     c: "var(--color-info)" },
      { name: "Hydro",  v: city.id === "bengaluru" ? 14 : 8,                              c: "var(--color-primary)" },
      { name: "Fossil", v: 0, c: "var(--color-destructive)" },
    ];
    const rn = arr.slice(0, 3).reduce((s, m) => s + m.v, 0);
    arr[3].v = 100 - rn;
    return arr;
  }, [city.id]);

  const renewableShare = city.id === "london" ? 48 : city.id === "singapore" ? 42 : city.id === "tokyo" ? 44 : 38;
  const greenCover     = city.id === "singapore" ? 46 : city.id === "london" ? 42 : city.id === "tokyo" ? 38 : 27;

  const band = findAqiBand(city.aqi);
  const tone = bandTone(band.label);
  const grade = ecoGrade(city.eco);
  const prevScore = allMonthlyTrend[allMonthlyTrend.length - 2].score;
  const lastScore = allMonthlyTrend[allMonthlyTrend.length - 1].score;
  const trendDiff = lastScore - prevScore;
  const trendDirection: "up" | "down" | "flat" = trendDiff > 0 ? "up" : trendDiff < 0 ? "down" : "flat";

  const kpis: KpiItem[] = [
    { icon: Leaf,     label: "Green cover",    value: greenCover, suffix: "%", accent: "var(--color-primary)", target: 30, targetLabel: "Target 30% urban canopy", trend: { direction: greenCover >= 30 ? "up" : "flat", delta: Math.abs(greenCover - 30), unit: "%" }, status: kpiStatus(greenCover, 30) },
    { icon: TreePine, label: "Sequestration",  value: Math.round(greenCover * 3), suffix: " ktCO₂", accent: "var(--color-success)" },
    { icon: Wind,     label: "Renewables",     value: renewableShare, suffix: "%", accent: "var(--color-info)", target: 40, targetLabel: "Target 40% renewable mix", trend: { direction: renewableShare >= 40 ? "up" : "down", delta: Math.abs(renewableShare - 40), unit: "%" }, status: kpiStatus(renewableShare, 40) },
    { icon: Droplets, label: "Water reuse",    value: Math.round(city.water * 0.56), suffix: "%", accent: "var(--color-info)", target: 50, targetLabel: "Target 50% reuse rate", trend: { direction: city.water * 0.56 >= 50 ? "up" : "down", delta: Math.round(Math.abs(city.water * 0.56 - 50)), unit: "%" }, status: kpiStatus(Math.round(city.water * 0.56), 50) },
    { icon: Zap,      label: "Energy/cap",     value: Number((city.carbon * 0.4).toFixed(1)), decimals: 1, suffix: " MWh", accent: "var(--color-warning)", trend: { direction: city.carbon < 5 ? "down" : "up", delta: 0.3, unit: " MWh" } },
    { icon: Recycle,  label: "Waste diverted", value: Math.round(50 + city.eco * 0.15), suffix: "%", accent: "var(--color-primary)", target: 60, targetLabel: "Target 60% diversion", trend: { direction: "up", delta: 2, unit: "%" }, status: kpiStatus(Math.round(50 + city.eco * 0.15), 60) },
    { icon: Leaf,     label: "EV share",       value: Math.round(renewableShare * 0.28), suffix: "%", accent: "var(--color-success)", target: 25, targetLabel: "Target 25% EV share", trend: { direction: "up", delta: 1, unit: "%" }, status: kpiStatus(Math.round(renewableShare * 0.28), 25) },
    { icon: TreePine, label: "Trees planted",  value: Math.round(greenCover * 6.8), suffix: "k", accent: "var(--color-primary)", trend: { direction: "up", delta: Math.round(greenCover * 0.3), unit: "k" } },
  ];

  const trendMetrics: TrendMetric[] = useMemo(() => [
    { label: "Green cover",    direction: greenCover >= 30 ? "up" : "flat",                                                       value: Math.abs(greenCover - 30), unit: "%" },
    { label: "Renewables",     direction: renewableShare >= 40 ? "up" : "down",                                                    value: Math.abs(renewableShare - 40), unit: "%" },
    { label: "Water quality",  direction: city.water >= 75 ? "up" : city.water < 55 ? "down" : "flat",                            value: city.water, unit: "%" },
    { label: "Waste diversion",direction: "up",                                                                                    value: 2, unit: "%" },
    { label: "Carbon intensity",direction: city.carbon > 7 ? "down" : city.carbon < 5 ? "up" : "flat",                            value: city.carbon, unit: " tCO₂" },
    { label: "EV adoption",    direction: "up",                                                                                    value: 1, unit: "%" },
    { label: "AQI",            direction: city.aqi < 80 ? "up" : city.aqi > 150 ? "down" : "flat",                                value: city.aqi, unit: "" },
    { label: "EcoScore",       direction: trendDirection,                                                                          value: Math.abs(trendDiff), unit: " pts" },
  ], [city.water, city.carbon, city.aqi, greenCover, renewableShare, trendDirection, trendDiff]);

  return (
    <div className="relative">
      <SustainabilityBackground />
      <div className="relative p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <SustainabilityHero city={city} isApiConnected={isApiConnected} grade={grade} band={band.label} tone={tone} trendDirection={trendDirection} trendValue={Math.abs(trendDiff)} />

        {/* ── STATUS RIBBON ─────────────────────────────────────── */}
        <LiveStatusRibbon city={city} />

        

        {/* ── AI EXECUTIVE SUMMARY ──────────────────────────────── */}
        <section>
          <SustainabilitySectionHeading icon={Sparkles} title="AI Executive Summary" description={`Rule-based sustainability brief for ${city.name}.`} />
          <AiExecutiveSummary city={city} renewableShare={renewableShare} greenCover={greenCover} />
        </section>

        {/* ── PHASE 5: AI SUSTAINABILITY COPILOT ───────────────── */}
        <section aria-labelledby="copilot-heading">
          <SustainabilitySectionHeading
            icon={BotMessageSquare}
            title="AI Sustainability Copilot"
            description={`Ask Gemini anything about ${city.name}'s environmental data, EcoScore, or what to prioritise next.`}
            accent="var(--color-primary)"
          />
          <SustainabilityCopilot
            city={city}
            isApiConnected={isApiConnected}
            renewableShare={renewableShare}
            greenCover={greenCover}
          />
        </section>

        {/* ── EXECUTIVE KPIs ────────────────────────────────────── */}
        <section id="kpis">
          <SustainabilitySectionHeading icon={BarChart3} title="Executive KPIs" description="Core sustainability metrics, refreshed with live data." />
          <ExecutiveKpiStrip items={kpis} />
        </section>

        {/* ── PHASE 6: PREDICTIVE INTELLIGENCE DASHBOARD ───────── */}
        <section aria-labelledby="predictive-heading">
          <SustainabilitySectionHeading
            icon={Brain}
            title="Predictive Sustainability Intelligence"
            description={`EcoScore forecast, environmental predictions, and what-if simulation for ${city.name}.`}
            accent="var(--color-info)"
          />
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <ForecastDashboard city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            <div className="lg:col-span-5">
              <EnvForecastCards city={city} renewableShare={renewableShare} />
            </div>
            <div className="lg:col-span-12">
              <ScenarioSimulator city={city} isApiConnected={isApiConnected} />
            </div>
            <div className="lg:col-span-6">
              <RiskPredictions city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            <div className="lg:col-span-6">
              <OpportunityCards city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            <div className="lg:col-span-12">
              <SustainabilitySectionHeading
                icon={Clock}
                title="Sustainability Forecast Timeline"
                description="Predicted events and milestones for the next 90 days."
              />
              <ForecastTimeline city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
          </div>
        </section>

        {/* ── TREND ANALYSIS ────────────────────────────────────── */}
        <section>
          <SustainabilitySectionHeading icon={TrendingUp} title="Trend Analysis" description="Rule-based signal summary across all sustainability dimensions." />
          <TrendAnalysisPanel metrics={trendMetrics} />
        </section>

        {/* ── PHASE 7: ESG INTELLIGENCE ────────────────────────── */}
        <section aria-labelledby="esg-heading">
          <SustainabilitySectionHeading
            icon={Award}
            title="ESG Intelligence"
            description={`Environmental, Social and Governance scoring for ${city.name}.`}
            accent="var(--color-success)"
          />
          <div className="space-y-5">
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4">
                <EsgScoreCard city={city} renewableShare={renewableShare} greenCover={greenCover} />
              </div>
              <div className="lg:col-span-8">
                <ExecutiveEsgSummary city={city} renewableShare={renewableShare} greenCover={greenCover} />
              </div>
            </div>
            <EsgPillars city={city} renewableShare={renewableShare} greenCover={greenCover} />
          </div>
        </section>

        {/* ── PHASE 7: SDG ALIGNMENT ───────────────────────────── */}
        <section aria-labelledby="sdg-heading">
          <SustainabilitySectionHeading
            icon={Target}
            title="SDG Alignment Center"
            description="UN Sustainable Development Goal alignment across 6 sustainability-relevant goals."
            accent="oklch(0.62 0.17 220)"
          />
          <div className="space-y-5">
            <SdgAlignmentCenter city={city} renewableShare={renewableShare} greenCover={greenCover} />
            <SdgProgressMatrix  city={city} renewableShare={renewableShare} greenCover={greenCover} />
          </div>
        </section>

        {/* ── PHASE 7: BENCHMARKING ────────────────────────────── */}
        <section aria-labelledby="benchmarking-heading">
          <SustainabilitySectionHeading
            icon={Building2}
            title="Benchmark Intelligence"
            description="Current performance vs internal good-practice baseline across 8 dimensions."
            accent="var(--color-warning)"
          />
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5">
              <SustainabilityRadar city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            <div className="lg:col-span-7 space-y-5">
              <BenchmarkIntelligence city={city} renewableShare={renewableShare} greenCover={greenCover} />
              <BenchmarkInsights     city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
          </div>
        </section>

        {/* ── PHASE 4: CLIMATE + BIODIVERSITY ROW ──────────────── */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <SustainabilitySectionHeading icon={CloudLightning} title="Climate Intelligence" description="Heat, flood, storm, air, water stress, and drought exposure." accent="var(--color-destructive)" />
            <ClimateCard city={city} />
          </div>
          <div className="lg:col-span-3">
            <SustainabilitySectionHeading icon={Bug} title="Biodiversity" description="Ecological health profile derived from green cover and eco performance." accent="var(--color-success)" />
            <BiodiversityCard city={city} greenCover={greenCover} />
          </div>
          <div className="lg:col-span-3">
            <SustainabilitySectionHeading icon={BarChart3} title="Risk Wheel" description="Animated radar chart of environmental risk by domain." />
            <RiskWheel city={city} greenCover={greenCover} />
          </div>
        </div>

        {/* ── PHASE 4: ENVIRONMENTAL TIMELINE ──────────────────── */}
        <section>
          <SustainabilitySectionHeading icon={Clock} title="Environmental Timeline" description="Achieved milestones and targets for the current city." accent="var(--color-primary)" />
          <EnvTimeline city={city} renewableShare={renewableShare} greenCover={greenCover} />
        </section>

        {/* ── MAIN ANALYTICS GRID (Phase 3, unchanged) ─────────── */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4" id="ecoscore-card">
            <SustainabilitySectionHeading icon={Leaf} title="EcoScore Intelligence" description="Animated gauge, grade, breakdown, and 12-month trend." />
            <EcoScoreCard city={city} grade={grade} trendDirection={trendDirection} trendValue={Math.abs(trendDiff)} renewableShare={renewableShare} greenCover={greenCover} />
          </div>
          <div className="lg:col-span-8">
            <div className="flex items-start justify-between mb-4 gap-4">
              <SustainabilitySectionHeading icon={BarChart3} title="EcoScore Trend" description="Monthly composite score." />
              <div className="shrink-0 pt-1"><TimeRangeSelector value={timeRange} onChange={setTimeRange} /></div>
            </div>
            <Panel><EcoTrendChart data={monthlyTrend} /></Panel>
          </div>

          <div className="lg:col-span-4">
            <SustainabilitySectionHeading icon={Factory} title="Carbon Intelligence" description="Intensity, sector split, and reduction progress." accent="var(--color-destructive)" />
            <CarbonCard city={city} />
          </div>
          <div className="lg:col-span-4">
            <SustainabilitySectionHeading icon={Zap} title="Renewable Energy" description="Clean energy share, source breakdown, and grid intensity." accent="var(--color-warning)" />
            <RenewableCard city={city} mix={mix} renewableShare={renewableShare} />
          </div>
          <div className="lg:col-span-4">
            <SustainabilitySectionHeading icon={Droplets} title="Water Intelligence" description="Quality index, reuse rate, efficiency, and 12-month trend." accent="var(--color-info)" />
            <WaterCard city={city} />
          </div>

          <div className="lg:col-span-6">
            <SustainabilitySectionHeading icon={Recycle} title="Waste Intelligence" description="Diversion rate, recycling, composting, and landfill trend." accent="var(--color-primary)" />
            <WasteCard city={city} />
          </div>
          <div className="lg:col-span-6">
            <SustainabilitySectionHeading icon={TreePine} title="Green Cover Intelligence" description="Urban canopy coverage, sequestration, and vegetation health." accent="var(--color-success)" />
            <GreenCoverCard city={city} greenCover={greenCover} />
          </div>

          <div className="lg:col-span-4">
            <SustainabilitySectionHeading icon={FlameKindling} title="Generation Mix" description="Share of electricity generation by source." />
            <Panel>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={mix} dataKey="v" innerRadius={48} outerRadius={84} paddingAngle={3} isAnimationActive animationDuration={900}>
                      {mix.map((m, i) => (<Cell key={i} fill={m.c} />))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2 text-xs">
                {mix.map(m => (
                  <div key={m.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: m.c }} />{m.name}</span>
                    <span className="tabular-nums text-muted-foreground">{m.v}%</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="lg:col-span-8">
            {isApiConnected && trendLoading ? (
              <>
                <SustainabilitySectionHeading icon={Radio} title="24h AQI vs Water Quality" description="Live rolling window from connected sensors." />
                <GlassPanelSkeleton rows={4} />
              </>
            ) : trendData && Array.isArray(trendData) && trendData.length > 0 ? (
              <>
                <SustainabilitySectionHeading icon={Radio} title="24h AQI vs Water Quality" description="Live rolling window from connected sensors." />
                <Panel>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <AreaChart data={trendData.slice(-12).map((d: { timestamp: string; aqi: number; water: number }) => ({ t: new Date(d.timestamp).getHours() + ":00", aqi: d.aqi, water: d.water }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="live-aqi-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient>
                          <linearGradient id="live-water-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Area type="monotone" dataKey="aqi"   name="AQI"   stroke="var(--color-primary)" strokeWidth={1.5} fill="url(#live-aqi-gr)"   dot={false} isAnimationActive animationDuration={900} />
                        <Area type="monotone" dataKey="water" name="Water" stroke="var(--color-info)"    strokeWidth={1.5} fill="url(#live-water-gr)" dot={false} isAnimationActive animationDuration={900} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </>
            ) : null}
          </div>

          {isApiConnected && aiLoading ? (
            <div className="lg:col-span-12">
              <SustainabilitySectionHeading icon={Sparkles} title="AI Sustainability Intelligence" description={`Gemini AI insights for ${city.name}.`} />
              <GlassPanelSkeleton rows={3} />
            </div>
          ) : aiInsightsData ? (
            <div className="lg:col-span-12">
              <SustainabilitySectionHeading icon={Sparkles} title="AI Sustainability Intelligence" description={`Gemini AI insights for ${city.name}.`} />
              <Panel>
                <div className="grid md:grid-cols-2 gap-4">
                  {(Array.isArray(aiInsightsData) ? aiInsightsData : []).map((insight: { title: string; body: string; tag: string }) => (
                    <div key={insight.title} className="rounded-xl bg-muted/30 border border-border p-4 hover:border-primary/40 transition-colors">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{insight.tag}</div>
                      <div className="text-sm font-medium mt-1">{insight.title}</div>
                      <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{insight.body}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
