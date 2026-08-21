import { motion, useReducedMotion } from "framer-motion";
import { Wind, Droplets, Leaf, Zap, CloudFog, MapPin, Activity } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { ENVIRONMENTAL_OVERVIEW_BACKDROP } from "@/assets/landing/imagery";
import { ExperienceCTA } from "./shared";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview Experience — Product Capability Showcase
 *
 * Communicates how GreenGuard unifies diverse environmental indicators
 * (Air, Water, Green Canopy, Renewable Energy, and Carbon) into a single,
 * clear picture — without reproducing the full operational dashboard.
 */
export function EnvironmentalOverviewExperience() {
  const reducedMotion = useReducedMotion();
  const { city } = useCity();
  const band = findAqiBand(city.aqi);

  const greenCover = city.greenCover ?? 34;
  const renewableShare = city.renewableShare ?? 28;

  const signals = [
    {
      id: "water",
      icon: Droplets,
      label: "Water Quality",
      value: `${city.water}%`,
      sub: "Surface & potable purity",
      accent: "var(--color-info)",
    },
    {
      id: "green",
      icon: Leaf,
      label: "Green Canopy",
      value: `${greenCover}%`,
      sub: "Urban land area coverage",
      accent: "var(--color-success)",
    },
    {
      id: "renew",
      icon: Zap,
      label: "Renewable Energy",
      value: `${renewableShare}%`,
      sub: "Grid generation mix",
      accent: "var(--color-primary)",
    },
    {
      id: "carbon",
      icon: CloudFog,
      label: "Carbon Intensity",
      value: `${city.carbon.toFixed(1)} tCO₂`,
      sub: "Per capita annual rate",
      accent: "var(--color-warning)",
    },
  ];

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      {/* Eco-toned decorative backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-success)]/[0.03] to-background" />
        <div
          className="absolute inset-x-0 bottom-0 h-[50%] opacity-[0.14] dark:opacity-[0.08]"
          style={{
            maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)",
          }}
        >
          <img
            src={ENVIRONMENTAL_OVERVIEW_BACKDROP.src}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: ENVIRONMENTAL_OVERVIEW_BACKDROP.position }}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div
          className={cn(
            "absolute right-[-8%] top-12 size-[500px] rounded-full opacity-[0.12] blur-[120px]",
            !reducedMotion && "drift-blob",
          )}
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-success) 60%, transparent), transparent 70%)",
          }}
        />
      </div>

      <div className={LANDING_CONTAINER}>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Side — Product Message */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-success)]">
              ENVIRONMENTAL MONITORING
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]">
              See the environment clearly.
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              GreenGuard unifies air quality, water telemetry, urban green cover, and emissions indicators into one continuous picture.
              Complex environmental signals become immediately understandable for municipal operators and citizens alike.
            </p>

            <div className="pt-2">
              <ExperienceCTA to="/environment" tone="success">
                <Activity className="size-4" />
                Explore Environmental Data
              </ExperienceCTA>
            </div>
          </motion.div>

          {/* Right Side — Environmental Signals Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              {/* Header: Location & Live Signal Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-[color:var(--color-primary)]" />
                  <span className="font-display font-semibold text-base sm:text-lg">{city.name}</span>
                  <span className="text-xs text-muted-foreground">· {city.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/25">
                    <span className="size-1.5 rounded-full bg-success animate-pulse" />
                    Live Sensing
                  </span>
                </div>
              </div>

              {/* Primary Signal: Ambient Air Quality Spotlight */}
              <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                    <Wind className="size-5.5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Air Quality Index
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                      {city.aqi} <span className="text-sm font-medium text-muted-foreground">AQI</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:text-right">
                  <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30">
                    {band.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground hidden sm:block">
                    PM2.5: <span className="font-semibold text-foreground">{city.pm25} µg/m³</span>
                  </div>
                </div>
              </div>

              {/* Complementary Indicators Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {signals.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border/50 bg-white/[0.015] p-4 hover:border-primary/30 transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div
                        className="size-8 rounded-lg grid place-items-center shrink-0"
                        style={{
                          background: `color-mix(in oklab, ${s.accent} 15%, transparent)`,
                          color: s.accent,
                        }}
                      >
                        <s.icon className="size-4" aria-hidden="true" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                        {s.label}
                      </span>
                    </div>

                    <div className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight text-foreground">
                      {s.value}
                    </div>

                    <div className="text-[10px] text-muted-foreground truncate mt-1">
                      {s.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
