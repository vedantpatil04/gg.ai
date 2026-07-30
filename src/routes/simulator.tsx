import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel, Pill } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { simulatorApi } from "@/lib/api/services.api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
} from "recharts";
import {
  Car,
  TreePine,
  Factory,
  Sparkles,
  Play,
  RotateCcw,
  Loader2,
  TrendingDown,
  Heart,
  Leaf,
  Building,
  Zap,
  Bus,
  Recycle,
  Trees,
  Download,
  GitCompareArrows,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScenarioSimulator } from "@/components/sustainability/scenario-simulator";


export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [{ title: "Policy Simulator — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <Simulator />
    </AppLayout>
  ),
});

const LEVERS = [
  {
    id: "ev",
    label: "EV adoption",
    icon: Car,
    max: 100,
    unit: "%",
    default: 22,
    color: "var(--color-info)",
  },
  {
    id: "traffic",
    label: "Traffic reduction",
    icon: Car,
    max: 60,
    unit: "%",
    default: 12,
    color: "var(--color-primary)",
  },
  {
    id: "trees",
    label: "Tree plantation",
    icon: TreePine,
    max: 500,
    unit: "k/yr",
    default: 84,
    color: "var(--color-success)",
  },
  {
    id: "industry",
    label: "Industrial growth",
    icon: Factory,
    max: 30,
    unit: "%",
    default: 8,
    color: "var(--color-warning)",
  },
  {
    id: "renewable",
    label: "Renewable energy adoption",
    icon: Zap,
    max: 100,
    unit: "%",
    default: 20,
    color: "var(--color-info)",
  },
  {
    id: "publicTransport",
    label: "Public transport usage",
    icon: Bus,
    max: 100,
    unit: "%",
    default: 15,
    color: "var(--color-primary)",
  },
  {
    id: "wasteManagement",
    label: "Waste management efficiency",
    icon: Recycle,
    max: 100,
    unit: "%",
    default: 30,
    color: "var(--color-success)",
  },
  {
    id: "greenArea",
    label: "Green area expansion",
    icon: Trees,
    max: 50,
    unit: "%",
    default: 10,
    color: "var(--color-success)",
  },
] as const;

interface PolicyAnalysis {
  summary: string;
  environmentalImpact: string;
  sustainabilityAnalysis: string;
  healthImpactAnalysis: string;
  longTermRecommendations: string[];
  governmentPolicyRecommendations: string[];
  estimatedTimeline: string;
  costBenefit: string;
}

interface ExecutiveScores {
  environmentalImpactScore: number;
  sustainabilityScore: number;
  policyEffectivenessScore: number;
  publicHealthImprovementScore: number;
  longTermBenefitScore: number;
  overallScore: number;
  verdict: "Highly Recommended" | "Recommended" | "Moderate Impact" | "Not Recommended";
}

interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  levers: Record<string, number>;
}

