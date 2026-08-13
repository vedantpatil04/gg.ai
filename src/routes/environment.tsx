import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AppLayout } from "@/components/app-layout";

/* ── Phase 1 foundation — City Environmental Context + Current Conditions ── */
import { CityEnvironmentalContext } from "@/components/environment/env-city-context";
import { CurrentConditions } from "@/components/environment/env-current-conditions";

/* ── Phase 2 — Understanding & Explanations ── */
import { EnvironmentalUnderstanding } from "@/components/environment/env-understanding";

/* ── Phase 3 — Relationships & Trends ── */
import { EnvironmentalTrend } from "@/components/environment/env-trends";

/* ── Phase 4 — Environmental Exploration ── */
import { EnvironmentalExplore } from "@/components/environment/env-explore";

/* ── Phase 5 — Grounded AI Assistance ── */
import { EnvironmentalInsight } from "@/components/environment/env-insight";

export const Route = createFileRoute("/environment")({
  head: () => ({ meta: [{ title: "Environmental Overview — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <EnvironmentOverview />
    </AppLayout>
  ),
});

/**
 * Environmental Overview — Phase 1: Foundation & Environmental Context.
 *
 * Information Architecture:
 *   Area 1: City Environmental Context (Contextual photograph, City Name, Live Status, Natural Summary)
 *   Area 2: Current Conditions (AQI Primary Gauge + Real Supporting Measurements)
 *   Area 3: Understanding & Explanations (Phase 2) — AQI meaning + scale,
 *           pollutant explanations, weather-measurement context.
 *   Area 4: Relationships & Trends (Phase 3) — verified-history-only AQI
 *           trend chart, direction, and a restrained comparison summary.
 *   Area 5: Environmental Exploration (Phase 4) — compact, read-only
 *           spatial view of monitored locations, linking out to the full
 *           Smart Map experience rather than duplicating it.
 *   Area 6: Grounded AI Assistance (Phase 5) — restrained, contextual AI
 *           entry point grounded in this city's current data, verified
 *           trend, and (when selected) Phase 4 location context.
 *   Area 7+: Clean foundation for future environmental sections.
 */

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
};

interface SelectedLocation {
  id: string;
  name: string;
  category: string;
  level: number;
}

function EnvironmentOverview() {
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? { hidden: {}, show: {} } : pageVariants;

  return (
    <div className="relative min-h-screen">
      <motion.div variants={variants} initial="hidden" animate="show">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 md:px-10 xl:px-14 2xl:px-16">
          {/* ═══ AREA 1 — CITY ENVIRONMENTAL CONTEXT ═════════════════════════ */}
          <div className="pt-8 md:pt-12">
            <CityEnvironmentalContext />
          </div>

          {/* ═══ AREA 2 — CURRENT CONDITIONS ═════════════════════════════════ */}
          <div className="pt-8 md:pt-10">
            <CurrentConditions />
          </div>

          {/* ═══ AREA 3 — UNDERSTANDING & EXPLANATIONS (Phase 2) ═════════════ */}
          <div className="pt-8 md:pt-10">
            <EnvironmentalUnderstanding />
          </div>

          {/* ═══ AREA 4 — RELATIONSHIPS & TRENDS (Phase 3) ═══════════════════ */}
          <div className="pt-8 md:pt-10">
            <EnvironmentalTrend />
          </div>

          {/* ═══ AREA 5 — ENVIRONMENTAL EXPLORATION (Phase 4) ════════════════ */}
          <div className="pt-8 md:pt-10">
            <EnvironmentalExplore onSelectionChange={setSelectedLocation} />
          </div>

          {/* ═══ AREA 6 — GROUNDED AI ASSISTANCE (Phase 5) ═══════════════════ */}
          <div className="pt-8 md:pt-10">
            <EnvironmentalInsight selectedLocation={selectedLocation} />
          </div>
        </div>

        <div className="h-16 md:h-24" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
