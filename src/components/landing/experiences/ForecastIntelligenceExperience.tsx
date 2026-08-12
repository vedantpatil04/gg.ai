import { useReducedMotion } from "framer-motion";
import { CloudRain } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { ForecastAISummary } from "@/components/forecast/forecast-ai-summary";
import { ForecastDayCards } from "@/components/forecast/forecast-day-cards";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { ExperienceHeader, ExperienceCTA } from "./shared";
import { cn } from "@/lib/utils";

/**
 * An editorial composition rather than a side-by-side card pair: the AI
 * narrative reads as the centerpiece at a wider column, and the day
 * outlook runs beneath it as a full-width strip instead of a boxed-in
 * neighbor — a deliberately different rhythm from Environmental Overview's
 * two-column data panel.
 *
 * Built from the app's forecast subcomponents (`ForecastAISummary`,
 * `ForecastDayCards`) — both generate their output deterministically from
 * the live city record, no separate mock chart logic here.
 */
export function ForecastIntelligenceExperience() {
  const { city } = useCity();
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      {/* Atmospheric backdrop — a layered cloud silhouette standing in for
          real weather/radar photography, since this sandbox has no network
          access to source it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-info)]/[0.05] to-background" />
        <CloudLayers reducedMotion={!!reducedMotion} />
      </div>

      <div className={`${LANDING_CONTAINER} flex flex-col gap-10`}>
        <ExperienceHeader
          align="center"
          tone="info"
          eyebrow="Forecast Intelligence"
          title="72 hours ahead, explained in plain language."
          sub="A deterministic forecast narrative and a full week's outlook, generated from the same city record the platform uses everywhere else."
        />

        <div className="mx-auto w-full max-w-3xl">
          <ForecastAISummary city={city} />
        </div>

        <div className="w-full">
          <ForecastDayCards city={city} />
        </div>

        <ExperienceCTA to="/forecast" tone="info" className="mx-auto">
          <CloudRain className="size-4" />
          View Forecast Intelligence
        </ExperienceCTA>
      </div>
    </section>
  );
}

/** Two soft, slow-drifting cloud-layer shapes — illustration, not a photo. */
function CloudLayers({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <div
        className={cn(
          "absolute right-[-10%] top-6 size-[600px] rounded-full opacity-[0.16] blur-[130px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-info) 60%, transparent), transparent 70%)",
        }}
      />
      <div
        className={cn(
          "absolute left-[-8%] bottom-0 size-[480px] rounded-full opacity-[0.12] blur-[120px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 50%, transparent), transparent 70%)",
          animationDelay: "-10s",
        }}
      />
      <svg
        className="absolute inset-x-0 top-1/4 h-40 w-full opacity-[0.4]"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        fill="none"
      >
        <ellipse cx="180" cy="80" rx="220" ry="46" fill="color-mix(in oklab, var(--color-info) 10%, transparent)" />
        <ellipse cx="620" cy="50" rx="300" ry="54" fill="color-mix(in oklab, var(--color-info) 8%, transparent)" />
        <ellipse cx="1040" cy="90" rx="240" ry="44" fill="color-mix(in oklab, var(--color-info) 10%, transparent)" />
      </svg>
    </>
  );
}
