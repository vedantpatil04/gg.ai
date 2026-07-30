/**
 * ecoscore-card.tsx — Phase 2 EcoScore Intelligence centerpiece
 *
 * Premium card that replaces the Phase 1 "Composite EcoScore" panel.
 * Everything here is derived from the same City values already present on
 * the page — no new API calls, no new data fields, no fabricated backend
 * figures. "AI Confidence" is an honest rule-based estimate (lower when
 * the city has more alerts and a worse AQI), not a hallucinated number.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Main gauge (animated SVG ring)                       │
 *   │  Score · Grade · Status badge · Trend                 │
 *   │  Monthly Δ · Target · Progress to target              │
 *   │  AI confidence · Last updated                         │
 *   ├──────────────────────────────────────────────────────┤
 *   │  Breakdown: 5 progress-bar rows (existing fields)     │
 *   ├──────────────────────────────────────────────────────┤
 *   │  Mini sparkline — last 12 synthetic monthly points   │
 *   └──────────────────────────────────────────────────────┘
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Clock, Target, Brain } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import type { City } from "@/lib/mock-data";
import { trendSeries } from "@/lib/mock-data";
import { CountUp } from "@/components/sustainability/count-up";

// ─── helpers ────────────────────────────────────────────────────────────────

function ecoStatus(eco: number) {
  if (eco >= 80) return { label: "Excellent",  color: "var(--color-success)",     bg: "color-mix(in oklab, var(--color-success) 14%, transparent)" };
  if (eco >= 65) return { label: "Good",        color: "var(--color-info)",        bg: "color-mix(in oklab, var(--color-info) 14%, transparent)" };
  if (eco >= 50) return { label: "Moderate",    color: "var(--color-warning)",     bg: "color-mix(in oklab, var(--color-warning) 14%, transparent)" };
  return              { label: "Poor",          color: "var(--color-destructive)", bg: "color-mix(in oklab, var(--color-destructive) 14%, transparent)" };
}

/** Normalise a raw metric to [0, 100] contribution, capped. */
function norm(v: number, best: number, worst: number) {
  return Math.max(0, Math.min(100, Math.round(((v - worst) / (best - worst)) * 100)));
}

/** Rule-based AI confidence: penalise high alerts and bad AQI. */
function aiConfidence(city: City) {
  const base = 78;
  const aqiPenalty  = Math.min(18, Math.round(Math.max(0, city.aqi - 50) / 15));
  const alertPenalty = Math.min(10, city.alerts);
  return Math.max(55, base - aqiPenalty - alertPenalty);
}

// ─── animated SVG gauge ─────────────────────────────────────────────────────

function EcoGauge({ eco, grade, color }: { eco: number; grade: string; color: string }) {
  const r = 82;
  const circ = 2 * Math.PI * r;
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const id = setTimeout(() => setDrawn(true), 120);
      return () => clearTimeout(id);
    }
    let timerId: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timerId = setTimeout(() => setDrawn(true), 120);
          observer.disconnect();
        }
      },
      { rootMargin: "-40px" },
    );
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(timerId); };
  }, []);

  const dash = drawn ? (eco / 100) * circ : 0;

  return (
    <div ref={ref} className="relative h-52 w-52 grid place-items-center mx-auto">
      {/* Outer ambient pulse */}
      <div
        className="absolute inset-0 rounded-full pulse-dot opacity-60"
        aria-hidden="true"
        style={{ color }}
      />
      <svg viewBox="0 0 200 200" className="h-52 w-52 -rotate-90" aria-hidden="true">
        {/* Track */}
        <circle cx="100" cy="100" r={r} stroke="var(--color-muted)" strokeWidth="11" fill="none" />
        {/* Fill — CSS transition does the draw animation */}
        <circle
          cx="100" cy="100" r={r}
          stroke="url(#eco-main-gr)" strokeWidth="11" fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: `${circ}`,
            strokeDashoffset: circ - dash,
            transition: drawn ? "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          }}
        />
        <defs>
          <linearGradient id="eco-main-gr" x1="0" x2="1">
            <stop offset="0%"   stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-info)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Centre text */}
      <div className="absolute text-center pointer-events-none">
        <div className="text-5xl font-semibold tabular-nums leading-none">
          <CountUp value={eco} duration={1100} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5 tracking-wide">
          Grade <span className="font-semibold" style={{ color }}>{grade}</span>
        </div>
      </div>
    </div>
  );
}

