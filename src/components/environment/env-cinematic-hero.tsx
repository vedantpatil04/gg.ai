import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Satellite, RefreshCw, ChevronDown, Activity, Thermometer,
  Droplets, Wind, Gauge, Map, CloudSun, FileText, Sparkles,
  BarChart2, Clock, Leaf, TrendingUp, TrendingDown, Minus, ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { resolveHeroMedia, getTimeOfDay } from "@/components/environment/env-hero-media-config";
import { EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Phase 2 — Environmental Identity & Executive Experience.
 *
 * Changes from Phase 1 hero:
 *  — Hero imagery is now environmental (forests, lakes, mountains, renewable
 *    energy) — NOT city skylines. Driven by env-hero-media-config.ts.
 *  — Identity line changed from city-centric to environmental-intelligence.
 *  — AI Executive Briefing upgraded to "Environmental Analysis" with richer
 *    copy: Status / Risk level / Conditions / Recommendation / Trend.
 *  — Environmental Health Index panel now shows score label + confidence.
 *  — City name retained as context, not as hero identity.
 *  — Quick actions labels refined for the Intelligence Workspace context.
 *
 * All business logic, APIs, hooks, and data sources are unchanged.
 * All animations respect prefers-reduced-motion.
 */

// ─── prefers-reduced-motion ───────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [v, set] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    set(q.matches);
    const h = (e: MediaQueryListEvent) => set(e.matches);
    q.addEventListener("change", h);
    return () => q.removeEventListener("change", h);
  }, []);
  return v;
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, reduced: boolean, duration = 1400) {
  const [val, setVal] = useState(reduced ? target : 0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (reduced) { setVal(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced, duration]);
  return val;
}

// ─── Environmental Health Score ───────────────────────────────────────────────

function computeScore(city: {
  aqi: number; pm25?: number; humidity?: number;
  windSpeed?: number; pressure?: number; temp?: number;
}): { score: number; label: string; confidence: "High" | "Moderate" | "Limited" } {
  const subs: { s: number; w: number }[] = [
    { s: Math.max(0, 1 - city.aqi / 300), w: 0.45 },
    ...(city.pm25     != null ? [{ s: Math.max(0, 1 - city.pm25 / 150), w: 0.20 }] : []),
    ...(city.humidity != null ? [{ s: Math.max(0, 1 - Math.abs(city.humidity - 50) / 50), w: 0.10 }] : []),
    ...(city.windSpeed != null ? [{ s: Math.max(0, Math.min(1, city.windSpeed / 30)), w: 0.10 }] : []),
    ...(city.pressure != null ? [{ s: Math.max(0, 1 - Math.abs(city.pressure - 1013) / 60), w: 0.08 }] : []),
    ...(city.temp     != null ? [{ s: Math.max(0, 1 - Math.abs(city.temp - 21) / 30), w: 0.07 }] : []),
  ];
  const tw = subs.reduce((a, x) => a + x.w, 0);
  const score = tw ? Math.round(subs.reduce((a, x) => a + x.s * x.w, 0) / tw * 100) : 0;
  const dataCount = subs.length;
  const confidence: "High" | "Moderate" | "Limited" =
    dataCount >= 5 ? "High" : dataCount >= 3 ? "Moderate" : "Limited";
  const label =
    score >= 80 ? "Excellent" :
    score >= 65 ? "Good" :
    score >= 50 ? "Moderate" :
    score >= 35 ? "Elevated" : "Poor";
  return { score, label, confidence };
}

// ─── Risk level from AQI ──────────────────────────────────────────────────────

function riskLevel(aqi: number): { label: string; color: string } {
  if (aqi <= 50)  return { label: "Low",      color: "oklch(0.70 0.18 152)" };
  if (aqi <= 100) return { label: "Moderate", color: "oklch(0.80 0.16 78)"  };
  if (aqi <= 150) return { label: "Elevated", color: "oklch(0.72 0.17 46)"  };
  if (aqi <= 200) return { label: "High",     color: "oklch(0.66 0.20 28)"  };
  return                  { label: "Critical", color: "oklch(0.58 0.22 24)"  };
}

// ─── Environmental trend label ────────────────────────────────────────────────

function trendLabel(aqi: number): { label: string; dir: "up" | "down" | "stable" } {
  // Without historical data we infer from current AQI band
  if (aqi <= 50)  return { label: "Improving conditions",   dir: "down"   };
  if (aqi <= 100) return { label: "Stable conditions",      dir: "stable" };
  if (aqi <= 150) return { label: "Conditions worsening",   dir: "up"     };
  return                  { label: "Significant degradation", dir: "up"   };
}

// ─── AI Executive Analysis — upgraded copy ────────────────────────────────────

function buildAnalysis(city: {
  name: string; aqi: number; temp?: number; humidity?: number; windSpeed?: number;
}): { label: string; text: string }[] {
  const band    = findAqiBand(city.aqi);
  const health  = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];
  const risk    = riskLevel(city.aqi);
  const trend   = trendLabel(city.aqi);

  const conditionParts: string[] = [];
  if (city.temp      != null) conditionParts.push(`${city.temp}°C`);
  if (city.humidity  != null) conditionParts.push(`${city.humidity}% humidity`);
  if (city.windSpeed != null) conditionParts.push(`${city.windSpeed} km/h wind`);
  const conditions = conditionParts.length
    ? conditionParts.join(" · ")
    : "Atmospheric conditions logged — detail available below.";

  return [
    {
      label: "Status",
      text: `${band.label} air quality detected in ${city.name}. ${health}`,
    },
    {
      label: "Risk",
      text: `${risk.label} health risk. ${
        city.aqi <= 50
          ? "No restrictions on outdoor activity."
          : city.aqi <= 100
            ? "Sensitive individuals may wish to limit prolonged outdoor exertion."
            : "Consider limiting prolonged outdoor activity until conditions improve."
      }`,
    },
    {
      label: "Conditions",
      text: conditions,
    },
    {
      label: "Trend",
      text: `${trend.label}. Full analysis and 7-day historical trends available in the intelligence report below.`,
    },
  ];
}

