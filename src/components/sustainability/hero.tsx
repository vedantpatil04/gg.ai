import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Clock, RadioTower, TrendingUp, TrendingDown, Minus,
  Gauge, Thermometer, Droplets, CloudCog, Waves, BarChart3, Award, Target, Sparkles, ChevronDown
} from "lucide-react";
import type { City } from "@/lib/mock-data";
import { StatusChip, type Tone } from "@/components/map/intelligence-ui";
import { CountUp } from "@/components/sustainability/count-up";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function relativeTime(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export function SustainabilityHero({
  city, isApiConnected, grade, band, tone, trendDirection, trendValue,
}: {
  city: City;
  isApiConnected: boolean;
  grade: string;
  band: string;
  tone: Tone;
  trendDirection: "up" | "down" | "flat";
  trendValue: number;
}) {
  const [now, setNow] = useState(() => new Date());
  const [lastSyncAt, setLastSyncAt] = useState(() => Date.now());
  const [, forceTick] = useState(0);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Re-stamp "last sync" whenever the live city payload changes identity
  useEffect(() => {
    setLastSyncAt(Date.now());
  }, [city]);

  // Tick relative label
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const TrendIcon = trendDirection === "up" ? TrendingUp : trendDirection === "down" ? TrendingDown : Minus;
  const trendColor =
    trendDirection === "up" ? "var(--color-success)" : trendDirection === "down" ? "var(--color-destructive)" : "var(--color-muted-foreground)";

  const summary = [
    { icon: Gauge, label: "AQI", value: city.aqi, decimals: 0, suffix: "" },
    { icon: Thermometer, label: "Temperature", value: city.temp, decimals: 0, suffix: "°C" },
    { icon: Droplets, label: "Humidity", value: city.humidity, decimals: 0, suffix: "%" },
    { icon: CloudCog, label: "CO₂", value: city.co2, decimals: 0, suffix: " ppm" },
    { icon: Waves, label: "Water quality", value: city.water, decimals: 0, suffix: "%" },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="glass relative overflow-hidden rounded-3xl p-5 sm:p-8 lg:p-10 border border-primary/20 shadow-2xl"
    >
      {/* Ambient glow border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--color-primary) 25%, transparent)" }}
        aria-hidden="true"
      />

      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-primary/20 blur-3xl floaty" style={{ animationDuration: "8s" }} />
        <div className="absolute -bottom-24 -right-20 size-96 rounded-full bg-info/15 blur-3xl floaty" style={{ animationDuration: "10s", animationDelay: "1s" }} />
      </div>

      <div className="relative space-y-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left — identity & status */}
          <motion.div variants={fadeUp} custom={0} className="lg:col-span-5 space-y-4">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary shrink-0" />
              Executive Sustainability Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight flex items-center gap-3">
              <MapPin className="size-8 sm:size-10 text-primary shrink-0" />
              {city.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusChip tone={tone} pulse>{band}</StatusChip>
              <StatusChip tone={isApiConnected ? "good" : "neutral"}>
                {isApiConnected ? "Live data" : "Mock data"}
              </StatusChip>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs sm:text-sm text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="size-4 text-primary shrink-0" />
                {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <RadioTower className="size-4 text-info shrink-0" />
                Synced {relativeTime(lastSyncAt)}
              </span>
            </div>
          </motion.div>

          {/* Center — EcoScore preview */}
          <motion.div variants={fadeUp} custom={1} className="lg:col-span-3 grid place-items-center">
            <div className="relative size-44 sm:size-52 grid place-items-center">
              <div
                className="absolute inset-0 rounded-full pulse-dot"
                style={{ boxShadow: "0 0 0 0 color-mix(in oklab, var(--color-primary) 45%, transparent)" }}
                aria-hidden="true"
              />
              <svg viewBox="0 0 200 200" className="size-44 sm:size-52 -rotate-90">
                <circle cx="100" cy="100" r="82" stroke="var(--color-muted)" strokeWidth="12" fill="none" />
                <circle
                  cx="100" cy="100" r="82" stroke="url(#hero-egr)" strokeWidth="12" fill="none"
                  strokeLinecap="round" strokeDasharray={`${(city.eco / 100) * 515} 515`}
                  style={{ transition: "stroke-dasharray 1s ease-out" }}
                />
                <defs>
                  <linearGradient id="hero-egr" x1="0" x2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-info)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <div className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tabular-nums tracking-tight">
                  <CountUp value={city.eco} />
                </div>
                <div className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">EcoScore · Grade {grade}</div>
                <div
                  className="mt-1.5 inline-flex items-center gap-1 text-xs sm:text-sm font-bold tabular-nums"
                  style={{ color: trendColor }}
                >
                  <TrendIcon className="size-4" />
                  {trendDirection === "flat" ? "Stable" : `${trendValue} pts`}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — live environmental summary */}
          <motion.div variants={fadeUp} custom={2} className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3" role="group" aria-label="Live environmental summary">
              {summary.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/80 bg-white/5 p-3 sm:p-3.5 flex items-center gap-3 hover:border-primary/40 transition-colors"
                  aria-label={`${s.label}: ${s.value}${s.suffix}`}
                >
                  <div className="size-8 sm:size-9 rounded-lg bg-muted/30 grid place-items-center shrink-0">
                    <s.icon className="size-4.5 sm:size-5 text-primary shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{s.label}</div>
                    <div className="text-base sm:text-lg font-bold tabular-nums">
                      <CountUp value={s.value} decimals={s.decimals} />
                      {s.suffix}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Executive Quick Navigation Buttons Bar ──────────────────────── */}
        <motion.div variants={fadeUp} custom={3} className="pt-4 border-t border-border/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
            <ChevronDown className="size-3.5 text-primary animate-bounce" />
            Quick Navigation Anchors
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:flex md:flex-wrap gap-2.5 sm:gap-3">
            <button
              onClick={() => scrollToSection("analytics")}
              className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold aurora text-primary-foreground flex items-center justify-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              <BarChart3 className="size-4 shrink-0" />
              <span>View Analytics</span>
            </button>
            <button
              onClick={() => scrollToSection("esg")}
              className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold glass hover:bg-muted/30 text-foreground flex items-center justify-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Award className="size-4 text-success shrink-0" />
              <span>View ESG Intelligence</span>
            </button>
            <button
              onClick={() => scrollToSection("sdg")}
              className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold glass hover:bg-muted/30 text-foreground flex items-center justify-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Target className="size-4 text-info shrink-0" />
              <span>View SDG Alignment</span>
            </button>
            <button
              onClick={() => scrollToSection("recommendations")}
              className="min-h-[48px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold glass hover:bg-muted/30 text-foreground flex items-center justify-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] col-span-2 sm:col-span-1"
            >
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>Jump to Recommendations</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