// ─── breakdown row ───────────────────────────────────────────────────────────

function BreakdownRow({
  label, pct, color, delay,
}: { label: string; pct: number; color: string; delay: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────

export function EcoScoreCard({
  city, grade, trendDirection, trendValue, renewableShare, greenCover,
}: {
  city: City;
  grade: string;
  trendDirection: "up" | "down" | "flat";
  trendValue: number;
  renewableShare: number;
  greenCover: number;
}) {
  const status   = ecoStatus(city.eco);
  const confidence = aiConfidence(city);
  const [updatedAt] = useState(() => new Date());

  const TrendIcon = trendDirection === "up" ? TrendingUp : trendDirection === "down" ? TrendingDown : Minus;
  const trendColor =
    trendDirection === "up"
      ? "var(--color-success)"
      : trendDirection === "down"
      ? "var(--color-destructive)"
      : "var(--color-muted-foreground)";

  // EcoScore target — simple rule: 10 points above current, capped at 95
  const target        = Math.min(95, city.eco + 10);
  const targetPct     = Math.min(100, Math.round((city.eco / target) * 100));
  const monthlyChange = trendDirection === "flat" ? 0 : trendDirection === "up" ? trendValue : -trendValue;

  // Breakdown contributions derived from existing fields
  const breakdown = [
    { label: "Air Quality",         pct: norm(city.aqi,  50, 250), color: "var(--color-primary)" },
    { label: "Green Cover",         pct: Math.min(100, Math.round(greenCover * 1.8)), color: "var(--color-success)" },
    { label: "Renewable Energy",    pct: Math.min(100, renewableShare),               color: "var(--color-info)" },
    { label: "Carbon Impact",       pct: norm(city.carbon, 0, 12) ,                   color: "var(--color-warning)" },
    { label: "Water Sustainability", pct: Math.min(100, city.water),                  color: "var(--color-info)" },
  ];

  // Mini sparkline — 12 synthetic monthly eco-score-like points
  const sparkData = trendSeries(city.eco, 60, 12, 10).map((d, i) => ({
    m: i,
    score: Math.max(20, Math.min(100, Math.round(city.eco - 6 + (d.aqi % 12)))),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6 relative overflow-hidden"
    >
      {/* Decorative ambient glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full blur-3xl opacity-20"
        style={{ background: status.color }}
        aria-hidden="true"
      />

      {/* ── MAIN GAUGE ─────────────────────────────────────────────── */}
      <EcoGauge eco={city.eco} grade={grade} color={status.color} />

      {/* Status badge + trend */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          style={{ color: status.color, background: status.bg }}
        >
          {status.label}
        </span>
        <span
          className="inline-flex items-center gap-1 text-xs font-medium tabular-nums"
          style={{ color: trendColor }}
          aria-label={`EcoScore trend: ${trendDirection === "flat" ? "stable" : `${trendDirection} ${Math.abs(monthlyChange)} points`}`}
        >
          <TrendIcon className="size-3.5" aria-hidden="true" />
          {trendDirection === "flat" ? "Stable" : `${monthlyChange > 0 ? "+" : ""}${monthlyChange} pts`}
        </span>
      </div>

      {/* Progress toward target */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Target className="size-3" />Target {target}</span>
          <span className="tabular-nums font-medium">{targetPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(to right, var(--color-primary), var(--color-info))" }}
            initial={{ width: 0 }}
            animate={{ width: `${targetPct}%` }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* AI confidence + timestamp */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Brain className="size-3" aria-hidden="true" />
          AI confidence: <span className="font-semibold text-foreground ml-0.5">{confidence}%</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" />
          {updatedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* ── BREAKDOWN ──────────────────────────────────────────────── */}
      <div
        className="mt-5 pt-5 space-y-3.5"
        style={{ borderTop: "1px solid var(--color-border)" }}
        aria-label="EcoScore breakdown"
      >
        {breakdown.map((b, i) => (
          <BreakdownRow key={b.label} {...b} delay={0.1 + i * 0.07} />
        ))}
      </div>

      {/* ── MINI SPARKLINE ─────────────────────────────────────────── */}
      <div
        className="mt-5 pt-5"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          12-month EcoScore trend
        </div>
        <div className="h-20">
          <ResponsiveContainer>
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eco-spark-gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }}
                labelFormatter={() => ""}
                formatter={(v: number) => [v, "EcoScore"]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                fill="url(#eco-spark-gr)"
                dot={false}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
