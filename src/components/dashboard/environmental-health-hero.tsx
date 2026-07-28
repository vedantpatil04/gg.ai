import { Panel } from "@/components/ui-bits";
import { HeroSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { AnimatedNumber, MotionCard } from "@/components/dashboard/motion-primitives";
import type { EnvHealthBand } from "@/lib/environmental-health";
import { FADE_UP, SPRING_SLOW, DUR_XL, EASE_OUT } from "@/lib/motion";
import { Gauge, ThermometerSun, Droplets, Wind, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

function MiniStat({
  icon: Icon,
  label,
  value,
  unit,
  animate = false,
  numericValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  animate?: boolean;
  numericValue?: number;
}) {
  return (
    <MotionCard lift="sm" className="rounded-xl bg-muted/40 p-4 group">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider">
        <Icon className="size-3.5 transition-colors group-hover:text-primary" /> {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        {animate && numericValue != null ? (
          <AnimatedNumber target={numericValue} className="text-xl font-semibold tabular-nums" />
        ) : (
          <span className="text-xl font-semibold tabular-nums">{value}</span>
        )}
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </MotionCard>
  );
}

export function EnvironmentalHealthHero({
  score,
  band,
  aqi,
  aqiBand,
  mainPollutant,
  temp,
  humidity,
  windSpeed,
  lastUpdated,
  isLoading,
}: {
  score: number;
  band: EnvHealthBand;
  aqi: number;
  aqiBand: { label: string; color: string };
  mainPollutant?: { label: string; value: number };
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  lastUpdated: string;
  isLoading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      variants={FADE_UP}
      initial={prefersReduced ? false : "hidden"}
      animate={inView ? "show" : "hidden"}
    >
      <Panel eyebrow="Overview" title="Environmental Health Score" id="environmental-health">
        {isLoading ? (
          <HeroSkeleton />
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Animated score ring */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative size-32 group">
                {/* Breathing glow halo — outermost, CSS animation, GPU-only */}
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full pointer-events-none",
                    !prefersReduced && "breathing-glow",
                  )}
                  style={{
                    background: band.color,
                    filter: "blur(16px)",
                    opacity: 0.3,
                  }}
                />
                {/* Rotating highlight arc — a thin conic-gradient that slowly orbits */}
                {!prefersReduced && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    style={{
                      background: `conic-gradient(transparent 0deg, color-mix(in oklab, ${band.color} 60%, white) 30deg, transparent 60deg)`,
                    }}
                  />
                )}
                {/* Main conic ring */}
                <motion.div
                  className="relative size-32 rounded-full grid place-items-center"
                  initial={prefersReduced ? false : { rotate: -90, opacity: 0 }}
                  animate={inView ? { rotate: 0, opacity: 1 } : {}}
                  transition={{ duration: DUR_XL, ease: EASE_OUT }}
                  style={{
                    background: `conic-gradient(${band.color} ${score * 3.6}deg, color-mix(in oklab, ${band.color} 10%, transparent) 0deg)`,
                    filter: `drop-shadow(0 0 10px color-mix(in oklab, ${band.color} 38%, transparent))`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-background grid place-items-center">
                    <div className="text-center">
                      <div className="text-2xl font-semibold tabular-nums">
                        {inView && !prefersReduced ? <AnimatedNumber target={score} /> : score}
                      </div>
                      <div className="text-[10px] text-muted-foreground">/100</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Status badge */}
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, scale: 0.82 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.55, ...SPRING_SLOW }}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{
                  color: band.color,
                  background: `color-mix(in oklab, ${band.color} 10%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${band.color} 28%, transparent)`,
                }}
              >
                <span className="size-1.5 rounded-full" style={{ background: band.color }} />
                {band.label}
              </motion.div>
            </div>

            {/* Mini stats */}
            <motion.div
              className={cn("flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full")}
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.28, duration: 0.5 }}
            >
              <MiniStat
                icon={Gauge}
                label="AQI"
                value={String(aqi)}
                unit={aqiBand.label}
                animate={inView && !prefersReduced}
                numericValue={aqi}
              />
              <MiniStat
                icon={Flame}
                label="Main Pollutant"
                value={mainPollutant ? mainPollutant.label : "Not Available"}
              />
              <MiniStat
                icon={ThermometerSun}
                label="Temperature"
                value={temp != null ? String(temp) : "Not Available"}
                unit={temp != null ? "°C" : undefined}
                animate={inView && !!temp && !prefersReduced}
                numericValue={temp}
              />
              <MiniStat
                icon={Droplets}
                label="Humidity"
                value={humidity != null ? String(humidity) : "Not Available"}
                unit={humidity != null ? "%" : undefined}
                animate={inView && !!humidity && !prefersReduced}
                numericValue={humidity}
              />
              <MiniStat
                icon={Wind}
                label="Wind"
                value={windSpeed != null ? String(windSpeed) : "Not Available"}
                unit={windSpeed != null ? "km/h" : undefined}
                animate={inView && !!windSpeed && !prefersReduced}
                numericValue={windSpeed}
              />
              <MiniStat icon={Clock} label="Last Updated" value={lastUpdated} />
            </motion.div>
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
