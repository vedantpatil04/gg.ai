import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { MapPin, Cpu, Activity, Thermometer, Droplets, Wind, Gauge, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { HEALTH_STATUS_BY_BAND } from "@/components/environment/env-live-aqi-hero";
import { EnvHeroCommandCenterSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * V3 Hero Command Center — Full-Viewport Environmental Intelligence Hub.
 *
 * Redesign goals:
 *   - Full first-viewport occupancy with a radial Environmental Health Score
 *   - Animated score ring counting up on mount (RAF loop, reduced-motion safe)
 *   - Live telemetry chips strip
 *   - Magnetic floating glass card with tilt-on-hover (Framer Motion)
 *   - Weather-context AI summary panel
 *   - AQI-reactive accent colors throughout
 *
 * Data: useCity() only — no new API, no new fetches.
 * All animations respect prefers-reduced-motion.
 */

// ─── Reduced motion ───────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
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

// ─── Environmental Health Score ───────────────────────────────────────────────

/**
 * Deterministic 0-100 composite score. Same weighting as env-intelligence.tsx.
 * Weights: AQI 0.45, PM2.5 0.20, Humidity 0.10, Wind 0.10, Pressure 0.08, Temp 0.07
 */
function computeHealthScore(city: {
  aqi: number;
  pm25?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  temp?: number;
}): number {
  const sub: { score: number; weight: number }[] = [];

  const aqiNorm = Math.max(0, Math.min(1, 1 - city.aqi / 300));
  sub.push({ score: aqiNorm, weight: 0.45 });

  if (typeof city.pm25 === "number") {
    const pm25Norm = Math.max(0, Math.min(1, 1 - city.pm25 / 150));
    sub.push({ score: pm25Norm, weight: 0.20 });
  }
  if (typeof city.humidity === "number") {
    const humNorm = 1 - Math.abs(city.humidity - 50) / 50;
    sub.push({ score: Math.max(0, humNorm), weight: 0.10 });
  }
  if (typeof city.windSpeed === "number") {
    const windNorm = Math.max(0, Math.min(1, city.windSpeed / 30));
    sub.push({ score: windNorm, weight: 0.10 });
  }
  if (typeof city.pressure === "number") {
    const pNorm = Math.max(0, Math.min(1, (city.pressure - 960) / 80));
    sub.push({ score: pNorm, weight: 0.08 });
  }
  if (typeof city.temp === "number") {
    const tempNorm = 1 - Math.abs(city.temp - 22) / 30;
    sub.push({ score: Math.max(0, tempNorm), weight: 0.07 });
  }

  const totalWeight = sub.reduce((s, x) => s + x.weight, 0);
  if (totalWeight === 0) return 0;
  const raw = sub.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight;
  return Math.round(raw * 100);
}

// ─── Score ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({
  score,
  color,
  size = 200,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [displayed, setDisplayed] = useState(reduced ? score : 0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setDisplayed(score);
      return;
    }
    const start = performance.now();
    const duration = 1400;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * score));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, reduced]);

  const radius = (size / 2) * 0.78;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (displayed / 100) * circumference;
  const center = size / 2;
  const trackColor = "oklch(1 0 0 / 0.07)";

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Environmental health score: ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={10}
          fill="none"
        />
        {/* Glow track (wider, blurred via filter) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
          strokeDashoffset={circumference / 4}
          style={{ filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 3px ${color})`, opacity: 0.35 }}
          transform={`rotate(-90, ${center}, ${center})`}
        />
        {/* Main progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
          strokeDashoffset={circumference / 4}
          transform={`rotate(-90, ${center}, ${center})`}
          style={{ transition: reduced ? "none" : undefined }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="font-bold tabular-nums leading-none"
          style={{ fontSize: size * 0.26, color }}
          aria-hidden="true"
        >
          {displayed}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-medium"
          aria-hidden="true"
        >
          Health Score
        </span>
      </div>
    </div>
  );
}

// ─── Telemetry chip ───────────────────────────────────────────────────────────

function TelemetryChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
      whileHover={{ scale: 1.04, borderColor: "rgba(255,255,255,0.2)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div
        className="size-6 rounded-lg grid place-items-center shrink-0"
        style={{
          color: accent ?? "oklch(0.78 0.18 160)",
          background: accent
            ? `color-mix(in oklab, ${accent} 18%, transparent)`
            : "color-mix(in oklab, oklch(0.78 0.18 160) 18%, transparent)",
        }}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
        <div className="text-xs font-semibold tabular-nums text-white/90 leading-tight">{value}</div>
      </div>
    </motion.div>
  );
}

// ─── Floating tilt card ───────────────────────────────────────────────────────

function FloatingTiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, transformPerspective: 1000 }}
      className={cn("relative", className)}
    >
      {children}
    </motion.div>
  );
}

// ─── Live status badge ────────────────────────────────────────────────────────

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border",
        live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-white/40",
      )}
      role="status"
    >
      {live && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {!live && <span className="size-1.5 rounded-full bg-white/30" />}
      {live ? "Live telemetry" : "Offline"}
    </span>
  );
}

// ─── AQI Status pill ─────────────────────────────────────────────────────────

function AqiPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        boxShadow: `0 0 12px color-mix(in oklab, ${color} 20%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── WEATHER_IMPACT & RECOMMENDATION copies ───────────────────────────────────

const WEATHER_IMPACT_BY_BAND: Record<string, string> = {
  Good: "Current conditions are favorable for spending time outdoors.",
  Moderate: "Conditions are generally comfortable; sensitive individuals should stay aware.",
  "Unhealthy (SG)": "Weather is pleasant, but pollution levels affect sensitive groups.",
  Unhealthy: "Despite the weather, elevated pollution makes outdoor exposure less favorable.",
  "Very Unhealthy": "Very poor air quality is the primary concern today — minimize exposure.",
  Hazardous: "Hazardous air quality overrides all weather considerations.",
};

const RECOMMENDATION_BY_BAND: Record<string, string> = {
  Good: "Outdoor activities are suitable for all groups.",
  Moderate: "Generally fine outdoors — sensitive individuals may pace prolonged exertion.",
  "Unhealthy (SG)": "Sensitive groups should limit prolonged outdoor exertion.",
  Unhealthy: "Reduce prolonged outdoor exertion where possible.",
  "Very Unhealthy": "Avoid outdoor activity where possible.",
  Hazardous: "Avoid all outdoor activity.",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function HeroCommandCenter({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, isApiConnected, cityDataUpdatedAt, refreshCity } =
    useCity();

  if (isCityListLoading) return <EnvHeroCommandCenterSkeleton className={className} />;
  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load the command center summary."
      />
    );
  }
  if (!city || typeof city.aqi !== "number" || typeof city.temp !== "number") {
    return (
      <EnvEmptyState
        className={className}
        title="Command center summary is unavailable."
        description="This section will update once a live environmental reading is available."
      />
    );
  }

  const band = findAqiBand(city.aqi);
  const healthScore = computeHealthScore(city);
  const healthText = HEALTH_STATUS_BY_BAND[band.label] ?? HEALTH_STATUS_BY_BAND["Moderate"];
  const weatherImpact = WEATHER_IMPACT_BY_BAND[band.label] ?? WEATHER_IMPACT_BY_BAND["Moderate"];
  const recommendation = RECOMMENDATION_BY_BAND[band.label] ?? RECOMMENDATION_BY_BAND["Moderate"];
  const lastUpdated = isApiConnected ? cityDataUpdatedAt : undefined;
  const updatedLabel = lastUpdated
    ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
    : "Live data";

  // Telemetry chips — only real values
  const chips: { icon: ComponentType<{ className?: string }>; label: string; value: string; accent?: string }[] = [
    { icon: Activity, label: "AQI", value: String(city.aqi), accent: band.color },
    { icon: Thermometer, label: "Temp", value: `${city.temp}°C` },
  ];
  if (typeof city.humidity === "number") chips.push({ icon: Droplets, label: "Humidity", value: `${city.humidity}%` });
  if (typeof city.windSpeed === "number") chips.push({ icon: Wind, label: "Wind", value: `${city.windSpeed} km/h` });
  if (typeof city.pressure === "number") chips.push({ icon: Gauge, label: "Pressure", value: `${city.pressure} hPa` });

  const springTransition = { type: "spring" as const, stiffness: 260, damping: 24 };
  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: springTransition },
  };

  return (
    <motion.div
      className={cn("relative", className)}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Outer glass shell */}
      <div
        className="relative rounded-3xl overflow-hidden border border-white/10"
        style={{
          background: "linear-gradient(135deg, oklch(1 0 0 / 0.06) 0%, oklch(1 0 0 / 0.03) 100%)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          boxShadow: `0 0 0 1px oklch(1 0 0 / 0.06) inset, 0 24px 80px -20px oklch(0 0 0 / 0.6), 0 0 60px -30px ${band.color}40`,
        }}
      >
        {/* Accent glow behind the ring area */}
        <div
          className="absolute top-0 right-0 w-[55%] h-[120%] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 70% 30%, ${band.color}18 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />

        {/* Header strip */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.06]"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="size-7 rounded-lg grid place-items-center"
              style={{ background: `color-mix(in oklab, ${band.color} 20%, transparent)`, color: band.color }}
            >
              <Cpu className="size-3.5" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium">
              Environmental Command Center
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/30">{updatedLabel}</span>
            <LiveBadge live={isApiConnected} />
          </div>
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">

          {/* Left zone — Location, AQI, telemetry chips */}
          <motion.div variants={itemVariants} className="p-6 md:p-8 flex flex-col gap-5">
            {/* Location header */}
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-white/40 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white/95">
                  {city.name}
                  {city.country && (
                    <span className="text-white/45 font-normal"> · {city.country}</span>
                  )}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">Environmental Overview</p>
              </div>
            </div>

            {/* AQI display */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35 mb-1.5">
                Air Quality Index
              </div>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-7xl font-bold tabular-nums tracking-tighter leading-none"
                  style={{ color: band.color }}
                  aria-label={`AQI ${city.aqi} — ${band.label}`}
                >
                  {city.aqi}
                </span>
                <AqiPill label={band.label} color={band.color} />
              </div>
            </div>

            {/* Telemetry chips */}
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <TelemetryChip key={c.label} icon={c.icon} label={c.label} value={c.value} accent={c.accent} />
              ))}
            </div>
          </motion.div>

          {/* Center zone — Environmental Health Score ring */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center p-6 md:p-8 lg:px-10"
          >
            <FloatingTiltCard>
              <div
                className="relative rounded-2xl border border-white/10 p-6 flex flex-col items-center gap-4"
                style={{
                  background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${band.color}12 0%, oklch(1 0 0 / 0.04) 100%)`,
                }}
              >
                <ScoreRing score={healthScore} color={band.color} size={180} />

                {/* Score interpretation */}
                <div className="text-center max-w-[180px]">
                  <div className="text-xs font-medium text-white/80 leading-snug">
                    {healthText}
                  </div>
                </div>
              </div>
            </FloatingTiltCard>
          </motion.div>

          {/* Right zone — AI intelligence summary */}
          <motion.div variants={itemVariants} className="p-6 md:p-8 flex flex-col gap-4">
            {/* GreenGuard AI label */}
            <div className="flex items-center gap-2">
              <div
                className="size-6 rounded-md grid place-items-center"
                style={{ background: `color-mix(in oklab, var(--color-primary) 20%, transparent)`, color: "var(--color-primary)" }}
              >
                <Activity className="size-3" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium">
                GreenGuard AI
              </span>
            </div>

            {/* AI panels */}
            <div className="space-y-3 flex-1">
              {/* Environmental Status */}
              <div
                className="rounded-xl p-3.5 border border-white/[0.06]"
                style={{ background: "oklch(1 0 0 / 0.04)" }}
              >
                <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Environmental Status
                </div>
                <p className="text-sm text-white/75 leading-relaxed">{healthText}</p>
              </div>

              {/* Weather Impact */}
              <div
                className="rounded-xl p-3.5 border border-white/[0.06]"
                style={{ background: "oklch(1 0 0 / 0.04)" }}
              >
                <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">
                  Weather Impact
                </div>
                <p className="text-sm text-white/75 leading-relaxed">{weatherImpact}</p>
              </div>

              {/* Recommendation */}
              <div
                className="rounded-xl p-3.5 border border-white/[0.06]"
                style={{
                  background: `color-mix(in oklab, ${band.color} 10%, oklch(1 0 0 / 0.03))`,
                  borderColor: `color-mix(in oklab, ${band.color} 25%, transparent)`,
                }}
              >
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: `color-mix(in oklab, ${band.color} 70%, oklch(1 0 0 / 0.6))` }}>
                  Recommendation
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: `color-mix(in oklab, ${band.color} 90%, oklch(1 0 0))` }}>
                  {recommendation}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
