import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import {
  Wind,
  Flame,
  FlaskConical,
  Leaf,
  Factory,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { environmentalApi, type CityHistoryDay } from "@/lib/api/environmental.api";
import { EnvPollutantsOverviewSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Pollutant Intelligence Center (Phase 5).
 *
 * Upgrades the plain 6-tile grid into a multi-panel analytics experience:
 *
 *   1. Pollutant overview cards — value, unit, status badge, progress bar,
 *      expandable detail panel (keyboard accessible, motion-safe animated).
 *   2. Dominant pollutant insight — dynamically derived from the highest
 *      normalised score across all available pollutants.
 *   3. Visual comparison strip — horizontal bars normalised for relative
 *      ranking, with exact values always visible.
 *   4. 7-day trend chart — shown per expanded pollutant when real
 *      historical data exists (`getCityHistory` already fetched for the
 *      AQI trend chart in Phase 3 but uses a DIFFERENT query key so this
 *      is a separate, correctly-keyed query). Only pm25/pm10/no2/o3 have
 *      history; co/so2 show "trend unavailable" gracefully.
 *   5. Pollution profile interpretation — plain-language summary derived
 *      from real pollutant readings, no AI call.
 *
 * DATA: all from `useCity()` (no new fetch for current readings).
 * HISTORY: `getCityHistory(city.id, 7)` — same endpoint as the AQI Trend
 *   section, but keyed as `["pollutant-history", city.id, 7]` so the two
 *   queries remain independent (different consumers, different stale
 *   windows are possible in future). The data is already cached by
 *   TanStack Query after the first load of this page, so in practice this
 *   results in zero additional network traffic.
 *
 * All animations respect `prefers-reduced-motion`.
 * No new dependencies introduced.
 */

// ─── Reduced motion ─────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener("change", h);
    return () => q.removeEventListener("change", h);
  }, []);
  return reduced;
}

// ─── Pollutant metadata & classification ────────────────────────────────────

/**
 * WHO/EPA-aligned breakpoints for each pollutant, kept separate from the
 * AQI classification system (`findAqiBand` / `AQI_BANDS`) so the two
 * systems don't interfere with each other.
 *
 * References used for breakpoints:
 *   PM2.5  — WHO 2021 annual guideline  5 µg/m³; 24-h 15 µg/m³
 *   PM10   — WHO 2021 annual guideline 15 µg/m³; 24-h 45 µg/m³
 *   NO₂    — WHO 2021 annual guideline 10 µg/m³ ≈ 5.3 ppb; 24-h 25 µg/m³ ≈ 13.3 ppb
 *   O₃     — WHO 2021 8-h target 60 µg/m³ ≈ 30 ppb; 100 µg/m³ ≈ 50 ppb
 *   CO     — WHO 24-h 4 mg/m³ ≈ 3.5 ppm; 8-h 10 mg/m³ ≈ 8.7 ppm
 *   SO₂    — WHO 24-h guideline 40 µg/m³ ≈ 15.3 ppb; alert 188 µg/m³ ≈ 72 ppb
 *
 * The GreenGuard project does not yet surface a canonical pollutant
 * classification utility; this is the first one. The thresholds are
 * intentionally conservative (WHO 2021) rather than the looser NAAQS/CPCB
 * standards because GreenGuard's existing AQI Hero and Health
 * Recommendation copy already leans toward the stricter end.
 */
interface PollutantThreshold {
  good: number;
  moderate: number;
  elevated: number;
  high: number;
}

const THRESHOLDS: Record<string, PollutantThreshold> = {
  pm25: { good: 15, moderate: 35, elevated: 55, high: 150 },
  pm10: { good: 45, moderate: 100, elevated: 150, high: 250 },
  no2: { good: 13, moderate: 30, elevated: 50, high: 100 },
  o3: { good: 30, moderate: 55, elevated: 80, high: 120 },
  co: { good: 3.5, moderate: 8, elevated: 12, high: 20 },
  so2: { good: 15, moderate: 35, elevated: 72, high: 120 },
};

type PollutantStatus = "Good" | "Moderate" | "Elevated" | "High" | "Hazardous";

function classifyPollutant(key: string, value: number): PollutantStatus {
  const t = THRESHOLDS[key];
  if (!t) return "Moderate";
  if (value <= t.good) return "Good";
  if (value <= t.moderate) return "Moderate";
  if (value <= t.elevated) return "Elevated";
  if (value <= t.high) return "High";
  return "Hazardous";
}

