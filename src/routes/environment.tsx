import { createFileRoute } from "@tanstack/react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/app-layout";
import { useCity } from "@/lib/city-context";

/* ── Feature components (untouched) ── */
import { ForecastOverview }          from "@/components/environment/env-forecast-overview";
import { PollutantsOverview }        from "@/components/environment/env-pollutants";
import { HealthRecommendation }      from "@/components/environment/env-health-recommendation";
import { EnvironmentalIntelligence } from "@/components/environment/env-intelligence";
import { EnvMap }                    from "@/components/environment/env-map";
import { NearbyCities }              from "@/components/environment";
import { EnvAlerts }                 from "@/components/environment/env-alerts";
import { EnvAmbientBackground }      from "@/components/environment/env-ambient-background";

/* ── Phase 1 architecture shells ── */
import { ExecIntelligenceStrip }     from "@/components/environment/env-metrics-strip";
import { EnvBentoSection }           from "@/components/environment/env-section";

/* ── Phase 2: cinematic hero with environmental identity ── */
import { CinematicHero }             from "@/components/environment/env-cinematic-hero";

export const Route = createFileRoute("/environment")({
  head: () => ({ meta: [{ title: "Environmental Overview — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <EnvironmentOverview />
    </AppLayout>
  ),
});

/**
 * Phase 2 — Environmental Identity & Executive Experience.
 *
 * Design Decision:
 *   The Citizen Dashboard  →  city identity (landmarks, skylines, iconic places)
 *   The Environmental Overview  →  environmental identity (forests, rivers,
 *   mountains, wetlands, renewable energy, ecosystems, atmospheric landscapes)
 *
 * This page is an Environmental Intelligence Workspace, not another dashboard.
 * Users ask: "Help me understand the environment" — not "How is my city today?"
 *
 * Changes from Phase 1:
 *  — Hero imagery is now environmental (forests / mountains / wetlands / stars)
 *  — Hero identity pill reads "Environmental Intelligence" not "GreenGuard AI"
 *  — AI panel title: "GreenGuard AI · Environmental Analysis" (not Briefing)
 *  — Analysis copy upgraded: Status / Risk / Conditions / Trend
 *  — Environmental Health Index shows score label + confidence
 *  — Section microcopy upgraded throughout (see labels below)
 *  — All business logic, APIs, routing, auth: unchanged
 *
 * Reading flow:
 *   Hero → Live telemetry → Pollutant analysis → AI intelligence →
 *   Forecast gateway → Health + spatial view → Regional comparison → Alerts
 */

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
};

function EnvironmentOverview() {
  const { city, isCityFetching, cityDataUpdatedAt, isApiConnected, refreshCity } = useCity();
  const queryClient     = useQueryClient();
  const isForecastFetch = useIsFetching({ queryKey: ["weather-forecast", city.id] }) > 0;
  const isAlertsFetch   = useIsFetching({ queryKey: ["active-alerts",    city.id] }) > 0;

  const handleRefresh = () => {
    refreshCity();
    queryClient.invalidateQueries({ queryKey: ["weather-forecast", city.id] });
    queryClient.invalidateQueries({ queryKey: ["active-alerts",    city.id] });
  };

  const isRefreshing = isCityFetching || isForecastFetch || isAlertsFetch;

  return (
    <div className="dark relative min-h-screen">
      <EnvAmbientBackground aqi={typeof city.aqi === "number" ? city.aqi : undefined} />

      <motion.div
        className="relative z-10"
        variants={pageVariants}
        initial="hidden"
        animate="show"
      >
        {/* ═══ ZONE 1 — ENVIRONMENTAL HERO ════════════════════════════════════
            Full-viewport environmental scene (forests / lakes / mountains).
            Identity: "Environmental Intelligence" not city name.
        ═════════════════════════════════════════════════════════════════════ */}
        <CinematicHero onRefresh={handleRefresh} isRefreshing={isRefreshing} />

        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 md:px-10 xl:px-14 2xl:px-16">

          {/* ═══ ZONE 2 — LIVE TELEMETRY ══════════════════════════════════════
              AQI + atmospheric metrics. No header — data speaks for itself.
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="pt-8 md:pt-10">
            <ExecIntelligenceStrip />
          </div>

          {/* ═══ ZONE 3 — POLLUTANT ANALYSIS ══════════════════════════════════
              Full-width. Every measured pollutant against WHO thresholds.
              Microcopy: "Pollutant Intelligence" / "What's in the air"
          ═════════════════════════════════════════════════════════════════════ */}
          <EnvBentoSection
            eyebrow="Pollutant Intelligence"
            title="What's in the air"
            description="Real-time breakdown of measured pollutants compared against WHO-aligned health thresholds."
            accent="cyan"
            size="feature"
            className="pt-16 md:pt-20"
          >
            <PollutantsOverview />
          </EnvBentoSection>

          {/* ═══ ZONE 4 — AI ENVIRONMENTAL ANALYSIS ══════════════════════════
              Editorial. Intelligence report, impact analysis, trends, guidance.
              Microcopy: "AI Environmental Analysis" (not "AI Summary")
          ═════════════════════════════════════════════════════════════════════ */}
          <EnvBentoSection
            eyebrow="AI Environmental Analysis"
            title="Environmental intelligence report"
            description="Composite environmental readings interpreted by GreenGuard's analytical model — not a medical assessment."
            accent="purple"
            size="editorial"
            className="pt-16 md:pt-20"
          >
            <EnvironmentalIntelligence />
          </EnvBentoSection>

          {/* ═══ ZONE 5 — FORECAST GATEWAY ════════════════════════════════════
              Accent panel — the component is the content, no separate header.
              Microcopy: "Forecast Center" / "Weather & forecast intelligence"
          ═════════════════════════════════════════════════════════════════════ */}
          <EnvBentoSection
            eyebrow="Forecast Center"
            title="Weather & forecast intelligence"
            description="Hourly, daily, and long-range forecasts with AI-powered predictive environmental analysis."
            accent="sky"
            size="accent"
            className="pt-16 md:pt-20"
          >
            <ForecastOverview />
          </EnvBentoSection>

          {/* ═══ ZONE 6 — HEALTH GUIDANCE + SPATIAL VIEW ═════════════════════
              Asymmetric 1 / 1.35. Health is narrower, map is wider.
              Microcopy: "Today's Health Guidance" / "Environmental Map"
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="pt-16 md:pt-20 grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-6 xl:gap-8 items-start">
            <EnvBentoSection
              eyebrow="Health Advisory"
              title="Today's health guidance"
              description="Personalised recommendations based on current air quality and atmospheric conditions."
              accent="emerald"
              size="compact"
            >
              <HealthRecommendation />
            </EnvBentoSection>

            <EnvBentoSection
              eyebrow="Spatial Intelligence"
              title="Environmental map"
              description="Live spatial view of air quality conditions across the wider region."
              accent="sky"
              size="compact"
            >
              <EnvMap />
            </EnvBentoSection>
          </div>

          {/* ═══ ZONE 7 — REGIONAL COMPARISON ════════════════════════════════
              Full-width. Live AQI across nearby cities, ranked and sorted.
              Microcopy: "Regional Intelligence" / "How does your region compare?"
          ═════════════════════════════════════════════════════════════════════ */}
          <EnvBentoSection
            eyebrow="Regional Intelligence"
            title="How does your region compare?"
            description="Live air quality rankings across nearby cities — updated in real time."
            accent="amber"
            size="feature"
            className="pt-16 md:pt-20"
          >
            <NearbyCities />
          </EnvBentoSection>

          {/* ═══ ZONE 8 — LIVE MONITORING FEED ═══════════════════════════════
              Full-width editorial. Active alerts and monitoring feed.
              Microcopy: "Live Monitoring" / "Environmental alerts & conditions"
          ═════════════════════════════════════════════════════════════════════ */}
          <EnvBentoSection
            eyebrow="Live Monitoring"
            title="Environmental alerts & conditions"
            description="Active advisories, threshold breaches, and real-time environmental monitoring events."
            accent="coral"
            size="editorial"
            className="pt-16 md:pt-20"
          >
            <EnvAlerts />
          </EnvBentoSection>

        </div>

        <div className="h-24 md:h-32" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
