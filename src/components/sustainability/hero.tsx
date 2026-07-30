/**
 * hero.tsx — Phase 1 premium hero section
 *
 * Replaces the plain "EcoScore · {city}" header. Three-column layout:
 * left = identity/status, center = EcoScore preview, right = live
 * environmental summary. All values are passed in from already-fetched
 * city data (`useCity`) — no new API calls, no new business logic. Grade,
 * trend and AQI-band-tone are cheap presentational derivations computed
 * once in the route and passed down as props.
 *
 * Wind Speed and Weather Condition were called out in the phase brief's
 * hero copy, but the live `City` model (src/lib/mock-data.ts) and the
 * environmental API it's mapped from don't carry either field — there is
 * no live source for them. Rather than inventing a wind reading or a
 * synthesized "condition" string, this hero shows the five fields that
 * actually exist on live City data (AQI, Temp, Humidity, CO₂, Water
 * Quality), which keeps the "reuse existing live APIs, no new
 * calculations" rule intact. See the implementation report for the same
 * note.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Clock, RadioTower, TrendingUp, TrendingDown, Minus,
  Gauge, Thermometer, Droplets, CloudCog, Waves,
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

  // Tick the relative "Xs/m ago" label without needing new city data
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

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
      className="glass relative overflow-hidden rounded-3xl p-6 md:p-8"
    >
      {/* Ambient glow border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--color-primary) 18%, transparent)" }}
        aria-hidden="true"
      />
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-6 right-16 size-1.5 rounded-full bg-primary/50 floaty" style={{ animationDuration: "7s" }} />
        <div className="absolute bottom-10 right-1/3 size-1 rounded-full bg-info/50 floaty" style={{ animationDuration: "9s", animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/4 size-1 rounded-full bg-primary/40 floaty" style={{ animationDuration: "8s", animationDelay: "0.4s" }} />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left — identity & status */}
        <motion.div variants={fadeUp} custom={0} className="lg:col-span-4 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Sustainability Intelligence</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-2">
            <MapPin className="size-6 text-primary shrink-0" />
            {city.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={tone} pulse>{band}</StatusChip>
            <StatusChip tone={isApiConnected ? "good" : "neutral"}>
              {isApiConnected ? "Live data" : "Mock data"}
            </StatusChip>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} ·{" "}
              {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1.5">
              <RadioTower className="size-3.5" />
              Synchronized {relativeTime(lastSyncAt)}
            </span>
          </div>
        </motion.div>

        {/* Center — EcoScore preview */}
        <motion.div variants={fadeUp} custom={1} className="lg:col-span-4 grid place-items-center">
          <div className="relative h-48 w-48 grid place-items-center">
            <div
              className="absolute inset-0 rounded-full pulse-dot"
              style={{ boxShadow: "0 0 0 0 color-mix(in oklab, var(--color-primary) 45%, transparent)" }}
              aria-hidden="true"
            />
            <svg viewBox="0 0 200 200" className="h-48 w-48 -rotate-90">
              <circle cx="100" cy="100" r="82" stroke="var(--color-muted)" strokeWidth="10" fill="none" />
              <circle
                cx="100" cy="100" r="82" stroke="url(#hero-egr)" strokeWidth="10" fill="none"
                strokeLinecap="round" strokeDasharray={`${(city.eco / 100) * 515} 515`}
              />
              <defs>
                <linearGradient id="hero-egr" x1="0" x2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-info)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <div className="text-5xl font-semibold tabular-nums">
                <CountUp value={city.eco} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">EcoScore · Grade {grade}</div>
              <div
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium tabular-nums"
                style={{ color: trendColor }}
              >
                <TrendIcon className="size-3.5" />
                {trendDirection === "flat" ? "Stable" : `${trendValue} pts`}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right — live environmental summary */}
        <motion.div variants={fadeUp} custom={2} className="lg:col-span-4">
          <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Live environmental summary">
            {summary.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-white/4 px-3 py-2.5 flex items-center gap-2.5"
                aria-label={`${s.label}: ${s.value}${s.suffix}`}
              >
                <s.icon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                  <div className="text-sm font-semibold tabular-nums">
                    <CountUp value={s.value} decimals={s.decimals} />
                    {s.suffix}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
