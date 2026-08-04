/**
 * AirQualityPanel.tsx — Phase 6: Environmental Intelligence Platform
 *
 * Comprehensive air quality and environmental analytics panel.
 * Renders as the "Air Quality" tab in the intelligence drawer.
 * All data derived from existing City fields — no new APIs.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind,
  AlertTriangle,
  Activity,
  BarChart3,
  Users,
  Dumbbell,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";
import { CITIES } from "@/lib/mock-data";
import {
  generateAirQualityData,
  POLLUTANTS,
  type AirQualityData,
  type PollutantReading,
  type TimelinePoint,
  type AqiInsight,
  type HealthGuidance,
} from "@/lib/map/air-quality-data";
import { resolveThemeColor } from "@/lib/map/map-visuals";

// ─── AQI Circular Gauge ───────────────────────────────────────────────────────
function AqiGauge({ aqi, color, max = 300 }: { aqi: number; color: string; max?: number }) {
  const r = 42;
  const cx = 56;
  const cy = 56;
  const circumference = Math.PI * r; // half circle
  const pct = Math.min(aqi / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <svg width={112} height={68} viewBox="0 0 112 68" overflow="visible">
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="color-mix(in oklab, var(--color-foreground) 8%, transparent)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        {/* AQI bands as tick marks */}
        {[50, 100, 150, 200, 300].map((mark, i) => {
          const angle = Math.PI * (mark / max);
          const tx = cx - r * Math.cos(angle);
          const ty = cy - r * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={tx}
              cy={ty}
              r={2}
              fill={mark <= aqi ? color : "color-mix(in oklab, var(--color-foreground) 20%, transparent)"}
            />
          );
        })}
        {/* Value text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={24}
          fontWeight={700}
          fill="currentColor"
          fontFamily="inherit"
        >
          {aqi}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize={8.5}
          fill="color-mix(in oklab, var(--color-foreground) 50%, transparent)"
          fontFamily="inherit"
          fontWeight={500}
          letterSpacing="0.12em"
        >
          AQI
        </text>
      </svg>
    </div>
  );
}

// ─── Pollutant bar ────────────────────────────────────────────────────────────
function PollutantBar({ reading, animate }: { reading: PollutantReading; animate: boolean }) {
  const { meta, value, fraction, elevated, exceedingGuideline } = reading;
  const pct = Math.min(fraction * 100, 100);
  const guidelinePct = Math.min((meta.guideline / meta.safeMax) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-2.5"
    >
      {/* Label + value */}
      <div className="w-10 shrink-0 text-right">
        <div className="text-[9px] font-semibold text-muted-foreground">{meta.label}</div>
        <div className="text-[8px] text-muted-foreground/60">{meta.unit}</div>
      </div>

      {/* Track */}
      <div
        className="flex-1 relative h-5 rounded-lg overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Guideline marker */}
        <div
          className="absolute top-0 bottom-0 w-px z-10 opacity-40"
          style={{ left: `${guidelinePct}%`, background: "var(--color-foreground)" }}
        />

        {/* Fill bar */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-lg"
          style={{ background: meta.color }}
          initial={{ width: 0 }}
          animate={{ width: animate ? `${pct}%` : 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="absolute inset-0 opacity-30 rounded-lg"
            style={{ background: `linear-gradient(to right, transparent, ${meta.color})` }}
          />
        </motion.div>

        {/* Value label inside */}
        <div className="absolute inset-0 flex items-center justify-end pr-1.5 z-10">
          <span
            className={cn(
              "text-[8.5px] font-bold tabular-nums",
              elevated ? "text-white" : exceedingGuideline ? "text-white/90" : "text-foreground/60",
            )}
          >
            {value}
          </span>
        </div>
      </div>

      {/* Elevated dot */}
      <div
        className="size-1.5 rounded-full shrink-0"
        style={{
          background: elevated
            ? "var(--color-destructive)"
            : exceedingGuideline
              ? "var(--color-warning)"
              : "transparent",
        }}
      />
    </motion.div>
  );
}

// ─── Health guidance card ─────────────────────────────────────────────────────
function HealthCard({ health }: { health: HealthGuidance }) {
  const items = [
    {
      icon: Eye,
      label: "Outdoor",
      guidance: health.outdoor.label,
      severity: health.outdoor.severity,
    },
    {
      icon: Users,
      label: "Sensitive",
      guidance: health.sensitive.label,
      severity: health.sensitive.severity,
    },
    {
      icon: Dumbbell,
      label: "Exercise",
      guidance: health.exercise.label,
      severity: health.exercise.severity,
    },
    { icon: Shield, label: "Mask", guidance: health.mask.label, severity: health.mask.severity },
  ];
  const severityColor = {
    safe: "var(--color-success)",
    caution: "var(--color-warning)",
    avoid: "var(--color-destructive)",
  };
  const severityBg = {
    safe: "color-mix(in oklab, var(--color-success) 10%, transparent)",
    caution: "color-mix(in oklab, var(--color-warning) 10%, transparent)",
    avoid: "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
  };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map(({ icon: Icon, label, severity, guidance }) => (
        <motion.div
          key={label}
          whileHover={{ y: -1 }}
          className="rounded-xl p-2 flex flex-col gap-1"
          style={{
            background: severityBg[severity],
            border: `1px solid color-mix(in oklab, ${severityColor[severity]} 20%, transparent)`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <Icon className="size-3 shrink-0" style={{ color: severityColor[severity] }} />
            <span
              className="text-[8.5px] font-semibold uppercase tracking-wide"
              style={{ color: severityColor[severity] }}
            >
              {label}
            </span>
          </div>
          <span className="text-[8px] text-muted-foreground leading-snug">{guidance}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Timeline bar chart ───────────────────────────────────────────────────────
function AqiTimeline({ timeline }: { timeline: TimelinePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeIdx, setActiveIdx] = useState(11); // "Now" index

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);
    const values = timeline.map((p) => p.aqi);
    const max = Math.max(...values, 1);
    const barW = Math.floor(w / timeline.length);
    const gap = 2;

    timeline.forEach((pt, i) => {
      const barH = Math.max(4, (pt.aqi / max) * (h - 16));
      const x = i * barW + gap / 2;
      const y = h - barH - 10;
      const color = resolveThemeColor(pt.bandColor);

      ctx.globalAlpha = pt.isFuture ? 0.45 : 1;
      if (i === activeIdx) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW - gap, barH, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    // Label "Now"
    const nowX = 11 * barW + barW / 2;
    ctx.fillStyle = "color-mix(in oklab, var(--color-foreground) 50%, transparent)";
    ctx.font = "bold 7px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("NOW", nowX, h - 1);
  }, [timeline, activeIdx]);

  const active = timeline[activeIdx];
  const bandColor = resolveThemeColor(active.bandColor);

  return (
    <div className="space-y-2">
      {/* Canvas chart */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <canvas
          ref={canvasRef}
          width={340}
          height={64}
          className="w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.floor((x / rect.width) * timeline.length);
            setActiveIdx(Math.max(0, Math.min(timeline.length - 1, idx)));
          }}
        />
      </div>

      {/* Active point detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-between rounded-xl px-3 py-2"
          style={{
            background: `color-mix(in oklab, ${bandColor} 10%, transparent)`,
            border: `1px solid color-mix(in oklab, ${bandColor} 25%, transparent)`,
          }}
        >
          <div>
            <span className="text-[9px] font-semibold text-muted-foreground">{active.label}</span>
            {active.isFuture && (
              <span className="ml-1.5 text-[7.5px] text-muted-foreground/60 italic">forecast</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">PM₂.₅ {active.pm25} µg/m³</span>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: bandColor }}>
              AQI {active.aqi}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between text-[7.5px] text-muted-foreground/60 px-0.5">
        <span>−11h</span>
        <span>Now</span>
        <span>+6h forecast</span>
      </div>
    </div>
  );
}

// ─── City comparison ──────────────────────────────────────────────────────────
function CityComparison({ data }: { data: AirQualityData }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? data.cityComparison : data.cityComparison.slice(0, 6);
  const max = Math.max(...data.cityComparison.map((c) => c.aqi));

  return (
    <div>
      <div className="space-y-1.5">
        {shown.map((city, i) => {
          const pct = (city.aqi / max) * 100;
          const color = resolveThemeColor(city.color);
          return (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-1.5",
                city.isCurrent ? "ring-1 ring-inset" : "",
              )}
              style={{
                background: city.isCurrent
                  ? `color-mix(in oklab, ${color} 12%, transparent)`
                  : "var(--card-bg)",
                border: `1px solid ${city.isCurrent ? `color-mix(in oklab, ${color} 30%, transparent)` : "var(--card-border)"}`,
                ...(city.isCurrent ? { ringColor: color } : {}),
              }}
            >
              <span
                className="text-[9px] w-20 truncate font-medium"
                style={{ color: city.isCurrent ? color : undefined }}
              >
                {city.name}
                {city.isCurrent && <span className="ml-1 text-[7px] opacity-60">●</span>}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "color-mix(in oklab, var(--color-foreground) 8%, transparent)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-[9px] font-bold tabular-nums w-8 text-right" style={{ color }}>
                {city.aqi}
              </span>
            </motion.div>
          );
        })}
      </div>
      {data.cityComparison.length > 6 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-1.5 text-[9px] text-muted-foreground hover:text-foreground py-1.5 flex items-center justify-center gap-1 rounded-lg hover:bg-[color-mix(in_oklab,var(--color-foreground)_5%,transparent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> Show all {data.cityComparison.length} cities
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────
function InsightCards({ insights }: { insights: AqiInsight[] }) {
  const colorMap = {
    info: "var(--color-info)",
    warning: "var(--color-warning)",
    critical: "var(--color-destructive)",
  };
  const bgMap = {
    info: "color-mix(in oklab, var(--color-info) 10%, transparent)",
    warning: "color-mix(in oklab, var(--color-warning) 10%, transparent)",
    critical: "color-mix(in oklab, var(--color-destructive) 12%, transparent)",
  };

  return (
    <div className="space-y-1.5">
      {insights.map((ins, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl px-2.5 py-2 flex items-start gap-2"
          style={{
            background: bgMap[ins.severity],
            border: `1px solid color-mix(in oklab, ${colorMap[ins.severity]} 22%, transparent)`,
          }}
        >
          <AlertTriangle
            className="size-3 mt-0.5 shrink-0"
            style={{ color: colorMap[ins.severity] }}
          />
          <div className="min-w-0">
            <div className="text-[9px] font-semibold" style={{ color: colorMap[ins.severity] }}>
              {ins.label}
            </div>
            <div className="text-[8.5px] text-muted-foreground/80 leading-snug mt-0.5">
              {ins.detail}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── AQI band scale ───────────────────────────────────────────────────────────
function AqiBandScale({ current }: { current: number }) {
  const bands = [
    { max: 50, label: "Good", color: "var(--color-success)" },
    { max: 100, label: "Moderate", color: "var(--color-warning)" },
    { max: 150, label: "USG", color: "oklch(0.72 0.18 50)" },
    { max: 200, label: "Unhealthy", color: "var(--color-destructive)" },
    { max: 300, label: "V.Unhealthy", color: "oklch(0.5 0.22 320)" },
    { max: 500, label: "Hazardous", color: "oklch(0.4 0.2 20)" },
  ];

  return (
    <div
      className="flex rounded-lg overflow-hidden h-3"
      style={{ border: "1px solid var(--card-border)" }}
    >
      {bands.map((b, i) => {
        const isActive = current <= b.max && (i === 0 || current > bands[i - 1].max);
        return (
          <div
            key={b.label}
            className="flex-1 relative"
            style={{ background: resolveThemeColor(b.color) + (isActive ? "ff" : "44") }}
          >
            {isActive && (
              <motion.div
                layoutId="aqi-indicator"
                className="absolute inset-0"
                style={{
                  background: resolveThemeColor(b.color),
                  boxShadow: `0 0 8px ${resolveThemeColor(b.color)}`,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Pollutant detail expand ──────────────────────────────────────────────────
function PollutantGrid({ pollutants }: { pollutants: PollutantReading[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? pollutants : pollutants.slice(0, 5);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="space-y-2">
        {shown.map((r) => (
          <PollutantBar key={r.id} reading={r} animate={mounted} />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[8px] text-muted-foreground">
        <div className="h-px flex-1" style={{ background: "var(--card-border)" }} />
        <span>│ = WHO guideline</span>
        <span
          className="size-1.5 rounded-full inline-block"
          style={{ background: "var(--color-warning)" }}
        />
        <span>= exceeds guideline</span>
        <div className="h-px flex-1" style={{ background: "var(--card-border)" }} />
      </div>
      {pollutants.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-1.5 text-[9px] text-muted-foreground hover:text-foreground py-1 flex items-center justify-center gap-1 hover:bg-[color-mix(in_oklab,var(--color-foreground)_5%,transparent)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> +{pollutants.length - 5} more pollutants
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function AirQualityPanel({ city }: { city: City }) {
  const data: AirQualityData = useMemo(
    () => generateAirQualityData(city, CITIES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city.id, city.aqi, city.pm25, city.pm10, city.no2, city.o3],
  );

  const dominantMeta = POLLUTANTS.find((p) => p.id === data.dominant);
  const bandColor = resolveThemeColor(data.band.color);

  return (
    <div
      className="flex flex-col gap-4 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* ── Hero: AQI gauge + band + dominant pollutant ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${bandColor} 22%, var(--card-bg)) 0%, var(--card-bg) 100%)`,
          border: `1px solid color-mix(in oklab, ${bandColor} 30%, transparent)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 80% 30%, color-mix(in oklab, ${bandColor} 15%, transparent), transparent)`,
          }}
        />

        <div className="relative flex items-center gap-4">
          <AqiGauge aqi={data.aqi} color={bandColor} />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
              Air Quality Index
            </div>
            <div className="text-xl font-bold mb-0.5" style={{ color: bandColor }}>
              {data.band.label}
            </div>
            {dominantMeta && (
              <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                <Wind className="size-3" />
                Dominant:{" "}
                <span className="font-semibold" style={{ color: dominantMeta.color }}>
                  {dominantMeta.label}
                </span>
              </div>
            )}
            <div className="mt-2">
              <AqiBandScale current={data.aqi} />
              <div className="flex justify-between text-[7px] text-muted-foreground/60 mt-0.5 px-0.5">
                <span>0</span>
                <span>Good</span>
                <span>Moderate</span>
                <span>Unhealthy</span>
                <span>300+</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Pollutant breakdown ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <BarChart3 className="size-3" /> Pollutant Breakdown
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <PollutantGrid pollutants={data.pollutants} />
        </div>
      </div>

      {/* ── AQI Timeline ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Activity className="size-3" /> 18-Hour Timeline
        </div>
        <AqiTimeline timeline={data.timeline} />
      </div>

      {/* ── Health guidance ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Users className="size-3" /> Health Guidance
        </div>
        <HealthCard health={data.health} />
        <p className="text-[7.5px] text-muted-foreground/50 mt-1.5 text-center italic">
          Informational only — not medical advice
        </p>
      </div>

      {/* ── City comparison ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <BarChart3 className="size-3" /> City Comparison
        </div>
        <CityComparison data={data} />
      </div>

      {/* ── Intelligence insights ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <Zap className="size-3" /> Environmental Intelligence
        </div>
        <InsightCards insights={data.insights} />
      </div>
    </div>
  );
}
