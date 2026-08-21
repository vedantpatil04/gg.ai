import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Clock, RadioTower,
  Gauge, Thermometer, Droplets, CloudCog, Waves, Activity,
} from "lucide-react";
import type { City } from "@/lib/mock-data";
import { StatusChip, type Tone } from "@/components/map/intelligence-ui";
import { CountUp } from "@/components/sustainability/count-up";
import { formatRelativeTime } from "@/lib/format-time";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function SustainabilityHero({
  city, isApiConnected, grade, band, tone,
}: {
  city: City;
  isApiConnected: boolean;
  grade: string;
  band: string;
  tone: Tone;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const updatedLabel = city.updatedAt ? formatRelativeTime(city.updatedAt) : "Live";

  const summary = [
    { icon: Gauge, label: "AQI", value: city.aqi, decimals: 0, suffix: "" },
    { icon: Thermometer, label: "Temperature", value: city.temp, decimals: 0, suffix: "°C" },
    { icon: Droplets, label: "Humidity", value: city.humidity, decimals: 0, suffix: "%" },
    { icon: CloudCog, label: "CO₂", value: city.co2, decimals: 0, suffix: " ppm" },
    { icon: Waves, label: "Water Quality", value: city.water, decimals: 0, suffix: "%" },
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

      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-primary/15 blur-3xl floaty" style={{ animationDuration: "9s" }} />
      </div>

      <div className="relative space-y-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left — identity & status */}
          <motion.div variants={fadeUp} custom={0} className="lg:col-span-5 space-y-4">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-2">
              <Activity className="size-4 text-primary shrink-0" />
              SUSTAINABILITY OVERVIEW
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight flex items-center gap-3">
              <MapPin className="size-8 sm:size-10 text-primary shrink-0" />
              {city.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusChip tone={tone} pulse>{band}</StatusChip>
              <StatusChip tone={isApiConnected ? "good" : "neutral"}>
                {isApiConnected ? "Live Data" : "Mock Data"}
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
                Updated {updatedLabel}
              </span>
            </div>
          </motion.div>

          {/* Center — EcoScore visualization */}
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
              </div>
            </div>
          </motion.div>

          {/* Right — live environmental summary */}
          <motion.div variants={fadeUp} custom={2} className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3" role="group" aria-label="Current environmental conditions">
              {summary.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/80 bg-white/5 p-3 sm:p-3.5 flex items-center gap-3 hover:border-primary/40 transition-colors"
                  aria-label={`${s.label}: ${s.value != null ? `${s.value}${s.suffix}` : "Not available"}`}
                >
                  <div className="size-8 sm:size-9 rounded-lg bg-muted/30 grid place-items-center shrink-0">
                    <s.icon className="size-4.5 sm:size-5 text-primary shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{s.label}</div>
                    <div className="text-base sm:text-lg font-bold tabular-nums">
                      {s.value != null ? (
                        <>
                          <CountUp value={s.value} decimals={s.decimals} />
                          {s.suffix}
                        </>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">Not available</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