function Simulator() {
  const { city, isApiConnected } = useCity();
  const [vals, setVals] = useState<Record<string, number>>(
    Object.fromEntries(LEVERS.map((l) => [l.id, l.default])),
  );
  const [analysis, setAnalysis] = useState<PolicyAnalysis | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [executiveScores, setExecutiveScores] = useState<ExecutiveScores | null>(null);
  const [lastSimulationId, setLastSimulationId] = useState<string | null>(null);

  // Phase 5 — presets, comparison mode
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareBPresetId, setCompareBPresetId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{
    scenarioA: { name: string; results: Record<string, number>; executiveScores: ExecutiveScores };
    scenarioB: { name: string; results: Record<string, number>; executiveScores: ExecutiveScores };
    diff: Record<string, number>;
    narrative: { headline: string; recommendation: string; tradeoffs: string };
  } | null>(null);

  const presetsQuery = useQuery({
    queryKey: ["simulator-presets"],
    queryFn: () => simulatorApi.getPresets(),
    staleTime: 10 * 60 * 1000,
    enabled: isApiConnected,
  });
  const presets: ScenarioPreset[] = presetsQuery.data?.data?.presets ?? [];

  const localResults = useMemo(() => {
    const aqiDelta =
      -(vals.ev * 0.35) -
      vals.traffic * 0.6 -
      vals.trees * 0.04 +
      vals.industry * 0.8 -
      vals.renewable * 0.18 -
      vals.publicTransport * 0.22 -
      vals.wasteManagement * 0.05 -
      vals.greenArea * 0.1;
    const projectedAqi = Math.max(1, Math.round(city.aqi + aqiDelta));
    const health = Math.max(0, Math.min(100, Math.round(50 + (city.aqi - projectedAqi) * 0.6)));
    const eco = Math.max(
      0,
      Math.min(
        100,
        city.eco +
          Math.round(
            (vals.ev +
              vals.traffic +
              vals.trees * 0.1 -
              vals.industry * 1.5 +
              vals.renewable * 0.22 +
              vals.publicTransport * 0.14 +
              vals.wasteManagement * 0.12 +
              vals.greenArea * 0.2) /
              4,
          ),
      ),
    );
    const sustain = Math.max(
      0,
      Math.min(100, eco - 4 + Math.round(vals.trees / 25) + Math.round(vals.greenArea / 5)),
    );
    const carbon = Math.max(
      0,
      Math.round(
        (vals.ev * 0.02 +
          vals.traffic * 0.015 +
          vals.trees * 0.001 +
          vals.renewable * 0.03 +
          vals.publicTransport * 0.016 +
          vals.wasteManagement * 0.01 +
          vals.greenArea * 0.008) *
          10,
      ) / 10,
    );
    return { aqiDelta, projectedAqi, health, eco, sustain, carbon };
  }, [vals, city]);

  const runMutation = useMutation({
    mutationFn: () =>
      simulatorApi.run({
        cityId: city.id,
        levers: vals,
        presetId: activePresetId ?? undefined,
      }),

    onSuccess: (res) => {
      const payload = res.data;

      setAiInsight(payload?.aiInsight ?? null);
      setAnalysis(payload?.analysis ?? null);
      setExecutiveScores(payload?.executiveScores ?? null);

      if (payload?.simulation?._id) {
        setLastSimulationId(payload.simulation._id);
      } else {
        setLastSimulationId(null);
      }
      setTimeout(() => {
        document.getElementById("ai-analysis")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    },
  });
  const compareMutation = useMutation({
    mutationFn: () =>
      simulatorApi.compare({
        cityId: city.id,
        scenarioA: { name: "Current configuration", levers: vals },
        scenarioB: compareBPresetId
          ? {
              name: presets.find((p) => p.id === compareBPresetId)?.name,
              presetId: compareBPresetId,
            }
          : { name: "Alternative", levers: vals },
      }),
    onSuccess: (res) => {
      if (res.data) setComparison(res.data as typeof comparison & object);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      simulatorApi.exportPdf(
        lastSimulationId
          ? { simulationId: lastSimulationId }
          : { cityId: city.id, levers: vals, presetId: activePresetId ?? undefined },
      ),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `greenguard-simulation-${city.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  const applyPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setVals(Object.fromEntries(LEVERS.map((l) => [l.id, preset.levers[l.id] ?? l.default])));
    setAnalysis(null);
    setAiInsight(null);
    setExecutiveScores(null);
    setComparison(null);
  };

  const bars = LEVERS.map((l) => ({ k: l.label, v: vals[l.id], color: l.color }));
  const proj = Array.from({ length: 12 }).map((_, i) => ({
    m: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i],
    current: Math.round(city.aqi + Math.sin(i / 2) * 8),
    projected: Math.round(localResults.projectedAqi + Math.sin(i / 2) * 6),
  }));

  const handleReset = () => {
    setVals(Object.fromEntries(LEVERS.map((l) => [l.id, l.default])));
    setAnalysis(null);
    setAiInsight(null);
    setExecutiveScores(null);
    setActivePresetId(null);
    setComparison(null);
    setLastSimulationId(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Policy Simulator
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">
            What-if · <span className="text-aurora">{city.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quantify the AQI, health, and sustainability impact of policy levers before deploying.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="glass rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className={cn(
              "glass rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5",
              compareOpen && "ring-1 ring-primary/50",
            )}
          >
            <GitCompareArrows className="size-3.5" /> Compare
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || !isApiConnected}
            className="glass rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            title={
              !isApiConnected ? "Requires backend API" : "Export a PDF summary of this scenario"
            }
          >
            {exportMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export PDF
          </button>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || !isApiConnected}
            className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            title={!isApiConnected ? "Requires backend API" : undefined}
          >
            {runMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            {isApiConnected ? "Generate AI Strategy" : "Start backend to run AI"}
          </button>
        </div>
      </header>

      {/* Preset scenarios */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-1">
            Presets
          </span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              title={p.description}
              className={cn(
                "glass rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activePresetId === p.id
                  ? "ring-1 ring-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Comparison mode panel */}
      {compareOpen && (
        <Panel
          eyebrow="Scenario comparison"
          title={
            <div className="flex items-center gap-2">
              <GitCompareArrows className="size-4 text-primary" />
              Compare current configuration against a preset
            </div>
          }
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Scenario B — preset to compare against
              </label>
              <select
                value={compareBPresetId ?? ""}
                onChange={(e) => setCompareBPresetId(e.target.value || null)}
                className="mt-1 w-full glass rounded-lg px-3 py-2 text-sm bg-transparent"
              >
                <option value="">Select a preset…</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => compareMutation.mutate()}
              disabled={!compareBPresetId || compareMutation.isPending}
              className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {compareMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <GitCompareArrows className="size-3.5" />
              )}
              Run comparison
            </button>
          </div>

          {comparison && (
            <div className="mt-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <ComparisonCard
                  title={comparison.scenarioA.name}
                  results={comparison.scenarioA.results}
                  scores={comparison.scenarioA.executiveScores}
                />
                <ComparisonCard
                  title={comparison.scenarioB.name}
                  results={comparison.scenarioB.results}
                  scores={comparison.scenarioB.executiveScores}
                />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                <DiffStat label="AQI Δ" value={comparison.diff.aqiDifference} />
                <DiffStat label="EcoScore Δ" value={comparison.diff.ecoScoreDifference} positive />
                <DiffStat
                  label="Sustainability Δ"
                  value={comparison.diff.sustainabilityDifference}
                  positive
                />
                <DiffStat
                  label="Carbon Δ"
                  value={comparison.diff.carbonImpactDifference}
                  positive
                />
                <DiffStat
                  label="Health Δ"
                  value={comparison.diff.healthImpactDifference}
                  positive
                />
                <DiffStat label="Risk Δ" value={comparison.diff.riskScoreDifference} />
              </div>
              <div className="rounded-xl bg-muted/40 p-4 space-y-1.5">
                <p className="text-sm font-medium">{comparison.narrative.headline}</p>
                <p className="text-sm text-muted-foreground">
                  {comparison.narrative.recommendation}
                </p>
                <p className="text-xs text-muted-foreground">{comparison.narrative.tradeoffs}</p>
              </div>
            </div>
          )}
        </Panel>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Levers */}
        <Panel
          className="lg:col-span-4"
          eyebrow="Inputs"
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Policy levers
            </div>
          }
        >
          <div className="space-y-5 max-h-[640px] overflow-y-auto pr-1">
            {LEVERS.map((l) => (
              <div key={l.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="size-7 rounded-md grid place-items-center"
                      style={{
                        background: `color-mix(in oklab, ${l.color} 18%, transparent)`,
                        color: l.color,
                      }}
                    >
                      <l.icon className="size-3.5" />
                    </div>
                    {l.label}
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {vals[l.id]}
                    <span className="text-xs text-muted-foreground ml-0.5">{l.unit}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={l.max}
                  value={vals[l.id]}
                  onChange={(e) => setVals((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
                  className="mt-2 w-full"
                  style={{ accentColor: l.color }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0</span>
                  <span>
                    {l.max}
                    {l.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* KPIs */}
        <div className="lg:col-span-8 grid grid-cols-2 gap-4">
          <Panel eyebrow="AQI projection" title="Projected AQI">
            <div className="text-5xl font-semibold tabular-nums tracking-tight mt-1">
              {localResults.projectedAqi}
            </div>
            <div className="mt-3">
              <Pill tone={localResults.aqiDelta < 0 ? "success" : "destructive"}>
                {localResults.aqiDelta < 0 ? "▼" : "▲"}{" "}
                {Math.abs(Math.round(localResults.aqiDelta))} pts vs current ({city.aqi})
              </Pill>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Carbon reduction:{" "}
              <span className="font-medium tabular-nums">{localResults.carbon} tCO₂e</span>
            </div>
          </Panel>
          <Panel eyebrow="Health impact" title="Health index">
            <RadialGauge value={localResults.health} color="var(--color-info)" label="HII" />
          </Panel>
          <Panel eyebrow="EcoScore" title="Eco impact">
            <RadialGauge value={localResults.eco} color="var(--color-primary)" label="Eco" />
          </Panel>
          <Panel eyebrow="Sustainability" title="Sustainability index">
            <RadialGauge value={localResults.sustain} color="var(--color-success)" label="SI" />
          </Panel>
        </div>

        {/* Executive decision dashboard — Phase 5 */}
        {executiveScores && (
          <Panel
            className="lg:col-span-12"
            eyebrow="Executive decision support"
            title={
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Decision intelligence dashboard
              </div>
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Overall verdict
                </div>
                <div className="text-2xl font-semibold tracking-tight mt-1">
                  {executiveScores.verdict}
                </div>
              </div>
              <Pill
                tone={
                  executiveScores.verdict === "Highly Recommended"
                    ? "success"
                    : executiveScores.verdict === "Recommended"
                      ? "info"
                      : executiveScores.verdict === "Moderate Impact"
                        ? "warning"
                        : "destructive"
                }
              >
                Overall score {executiveScores.overallScore}/100
              </Pill>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ExecScoreCard
                label="Environmental impact"
                value={executiveScores.environmentalImpactScore}
              />
              <ExecScoreCard label="Sustainability" value={executiveScores.sustainabilityScore} />
              <ExecScoreCard
                label="Policy effectiveness"
                value={executiveScores.policyEffectivenessScore}
              />
              <ExecScoreCard
                label="Public health"
                value={executiveScores.publicHealthImprovementScore}
              />
              <ExecScoreCard
                label="Long-term benefit"
                value={executiveScores.longTermBenefitScore}
              />
            </div>
          </Panel>
        )}

        {/* 12-month trajectory */}
        <Panel
          className="lg:col-span-8"
          eyebrow="Projection"
          title="12-month AQI trajectory"
          action={
            <div className="text-[11px] text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-muted-foreground" />
                Baseline
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary" />
                Scenario
              </span>
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={proj}>
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
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Lever intensity chart */}
        <Panel className="lg:col-span-4" eyebrow="Inputs" title="Lever intensity">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={bars} layout="vertical">
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="k"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="v" radius={[0, 6, 6, 0]}>
                  {bars.map((b, i) => (
                    <Cell key={i} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* AI Analysis — full PolicyAnalysis panel, shown after running */}
        {analysis && (
          <div id="ai-analysis" className="lg:col-span-12">
            <Panel
              className="lg:col-span-12"
              eyebrow="Gemini AI · Policy Analysis"
              title={
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Strategic intelligence
                </div>
              }
            >
              <div className="grid md:grid-cols-4 gap-4">
                <MetricCard title="Projected AQI" value={localResults.projectedAqi} />

                <MetricCard title="Health Index" value={localResults.health} />

                <MetricCard title="Eco Score" value={localResults.eco} />

                <MetricCard title="Carbon Reduction" value={`${localResults.carbon} tCO₂e`} />
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 mt-5">
                <div className="text-xs uppercase tracking-wider text-primary">AI Verdict</div>

                <h3 className="text-xl font-bold mt-2">
                  {executiveScores?.verdict || "Recommended Policy Mix"}
                </h3>

                <p className="text-muted-foreground mt-3">{analysis.summary}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-5 mt-6">
                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="font-semibold mb-4">Long-Term Recommendations</h3>

                  <ul className="space-y-3">
                    {analysis.longTermRecommendations.map((r, i) => (
                      <li key={i} className="text-sm">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border/60 p-5">
                  <h3 className="font-semibold mb-4">Government Actions</h3>

                  <ul className="space-y-3">
                    {analysis.governmentPolicyRecommendations.map((r, i) => (
                      <li key={i} className="text-sm">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  <div className="rounded-xl bg-muted/40 p-5">
                    <div className="text-xs text-muted-foreground">IMPLEMENTATION TIMELINE</div>

                    <div className="mt-2">{analysis.estimatedTimeline}</div>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-5">
                    <div className="text-xs text-muted-foreground">COST BENEFIT</div>

                    <div className="mt-2">{analysis.costBenefit}</div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* Fallback AI insight string if analysis not yet available but string is */}
        {!analysis && aiInsight && (
          <Panel
            className="lg:col-span-12"
            eyebrow="Gemini AI"
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Policy insight
              </div>
            }
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{aiInsight}</p>
          </Panel>
        )}

        {/* Embedded What-If Scenario Simulator */}
        <ScenarioSimulator city={city} isApiConnected={isApiConnected} />
      </div>
    </div>
  );
}

function RadialGauge({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="relative h-40">
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={[{ name: label, v: value, fill: color }]}
          startAngle={210}
          endAngle={-30}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={
              {
                fill: "color-mix(in oklab, var(--color-muted-foreground) 18%, transparent)",
              } as object
            }
            dataKey="v"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {label} score
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ElementType;
  label: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Phase 5 helper components ────────────────────────────────────────────

function ExecScoreCard({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75
      ? "var(--color-success)"
      : value >= 55
        ? "var(--color-info)"
        : value >= 35
          ? "var(--color-warning)"
          : "var(--color-destructive)";
  return (
    <div className="rounded-xl bg-muted/40 p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  results,
  scores,
}: {
  title: string;
  results: Record<string, number>;
  scores: { overallScore: number; verdict: string };
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <Pill
          tone={
            scores.verdict === "Highly Recommended"
              ? "success"
              : scores.verdict === "Recommended"
                ? "info"
                : scores.verdict === "Moderate Impact"
                  ? "warning"
                  : "destructive"
          }
        >
          {scores.overallScore}/100
        </Pill>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">AQI</span>{" "}
          <span className="font-medium tabular-nums">{results.projectedAqi}</span>
        </div>
        <div>
          <span className="text-muted-foreground">EcoScore</span>{" "}
          <span className="font-medium tabular-nums">{results.projectedEcoScore}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Sustainability</span>{" "}
          <span className="font-medium tabular-nums">{results.sustainabilityIndex}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Carbon</span>{" "}
          <span className="font-medium tabular-nums">{results.carbonReductionTons} tCO₂e</span>
        </div>
      </div>
    </div>
  );
}

function DiffStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  const isGood = positive ? value > 0 : value < 0;
  const color =
    value === 0
      ? "var(--color-muted-foreground)"
      : isGood
        ? "var(--color-success)"
        : "var(--color-destructive)";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums mt-0.5" style={{ color }}>
        {value > 0 ? "+" : ""}
        {value}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="text-xs text-muted-foreground">{title}</div>

      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}
