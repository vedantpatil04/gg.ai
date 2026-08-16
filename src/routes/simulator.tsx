import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Pill } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { simulatorApi } from "@/lib/api/services.api";
import { downloadBlob } from "@/lib/download-file";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Car,
  TreePine,
  Factory,
  Sparkles,
  RotateCcw,
  Loader2,
  Heart,
  Leaf,
  Zap,
  Bus,
  Recycle,
  Trees,
  Download,
  GitCompareArrows,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  MapPin,
  ChevronRight,
  Activity,
  Wind,
  CheckCircle2,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Minus,
  BarChart2,
  AlertCircle,
  Clock,
  FileDown,
  Zap as ZapIcon,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [{ title: "Policy Simulator — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <Simulator />
    </AppLayout>
  ),
});

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVERS = [
  { id: "ev", label: "EV adoption", icon: Car, max: 100, unit: "%", default: 22, color: "var(--color-info)", group: "transport" },
  { id: "traffic", label: "Traffic reduction", icon: Car, max: 60, unit: "%", default: 12, color: "var(--color-primary)", group: "transport" },
  { id: "publicTransport", label: "Public transport usage", icon: Bus, max: 100, unit: "%", default: 15, color: "var(--color-primary)", group: "transport" },
  { id: "trees", label: "Tree plantation", icon: TreePine, max: 500, unit: "k/yr", default: 84, color: "var(--color-success)", group: "environment" },
  { id: "greenArea", label: "Green area expansion", icon: Trees, max: 50, unit: "%", default: 10, color: "var(--color-success)", group: "environment" },
  { id: "renewable", label: "Renewable energy adoption", icon: Zap, max: 100, unit: "%", default: 20, color: "var(--color-info)", group: "energy" },
  { id: "wasteManagement", label: "Waste management efficiency", icon: Recycle, max: 100, unit: "%", default: 30, color: "var(--color-success)", group: "energy" },
  { id: "industry", label: "Industrial growth", icon: Factory, max: 30, unit: "%", default: 8, color: "var(--color-warning)", group: "industry" },
] as const;

type LeverId = (typeof LEVERS)[number]["id"];

const LEVER_GROUPS = [
  { id: "transport", label: "Transportation", icon: Car },
  { id: "environment", label: "Environment", icon: TreePine },
  { id: "energy", label: "Energy & Waste", icon: Zap },
  { id: "industry", label: "Industry", icon: Factory },
] as const;

const DEFAULT_VALS: Record<string, number> = Object.fromEntries(LEVERS.map((l) => [l.id, l.default]));
const MONTHS_SHORT = ["J","F","M","A","M","J","J","A","S","O","N","D"] as const;

const AQI_BANDS = [
  { max: 50,       label: "Excellent", color: "var(--color-success)",    bg: "color-mix(in oklab, var(--color-success) 12%, transparent)" },
  { max: 100,      label: "Good",      color: "var(--color-info)",       bg: "color-mix(in oklab, var(--color-info) 12%, transparent)" },
  { max: 150,      label: "Moderate",  color: "var(--color-warning)",    bg: "color-mix(in oklab, var(--color-warning) 12%, transparent)" },
  { max: 200,      label: "Poor",      color: "var(--color-destructive)", bg: "color-mix(in oklab, var(--color-destructive) 12%, transparent)" },
  { max: Infinity, label: "Severe",    color: "oklch(0.45 0.2 15)",      bg: "color-mix(in oklab, oklch(0.45 0.2 15) 12%, transparent)" },
] as const;

