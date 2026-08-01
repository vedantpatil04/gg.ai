import { createFileRoute } from "@tanstack/react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/app-layout";
import { useCity } from "@/lib/city-context";
import { EnvPageHeader } from "@/components/environment/env-page-header";
import { EnvSection } from "@/components/environment/env-section";
import { HeroCommandCenter } from "@/components/environment/env-hero-command-center";
import { LiveMetricsStrip } from "@/components/environment/env-metrics-strip";
import { ForecastOverview } from "@/components/environment/env-forecast-overview";
import { PollutantsOverview } from "@/components/environment/env-pollutants";
import { HealthRecommendation } from "@/components/environment/env-health-recommendation";
import { EnvironmentalIntelligence } from "@/components/environment/env-intelligence";
import { EnvMap } from "@/components/environment/env-map";
import { NearbyCities } from "@/components/environment";
import { EnvAlerts } from "@/components/environment/env-alerts";
import { EnvAmbientBackground } from "@/components/environment/env-ambient-background";

export const Route = createFileRoute("/environment")({
  head: () => ({ meta: [{ title: "Environmental Overview — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <EnvironmentOverview />
    </AppLayout>
  ),
});

/**
 * V3 Environmental Overview — Immersive Environmental Operating System.
 *
 * Layout: cinematic dark canvas with multi-layer animated atmosphere,
 * full-viewport hero, then Bento-style section grid below.
 *
 * Changes from previous version:
 *   - Outer wrapper forces dark rendering context so the background system
 *     always reads against the deep base — regardless of user OS theme.
 *     This matches the page's cinematic intent (comparable to a mapping
 *     or satellite intelligence tool).
 *   - Hero section removed from EnvSection wrapper — it occupies its own
 *     full visual zone.
 *   - Section grid uses a slightly narrower max-width with generous padding.
 *   - Framer Motion page-entrance stagger via containerVariants.
 *
 * All existing child components (EnvMap, NearbyCities, EnvAlerts, etc.)
 * are unchanged — only the wrapper layout and aesthetic context updated.
 */

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

function EnvironmentOverview() {
  const { city, isCityFetching, cityDataUpdatedAt, isApiConnected, refreshCity } = useCity();

  const queryClient = useQueryClient();
  const isForecastFetching = useIsFetching({ queryKey: ["weather-forecast", city.id] }) > 0;
  const isAlertsFetching = useIsFetching({ queryKey: ["active-alerts", city.id] }) > 0;

  const handleRefresh = () => {
    refreshCity();
    queryClient.invalidateQueries({ queryKey: ["weather-forecast", city.id] });
    queryClient.invalidateQueries({ queryKey: ["active-alerts", city.id] });
  };

  return (
    /*
     * Dark-mode forcing wrapper:
     * `dark` class on this div pushes Tailwind's dark-variant tokens down
     * into all child components, giving the cinematic dark background even
     * when the user's OS is in light mode. We don't touch the sidebar or
     * top-nav (those live outside AppLayout's content slot) — only this
     * content area is affected.
     */
    <div className="dark relative min-h-screen">
      {/* ── Cinematic atmosphere (fixed behind all content) ── */}
      <EnvAmbientBackground aqi={typeof city.aqi === "number" ? city.aqi : undefined} />

      {/* ── Scrollable content grid ── */}
      <motion.div
        className="relative z-10 p-4 md:p-8 space-y-10 max-w-[1600px] mx-auto"
        variants={pageVariants}
        initial="hidden"
        animate="show"
      >
        {/* 1. Masthead */}
        <EnvPageHeader
          onRefresh={handleRefresh}
          isRefreshing={isCityFetching || isForecastFetching || isAlertsFetching}
          lastUpdated={isApiConnected ? cityDataUpdatedAt : undefined}
        />

        {/* 2. Full-viewport hero command center */}
        <HeroCommandCenter />

        {/* 3. Live telemetry strip */}
        <LiveMetricsStrip />

        {/* 4. Weather Forecast */}
        <EnvSection
          eyebrow="Forecast"
          title="Weather forecast center"
          subtitle="Plan ahead with upcoming weather conditions, temperature trends, and precipitation intelligence."
        >
          <ForecastOverview />
        </EnvSection>

        {/* 5. Pollutant Intelligence */}
        <EnvSection
          eyebrow="Air Quality Intelligence"
          title="Pollutant intelligence"
          subtitle="Understand the individual pollutants contributing to current air quality."
        >
          <PollutantsOverview />
        </EnvSection>

        {/* 6. AI Environmental Intelligence */}
        <EnvSection
          eyebrow="AI Intelligence"
          title="AI environmental intelligence"
          subtitle="AI score breakdown, executive summary, and root-cause analysis."
        >
          <EnvironmentalIntelligence />
        </EnvSection>

        {/* 7. Smart Recommendations */}
        <EnvSection
          eyebrow="Health & Activity"
          title="Smart recommendations"
          subtitle="Actionable guidance for outdoor activities, sensitive groups, and environmental safety."
        >
          <HealthRecommendation />
        </EnvSection>

        {/* 8. Smart Map Preview */}
        <EnvSection
          eyebrow="Location"
          title="Smart map preview"
          subtitle="A compact GIS view of monitored locations and AQI readings."
        >
          <EnvMap />
        </EnvSection>

        {/* 9. Nearby Cities */}
        <EnvSection
          eyebrow="Regional Comparison"
          title="Nearby city analysis"
          subtitle="Compare environmental performance across neighboring urban areas."
        >
          <NearbyCities />
        </EnvSection>

        {/* 10. Environmental Alerts */}
        <EnvSection
          eyebrow="Live Monitoring"
          title="Environmental alerts"
          subtitle="Active notifications, advisory timeline, and severity filters."
        >
          <EnvAlerts />
        </EnvSection>

        {/* Bottom breathing room */}
        <div className="h-8" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
