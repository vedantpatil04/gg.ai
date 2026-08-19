import { useReducedMotion } from "framer-motion";
import { CloudRain } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { ForecastAISummary } from "@/components/forecast/forecast-ai-summary";
import { ForecastDayCards } from "@/components/forecast/forecast-day-cards";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { FORECAST_BACKDROP } from "@/assets/landing/imagery";
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
    <section className="relative overflow-hidden py-14 lg:py-16">
      {/* Atmospheric backdrop: a real sky photograph (Kolkata — see
          src/assets/landing/imagery.ts) fading in low-opacity along the top
          edge, under the same soft info-tinted glow used before. Purely
          decorative, so it's aria-hidden with empty alt text. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-info)]/[0.05] to-background" />
        <div
          className="absolute inset-x-0 top-0 h-[60%] opacity-[0.14] dark:opacity-[0.08]"
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

      <div className={`${LANDING_CONTAINER} flex flex-col gap-8`}>
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

/** Two soft, slow-drifting color blobs that sit over the real sky photo above. */
function AtmosphereGlow({ reducedMotion }: { reducedMotion: boolean }) {
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
    </>
  );
}
