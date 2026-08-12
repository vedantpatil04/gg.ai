import { useReducedMotion } from "framer-motion";
import { Activity } from "lucide-react";
import { LiveAqiHero } from "@/components/environment/env-live-aqi-hero";
import { EnvironmentalMetrics } from "@/components/environment/env-environmental-metrics";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { ExperienceHeader, ExperienceCTA } from "./shared";
import { cn } from "@/lib/utils";

/**
 * A "product/data" composition rather than another centered card row: the
 * heading sits left, a layered terrain silhouette (illustration, not a
 * photo — see the note below) anchors the right side, and the live
 * AQI/metrics panel reads as one integrated data surface underneath.
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
      {/* Eco-toned backdrop. Real forest/river photography isn't available
          in this sandbox (no network access to source it), so a layered
          terrain silhouette stands in — an illustration, not a stock
          gradient, and easy to swap for a real photo later since it's the
          only visual element in this block. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[color:var(--color-success)]/[0.04] to-background" />
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
        <TerrainSilhouette />
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

/** A quiet, layered hill/terrain silhouette — illustration standing in for real environmental photography. */
function TerrainSilhouette() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-[45%] w-full opacity-[0.5]"
      viewBox="0 0 1200 300"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M0 220 L120 160 L260 200 L400 120 L560 190 L720 100 L900 180 L1050 130 L1200 190 L1200 300 L0 300 Z"
        fill="color-mix(in oklab, var(--color-success) 14%, transparent)"
      />
      <path
        d="M0 260 L150 210 L320 250 L480 190 L650 240 L820 170 L1000 230 L1200 200 L1200 300 L0 300 Z"
        fill="color-mix(in oklab, var(--color-success) 22%, transparent)"
      />
    </svg>
  );
}