function getAqiBand(aqi: number) {
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

type SimStatus = "recalculating" | "ready" | "optimized";

// AI workflow states
type AiState =
  | "idle"           // never run
  | "stale"          // ran but levers changed
  | "generating"     // running now
  | "success"        // just succeeded
  | "error";         // failed

// Action feedback states
type ExportState = "idle" | "pending" | "success" | "error";

// ─── Pure calculation engine ──────────────────────────────────────────────────

function computeResults(vals: Record<string, number>, cityAqi: number, cityEco: number) {
  const aqiDelta =
    -(vals.ev * 0.35) - vals.traffic * 0.6 - vals.trees * 0.04 +
    vals.industry * 0.8 - vals.renewable * 0.18 - vals.publicTransport * 0.22 -
    vals.wasteManagement * 0.05 - vals.greenArea * 0.1;
  const projectedAqi = Math.max(1, Math.round(cityAqi + aqiDelta));
  const health = Math.max(0, Math.min(100, Math.round(50 + (cityAqi - projectedAqi) * 0.6)));
  const eco = Math.max(0, Math.min(100,
    cityEco + Math.round((vals.ev + vals.traffic + vals.trees * 0.1 - vals.industry * 1.5 +
      vals.renewable * 0.22 + vals.publicTransport * 0.14 +
      vals.wasteManagement * 0.12 + vals.greenArea * 0.2) / 4),
  ));
  const sustain = Math.max(0, Math.min(100, eco - 4 + Math.round(vals.trees / 25) + Math.round(vals.greenArea / 5)));
  const carbon = Math.max(0,
    Math.round((vals.ev * 0.02 + vals.traffic * 0.015 + vals.trees * 0.001 +
      vals.renewable * 0.03 + vals.publicTransport * 0.016 +
      vals.wasteManagement * 0.01 + vals.greenArea * 0.008) * 10) / 10,
  );
  return { aqiDelta, projectedAqi, health, eco, sustain, carbon };
}

function topContributor(vals: Record<string, number>): string {
  const contributions = [
    { label: "EV adoption",           score: vals.ev * 0.35 },
    { label: "Traffic reduction",     score: vals.traffic * 0.6 },
    { label: "Public transport",      score: vals.publicTransport * 0.22 },
    { label: "Tree plantation",       score: vals.trees * 0.04 },
    { label: "Green area expansion",  score: vals.greenArea * 0.1 },
    { label: "Renewable energy",      score: vals.renewable * 0.18 },
    { label: "Waste management",      score: vals.wasteManagement * 0.05 },
  ];
  return contributions.sort((a, b) => b.score - a.score)[0]?.label ?? "—";
}

// ─── useAnimatedValue ─────────────────────────────────────────────────────────

function useAnimatedValue(target: number, duration = 340): number {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const prevTargetRef = useRef(target);
  useEffect(() => {
    if (target === prevTargetRef.current) return;
    prevTargetRef.current = target;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      fromRef.current = val;
      setCurrent(val);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = target; setCurrent(target); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return current;
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

const AnimatedNumber = memo(function AnimatedNumber({
  value, duration = 480, decimals = 0,
}: { value: number; duration?: number; decimals?: number }) {
  const animated = useAnimatedValue(value, duration);
  return <>{decimals > 0 ? animated.toFixed(decimals) : Math.round(animated)}</>;
});

// ─── useEntranceAnimation ─────────────────────────────────────────────────────

function useEntranceAnimation() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);
  return visible;
}

// ─── useSimStatus ─────────────────────────────────────────────────────────────

function useSimStatus(vals: Record<string, number>): SimStatus {
  const [status, setStatus] = useState<SimStatus>("ready");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setStatus("recalculating");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("ready"), 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [vals]);
  return status;
}

// ─── useAiTimestamp ──────────────────────────────────────────────────────────

function useAiTimestamp(successFlag: boolean): string | null {
  const [ts, setTs] = useState<string | null>(null);
  useEffect(() => {
    if (successFlag) {
      const now = new Date();
      setTs(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }, [successFlag]);
  return ts;
}

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────

function SimTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap z-50 opacity-0 translate-y-1 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:translate-y-0"
        style={{
          background: "var(--color-popover)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
          boxShadow: "0 4px 16px -4px oklch(0 0 0 / 0.2)",
        }}
        role="tooltip"
      >
        {label}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-1 overflow-hidden"
          aria-hidden
        >
          <div
            className="w-2 h-2 rotate-45 -translate-y-1/2"
            style={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── SVG ArcGauge ─────────────────────────────────────────────────────────────

const ArcGauge = memo(function ArcGauge({
  value, color, label, size = 120,
}: { value: number; color: string; label: string; size?: number }) {
  const animatedVal = useAnimatedValue(value, 550);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.065;
  const startAngle = -220;
  const endAngle = 40;
  const totalArc = endAngle - startAngle;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(fromDeg: number, toDeg: number, radius: number) {
    const start = polarToXY(fromDeg, radius);
    const end = polarToXY(toDeg, radius);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const progressAngle = startAngle + (Math.min(100, Math.max(0, animatedVal)) / 100) * totalArc;
  const trackPath = arcPath(startAngle, endAngle, r);
  const fillPath = animatedVal > 0 ? arcPath(startAngle, progressAngle, r) : "";
  const thumbPos = animatedVal > 0 ? polarToXY(progressAngle, r) : null;

  return (
    <div className="relative" style={{ width: size, height: size * 0.82 }}>
      <svg
        width={size}
        height={size * 0.82}
        viewBox={`0 0 ${size} ${size * 0.82}`}
        aria-label={`${label}: ${Math.round(value)} of 100`}
        role="img"
      >
        <defs>
          <linearGradient id={`gauge-grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={trackPath} fill="none" stroke="color-mix(in oklab, var(--color-muted-foreground) 18%, transparent)" strokeWidth={strokeW} strokeLinecap="round" />
        {fillPath && <path d={fillPath} fill="none" stroke={`url(#gauge-grad-${label})`} strokeWidth={strokeW} strokeLinecap="round" />}
        {thumbPos && animatedVal > 1 && (
          <circle cx={thumbPos.x} cy={thumbPos.y} r={strokeW * 0.65} fill={color} stroke="var(--color-background)" strokeWidth={1.5} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: size * 0.06 }}>
        <span className="text-2xl font-bold tabular-nums tracking-tight leading-none" style={{ color }}>
          <AnimatedNumber value={value} duration={500} />
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">{label}</span>
      </div>
    </div>
  );
});

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("sim-skeleton rounded-lg", className)} />;
}

// ─── MobileLiveImpactPanel ────────────────────────────────────────────────────
// Mobile-only sticky panel that stays visible while the user scrolls through
// policy levers, showing the most important simulation metrics at a glance.

const MobileLiveImpactPanel = memo(function MobileLiveImpactPanel({
  localResults,
  currentAqi,
  simStatus,
}: {
  localResults: { projectedAqi: number; aqiDelta: number; health: number; eco: number; sustain: number; carbon: number };
  currentAqi: number;
  simStatus: SimStatus;
}) {
  const band = getAqiBand(localResults.projectedAqi);
  const isImprovement = localResults.aqiDelta < 0;
  const deltaPts = Math.abs(Math.round(localResults.aqiDelta));
  const [collapsed, setCollapsed] = useState(false);

  // Scroll the page to the full results section
  const handleViewFull = () => {
    document.getElementById("sim-results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className={`sim-mobile-sticky-panel lg:hidden`}
      role="region"
      aria-label="Live simulation results"
      aria-live="polite"
    >
      <button
        className="sim-mobile-sticky-collapse-btn"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand live impact panel" : "Collapse live impact panel"}
        aria-expanded={!collapsed}
      >
        <span className="sim-mobile-sticky-header">
          <span className="sim-mobile-sticky-title">
            <span
              className="sim-mobile-sticky-dot"
              style={{ background: simStatus === "recalculating" ? "var(--color-warning)" : band.color }}
              aria-hidden
            />
            LIVE SIMULATION
          </span>
          <ChevronUp
            className={`sim-mobile-sticky-chevron ${collapsed ? "sim-mobile-sticky-chevron-down" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {!collapsed && (
        <div className="sim-mobile-sticky-body">
          {/* 2×2 grid on narrow phones (≤430px), 4-column row on wider mobile */}
          <div className="sim-mobile-sticky-metrics-grid">
            {/* AQI with inline delta */}
            <div className="sim-mobile-sticky-metric">
              <span className="sim-mobile-sticky-metric-label">AQI</span>
              <div className="sim-mobile-sticky-metric-row">
                <span className="sim-mobile-sticky-metric-value" style={{ color: band.color }}>
                  <AnimatedNumber value={localResults.projectedAqi} duration={400} />
                </span>
                <span
                  className="sim-mobile-sticky-metric-delta"
                  style={{ color: isImprovement ? "var(--color-success)" : "var(--color-destructive)" }}
                >
                  {isImprovement ? "↓" : "↑"}{deltaPts}
                </span>
              </div>
            </div>
            {/* Health */}
            <div className="sim-mobile-sticky-metric">
              <span className="sim-mobile-sticky-metric-label">Health</span>
              <div className="sim-mobile-sticky-metric-row">
                <span className="sim-mobile-sticky-metric-value" style={{ color: "var(--color-info)" }}>
                  <AnimatedNumber value={localResults.health} duration={400} />
                </span>
                <span className="sim-mobile-sticky-metric-delta">/100</span>
              </div>
            </div>
            {/* Eco */}
            <div className="sim-mobile-sticky-metric">
              <span className="sim-mobile-sticky-metric-label">Eco</span>
              <div className="sim-mobile-sticky-metric-row">
                <span className="sim-mobile-sticky-metric-value" style={{ color: "var(--color-primary)" }}>
                  <AnimatedNumber value={localResults.eco} duration={400} />
                </span>
                <span className="sim-mobile-sticky-metric-delta">/100</span>
              </div>
            </div>
            {/* Sustainability */}
            <div className="sim-mobile-sticky-metric">
              <span className="sim-mobile-sticky-metric-label">SI</span>
              <div className="sim-mobile-sticky-metric-row">
                <span className="sim-mobile-sticky-metric-value" style={{ color: "var(--color-success)" }}>
                  <AnimatedNumber value={localResults.sustain} duration={400} />
                </span>
                <span className="sim-mobile-sticky-metric-delta">/100</span>
              </div>
            </div>
          </div>
          <button
            className="sim-mobile-sticky-view-btn"
            onClick={handleViewFull}
            aria-label="View full simulation results"
          >
            View full impact →
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Simulator ───────────────────────────────────────────────────────────────

function Simulator() {
  const { city, isApiConnected } = useCity();
  const visible = useEntranceAnimation();

  const [vals, setVals] = useState<Record<string, number>>({ ...DEFAULT_VALS });
  const [analysis, setAnalysis] = useState<PolicyAnalysis | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [executiveScores, setExecutiveScores] = useState<ExecutiveScores | null>(null);
  const [lastSimulationId, setLastSimulationId] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [recentlyActivatedLeverIds, setRecentlyActivatedLeverIds] = useState<Set<string>>(new Set());

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareBPresetId, setCompareBPresetId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{
    scenarioA: { name: string; results: Record<string, number>; executiveScores: ExecutiveScores };
    scenarioB: { name: string; results: Record<string, number>; executiveScores: ExecutiveScores };
    diff: Record<string, number>;
    narrative: { headline: string; recommendation: string; tradeoffs: string };
  } | null>(null);

  const [aiState, setAiState] = useState<AiState>("idle");
  const [exportState, setExportState] = useState<ExportState>("idle");
  const aiRunValsRef = useRef<Record<string, number> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simStatus = useSimStatus(vals);
  const aiTimestamp = useAiTimestamp(aiState === "success");

  const presetsQuery = useQuery({
    queryKey: ["simulator-presets"],
    queryFn: () => simulatorApi.getPresets(),
    staleTime: 10 * 60 * 1000,
    enabled: isApiConnected,
  });
  const presets: ScenarioPreset[] = presetsQuery.data?.data?.presets ?? [];

  const localResults = useMemo(() => computeResults(vals, city.aqi, city.eco), [vals, city.aqi, city.eco]);

  const proj = useMemo(
    () => MONTHS_SHORT.map((ms, i) => ({
      ms,
      current: Math.round(city.aqi + Math.sin(i / 2) * 8),
      projected: Math.round(localResults.projectedAqi + Math.sin(i / 2) * 6),
    })),
    [city.aqi, localResults.projectedAqi],
  );

  const bars = useMemo(
    () => LEVERS.map((l) => ({ k: l.label, v: vals[l.id], color: l.color, unit: l.unit, max: l.max })),
    [vals],
  );

  const topLever = useMemo(() => topContributor(vals), [vals]);

  // Stale AI detection
  useEffect(() => {
    if (aiRunValsRef.current !== null && (analysis !== null || aiInsight !== null)) {
      const changed = LEVERS.some((l) => aiRunValsRef.current![l.id] !== vals[l.id]);
      if (changed && aiState !== "stale") setAiState("stale");
    }
  }, [vals, analysis, aiInsight, aiState]);

  const handleLeverChange = useCallback((id: string, value: number) => {
    setVals((prev) => prev[id] === value ? prev : { ...prev, [id]: value });
  }, []);

  const runMutation = useMutation({
    mutationFn: () => simulatorApi.run({ cityId: city.id, levers: vals, presetId: activePresetId ?? undefined }),
    onMutate: () => { setAiState("generating"); },
    onSuccess: (res) => {
      const payload = res.data;
      setAiInsight(payload?.aiInsight ?? null);
      setAnalysis(payload?.analysis ?? null);
      setExecutiveScores(payload?.executiveScores ?? null);
      setLastSimulationId(payload?.simulation?._id ?? null);
      aiRunValsRef.current = { ...vals };
      setAiState("success");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setAiState((s) => s === "success" ? "idle" : s);
      }, 4000);
      setTimeout(() => {
        document.getElementById("ai-analysis")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    },
    onError: () => { setAiState("error"); },
  });

  const compareMutation = useMutation({
    mutationFn: () => simulatorApi.compare({
      cityId: city.id,
      scenarioA: { name: "Current configuration", levers: vals },
      scenarioB: compareBPresetId
        ? { name: presets.find((p) => p.id === compareBPresetId)?.name, presetId: compareBPresetId }
        : { name: "Alternative", levers: vals },
    }),
    onSuccess: (res) => { if (res.data) setComparison(res.data as typeof comparison & object); },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await simulatorApi.exportPdf(
        lastSimulationId
          ? { simulationId: lastSimulationId }
          : { cityId: city.id, levers: vals, presetId: activePresetId ?? undefined },
      );
      // Resolves only once the file is actually saved (see
      // download-file.ts), so onSuccess below only ever reflects a genuine
      // download rather than just that a click was dispatched.
      await downloadBlob(blob, `greenguard-simulation-${city.id}.pdf`);
    },
    onMutate: () => { setExportState("pending"); },
    onSuccess: () => {
      setExportState("success");
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
      exportTimerRef.current = setTimeout(() => setExportState("idle"), 3000);
    },
    onError: () => {
      setExportState("error");
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
      exportTimerRef.current = setTimeout(() => setExportState("idle"), 3000);
    },
  });

  const applyPreset = useCallback((preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    const newVals = Object.fromEntries(LEVERS.map((l) => [l.id, preset.levers[l.id] ?? l.default]));
    // Detect which levers actually change so we can highlight them
    const changed = new Set(LEVERS.filter((l) => newVals[l.id] !== vals[l.id]).map((l) => l.id));
    setVals(newVals);
    setRecentlyActivatedLeverIds(changed);
    setAnalysis(null);
    setAiInsight(null);
    setExecutiveScores(null);
    setComparison(null);
    if (aiState !== "idle") setAiState("stale");
    aiRunValsRef.current = null;
    // Clear highlights after animation
    setTimeout(() => setRecentlyActivatedLeverIds(new Set()), 1800);
  }, [vals, aiState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = useCallback(() => {
    setVals({ ...DEFAULT_VALS });
    setAnalysis(null);
    setAiInsight(null);
    setExecutiveScores(null);
    setActivePresetId(null);
    setComparison(null);
    setLastSimulationId(null);
    setAiState("idle");
    setExportState("idle");
    setRecentlyActivatedLeverIds(new Set());
    aiRunValsRef.current = null;
  }, []);

  // Cleanup timers
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
  }, []);

  return (
    <div className={cn("min-h-screen transition-opacity duration-700 sim-page-root", visible ? "opacity-100" : "opacity-0")}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl" style={{ background: "var(--color-primary)" }} />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-3xl" style={{ background: "var(--color-info)" }} />
      </div>

      {/* Mobile-only sticky live impact panel */}
      <MobileLiveImpactPanel
        localResults={localResults}
        currentAqi={city.aqi}
        simStatus={simStatus}
      />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-[1680px] mx-auto space-y-6 lg:space-y-8 sim-page-content">
        <SimulatorHeader
          city={city}
          isApiConnected={isApiConnected}
          compareOpen={compareOpen}
          aiState={aiState}
          simStatus={simStatus}
          aiTimestamp={aiTimestamp}
          exportState={exportState}
          onReset={handleReset}
          onToggleCompare={() => setCompareOpen((v) => !v)}
          onExport={() => exportMutation.mutate()}
          onRun={() => runMutation.mutate()}
        />

        {presets.length > 0 && (
          <PresetSection presets={presets} activePresetId={activePresetId} onApply={applyPreset} />
        )}

        {compareOpen && (
          <ComparePanel
            presets={presets}
            compareBPresetId={compareBPresetId}
            onSelectPreset={setCompareBPresetId}
            onRunCompare={() => compareMutation.mutate()}
            isRunning={compareMutation.isPending}
            comparison={comparison}
          />
        )}

        {/* Main simulator grid — desktop: side-by-side, mobile: stacked */}
        <div className="grid xl:grid-cols-12 gap-5 lg:gap-6">
          {/* Policy levers — mobile: first (top), desktop: left column */}
          <div className="xl:col-span-4 2xl:col-span-3">
            <LeversPanel
              vals={vals}
              onLeverChange={handleLeverChange}
              simStatus={simStatus}
              recentlyActivatedLeverIds={recentlyActivatedLeverIds}
            />
          </div>

          {/* Results — desktop: right columns, mobile: second (below levers) */}
          <div id="sim-results-section" className="xl:col-span-8 2xl:col-span-9 space-y-5 lg:space-y-6">
            {/* KPI cards: mobile = full-width AQI + 2-col gauges, desktop (lg) = 4-col row */}
            <div className="sim-kpi-grid">
              <HeroAqiCard
                projectedAqi={localResults.projectedAqi}
                aqiDelta={localResults.aqiDelta}
                currentAqi={city.aqi}
                carbon={localResults.carbon}
                isRecalculating={simStatus === "recalculating"}
              />
              <GaugeKpiCard eyebrow="Health impact" title="Health Index" value={localResults.health} color="var(--color-info)" label="HII" icon={Heart} isRecalculating={simStatus === "recalculating"} tooltip="Estimated population health improvement based on AQI reduction" />
              <GaugeKpiCard eyebrow="Eco score" title="Eco Impact" value={localResults.eco} color="var(--color-primary)" label="Eco" icon={Leaf} isRecalculating={simStatus === "recalculating"} tooltip="Combined environmental benefit score across all active levers" />
              <GaugeKpiCard eyebrow="Sustainability" title="Sustainability" value={localResults.sustain} color="var(--color-success)" label="SI" icon={Wind} isRecalculating={simStatus === "recalculating"} tooltip="Long-term sustainability index derived from eco score and green infrastructure" />
            </div>

            <SimulationSummary
              localResults={localResults}
              currentAqi={city.aqi}
              topLever={topLever}
              isRecalculating={simStatus === "recalculating"}
            />

            {executiveScores && <ExecutiveDashboard executiveScores={executiveScores} />}

            <div className="grid lg:grid-cols-8 gap-5">
              <TrajectoryChart className="lg:col-span-5" proj={proj} currentAqi={city.aqi} />
              <LeverIntensityChart className="lg:col-span-3" bars={bars} />
            </div>
          </div>
        </div>

        {/* AI generation loading skeleton */}
        {aiState === "generating" && !analysis && (
          <AiLoadingState />
        )}

        {analysis && (
          <div id="ai-analysis">
            <AiAnalysisPanel analysis={analysis} localResults={localResults} executiveScores={executiveScores} aiTimestamp={aiTimestamp} />
          </div>
        )}
        {!analysis && aiInsight && <AiInsightPanel aiInsight={aiInsight} />}
      </div>
    </div>
  );
}

// ─── SimulatorHeader ──────────────────────────────────────────────────────────

const SimulatorHeader = memo(function SimulatorHeader({
  city, isApiConnected, compareOpen, aiState, simStatus, aiTimestamp,
  exportState, onReset, onToggleCompare, onExport, onRun,
}: {
  city: { name: string };
  isApiConnected: boolean;
  compareOpen: boolean;
  aiState: AiState;
  simStatus: SimStatus;
  aiTimestamp: string | null;
  exportState: ExportState;
  onReset: () => void;
  onToggleCompare: () => void;
  onExport: () => void;
  onRun: () => void;
}) {
  const aiDisabled = !isApiConnected || aiState === "generating";

  const aiLabel =
    aiState === "generating" ? "Generating…"
    : aiState === "stale"     ? "Regenerate AI Strategy"
    : aiState === "success"   ? "Strategy Generated"
    : aiState === "error"     ? "Retry AI Strategy"
    : "Generate AI Strategy";

  const aiTooltip =
    !isApiConnected         ? "Start the backend to use AI"
    : aiState === "stale"   ? "Policy levers changed — regenerate to update strategy"
    : aiState === "success" ? `Generated at ${aiTimestamp ?? "just now"}`
    : aiState === "error"   ? "Generation failed — click to retry"
    : "Analyse your policy mix with Gemini AI";

  const exportLabel =
    exportState === "pending" ? "Exporting…"
    : exportState === "success" ? "Exported!"
    : exportState === "error"   ? "Export failed"
    : "Export PDF";

  return (
    <header className="sim-header flex flex-wrap items-start justify-between gap-4 lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5 sim-eyebrow">
            <Activity className="size-3 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Policy Simulator</span>
          </div>
          <span className="text-muted-foreground/30 text-[10px]">·</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="size-3" />
            <span className="font-medium">{city.name}</span>
          </div>
          <span className="text-muted-foreground/30 text-[10px] hidden sm:inline">·</span>
          <div className="hidden sm:block">
            <SimStatusBadge status={simStatus} aiState={aiState} />
          </div>
        </div>
        <h1 className="sim-page-title text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-none">
          What-if <span className="text-aurora">{city.name}</span>
        </h1>
        <p className="sim-subtitle mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed hidden sm:block">
          Quantify the AQI, health, and sustainability impact of policy levers before deploying.
        </p>
      </div>

      {/* Action buttons — responsive: wraps on mobile */}
      <div className="sim-toolbar sim-toolbar-responsive">
        {/* Secondary actions row */}
        <div className="sim-toolbar-secondary">
          <SimTooltip label="Restore all levers to defaults">
            <button
              onClick={onReset}
              className="sim-btn sim-btn-ghost sim-btn-ripple inline-flex items-center gap-1.5 rounded-lg px-3 sm:px-3.5 py-2 text-xs font-medium"
              aria-label="Reset all policy levers to defaults"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset</span>
            </button>
          </SimTooltip>

          <SimTooltip label={compareOpen ? "Close comparison mode" : "Compare two policy scenarios side-by-side"}>
            <button
              onClick={onToggleCompare}
              className={cn(
                "sim-btn sim-btn-ghost sim-btn-ripple inline-flex items-center gap-1.5 rounded-lg px-3 sm:px-3.5 py-2 text-xs font-medium",
                compareOpen && "sim-btn-active",
              )}
              aria-pressed={compareOpen}
              aria-label="Toggle scenario comparison"
            >
              <GitCompareArrows className="size-3.5" />
              <span>Compare</span>
              {compareOpen && <span className="sim-active-dot" aria-hidden />}
            </button>
          </SimTooltip>

          <SimTooltip label={!isApiConnected ? "Start backend to export" : "Download a PDF summary of this scenario"}>
            <button
              onClick={onExport}
              disabled={exportState === "pending" || !isApiConnected}
              className={cn(
                "sim-btn sim-btn-ghost sim-btn-ripple inline-flex items-center gap-1.5 rounded-lg px-3 sm:px-3.5 py-2 text-xs font-medium",
                exportState === "success" && "sim-btn-success",
                exportState === "error" && "sim-btn-error",
              )}
              aria-label={exportLabel}
              aria-busy={exportState === "pending"}
            >
              {exportState === "pending"
                ? <Loader2 className="size-3.5 animate-spin" />
                : exportState === "success"
                  ? <CheckCircle2 className="size-3.5" />
                  : exportState === "error"
                    ? <AlertCircle className="size-3.5" />
                    : <FileDown className="size-3.5" />}
              <span className="hidden sm:inline">{exportLabel}</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </SimTooltip>
        </div>

        {/* Primary CTA — always full-width on xs, auto on sm+ */}
        <SimTooltip label={aiTooltip}>
          <button
            onClick={onRun}
            disabled={aiDisabled}
            className={cn(
              "sim-btn-primary sim-btn-ripple inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold w-full sm:w-auto",
              aiState === "stale" && "sim-ai-stale",
              aiState === "success" && "sim-ai-success",
              aiState === "error" && "sim-ai-error",
            )}
            aria-label={aiLabel}
            aria-busy={aiState === "generating"}
          >
            {aiState === "generating"
              ? <Loader2 className="size-3.5 animate-spin" />
              : aiState === "success"
                ? <CheckCircle2 className="size-3.5" />
                : aiState === "error"
                  ? <AlertCircle className="size-3.5" />
                  : aiState === "stale"
                    ? <ZapIcon className="size-3.5 animate-pulse" />
                    : <Sparkles className="size-3.5" />}
            <span>{aiLabel}</span>
          </button>
        </SimTooltip>
      </div>

      {/* Stale AI warning bar */}
      {aiState === "stale" && (
        <div className="w-full sim-stale-bar flex items-center gap-2 rounded-xl px-4 py-2.5 sim-panel-enter">
          <AlertCircle className="size-3.5 shrink-0" style={{ color: "var(--color-warning)" }} />
          <span className="text-xs" style={{ color: "var(--color-warning)" }}>
            Policy levers changed since last generation. Click <strong>Regenerate AI Strategy</strong> to update.
          </span>
          {aiTimestamp && (
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="size-3" />
              Last run {aiTimestamp}
            </span>
          )}
        </div>
      )}
    </header>
  );
});

// ─── SimStatusBadge ───────────────────────────────────────────────────────────

const SimStatusBadge = memo(function SimStatusBadge({
  status, aiState,
}: { status: SimStatus; aiState: AiState }) {
  const isRecalc = status === "recalculating";
  const isGenerating = aiState === "generating";

  const label = isGenerating ? "Generating strategy…"
    : isRecalc ? "Recalculating…"
    : status === "optimized" ? "Optimized"
    : "Simulation ready";

  const color = isGenerating ? "var(--color-primary)"
    : isRecalc ? "var(--color-warning)"
    : status === "optimized" ? "var(--color-success)"
    : "var(--color-success)";

  return (
    <div
      className="flex items-center gap-1 text-[10px] font-medium transition-colors duration-300"
      style={{ color }}
      aria-live="polite"
      aria-label={label}
    >
      {isGenerating || isRecalc
        ? <RefreshCw className="size-3 animate-spin" />
        : <CheckCircle2 className="size-3" />}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
});

// ─── PresetSection ────────────────────────────────────────────────────────────

const PresetSection = memo(function PresetSection({
  presets, activePresetId, onApply,
}: {
  presets: ScenarioPreset[];
  activePresetId: string | null;
  onApply: (preset: ScenarioPreset) => void;
}) {
  return (
    <div className="sim-preset-section sim-preset-section-responsive" role="group" aria-label="Scenario presets">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground shrink-0 mr-0.5 sim-preset-label" aria-hidden>Presets</span>
      <div className="sim-preset-chips-rail">
        {presets.map((p, i) => (
          <SimTooltip key={p.id} label={p.description || p.name}>
            <button
              onClick={() => onApply(p)}
              aria-pressed={activePresetId === p.id}
              aria-label={`Apply preset: ${p.name}`}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "sim-preset-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0",
                activePresetId === p.id ? "sim-preset-chip-active" : "sim-preset-chip-idle",
              )}
            >
              {p.name}
              {activePresetId === p.id && <ChevronRight className="size-3" />}
            </button>
          </SimTooltip>
        ))}
      </div>
    </div>
  );
});

// ─── ComparePanel ─────────────────────────────────────────────────────────────

function ComparePanel({
  presets, compareBPresetId, onSelectPreset, onRunCompare, isRunning, comparison,
}: {
  presets: ScenarioPreset[];
  compareBPresetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onRunCompare: () => void;
  isRunning: boolean;
  comparison: {
    scenarioA: { name: string; results: Record<string, number>; executiveScores: ExecutiveScores };
    scenarioB: { name: string; results: Record<string, number>; executiveScores: ExecutiveScores };
    diff: Record<string, number>;
    narrative: { headline: string; recommendation: string; tradeoffs: string };
  } | null;
}) {
  return (
    <div className="sim-panel sim-panel-enter rounded-2xl p-5 lg:p-6 space-y-5 sim-compare-panel">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg sim-icon-badge grid place-items-center">
          <GitCompareArrows className="size-4 text-primary" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Scenario comparison</div>
          <div className="text-sm font-semibold tracking-tight mt-0.5">Compare current configuration against a preset</div>
        </div>
        <div className="ml-auto">
          <span className="sim-compare-active-badge inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Compare mode active
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5" htmlFor="compare-preset-select">
            Scenario B — preset to compare against
          </label>
          <select
            id="compare-preset-select"
            value={compareBPresetId ?? ""}
            onChange={(e) => onSelectPreset(e.target.value || null)}
            className="sim-select w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select a preset…</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button
          onClick={onRunCompare}
          disabled={!compareBPresetId || isRunning}
          className="sim-btn-primary sim-btn-ripple inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isRunning}
        >
          {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <GitCompareArrows className="size-3.5" />}
          {isRunning ? "Comparing…" : "Run comparison"}
        </button>
      </div>
      {isRunning && !comparison && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-14" />)}
          </div>
        </div>
      )}
      {comparison && (
        <div className="space-y-4 pt-1 sim-panel-enter">
          <div className="grid md:grid-cols-2 gap-4">
            <ComparisonCard title={comparison.scenarioA.name} results={comparison.scenarioA.results} scores={comparison.scenarioA.executiveScores} />
            <ComparisonCard title={comparison.scenarioB.name} results={comparison.scenarioB.results} scores={comparison.scenarioB.executiveScores} />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <DiffStat label="AQI Δ" value={comparison.diff.aqiDifference} />
            <DiffStat label="EcoScore Δ" value={comparison.diff.ecoScoreDifference} positive />
            <DiffStat label="Sustainability Δ" value={comparison.diff.sustainabilityDifference} positive />
            <DiffStat label="Carbon Δ" value={comparison.diff.carbonImpactDifference} positive />
            <DiffStat label="Health Δ" value={comparison.diff.healthImpactDifference} positive />
            <DiffStat label="Risk Δ" value={comparison.diff.riskScoreDifference} />
          </div>
          <div className="sim-muted-card rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold leading-snug">{comparison.narrative.headline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{comparison.narrative.recommendation}</p>
            <p className="text-xs text-muted-foreground">{comparison.narrative.tradeoffs}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LeversPanel ─────────────────────────────────────────────────────────────

const LeversPanel = memo(function LeversPanel({
  vals, onLeverChange, simStatus, recentlyActivatedLeverIds,
}: {
  vals: Record<string, number>;
  onLeverChange: (id: string, value: number) => void;
  simStatus: SimStatus;
  recentlyActivatedLeverIds: Set<string>;
}) {
  return (
    <div className="sim-panel rounded-2xl overflow-hidden xl:h-full flex flex-col" role="region" aria-label="Policy levers">
      <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Configuration</div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-base font-semibold tracking-tight">Policy levers</h2>
            </div>
          </div>
          <div className={cn(
            "size-2 rounded-full transition-all duration-300",
            simStatus === "recalculating" ? "bg-[var(--color-warning)] animate-pulse scale-125" : "bg-[var(--color-success)]",
          )} aria-hidden />
        </div>
      </div>
      <div className="flex-1 xl:overflow-y-auto px-5 py-4 space-y-6 sim-scrollbar">
        {LEVER_GROUPS.map((group) => {
          const groupLevers = LEVERS.filter((l) => l.group === group.id);
          return (
            <div key={group.id} className="space-y-4" role="group" aria-label={group.label}>
              <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]/50">
                <group.icon className="size-3 text-muted-foreground" aria-hidden />
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{group.label}</span>
              </div>
              {groupLevers.map((l) => (
                <LeverRow
                  key={l.id}
                  lever={l}
                  value={vals[l.id as LeverId]}
                  onChange={onLeverChange}
                  isHighlighted={recentlyActivatedLeverIds.has(l.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── LeverRow ─────────────────────────────────────────────────────────────────

const LeverRow = memo(function LeverRow({
  lever, value, onChange, isHighlighted,
}: {
  lever: (typeof LEVERS)[number];
  value: number;
  onChange: (id: string, v: number) => void;
  isHighlighted: boolean;
}) {
  const isDragging = useRef(false);
  const animatedPos = useAnimatedValue(value, 320);
  const fillPct = (isDragging.current ? value : animatedPos) / lever.max * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      isDragging.current = true;
      onChange(lever.id, Number(e.target.value));
    },
    [lever.id, onChange],
  );
  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const step = lever.max > 100 ? 5 : 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(lever.id, Math.max(0, value - step)); }
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(lever.id, Math.min(lever.max, value + step)); }
    },
    [lever.id, lever.max, value, onChange],
  );

  return (
    <div className={cn("sim-lever-row group", isHighlighted && "sim-lever-highlighted")}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="size-6 rounded-md grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: `color-mix(in oklab, ${lever.color} 16%, transparent)`, color: lever.color }}
            aria-hidden
          >
            <lever.icon className="size-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground/80 truncate">{lever.label}</span>
        </div>
        <div className="shrink-0 flex items-baseline gap-0.5 min-w-[2.5rem] justify-end">
          <span className="text-sm font-semibold tabular-nums">
            {Math.round(isDragging.current ? value : animatedPos)}
          </span>
          <span className="text-[10px] text-muted-foreground">{lever.unit}</span>
        </div>
      </div>
      <div className="relative">
        <div
          className="sim-lever-track-fill pointer-events-none absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 will-change-[width]"
          style={{ width: `${fillPct}%`, background: lever.color }}
        />
        <input
          type="range"
          min={0}
          max={lever.max}
          step={1}
          value={value}
          onChange={handleChange}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onKeyDown={handleKeyDown}
          aria-label={`${lever.label}: ${value}${lever.unit}`}
          aria-valuemin={0}
          aria-valuemax={lever.max}
          aria-valuenow={value}
          aria-valuetext={`${value}${lever.unit}`}
          className="sim-range w-full"
          style={{ "--range-color": lever.color } as React.CSSProperties}
        />
      </div>
      <div className="flex justify-between mt-1" aria-hidden>
        <span className="text-[10px] text-muted-foreground/50">0</span>
        <span className="text-[10px] text-muted-foreground/50">{lever.max}{lever.unit}</span>
      </div>
    </div>
  );
});

// ─── HeroAqiCard ─────────────────────────────────────────────────────────────

const HeroAqiCard = memo(function HeroAqiCard({
  projectedAqi, aqiDelta, currentAqi, carbon, isRecalculating,
}: {
  projectedAqi: number;
  aqiDelta: number;
  currentAqi: number;
  carbon: number;
  isRecalculating: boolean;
}) {
  const isImprovement = aqiDelta < 0;
  const band = getAqiBand(projectedAqi);
  const deltaPts = Math.abs(Math.round(aqiDelta));
  const pctChange = currentAqi > 0 ? Math.abs(Math.round((aqiDelta / currentAqi) * 100)) : 0;

  return (
    <SimTooltip label="Projected AQI after applying all active policy levers">
      <div
        className={cn(
          "sim-kpi-card sim-hero-aqi rounded-2xl p-5 relative overflow-hidden group cursor-default",
          isRecalculating && "sim-kpi-recalculating",
        )}
        role="region"
        aria-label={`Projected AQI: ${projectedAqi}, status: ${band.label}`}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl transition-opacity duration-700 group-hover:opacity-40"
          style={{ background: band.color, opacity: 0.18 }}
          aria-hidden
        />
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AQI projection</div>
              <div className="text-xs text-muted-foreground mt-0.5">vs. {currentAqi} baseline</div>
            </div>
            <div
              className="sim-aqi-status-badge inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: band.bg, color: band.color, border: `1px solid color-mix(in oklab, ${band.color} 30%, transparent)` }}
            >
              <span className="size-1.5 rounded-full" style={{ background: band.color }} aria-hidden />
              {band.label}
            </div>
          </div>
          <div className="flex items-end gap-2 mt-1 mb-3">
            <span className="sim-aqi-hero-number font-bold tabular-nums tracking-tight leading-none" style={{ color: band.color }}>
              <AnimatedNumber value={projectedAqi} duration={450} />
            </span>
            <span className="text-sm text-muted-foreground pb-1">AQI</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{
                background: isImprovement
                  ? "color-mix(in oklab, var(--color-success) 12%, transparent)"
                  : "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
                color: isImprovement ? "var(--color-success)" : "var(--color-destructive)",
              }}
            >
              {isImprovement ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />}
              <AnimatedNumber value={deltaPts} duration={400} /> pts
            </div>
            <span className="text-xs text-muted-foreground">{isImprovement ? "−" : "+"}{pctChange}% from baseline</span>
          </div>
          <div className="mt-auto pt-3 border-t border-[var(--color-border)]/50 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Carbon saved</div>
              <div className="text-sm font-bold tabular-nums">
                <AnimatedNumber value={carbon} duration={450} decimals={1} /> tCO₂e
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Baseline AQI</div>
              <div className="text-sm font-bold tabular-nums">{currentAqi}</div>
            </div>
          </div>
        </div>
      </div>
    </SimTooltip>
  );
});

// ─── GaugeKpiCard ─────────────────────────────────────────────────────────────

const GaugeKpiCard = memo(function GaugeKpiCard({
  eyebrow, title, value, color, label, icon: Icon, isRecalculating, tooltip,
}: {
  eyebrow: string;
  title: string;
  value: number;
  color: string;
  label: string;
  icon: React.ElementType;
  isRecalculating: boolean;
  tooltip: string;
}) {
  const trend = value >= 50 ? "up" : value >= 30 ? "neutral" : "down";
  return (
    <SimTooltip label={tooltip}>
      <div
        className={cn("sim-kpi-card rounded-2xl p-4 lg:p-5 relative overflow-hidden group cursor-default", isRecalculating && "sim-kpi-recalculating")}
        role="region"
        aria-label={`${title}: ${value} of 100`}
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-15 blur-2xl transition-opacity duration-500 group-hover:opacity-25" style={{ background: color }} aria-hidden />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{title}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="size-5 rounded-md grid place-items-center"
                style={{
                  background: trend === "up" ? "color-mix(in oklab, var(--color-success) 12%, transparent)" : trend === "down" ? "color-mix(in oklab, var(--color-destructive) 12%, transparent)" : "color-mix(in oklab, var(--color-muted-foreground) 12%, transparent)",
                  color: trend === "up" ? "var(--color-success)" : trend === "down" ? "var(--color-destructive)" : "var(--color-muted-foreground)",
                }}
                aria-hidden
              >
                {trend === "up" ? <TrendingUp className="size-3" /> : trend === "down" ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
              </div>
              <div className="size-7 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }} aria-hidden>
                <Icon className="size-3.5" />
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-1">
            <ArcGauge value={value} color={color} label={label} size={110} />
          </div>
          <div className="mt-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-muted-foreground) 14%, transparent)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={title} />
            </div>
            <div className="flex justify-between mt-1.5" aria-hidden>
              <span className="text-[9px] text-muted-foreground/60">0</span>
              <span className="text-[9px] text-muted-foreground/60">100</span>
            </div>
          </div>
        </div>
      </div>
    </SimTooltip>
  );
});

// ─── SimulationSummary ────────────────────────────────────────────────────────

const SimulationSummary = memo(function SimulationSummary({
  localResults, currentAqi, topLever, isRecalculating,
}: {
  localResults: { projectedAqi: number; aqiDelta: number; health: number; eco: number; sustain: number; carbon: number };
  currentAqi: number;
  topLever: string;
  isRecalculating: boolean;
}) {
  const aqiImprovement = Math.round(currentAqi - localResults.projectedAqi);
  const isImprovement = aqiImprovement > 0;

  const items = [
    { label: "AQI improvement", value: isImprovement ? `−${aqiImprovement}` : aqiImprovement === 0 ? "No change" : `+${Math.abs(aqiImprovement)}`, icon: isImprovement ? ArrowDown : aqiImprovement === 0 ? Minus : ArrowUp, color: isImprovement ? "var(--color-success)" : aqiImprovement === 0 ? "var(--color-muted-foreground)" : "var(--color-destructive)" },
    { label: "Carbon reduction", value: `${localResults.carbon} tCO₂e`, icon: Leaf, color: "var(--color-success)" },
    { label: "Health impact", value: `${localResults.health}/100`, icon: Heart, color: "var(--color-info)" },
    { label: "Eco score", value: `${localResults.eco}/100`, icon: Leaf, color: "var(--color-primary)" },
    { label: "Sustainability", value: `${localResults.sustain}/100`, icon: Wind, color: "var(--color-success)" },
    { label: "Top contributor", value: topLever, icon: BarChart2, color: "var(--color-primary)" },
  ] as const;

  return (
    <div className={cn("sim-panel rounded-2xl px-5 py-4", isRecalculating && "sim-kpi-recalculating")} role="region" aria-label="Simulation summary">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-3.5 text-primary" aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground">Simulation summary</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="sim-summary-cell rounded-xl p-3" tabIndex={0}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <item.icon className="size-3" style={{ color: item.color }} aria-hidden />
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground truncate">{item.label}</span>
            </div>
            <div className="text-sm font-bold leading-tight" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── ExecutiveDashboard ───────────────────────────────────────────────────────

function ExecutiveDashboard({ executiveScores }: { executiveScores: ExecutiveScores }) {
  const verdictTone = executiveScores.verdict === "Highly Recommended" ? "success" : executiveScores.verdict === "Recommended" ? "info" : executiveScores.verdict === "Moderate Impact" ? "warning" : "destructive";
  return (
    <div className="sim-panel rounded-2xl p-5 lg:p-6 sim-panel-enter">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl sim-icon-badge grid place-items-center"><ShieldCheck className="size-4 text-primary" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Executive decision support</div>
            <div className="text-sm font-semibold tracking-tight mt-0.5">Decision intelligence dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall verdict</div>
            <div className="text-xl font-bold tracking-tight mt-0.5">{executiveScores.verdict}</div>
          </div>
          <Pill tone={verdictTone}>{executiveScores.overallScore}/100</Pill>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <ExecScoreCard label="Environmental impact" value={executiveScores.environmentalImpactScore} />
        <ExecScoreCard label="Sustainability" value={executiveScores.sustainabilityScore} />
        <ExecScoreCard label="Policy effectiveness" value={executiveScores.policyEffectivenessScore} />
        <ExecScoreCard label="Public health" value={executiveScores.publicHealthImprovementScore} />
        <ExecScoreCard label="Long-term benefit" value={executiveScores.longTermBenefitScore} />
      </div>
    </div>
  );
}

// ─── TrajectoryChart ──────────────────────────────────────────────────────────

const TrajectoryChart = memo(function TrajectoryChart({
  className, proj, currentAqi,
}: {
  className?: string;
  proj: Array<{ ms: string; current: number; projected: number }>;
  currentAqi: number;
}) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="sim-chart-tooltip">
        <div className="sim-chart-tooltip-label">{label}</div>
        {payload.map((p) => (
          <div key={p.name} className="sim-chart-tooltip-row">
            <span className="sim-chart-tooltip-dot" style={{ background: p.color }} />
            <span className="sim-chart-tooltip-name">{p.name === "projected" ? "Scenario" : "Baseline"}</span>
            <span className="sim-chart-tooltip-val">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("sim-panel rounded-2xl p-5 lg:p-6", className)} role="region" aria-label="12-month AQI trajectory chart">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">12-month projection</div>
          <div className="text-sm font-semibold tracking-tight mt-0.5">AQI trajectory</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-5 h-px border-t border-dashed border-muted-foreground/60" aria-hidden />
            Baseline
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-5 h-0.5 rounded-full bg-primary" aria-hidden />
            Scenario
          </span>
        </div>
      </div>
      <div className="h-56 lg:h-64">
        <ResponsiveContainer>
          <AreaChart data={proj} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-current" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-muted-foreground)" stopOpacity={0.08} />
                <stop offset="95%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-projected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} strokeOpacity={0.6} />
            <XAxis dataKey="ms" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<CustomTooltip />} animationDuration={150} />
            <ReferenceLine y={currentAqi} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.4} strokeWidth={1} />
            <Area type="monotone" dataKey="current" stroke="var(--color-muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.55} fill="url(#grad-current)" dot={false} isAnimationActive animationDuration={500} animationEasing="ease-out" />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill="url(#grad-projected)"
              dot={(props: { cx: number; cy: number; index: number }) => {
                if (props.index !== 11 && props.index !== 0) return <g key={props.index} />;
                return <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={2} />;
              }}
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// ─── LeverIntensityChart ──────────────────────────────────────────────────────

const LeverIntensityChart = memo(function LeverIntensityChart({
  className, bars,
}: {
  className?: string;
  bars: Array<{ k: string; v: number; color: string; unit: string; max: number }>;
}) {
  const normalised = bars.map((b) => ({ ...b, pct: Math.round((b.v / b.max) * 100) }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { k: string; v: number; unit: string; pct: number }; color: string }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="sim-chart-tooltip">
        <div className="sim-chart-tooltip-label">{d.k}</div>
        <div className="sim-chart-tooltip-row">
          <span className="sim-chart-tooltip-dot" style={{ background: payload[0].color }} />
          <span className="sim-chart-tooltip-name">Value</span>
          <span className="sim-chart-tooltip-val">{d.v}{d.unit}</span>
        </div>
        <div className="sim-chart-tooltip-row">
          <span className="sim-chart-tooltip-dot" style={{ background: "transparent" }} />
          <span className="sim-chart-tooltip-name">Intensity</span>
          <span className="sim-chart-tooltip-val">{d.pct}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("sim-panel rounded-2xl p-5 lg:p-6", className)} role="region" aria-label="Lever intensity chart">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Policy inputs</div>
        <div className="text-sm font-semibold tracking-tight mt-0.5">Lever intensity</div>
      </div>
      <div className="h-56 lg:h-64">
        <ResponsiveContainer>
          <BarChart data={normalised} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} strokeOpacity={0.5} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="k" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={98} />
            <Tooltip content={<CustomTooltip />} animationDuration={150} cursor={{ fill: "var(--color-muted-foreground)", fillOpacity: 0.05 }} />
            <Bar dataKey="pct" radius={[0, 5, 5, 0]} isAnimationActive animationDuration={380} animationEasing="ease-out" label={{ position: "right", fontSize: 9, fill: "var(--color-muted-foreground)", formatter: (v: number) => `${v}%` }}>
              {normalised.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// ─── AiLoadingState — skeleton while AI generates ─────────────────────────────

function AiLoadingState() {
  return (
    <div className="sim-panel rounded-2xl p-5 lg:p-6 xl:p-8 sim-panel-enter space-y-5" aria-live="polite" aria-busy="true" aria-label="Generating AI strategy">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl sim-icon-badge grid place-items-center">
          <Loader2 className="size-5 text-primary animate-spin" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gemini AI · Generating</div>
          <div className="text-sm font-semibold tracking-tight mt-0.5 flex items-center gap-2">
            Analysing policy mix
            <span className="sim-dot-pulse" aria-hidden />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-16" />)}
      </div>
      <SkeletonBlock className="h-28" />
      <div className="grid md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-36" />)}
      </div>
    </div>
  );
}

// ─── AiAnalysisPanel ─────────────────────────────────────────────────────────

function AiAnalysisPanel({
  analysis, localResults, executiveScores, aiTimestamp,
}: {
  analysis: PolicyAnalysis;
  localResults: { projectedAqi: number; health: number; eco: number; carbon: number };
  executiveScores: ExecutiveScores | null;
  aiTimestamp: string | null;
}) {
  return (
    <div className="sim-panel rounded-2xl p-5 lg:p-6 xl:p-8 sim-panel-enter space-y-6" role="region" aria-label="AI strategy analysis">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl sim-icon-badge grid place-items-center">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gemini AI · Policy Analysis</div>
            <div className="text-lg font-semibold tracking-tight mt-0.5">Strategic intelligence</div>
          </div>
        </div>
        {aiTimestamp && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className="size-3 text-success" />
            Generated at {aiTimestamp}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <AiMetricCard title="Projected AQI" value={localResults.projectedAqi} />
        <AiMetricCard title="Health Index" value={localResults.health} />
        <AiMetricCard title="Eco Score" value={localResults.eco} />
        <AiMetricCard title="Carbon Reduction" value={`${localResults.carbon} tCO₂e`} />
      </div>
      <div className="rounded-xl border border-primary/25 bg-primary/8 p-5">
        <div className="text-[10px] uppercase tracking-wider text-primary mb-2">AI Verdict</div>
        <h3 className="text-xl font-bold tracking-tight">{executiveScores?.verdict ?? "Recommended Policy Mix"}</h3>
        <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">{analysis.summary}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="sim-muted-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Leaf className="size-4 text-success" />Long-Term Recommendations</h3>
          <ul className="space-y-2.5">
            {analysis.longTermRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 size-1 rounded-full bg-primary/60 shrink-0" aria-hidden />{r}</li>
            ))}
          </ul>
        </div>
        <div className="sim-muted-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><ShieldCheck className="size-4 text-info" />Government Actions</h3>
          <ul className="space-y-2.5">
            {analysis.governmentPolicyRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 size-1 rounded-full bg-info/60 shrink-0" aria-hidden />{r}</li>
            ))}
          </ul>
        </div>
        <div className="sim-muted-card rounded-xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Implementation Timeline</div>
          <p className="text-sm leading-relaxed">{analysis.estimatedTimeline}</p>
        </div>
        <div className="sim-muted-card rounded-xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Cost Benefit</div>
          <p className="text-sm leading-relaxed">{analysis.costBenefit}</p>
        </div>
      </div>
    </div>
  );
}

// ─── AiInsightPanel ──────────────────────────────────────────────────────────

function AiInsightPanel({ aiInsight }: { aiInsight: string }) {
  return (
    <div className="sim-panel rounded-2xl p-5 lg:p-6 sim-panel-enter">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="size-8 rounded-lg sim-icon-badge grid place-items-center"><Sparkles className="size-4 text-primary" /></div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Gemini AI</div>
          <div className="text-sm font-semibold tracking-tight mt-0.5">Policy insight</div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{aiInsight}</p>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ExecScoreCard({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "var(--color-success)" : value >= 55 ? "var(--color-info)" : value >= 35 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="sim-score-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="flex items-baseline gap-1 mb-2.5">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}><AnimatedNumber value={value} /></span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} />
      </div>
    </div>
  );
}

function ComparisonCard({ title, results, scores }: { title: string; results: Record<string, number>; scores: { overallScore: number; verdict: string } }) {
  const tone = scores.verdict === "Highly Recommended" ? "success" : scores.verdict === "Recommended" ? "info" : scores.verdict === "Moderate Impact" ? "warning" : "destructive";
  return (
    <div className="sim-muted-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <Pill tone={tone}>{scores.overallScore}/100</Pill>
      </div>
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">AQI</span><span className="font-semibold tabular-nums">{results.projectedAqi}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">EcoScore</span><span className="font-semibold tabular-nums">{results.projectedEcoScore}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Sustainability</span><span className="font-semibold tabular-nums">{results.sustainabilityIndex}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Carbon</span><span className="font-semibold tabular-nums">{results.carbonReductionTons} tCO₂e</span></div>
      </div>
    </div>
  );
}

function DiffStat({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const isGood = positive ? value > 0 : value < 0;
  const color = value === 0 ? "var(--color-muted-foreground)" : isGood ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <div className="sim-muted-card rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold tabular-nums" style={{ color }}>{value > 0 ? "+" : ""}{value}</div>
    </div>
  );
}

function AiMetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="sim-muted-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
