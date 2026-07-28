import { createFileRoute } from "@tanstack/react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
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
import { AiSummary } from "@/components/environment/env-ai-summary";
import { EnvMap } from "@/components/environment/env-map";
import { NearbyCities, EnvironmentalMetrics } from "@/components/environment/phase8";
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
 * Environmental Overview — layout built up across Phases 1–6.
 *
 * The "AQI & Weather Intelligence" section (Phase 3) has been removed.
 * Current section order: Hero Command Center → Live Metrics Strip →
 * Weather Forecast Center → Pollutant Intelligence → Environmental
 * Intelligence → AI Environmental Analysis → Health Recommendation
 * Center → Smart Map Preview → Nearby City Comparison → Environmental
 * Indicators → Live Alerts Timeline.
 */
function EnvironmentOverview() {
  const { city, isCityFetching, cityDataUpdatedAt, isApiConnected, refreshCity } = useCity();

  // Forecast, AQI Trend, and Alerts each own a separate query (different
  // data shape/cadence than the single city reading), so Header Refresh
  // needs to invalidate them too — same shared QueryClient, no new
  // fetching architecture. Hero Command Center, Live Metrics Strip,
  // Weather/Pollutants/Health Recommendation/Map/Nearby Cities/
  // Environmental Metrics all reuse the city query directly, so
  // refreshCity() already covers them — no extra invalidation needed.
  const queryClient = useQueryClient();
  const isForecastFetching = useIsFetching({ queryKey: ["weather-forecast", city.id] }) > 0;
  const isAlertsFetching = useIsFetching({ queryKey: ["active-alerts", city.id] }) > 0;

  const handleRefresh = () => {
    refreshCity();
    queryClient.invalidateQueries({ queryKey: ["weather-forecast", city.id] });
    queryClient.invalidateQueries({ queryKey: ["active-alerts", city.id] });
  };

  return (
    <div className="relative">
      {/* Decorative animated atmosphere — purely visual, pointer-events:none */}
      <EnvAmbientBackground aqi={typeof city.aqi === "number" ? city.aqi : undefined} />

      {/* Page content sits above the background (z-10 via relative stacking) */}
      <div className="relative p-4 md:p-8 space-y-10 max-w-[1600px] mx-auto">
        <EnvPageHeader
          onRefresh={handleRefresh}
          isRefreshing={isCityFetching || isForecastFetching || isAlertsFetching}
          lastUpdated={isApiConnected ? cityDataUpdatedAt : undefined}
        />

        <HeroCommandCenter />

        <LiveMetricsStrip />

        <EnvSection
          eyebrow="Upcoming"
          title="Weather forecast center"
          subtitle="Plan ahead with upcoming weather conditions, temperature trends, and precipitation intelligence for the selected location."
        >
          <ForecastOverview />
        </EnvSection>

        <EnvSection
          eyebrow="Air Quality Intelligence"
          title="Pollutant intelligence"
          subtitle="Understand the individual pollutants contributing to current air quality in the selected location."
        >
          <PollutantsOverview />
        </EnvSection>

        <EnvSection
          eyebrow="Intelligence"
          title="Environmental intelligence"
          subtitle="AI-powered insights derived from your current environmental conditions."
        >
          <EnvironmentalIntelligence />
        </EnvSection>

        <EnvSection
          eyebrow="AI Environmental Analysis"
          title="Environmental intelligence & smart recommendations"
          subtitle="Understand what is affecting your environment and what actions are recommended now."
        >
          <AiSummary />
        </EnvSection>

        <EnvSection
          eyebrow="Health Insights"
          title="Health recommendation center"
          subtitle="Guidance based on current air quality and conditions."
        >
          <HealthRecommendation />
        </EnvSection>

        <EnvSection
          eyebrow="Location"
          title="Smart map preview"
          subtitle="A compact view of the selected city's location and AQI reading."
        >
          <EnvMap />
        </EnvSection>

        <EnvSection
          eyebrow="Nearby Cities"
          title="Regional environmental comparison"
          subtitle="Compare AQI, weather, and environmental conditions across nearby cities."
        >
          <NearbyCities />
        </EnvSection>

        <EnvSection
          eyebrow="Analytics"
          title="Environmental indicators"
          subtitle="Additional water-quality and sustainability metrics for the selected city."
        >
          <EnvironmentalMetrics />
        </EnvSection>

        <EnvSection
          eyebrow="Environmental Alerts"
          title="Live monitoring & notifications"
          subtitle="Track environmental warnings, advisories, and live updates in real time."
        >
          <EnvAlerts />
        </EnvSection>
      </div>
    </div>
  );
}