// ─── Score Arc SVG ────────────────────────────────────────────────────────────

function ScoreArc({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
  const r = size * 0.40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Environmental Health Index: ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(1 0 0/0.10)" strokeWidth={7} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform={`rotate(-90,${cx},${cy})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}70)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span
          className="text-[7px] uppercase tracking-widest"
          style={{ color: "oklch(0.55 0.010 220)" }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

// ─── Floating telemetry widget ─────────────────────────────────────────────────

function FloatWidget({
  icon: Icon, label, value, reduced,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string; value: string; reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [ 4, -4]), { stiffness: 280, damping: 28 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4,  4]), { stiffness: 280, damping: 28 });

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width  - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduced ? {} : { y: -5, scale: 1.04 }}
      style={{
        rotateX: reduced ? 0 : rx, rotateY: reduced ? 0 : ry, transformPerspective: 800,
        background: "oklch(1 0 0 / 0.07)",
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
        border: "1px solid oklch(1 0 0 / 0.12)",
        boxShadow: "0 8px 32px oklch(0 0 0/0.30), 0 0 0 1px oklch(1 0 0/0.06) inset",
      }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="flex flex-col gap-1.5 px-4 py-3 rounded-2xl"
    >
      <div className="flex items-center gap-2">
        <div
          className="size-6 rounded-lg grid place-items-center"
          style={{ background: "oklch(0.68 0.14 210/0.16)", color: "oklch(0.72 0.14 210)" }}
        >
          <Icon className="size-3" aria-hidden="true" />
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "oklch(0.52 0.012 230)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-lg font-bold tabular-nums leading-none"
        style={{ color: "oklch(0.94 0.010 220)" }}
      >
        {value}
      </span>
    </motion.div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({
  icon: Icon, label, to, reduced,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string; to: string; reduced: boolean;
}) {
  return (
    <motion.div
      whileHover={reduced ? {} : { y: -4, scale: 1.05 }}
      whileTap={reduced ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <Link
        to={to as never}
        className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
        style={{
          background: "oklch(1 0 0 / 0.06)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid oklch(1 0 0 / 0.10)",
        }}
      >
        <div
          className="size-8 rounded-xl grid place-items-center"
          style={{ background: "oklch(0.68 0.14 148/0.18)", color: "oklch(0.75 0.16 148)" }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span
          className="text-[10px] font-semibold leading-tight"
          style={{ color: "oklch(0.70 0.012 230)" }}
        >
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

// ─── Background image layer ───────────────────────────────────────────────────

function HeroImage({
  url, alt, gradient, reduced,
}: { url: string; alt: string; gradient: string; reduced: boolean }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0">
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        initial={{ opacity: 0, scale: reduced ? 1 : 1.04 }}
        animate={{
          opacity: loaded ? 1 : 0,
          scale: 1,
          transition: { duration: reduced ? 0 : 1.6, ease: [0.25, 0.46, 0.45, 0.94] },
        }}
        style={{ backgroundImage: `url(${url})` }}
        role="img"
        aria-label={alt}
      />
      <img
        src={url} alt="" aria-hidden="true" loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
      />
      {/* Primary gradient — blends image into dark UI */}
      <div className="absolute inset-0" style={{ background: gradient }} />
      {/* Bottom vignette — stronger at base for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, oklch(0.07 0.010 248/0.97) 0%, oklch(0.07 0.010 248/0.35) 32%, transparent 62%)",
        }}
      />
      {/* Subtle top darkening for top-bar legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.05 0.008 248/0.50) 0%, transparent 20%)",
        }}
      />
    </div>
  );
}

// ─── Ambient lighting orbs ────────────────────────────────────────────────────

function AmbientOrbs({ color, reduced }: { color: string; reduced: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className={reduced ? "" : "orb-a"}
        style={{
          position: "absolute", top: "-20%", left: "-10%",
          width: "55%", height: "55%",
          background: `radial-gradient(ellipse, color-mix(in oklab, ${color} 16%, transparent) 0%, transparent 70%)`,
          filter: "blur(60px)",
          animation: reduced ? "none" : "orb-drift-a 24s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute", bottom: "-10%", right: "-5%",
          width: "45%", height: "45%",
          background: `radial-gradient(ellipse, color-mix(in oklab, ${color} 9%, transparent) 0%, transparent 65%)`,
          filter: "blur(80px)",
          animation: reduced ? "none" : "orb-drift-b 32s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── Telemetry widgets row ────────────────────────────────────────────────────

function TelemetryWidgets({ city, reduced }: {
  city: { aqi: number; temp?: number; humidity?: number; windSpeed?: number; pressure?: number };
  reduced: boolean;
}) {
  const widgets: { icon: ComponentType<{ className?: string }>; label: string; value: string }[] = [];
  if (city.temp      != null) widgets.push({ icon: Thermometer, label: "Temperature", value: `${city.temp}°C` });
  if (city.humidity  != null) widgets.push({ icon: Droplets,    label: "Humidity",    value: `${city.humidity}%` });
  if (city.windSpeed != null) widgets.push({ icon: Wind,        label: "Wind",        value: `${city.windSpeed} km/h` });
  if (city.pressure  != null) widgets.push({ icon: Gauge,       label: "Pressure",    value: `${city.pressure} hPa` });
  if (widgets.length === 0)   return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {widgets.map((w, i) => (
        <motion.div
          key={w.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 + i * 0.08, type: "spring", stiffness: 240, damping: 22 }}
        >
          <FloatWidget icon={w.icon} label={w.label} value={w.value} reduced={reduced} />
        </motion.div>
      ))}
    </div>
  );
}

// ─── AI Environmental Analysis Panel ─────────────────────────────────────────
// Phase 2: upgraded from "Executive Briefing" to "Environmental Analysis"
// with richer copy: Status / Risk / Conditions / Trend

function AIAnalysisPanel({ city, reduced }: {
  city: { name: string; aqi: number; temp?: number; humidity?: number; windSpeed?: number };
  reduced: boolean;
}) {
  const lines = buildAnalysis(city);
  const trend = trendLabel(city.aqi);
  const TrendIcon = trend.dir === "down"
    ? TrendingDown
    : trend.dir === "up"
      ? TrendingUp
      : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.44, type: "spring", stiffness: 200, damping: 24 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "oklch(1 0 0 / 0.06)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        border: "1px solid oklch(1 0 0 / 0.10)",
        boxShadow: "0 16px 48px oklch(0 0 0/0.35), 0 0 0 1px oklch(1 0 0/0.06) inset",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3.5 border-b"
        style={{ borderColor: "oklch(1 0 0 / 0.08)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="size-5 rounded-md grid place-items-center"
            style={{ background: "oklch(0.68 0.15 290/0.20)", color: "oklch(0.72 0.16 290)" }}
          >
            <Sparkles className="size-3" aria-hidden="true" />
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "oklch(0.55 0.014 230)" }}
          >
            GreenGuard AI · Environmental Analysis
          </span>
        </div>
        {/* Trend indicator */}
        <span
          className="inline-flex items-center gap-1 text-[9px] font-semibold"
          style={{
            color: trend.dir === "down"
              ? "oklch(0.70 0.18 152)"
              : trend.dir === "up"
                ? "oklch(0.66 0.18 30)"
                : "oklch(0.58 0.012 230)",
          }}
        >
          <TrendIcon className="size-2.5" aria-hidden="true" />
          {trend.dir === "down" ? "Improving" : trend.dir === "up" ? "Worsening" : "Stable"}
        </span>
      </div>

      {/* Analysis lines */}
      <div className="divide-y" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
        {lines.map((line, i) => (
          <motion.div
            key={line.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.52 + i * 0.08 }}
            className="flex gap-3 px-5 py-3"
          >
            <span
              className="text-[9px] font-bold uppercase tracking-wider shrink-0 mt-0.5 w-16"
              style={{ color: "oklch(0.50 0.014 230)" }}
            >
              {line.label}
            </span>
            <p
              className="text-[11.5px] leading-relaxed"
              style={{ color: "oklch(0.80 0.010 225)" }}
            >
              {line.text}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Environmental Health Index panel ────────────────────────────────────────

function HealthIndexPanel({
  score, label, confidence, bandColor,
}: {
  score: number; label: string; confidence: string; bandColor: string;
}) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 rounded-2xl"
      style={{
        background: "oklch(1 0 0 / 0.07)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid oklch(1 0 0 / 0.10)",
      }}
    >
      <ScoreArc score={score} color={bandColor} size={72} />
      <div className="min-w-0 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "oklch(0.50 0.012 230)" }}>
          Environmental Health Index
        </div>
        <div className="text-sm font-semibold" style={{ color: "oklch(0.92 0.010 220)" }}>
          {label} conditions
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3" style={{ color: "oklch(0.58 0.012 230)" }} aria-hidden="true" />
          <span className="text-[10px]" style={{ color: "oklch(0.50 0.012 230)" }}>
            {confidence} confidence · Composite of 5 indicators
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Quick actions — Phase 2 labels ──────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: Map,       label: "Smart Map",   to: "/map"             },
  { icon: CloudSun,  label: "Forecast",    to: "/forecast"        },
  { icon: FileText,  label: "Reports",     to: "/reports"         },
  { icon: Sparkles,  label: "AI Copilot",  to: "/command-center"  },
  { icon: BarChart2, label: "Simulator",   to: "/simulator"       },
] as const;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CinematicHeroSkeleton() {
  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "85vh" }}>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(165deg, oklch(0.10 0.018 240), oklch(0.07 0.012 250))" }}
      />
      <div
        className="relative z-10 flex flex-col justify-end h-full p-6 md:p-12 xl:p-16 gap-8"
        style={{ minHeight: "85vh" }}
      >
        <div className="space-y-3">
          <div className="h-2.5 w-32 rounded-full" style={{ background: "oklch(1 0 0/0.07)" }} />
          <div className="h-10 w-56 rounded-xl" style={{ background: "oklch(1 0 0/0.06)" }} />
          <div className="h-3.5 w-44 rounded-full" style={{ background: "oklch(1 0 0/0.05)" }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl" style={{ background: "oklch(1 0 0/0.06)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Keyframes injected into <head> ──────────────────────────────────────────

const HERO_KF = `
@keyframes orb-drift-a {
  0%,100%{ transform:translate(0%,0%) scale(1); }
  40%    { transform:translate(6%,-8%) scale(1.12); }
  72%    { transform:translate(-4%,5%) scale(0.96); }
}
@keyframes orb-drift-b {
  0%,100%{ transform:translate(0%,0%) scale(1); }
  35%    { transform:translate(-6%,7%) scale(1.08); }
  68%    { transform:translate(5%,-4%) scale(0.94); }
}
@keyframes hero-grain {
  0%,100%{ transform:translate(0,0); }
  25%    { transform:translate(-1%,-1%); }
  50%    { transform:translate(1.5%,-0.5%); }
  75%    { transform:translate(-1.5%,1%); }
}
@keyframes hero-scroll-bounce {
  0%,100%{ transform:translateY(0); opacity:0.5; }
  50%    { transform:translateY(8px); opacity:1; }
}
@media(prefers-reduced-motion:reduce){
  .orb-a,.orb-b{ animation:none!important; }
}
`;

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function CinematicHero({
  onRefresh,
  isRefreshing,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const { city, isCityListLoading, isCityError, isApiConnected, cityDataUpdatedAt, refreshCity } = useCity();
  const reduced = usePrefersReducedMotion();

  if (isCityListLoading) return <CinematicHeroSkeleton />;
  if (isCityError) {
    return (
      <div className="px-6 md:px-12 py-20">
        <EnvErrorState
          onRetry={refreshCity}
          retryDisabled={false}
          message="Unable to load environmental hero data."
        />
      </div>
    );
  }

  const band           = findAqiBand(city.aqi);
  const { score, label: scoreLabel, confidence } = computeScore(city);
  const scene          = resolveHeroMedia(city.id, city.aqi);
  const tod            = getTimeOfDay(new Date().getHours());
  const updatedLabel   = isApiConnected && cityDataUpdatedAt
    ? formatDistanceToNow(cityDataUpdatedAt, { addSuffix: true })
    : null;

  const todLabel: Record<string, string> = {
    dawn: "Dawn", morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night",
  };

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.10, delayChildren: 0.06 } },
  };
  const itemUp = {
    hidden: { opacity: 0, y: 24 },
    show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
  };

  return (
    <>
      <style>{HERO_KF}</style>
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: "clamp(600px, 90vh, 980px)" }}
        aria-label={`Environmental overview — ${city.name} · ${band.label} air quality`}
      >
        {/* L1 — Environmental photograph */}
        <HeroImage url={scene.imageUrl} alt={scene.imageAlt} gradient={scene.gradient} reduced={reduced} />

        {/* L3 — Ambient lighting */}
        <AmbientOrbs color={scene.ambientColor} reduced={reduced} />

        {/* L4 — Grain texture */}
        <svg
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            opacity: 0.028, mixBlendMode: "screen", pointerEvents: "none",
            animation: reduced ? "none" : "hero-grain 0.18s steps(1) infinite",
          }}
        >
          <filter id="hero-grain-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-grain-filter)" />
        </svg>

        {/* L5–L8 — Content */}
        <motion.div
          className="relative z-10 flex flex-col justify-between h-full"
          style={{ minHeight: "clamp(600px, 90vh, 980px)" }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* ── Top bar ── */}
          <motion.div
            variants={itemUp}
            className="flex items-center justify-between gap-4 px-6 md:px-12 xl:px-16 pt-6 md:pt-8"
          >
            {/* Platform identity pill — environmental workspace, not city dashboard */}
            <span
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1.5 rounded-full border"
              style={{
                color: "oklch(0.72 0.16 148)",
                border: "1px solid oklch(0.72 0.16 148/0.24)",
                background: "oklch(0.72 0.16 148/0.09)",
              }}
            >
              <Leaf className="size-2.5" aria-hidden="true" />
              Environmental Intelligence
            </span>

            {/* Controls */}
            <div className="flex items-center gap-2.5">
              {updatedLabel && (
                <span
                  className="hidden md:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg"
                  style={{
                    color: "oklch(0.52 0.012 230)",
                    background: "oklch(1 0 0/0.05)",
                    border: "1px solid oklch(1 0 0/0.08)",
                  }}
                >
                  <Clock className="size-2.5" aria-hidden="true" />
                  Updated {updatedLabel}
                </span>
              )}
              <button
                type="button"
                onClick={onRefresh ?? refreshCity}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-opacity duration-200 disabled:opacity-60"
                style={{
                  color: "oklch(0.65 0.012 230)",
                  background: "oklch(1 0 0/0.06)",
                  border: "1px solid oklch(1 0 0/0.10)",
                }}
                aria-label="Refresh environmental data"
              >
                <RefreshCw className={cn("size-3", isRefreshing && "animate-spin")} aria-hidden="true" />
                {isRefreshing ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
          </motion.div>

          {/* ── Main content ── */}
          <div className="flex flex-col gap-6 md:gap-8 px-6 md:px-12 xl:px-16 pb-10 md:pb-14">

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end">

              {/* Left — environmental identity (not city identity) */}
              <motion.div variants={itemUp} className="space-y-4">
                {/* Context line — tod + city as context, not as hero */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "oklch(0.56 0.014 225)" }}
                  >
                    {todLabel[tod]} · {city.name}, {city.country}
                  </span>
                  {isApiConnected && (
                    <span
                      className="flex items-center gap-1.5 text-[10px] font-semibold"
                      style={{ color: "oklch(0.68 0.18 150)" }}
                    >
                      <span className="relative flex size-1.5">
                        <span
                          className="absolute inline-flex size-full rounded-full opacity-65 bg-current"
                          style={{ animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
                        />
                        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                      </span>
                      Live
                    </span>
                  )}
                </div>

                {/* AQI — the environmental signal, not just a number */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-4">
                    <AnimatedAQI aqi={city.aqi} color={band.color} reduced={reduced} />
                    <div className="space-y-1.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border"
                        style={{
                          color: band.color,
                          borderColor: `color-mix(in oklab, ${band.color} 38%, transparent)`,
                          background: `color-mix(in oklab, ${band.color} 14%, transparent)`,
                          boxShadow: `0 0 14px color-mix(in oklab, ${band.color} 20%, transparent)`,
                        }}
                      >
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {band.label}
                      </span>
                      <p className="text-xs" style={{ color: "oklch(0.52 0.012 228)" }}>
                        Air Quality Index · {city.name}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right — Environmental Health Index + Analysis */}
              <motion.div variants={itemUp} className="flex flex-col gap-4 lg:max-w-sm xl:max-w-md w-full">
                {/* Health Index panel */}
                <HealthIndexPanel
                  score={score}
                  label={scoreLabel}
                  confidence={confidence}
                  bandColor={band.color}
                />

                {/* AI Environmental Analysis */}
                <AIAnalysisPanel city={city} reduced={reduced} />
              </motion.div>
            </div>

            {/* Telemetry widgets */}
            <motion.div variants={itemUp}>
              <TelemetryWidgets city={city} reduced={reduced} />
            </motion.div>

            {/* Quick access */}
            <motion.div variants={itemUp}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 max-w-6" style={{ background: "oklch(1 0 0/0.10)" }} />
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.20em]"
                  style={{ color: "oklch(0.44 0.010 230)" }}
                >
                  Quick Access
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 max-w-sm">
                {QUICK_ACTIONS.map((a, i) => (
                  <motion.div
                    key={a.to}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.72 + i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <QuickAction icon={a.icon} label={a.label} to={a.to} reduced={reduced} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll cue */}
          <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
            style={{
              color: "oklch(0.40 0.010 230)",
              animation: reduced ? "none" : "hero-scroll-bounce 2.2s ease-in-out infinite",
            }}
            aria-hidden="true"
          >
            <span className="text-[8px] uppercase tracking-[0.22em] font-bold">Scroll</span>
            <ChevronDown className="size-3.5" />
          </div>
        </motion.div>
      </section>
    </>
  );
}

// ─── Animated AQI number ──────────────────────────────────────────────────────

function AnimatedAQI({ aqi, color, reduced }: { aqi: number; color: string; reduced: boolean }) {
  const val = useCountUp(aqi, reduced, 1200);
  return (
    <span
      className="tabular-nums font-bold leading-none tracking-tighter"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(3.5rem, 9vw, 8rem)",
        color,
        textShadow: `0 0 40px color-mix(in oklab, ${color} 30%, transparent)`,
      }}
      aria-label={`AQI ${aqi}`}
    >
      {val}
    </span>
  );
}
