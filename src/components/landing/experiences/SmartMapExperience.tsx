import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Map as MapIcon, Radio } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { LandingMapPreview } from "./LandingMapPreview";
import { StickyProductStory, type StickyStoryStep } from "./StickyProductStory";
import { ExperienceHeader, ExperienceCTA, FloatingInsightPanel } from "./shared";

const MAP_STORY_STEPS: readonly StickyStoryStep[] = [
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
 * Phase 4: the map now sits inside `StickyProductStory` — on desktop it pins
 * in place while three short capability steps scroll past beside it; on
 * mobile the layout falls back to a simple stacked sequence (visual, then
 * each step). The map itself is untouched: `LandingMapPreview` still wraps
 * the real production `SmartMapCanvas` directly, with no overlay, no second
 * lifecycle and no interference with zoom/pan/controls — this only changes
 * how the section around it scrolls.
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
    <section className="relative overflow-hidden py-16 lg:py-20">
      {/* Satellite-inspired backdrop with a faint topographic grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-info)]/[0.05] to-background" />
        <div
          className="grid-bg absolute inset-0 opacity-[0.3]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 85%)",
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-10 px-4 sm:px-6 lg:px-10">
        <ExperienceHeader
          tone="info"
          eyebrow="Smart Map"
          title="Every zone, every hotspot, on one live map."
          sub="Real coordinates, real AQI-weighted markers, from the same tile layer and city data that power the production Smart Map."
        />

        <StickyProductStory
          steps={MAP_STORY_STEPS}
          accentColor="var(--color-info)"
          visual={
            // Transform-only (scale + opacity), so this never touches the
            // map's actual layout box or resizes its canvas — purely a
            // gentle "settle into place" as the section enters view, and
            // back as it leaves, per the brief's optional scroll-into-map
            // interaction (§7). Pointer events pass straight through to the
            // map at all times; nothing is overlaid on top of it.
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0.85, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <LandingMapPreview />

              {avgAqi !== null && (
                <FloatingInsightPanel
                  icon={Radio}
                  label={isApiConnected ? "Live network average AQI" : "Network average AQI"}
                  value={`${avgAqi} across ${cities.length} cities`}
                  className="absolute bottom-5 left-5 hidden sm:flex"
                />
              )}
            </motion.div>
          }
        />

        <ExperienceCTA to="/map" tone="info" className="mx-auto">
          <MapIcon className="size-4" />
          Open Smart Map
        </ExperienceCTA>
      </div>
    </section>
  );
}