const STATUS_STYLES: Record<PollutantStatus, { color: string; bg: string; border: string }> = {
  Good: {
    color: "var(--color-success)",
    bg: "color-mix(in oklab, var(--color-success) 12%, transparent)",
    border: "color-mix(in oklab, var(--color-success) 30%, transparent)",
  },
  Moderate: {
    color: "hsl(45 90% 55%)",
    bg: "color-mix(in oklab, hsl(45 90% 55%) 12%, transparent)",
    border: "color-mix(in oklab, hsl(45 90% 55%) 30%, transparent)",
  },
  Elevated: {
    color: "hsl(28 90% 55%)",
    bg: "color-mix(in oklab, hsl(28 90% 55%) 12%, transparent)",
    border: "color-mix(in oklab, hsl(28 90% 55%) 30%, transparent)",
  },
  High: {
    color: "var(--color-destructive)",
    bg: "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
    border: "color-mix(in oklab, var(--color-destructive) 30%, transparent)",
  },
  Hazardous: {
    color: "hsl(290 60% 50%)",
    bg: "color-mix(in oklab, hsl(290 60% 50%) 12%, transparent)",
    border: "color-mix(in oklab, hsl(290 60% 50%) 30%, transparent)",
  },
};

/** Fraction of the "good" threshold this pollutant represents — used only
 *  for normalising comparison bars and dominant-pollutant calculation.
 *  A value > 1 means it has already exceeded the "good" ceiling.
 *  NOTE: this is a relative comparison metric only, not an AQI sub-index. */
function normScore(key: string, value: number): number {
  const t = THRESHOLDS[key];
  if (!t || t.high === 0) return 0;
  return value / t.high;
}

/** Bar fill percentage (0–100) for the progress indicator inside each card.
 *  Clamped to 95 so a bar never appears entirely full at sub-hazardous levels. */
function barPct(key: string, value: number): number {
  const t = THRESHOLDS[key];
  if (!t) return 0;
  return Math.min(95, (value / (t.high * 1.5)) * 100);
}

// ─── Pollutant definitions ───────────────────────────────────────────────────

interface PollutantDef {
  key: "pm25" | "pm10" | "no2" | "o3" | "co" | "so2";
  label: string;
  unit: string;
  icon: LucideIcon;
  description: string;
  whyItMatters: string;
  historyKey?: "pm25" | "pm10" | "no2" | "o3"; // CityHistoryDay fields with trend data
}

const POLLUTANTS: PollutantDef[] = [
  {
    key: "pm25",
    label: "PM2.5",
    unit: "µg/m³",
    icon: Wind,
    historyKey: "pm25",
    description: "Fine particulate matter smaller than 2.5 µm in diameter.",
    whyItMatters:
      "PM2.5 can penetrate deep into the lungs and enter the bloodstream. It is one of the primary contributors to air quality degradation.",
  },
  {
    key: "pm10",
    label: "PM10",
    unit: "µg/m³",
    icon: Wind,
    historyKey: "pm10",
    description: "Coarse particulate matter smaller than 10 µm in diameter.",
    whyItMatters:
      "PM10 includes dust, pollen, and mould spores. Elevated levels can irritate the respiratory system, especially for sensitive individuals.",
  },
  {
    key: "no2",
    label: "NO₂",
    unit: "ppb",
    icon: Factory,
    historyKey: "no2",
    description: "Nitrogen dioxide — a combustion by-product from traffic and industry.",
    whyItMatters:
      "NO₂ contributes to the formation of ground-level ozone and secondary particulates, and can irritate the airways.",
  },
  {
    key: "o3",
    label: "O₃",
    unit: "ppb",
    icon: Leaf,
    historyKey: "o3",
    description: "Ground-level ozone — formed when sunlight reacts with other pollutants.",
    whyItMatters:
      "Ground-level ozone is different from the protective stratospheric ozone layer. At elevated concentrations it can affect breathing.",
  },
  {
    key: "co",
    label: "CO",
    unit: "ppm",
    icon: Flame,
    description: "Carbon monoxide — an odourless gas from incomplete combustion.",
    whyItMatters:
      "CO reduces the blood's ability to carry oxygen. Elevated outdoor concentrations typically occur near heavy traffic.",
  },
  {
    key: "so2",
    label: "SO₂",
    unit: "ppb",
    icon: FlaskConical,
    description:
      "Sulphur dioxide — released primarily by industrial processes and power generation.",
    whyItMatters:
      "SO₂ can react in the atmosphere to form particulates and contributes to acid rain. It can also irritate the airways at elevated concentrations.",
  },
];

// ─── History trend chart ─────────────────────────────────────────────────────

const tickStyle = { fontSize: 11, fill: "var(--color-muted-foreground)" };

