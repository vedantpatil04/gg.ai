import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CloudRain,
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudLightning,
  Droplets,
  Gauge,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { aqiBand, forecastSeries } from "@/lib/mock-data";
import { generateWeatherData, type WeatherCondition } from "@/lib/map/weather-data";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { FORECAST_BACKDROP } from "@/assets/landing/imagery";
import { ExperienceCTA } from "./shared";
import { cn } from "@/lib/utils";

function WeatherIcon({ condition, className = "size-5" }: { condition: WeatherCondition; className?: string }) {
  if (condition === "clear") return <Sun className={cn("text-amber-400", className)} />;
  if (condition === "partly-cloudy") return <CloudSun className={cn("text-sky-300", className)} />;
  if (condition === "thunderstorm") return <CloudLightning className={cn("text-purple-400", className)} />;
  if (condition.includes("rain")) return <CloudRain className={cn("text-blue-400", className)} />;
  if (condition === "haze" || condition === "fog") return <CloudFog className={cn("text-slate-400", className)} />;
  return <Cloud className={cn("text-slate-300", className)} />;
}

/**
 * Forecast Intelligence Experience — Product Capability Showcase
 *
 * Deterministic, data-driven 5-day environmental forecast preview
 * communicating multi-day predictive capability without duplicating the full Forecast Center.
 */
export function ForecastIntelligenceExperience() {
  const { city } = useCity();
  const reducedMotion = useReducedMotion();

  const weather = useMemo(() => generateWeatherData(city), [city]);
  const aqiWeekly = useMemo(() => forecastSeries(city.aqi, city.aqi, 5), [city.aqi]);

  const days = useMemo(() => {
    return weather.daily.slice(0, 5).map((d, i) => {
      const predictedAqi = aqiWeekly[i]?.predicted ?? city.aqi;
      return {
        ...d,
        aqiPredicted: predictedAqi,
        band: aqiBand(predictedAqi),
      };
    });
  }, [weather.daily, aqiWeekly, city.aqi]);

  // Deterministic trend derivation across next 72 hours
  const trend = useMemo(() => {
    const day3Aqi = days[2]?.aqiPredicted ?? city.aqi;
    const diff = day3Aqi - city.aqi;
    if (diff <= -5) {
      return {
        label: "Improving Outlook",
        desc: "AQI projected to decrease over next 72h",
        icon: TrendingDown,
        tone: "text-success bg-success/15 border-success/30",
      };
    }
    if (diff >= 15) {
      return {
        label: "Elevated Risk Expected",
        desc: "Higher pollutant accumulation expected",
        icon: TrendingUp,
        tone: "text-warning bg-warning/15 border-warning/30",
      };
    }
    return {
      label: "Stable Conditions",
      desc: "Consistent air quality across 72h window",
      icon: Minus,
      tone: "text-info bg-info/15 border-info/30",
    };
  }, [days, city.aqi]);

  return (
    <section className="relative overflow-hidden py-14 lg:py-18">
      {/* Atmospheric backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-info)]/[0.04] to-background" />
        <div
          className="absolute inset-x-0 top-0 h-[50%] opacity-[0.12] dark:opacity-[0.06]"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          }}
        >
          <img
            src={FORECAST_BACKDROP.src}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: FORECAST_BACKDROP.position }}
            loading="lazy"
            decoding="async"
          />
        </div>
        <AtmosphereGlow reducedMotion={!!reducedMotion} />
      </div>

      <div className={LANDING_CONTAINER}>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* Left Column — Forecast Message & CTA */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-info)]">
              FORECAST INTELLIGENCE
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]">
              72 hours ahead, clearly in view.
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              GreenGuard provides multi-day atmospheric and air quality projections.
              Predictive dispersion modeling and sensor telemetry allow municipalities and citizens to anticipate conditions before they peak.
            </p>

            {/* Deterministic Forecast Trend Badge */}
            <div className={cn("inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold", trend.tone)}>
              <trend.icon className="size-4 shrink-0" />
              <div>
                <span className="font-bold">{trend.label}</span>
                <span className="opacity-80 font-normal ml-1.5 hidden sm:inline">· {trend.desc}</span>
              </div>
            </div>

            <div className="pt-2">
              <ExperienceCTA to="/forecast" tone="info">
                <CloudRain className="size-4" />
                Explore Forecast
              </ExperienceCTA>
            </div>
          </motion.div>

          {/* Right Column — Compact 5-Day Forecast Strip */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="rounded-3xl border border-border/70 bg-card/60 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  5-Day Outlook · <span className="text-foreground">{city.name}</span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground hidden sm:block">
                  Deterministic Model
                </div>
              </div>

              {/* 5-Day Cards Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                {days.map((d, i) => {
                  const isToday = i === 0;
                  return (
                    <div
                      key={d.dayLabel}
                      className={cn(
                        "rounded-2xl border p-3.5 flex flex-col justify-between transition-all",
                        isToday
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "border-border/50 bg-white/[0.015] hover:border-primary/25",
                      )}
                    >
                      {/* Day Label */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold tracking-wider",
                            isToday ? "text-primary font-extrabold" : "text-muted-foreground",
                          )}
                        >
                          {isToday ? "Today" : d.dayLabel}
                        </span>
                        <span
                          className="size-2 rounded-full"
                          style={{ background: d.band.color }}
                          title={`AQI ${d.aqiPredicted} (${d.band.label})`}
                        />
                      </div>

                      {/* Weather Icon */}
                      <div className="my-1.5 flex justify-center">
                        <WeatherIcon condition={d.condition} className="size-6 sm:size-7" />
                      </div>

                      {/* High / Low Temp */}
                      <div className="flex items-baseline justify-center gap-1 my-1">
                        <span className="text-base sm:text-lg font-bold tabular-nums text-foreground">
                          {d.tempHigh}°
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {d.tempLow}°
                        </span>
                      </div>

                      {/* Rain & AQI Badges */}
                      <div className="mt-2 pt-2 border-t border-border/40 space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Droplets className="size-2.5 text-blue-400" /> Rain
                          </span>
                          <span className="tabular-nums font-semibold text-foreground">{d.rainChance}%</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Gauge className="size-2.5 text-muted-foreground" /> AQI
                          </span>
                          <span className="tabular-nums font-bold" style={{ color: d.band.color }}>
                            {d.aqiPredicted}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Two soft, slow-drifting color blobs that sit over the real sky photo above. */
function AtmosphereGlow({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <div
        className={cn(
          "absolute right-[-10%] top-6 size-[550px] rounded-full opacity-[0.14] blur-[130px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-info) 60%, transparent), transparent 70%)",
        }}
      />
      <div
        className={cn(
          "absolute left-[-8%] bottom-0 size-[440px] rounded-full opacity-[0.10] blur-[120px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 50%, transparent), transparent 70%)",
          animationDelay: "-10s",
        }}
      />
    </>
  );
}
