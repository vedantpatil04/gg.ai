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
 * Environmental Overview — Executive Environmental Command Center.
 * Streamlined 10-step information hierarchy without metric duplication or cross-module leakage.
 */
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
    <div className="relative">
      {/* Decorative animated atmosphere */}
      <EnvAmbientBackground aqi={typeof city.aqi === "number" ? city.aqi : undefined} />

      {/* Executive Command Center Content Grid */}
      <div className="relative p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* 1. Hero Header */}
        <EnvPageHeader
          onRefresh={handleRefresh}
          isRefreshing={isCityFetching || isForecastFetching || isAlertsFetching}
          lastUpdated={isApiConnected ? cityDataUpdatedAt : undefined}
        />

        {/* 2. Executive Status */}
        <HeroCommandCenter />

        {/* 3. Current Conditions */}
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
      </div>
    </div>
  );
}
