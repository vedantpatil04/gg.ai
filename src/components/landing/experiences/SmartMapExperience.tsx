import { Map as MapIcon, Radio } from "lucide-react";
import { CITIES } from "@/lib/mock-data";
import { LandingMapPreview } from "./LandingMapPreview";
import { ExperienceHeader, ExperienceCTA, FloatingInsightPanel } from "./shared";

const AVG_AQI = Math.round(CITIES.reduce((sum, c) => sum + c.aqi, 0) / CITIES.length);

/**
 * Hero-level composition: small label → headline → short supporting line →
 * the map itself, large, with one floating insight panel over it — not a
 * text block sitting beside an empty area. The map is the visual center of
 * gravity; nothing else in the section competes with it for width.
 */
export function SmartMapExperience() {
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

      <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 px-4 sm:px-6 lg:px-10">
        <ExperienceHeader
          tone="info"
          eyebrow="Smart Map"
          title="Every sensor, every hotspot, on one live map."
          sub="Real coordinates, real AQI-weighted markers, live from the same tile layer that powers the production Smart Map."
        />

        <div className="relative">
          <LandingMapPreview />

          <FloatingInsightPanel
            icon={Radio}
            label="Network average AQI"
            value={`${AVG_AQI} across ${CITIES.length} cities`}
            className="absolute bottom-5 left-5 hidden sm:flex"
          />
        </div>

        <ExperienceCTA to="/map" tone="info">
          <MapIcon className="size-4" />
          Open Smart Map
        </ExperienceCTA>
      </div>
    </section>
  );
}
