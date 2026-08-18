import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { AppLayout } from "@/components/app-layout";

/* ── Section 01: Current Environmental State ── */
import { CityEnvironmentalContext } from "@/components/environment/env-city-context";

/* ── Section 02: Current Conditions ── */
import { CurrentConditions } from "@/components/environment/env-current-conditions";

/* ── Section 03: Environmental State ── */
import { EnvironmentalState } from "@/components/environment/env-environmental-state";

/* ── Section 04: Understanding the Environment ── */
import { EnvironmentalUnderstanding } from "@/components/environment/env-understanding";

/* ── Section 05: Environmental Trends ── */
import { EnvironmentalTrend } from "@/components/environment/env-trends";

/* ── Section 06: Environmental Events ── */
import { EnvironmentalEvents } from "@/components/environment/env-events";

/* ── Section 07: Environmental Monitoring Network ── */
import { EnvironmentalExplore } from "@/components/environment/env-explore";

/* ── Section 08: Environmental Watch ── */
import { EnvironmentalWatch } from "@/components/environment/env-watch";

/* ── Section 09: Data & Monitoring Status ── */
import { DataMonitoringStatus } from "@/components/environment/env-data-status";

export const Route = createFileRoute("/environment")({
  head: () => ({ meta: [{ title: "Environmental Overview — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <EnvironmentOverview />
    </AppLayout>
  ),
});

/**
 * Environmental Overview / Environmental Observatory
 *
 * Information Flow:
 *   CURRENT → UNDERSTAND → ANALYZE → EXPLORE → MONITOR
 *
 * Structure:
 *   Section 01: Current Environmental State (Hero context, photograph, live status, summary)
 *   Section 02: Current Conditions (Air Quality & Atmospheric Conditions compact groups)
 *   Section 03: Environmental State (Deterministic state translations)
 *   Section 04: Understanding the Environment (Progressive disclosure for AQI & pollutants)
 *   Section 05: Environmental Trends (Metric & Range controls, responsive AreaChart)
 *   Section 06: Environmental Events (Compact timeline of meaningful detected changes)
 *   Section 07: Environmental Monitoring Network (Map & Area Comparison summary)
 *   Section 08: Environmental Watch (Deterministic operational signals)
 *   Section 09: Data & Monitoring Status (Credibility & telemetry metadata)
 */

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.02 } },
};

const sectionVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

function EnvironmentOverview() {
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? { hidden: {}, show: {} } : pageVariants;
  const itemVariant = prefersReducedMotion ? {} : sectionVariant;

  return (
    <div className="relative min-h-screen">
      <motion.div variants={variants} initial="hidden" animate="show">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 xl:px-10 space-y-6 sm:space-y-7 md:space-y-8 pt-6 sm:pt-8 md:pt-10">
          {/* ═══ SECTION 01 — CURRENT ENVIRONMENTAL STATE ═════════════════════ */}
          <motion.div variants={itemVariant}>
            <CityEnvironmentalContext />
          </motion.div>

          {/* ═══ SECTION 02 — CURRENT CONDITIONS ═════════════════════════════ */}
          <motion.div variants={itemVariant}>
            <CurrentConditions />
          </motion.div>

          {/* ═══ SECTION 03 — ENVIRONMENTAL STATE ════════════════════════════ */}
          <motion.div variants={itemVariant}>
            <EnvironmentalState />
          </motion.div>

          {/* ═══ SECTION 04 — UNDERSTANDING THE ENVIRONMENT ══════════════════ */}
          <motion.div variants={itemVariant}>
            <EnvironmentalUnderstanding />
          </motion.div>

          {/* ═══ SECTION 05 — ENVIRONMENTAL TRENDS ═══════════════════════════ */}
          <motion.div variants={itemVariant}>
            <EnvironmentalTrend />
          </motion.div>

          {/* ═══ SECTION 06 — ENVIRONMENTAL EVENTS ═══════════════════════════ */}
          <motion.div variants={itemVariant}>
            <EnvironmentalEvents />
          </motion.div>

          {/* ═══ SECTION 07 — ENVIRONMENTAL MONITORING NETWORK ═══════════════ */}
          <motion.div variants={itemVariant}>
            <EnvironmentalExplore />
          </motion.div>

          {/* ═══ SECTION 08 — ENVIRONMENTAL WATCH ════════════════════════════ */}
          <motion.div variants={itemVariant}>
            <EnvironmentalWatch />
          </motion.div>

          {/* ═══ SECTION 09 — DATA & MONITORING STATUS ════════════════════════ */}
          <motion.div variants={itemVariant}>
            <DataMonitoringStatus />
          </motion.div>
        </div>

        <div className="h-12 md:h-16" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