function PollutantTrendChart({
  historyKey,
  label,
  unit,
  history,
  prefersReducedMotion,
}: {
  historyKey: "pm25" | "pm10" | "no2" | "o3";
  label: string;
  unit: string;
  history: CityHistoryDay[];
  prefersReducedMotion: boolean;
}) {
  const chartData = history
    .map((d) => ({
      date: d.date,
      value: d[historyKey],
    }))
    .filter((d) => typeof d.value === "number");

  if (chartData.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        7-Day Trend — {label}
      </span>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`pollutant-grad-${historyKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={(d: string) => format(new Date(`${d}T00:00:00`), "EEE")}
          />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(d: string) => format(new Date(`${d}T00:00:00`), "EEEE")}
            formatter={(v: number) => [`${v} ${unit}`, label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            fill={`url(#pollutant-grad-${historyKey})`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Trend arrow ─────────────────────────────────────────────────────────────

function TrendBadge({
  current,
  history,
  historyKey,
}: {
  current: number;
  history: CityHistoryDay[] | undefined;
  historyKey?: "pm25" | "pm10" | "no2" | "o3";
}) {
  if (!history || !historyKey || history.length < 2) return null;
  const avg = history.reduce((s, d) => s + (d[historyKey] ?? 0), 0) / history.length;
  const label =
    current > avg * 1.05 ? "Increasing" : current < avg * 0.95 ? "Decreasing" : "Stable";
  const Icon = label === "Increasing" ? TrendingUp : label === "Decreasing" ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
      aria-label={`Trend: ${label}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Individual pollutant card ────────────────────────────────────────────────

function PollutantCard({
  def,
  value,
  history,
  prefersReducedMotion,
}: {
  def: PollutantDef;
  value: number;
  history: CityHistoryDay[] | undefined;
  prefersReducedMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const status = classifyPollutant(def.key, value);
  const styles = STATUS_STYLES[status];
  const pct = barPct(def.key, value);
  const Icon = def.icon;

  const hasHistory = !!def.historyKey && !!history && history.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 glass transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
      style={{ borderColor: open ? styles.border : undefined }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="size-7 rounded-lg grid place-items-center shrink-0"
            style={{ background: styles.bg, color: styles.color }}
            aria-hidden="true"
          >
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {def.label}
            </div>
            <div className="text-base font-semibold tabular-nums leading-tight">{value}</div>
            <div className="text-[10px] text-muted-foreground">{def.unit}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
            style={{ color: styles.color, background: styles.bg, borderColor: styles.border }}
          >
            {status}
          </span>
          {hasHistory && (
            <TrendBadge current={value} history={history} historyKey={def.historyKey} />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: prefersReducedMotion ? `${pct}%` : "0%",
            background: styles.color,
          }}
          ref={(el) => {
            if (el && !prefersReducedMotion) {
              requestAnimationFrame(() => {
                el.style.width = `${pct}%`;
              });
            }
          }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${def.label}: ${value} ${def.unit} — ${status}`}
        />
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`pollutant-detail-${def.key}`}
        className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-fit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
      >
        <ChevronDown
          className={cn("size-3 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
        {open ? "Less" : "Details"}
      </button>

      {/* Expandable detail panel */}
      <div
        id={`pollutant-detail-${def.key}`}
        ref={detailRef}
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="pt-3 space-y-3 border-t border-border mt-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{def.description}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{def.whyItMatters}</p>

          {hasHistory && def.historyKey && (
            <PollutantTrendChart
              historyKey={def.historyKey}
              label={def.label}
              unit={def.unit}
              history={history!}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}

          {!hasHistory && (
            <p className="text-[10px] text-muted-foreground italic">
              Historical pollutant trend unavailable.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comparison strip ────────────────────────────────────────────────────────

function ComparisonStrip({ pollutants }: { pollutants: { def: PollutantDef; value: number }[] }) {
  if (pollutants.length === 0) return null;

  const maxScore = Math.max(...pollutants.map((p) => normScore(p.def.key, p.value)));

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-4 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Pollutant Comparison
        </span>
        <p className="text-xs text-muted-foreground mt-1">
          Relative severity across measured pollutants — bars show how each pollutant compares to
          its own high-level threshold.
        </p>
      </div>
      <div className="space-y-3">
        {[...pollutants]
          .sort((a, b) => normScore(b.def.key, b.value) - normScore(a.def.key, a.value))
          .map(({ def, value }) => {
            const score = normScore(def.key, value);
            const relPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            const status = classifyPollutant(def.key, value);
            const styles = STATUS_STYLES[status];
            return (
              <div key={def.key} className="flex items-center gap-3">
                <span className="text-xs font-medium w-12 shrink-0">{def.label}</span>
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${relPct}%`, background: styles.color }}
                    role="progressbar"
                    aria-valuenow={relPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${def.label}: ${value} ${def.unit}`}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-20 text-right shrink-0">
                  {value} {def.unit}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Dominant pollutant ──────────────────────────────────────────────────────

function DominantPollutantInsight({
  pollutants,
}: {
  pollutants: { def: PollutantDef; value: number }[];
}) {
  if (pollutants.length === 0) return null;

  const dominant = [...pollutants].sort(
    (a, b) => normScore(b.def.key, b.value) - normScore(a.def.key, a.value),
  )[0];

  const status = classifyPollutant(dominant.def.key, dominant.value);
  const styles = STATUS_STYLES[status];
  const Icon = dominant.def.icon;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-3 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150",
      )}
      style={{ borderLeft: `3px solid ${styles.color}` }}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Dominant Pollutant
      </span>
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl grid place-items-center shrink-0"
          style={{ background: styles.bg, color: styles.color }}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-lg font-semibold">{dominant.def.label}</div>
          <div className="text-sm text-muted-foreground">
            {dominant.value} {dominant.def.unit}
          </div>
        </div>
        <span
          className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full border shrink-0"
          style={{ color: styles.color, background: styles.bg, borderColor: styles.border }}
        >
          {status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {dominant.def.label} is currently the highest measured pollutant relative to its threshold.
        It is not necessarily the sole contributor to the overall AQI, but represents the most
        elevated reading among those currently available.
      </p>
    </div>
  );
}

// ─── Pollution profile ───────────────────────────────────────────────────────

function PollutionProfile({
  pollutants,
  cityName,
}: {
  pollutants: { def: PollutantDef; value: number }[];
  cityName: string;
}) {
  if (pollutants.length === 0) return null;

  // Derive which pollutant category dominates — particulates vs gases.
  const particulatePollutants = pollutants.filter(
    (p) => p.def.key === "pm25" || p.def.key === "pm10",
  );
  const gasPollutants = pollutants.filter(
    (p) => p.def.key === "no2" || p.def.key === "o3" || p.def.key === "co" || p.def.key === "so2",
  );

  const particulateScore = particulatePollutants.reduce(
    (s, p) => s + normScore(p.def.key, p.value),
    0,
  );
  const gasScore = gasPollutants.reduce((s, p) => s + normScore(p.def.key, p.value), 0);

  const elevated = pollutants.filter((p) => classifyPollutant(p.def.key, p.value) !== "Good");

  let profile: string;
  if (elevated.length === 0) {
    profile = `All measured pollutants in ${cityName} are currently within good ranges.`;
  } else if (particulateScore > gasScore * 1.5) {
    profile = `Air quality in ${cityName} is currently influenced primarily by particulate matter (${particulatePollutants.map((p) => p.def.label).join(" and ")}).`;
  } else if (gasScore > particulateScore * 1.5) {
    profile = `Air quality in ${cityName} is currently influenced primarily by gas-phase pollutants (${gasPollutants.map((p) => p.def.label).join(", ")}).`;
  } else {
    profile = `${cityName} has a mixed pollution profile, with both particulate matter and gas-phase pollutants contributing to current readings.`;
  }

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-3 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200",
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Pollution Profile
      </span>
      <p className="text-sm text-muted-foreground leading-relaxed">{profile}</p>
      {elevated.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {elevated.length === 1
            ? `${elevated[0].def.label} is currently above good levels.`
            : `${elevated.map((p) => p.def.label).join(", ")} are currently above good levels.`}
        </p>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PollutantsOverview({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();
  const prefersReducedMotion = usePrefersReducedMotion();

  // 7-day historical pollutant data — keyed separately from the AQI Trend
  // query ("aqi-history") so the two remain independent consumers.
  // TanStack Query deduplicates the network request when both are mounted.
  const { data: history } = useQuery({
    queryKey: ["pollutant-history", city.id, 7],
    queryFn: async () => {
      const res = await environmentalApi.getCityHistory(city.id, 7);
      return res.data.history;
    },
    enabled: !!city.id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  if (isCityListLoading) {
    return <EnvPollutantsOverviewSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load pollutant data."
      />
    );
  }

  const available = POLLUTANTS.filter((p) => typeof city[p.key] === "number").map((def) => ({
    def,
    value: city[def.key] as number,
  }));

  if (available.length === 0) {
    return (
      <EnvEmptyState
        className={className}
        title="No pollutant data is currently available."
        description="This section will update once a live pollutant reading is available."
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1 — Pollutant card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {available.map(({ def, value }) => (
          <PollutantCard
            key={def.key}
            def={def}
            value={value}
            history={history}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>

      {/* 2 — Dominant pollutant */}
      <DominantPollutantInsight pollutants={available} />

      {/* 3 — Visual comparison strip */}
      <ComparisonStrip pollutants={available} />

      {/* 4 — Pollution profile interpretation */}
      <PollutionProfile pollutants={available} cityName={city.name} />
    </div>
  );
}
