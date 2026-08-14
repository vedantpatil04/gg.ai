import { useMemo } from "react";
import { Map as MapIcon, Radio } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { LandingMapPreview } from "./LandingMapPreview";
import { ExperienceHeader, ExperienceCTA, FloatingInsightPanel } from "./shared";

/**
 * Hero-level composition: small label → headline → short supporting line →
 * the map itself, large, with one floating insight panel over it — not a
 * text block sitting beside an empty area. The map is the visual center of
 * gravity; nothing else in the section competes with it for width.
 */
export function SmartMapExperience() {
  const { cities, isApiConnected } = useCity();
  const avgAqi = useMemo(
    () => (cities.length ? Math.round(cities.reduce((sum, c) => sum + c.aqi, 0) / cities.length) : null),
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

      <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 px-4 sm:px-6 lg:px-10">
        <ExperienceHeader
          tone="info"
          eyebrow="Smart Map"
          title="Every zone, every hotspot, on one live map."
          sub="Real coordinates, real AQI-weighted markers, from the same tile layer and city data that power the production Smart Map."
        />

        <div className="relative">
          <LandingMapPreview />

          {avgAqi !== null && (
            <FloatingInsightPanel
              icon={Radio}
              label={isApiConnected ? "Live network average AQI" : "Network average AQI"}
              value={`${avgAqi} across ${cities.length} cities`}
              className="absolute bottom-5 left-5 hidden sm:flex"
            />
          )}
        </div>

        <ExperienceCTA to="/map" tone="info">
          <MapIcon className="size-4" />
          Open Smart Map
        </ExperienceCTA>
      </div>
    </section>
  );
}
