import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Map as MapIcon, Radio } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { LandingMapPreview } from "./LandingMapPreview";
import { ExperienceHeader, ExperienceCTA, FloatingInsightPanel } from "./shared";
import { LANDING_CONTAINER } from "@/components/landing/shared";

interface StoryStep {
  title: string;
  description: string;
}

const MAP_STORY_STEPS: readonly StoryStep[] = [
  {
    title: "See the geography",
    description:
      "Every monitored zone plotted on real coordinates, on the same tile layer that powers the production Smart Map — not a stylized mock of it.",
  },
  {
    title: "Identify environmental conditions",
    description:
      "AQI, sensor and water-quality layers are color-coded and toggleable, so conditions across an entire city are visible at a glance instead of buried in a table.",
  },
  {
    title: "Understand where attention is needed",
    description:
      "The highest-risk zones stand out immediately against the rest of the network — a starting point for operations teams, not a search.",
  },
] as const;

/**
 * Smart Map Experience — Product Capability Showcase
 *
 * Compact, balanced, and responsive two-column layout on desktop, transitioning
 * to a clean single-column sequence on mobile. The map occupies the primary visual
 * focus with the three progressive steps and CTA grouped in close proximity.
 */
export function SmartMapExperience() {
  const { cities, isApiConnected } = useCity();
  const reducedMotion = useReducedMotion();
  const avgAqi = useMemo(
    () =>
      cities.length ? Math.round(cities.reduce((sum, c) => sum + c.aqi, 0) / cities.length) : null,
    [cities],
  );

  return (
    <section className="relative overflow-hidden py-14 lg:py-18">
      {/* Satellite-inspired backdrop with a faint topographic grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-info)]/[0.04] to-background" />
        <div
          className="grid-bg absolute inset-0 opacity-[0.25]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 85%)",
          }}
        />
      </div>

      <div className={LANDING_CONTAINER}>
        <ExperienceHeader
          tone="info"
          eyebrow="Smart Map"
          title="Every zone, every hotspot, on one live map."
          sub="Real coordinates, real AQI-weighted markers, from the same tile layer and city data that power the production Smart Map."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* Left Column: Smart Map Visual Focus */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            <div className="relative">
              <LandingMapPreview className="h-[340px] sm:h-[400px] lg:h-[450px]" />

              {avgAqi !== null && (
                <FloatingInsightPanel
                  icon={Radio}
                  label={isApiConnected ? "Live network average AQI" : "Network average AQI"}
                  value={`${avgAqi} across ${cities.length} cities`}
                  className="absolute bottom-4 left-4 hidden sm:flex"
                />
              )}
            </div>
          </motion.div>

          {/* Right Column: Progressive Explanation Steps + CTA */}
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5 flex flex-col justify-center space-y-6"
          >
            <div className="space-y-5 sm:space-y-6">
              {MAP_STORY_STEPS.map((step, index) => (
                <div key={step.title} className="flex items-start gap-3.5 sm:gap-4">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-info/40 bg-info/10 font-mono text-[11px] font-bold text-info mt-0.5"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <ExperienceCTA to="/map" tone="info">
                <MapIcon className="size-4" />
                Open Smart Map
              </ExperienceCTA>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
