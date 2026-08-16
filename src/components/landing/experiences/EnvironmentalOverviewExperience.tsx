import { useReducedMotion } from "framer-motion";
import { Activity } from "lucide-react";
import { LiveAqiHero } from "@/components/environment/env-live-aqi-hero";
import { EnvironmentalMetrics } from "@/components/environment/env-environmental-metrics";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { ENVIRONMENTAL_OVERVIEW_BACKDROP } from "@/assets/landing/imagery";
import { ExperienceHeader, ExperienceCTA } from "./shared";
import { cn } from "@/lib/utils";

/**
 * A "product/data" composition rather than another centered card row: the
 * heading sits left, a real environmental photograph fades in low-opacity
 * along the bottom edge, and the live AQI/metrics panel reads as one
 * integrated data surface underneath.
 *
 * Built entirely from the real Environmental Overview components
 * (`LiveAqiHero`, `EnvironmentalMetrics`) — they already read from the
 * app's live city context with the app's own loading/error/empty states,
 * so there's nothing fake to fall back to here.
 */
export function EnvironmentalOverviewExperience() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      {/* Eco-toned backdrop: a real, low-opacity photograph (Belagavi's
          green hills — see src/assets/landing/imagery.ts) masked so it only
          shows through along the bottom edge, under a soft success-tinted
          glow. Purely decorative, so it's aria-hidden with empty alt text. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-success)]/[0.04] to-background" />
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] opacity-[0.16] dark:opacity-[0.1]"
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
            "absolute right-[-6%] top-8 size-[520px] rounded-full opacity-[0.14] blur-[120px]",
            !reducedMotion && "drift-blob",
          )}
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-success) 60%, transparent), transparent 70%)",
          }}
        />
      </div>

      <div className={`${LANDING_CONTAINER} flex flex-col gap-10`}>
        <ExperienceHeader
          tone="success"
          eyebrow="Environmental Overview"
          title="Every reading, in one continuously updating picture."
          sub="Air, water, and risk indicators for every monitored zone — live where the backend is connected, gracefully degraded where it isn't. No placeholder numbers."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-stretch">
          <LiveAqiHero className="h-full" />
          <EnvironmentalMetrics className="h-full" />
        </div>

        <ExperienceCTA to="/environment" tone="success">
          <Activity className="size-4" />
          Open Environmental Overview
        </ExperienceCTA>
      </div>
    </section>
  );
}
