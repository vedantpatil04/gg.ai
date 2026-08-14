/**
 * DashboardHeader
 *
 * Phase 2: Production UI & Information Hierarchy — restraint pass (UI-only,
 * all existing props/exports preserved):
 *  - Removed the unused "--pill-glow" custom property and its dead "group"
 *    wrapper on the AQI pill (it had no visual effect; nothing consumed it)
 *  - Removed the blurred, scaling glow-ring layer behind "Issue advisory" —
 *    the aurora CTA now signals "primary action" through fill + a plain
 *    opacity hover rather than a pulsing halo, per the dashboard's calmer
 *    Phase 2 visual direction
 *  - Refresh/Export stay on the existing glass secondary-button treatment;
 *    Issue advisory remains the one clearly primary action
 *  - All motion still respects prefers-reduced-motion
 *
 * Phase 2A fix: the freshness badge used to pair an always-"Live" label
 * (true whenever the API was merely reachable) with a wall clock that
 * ticked every second — so it could read "Live · Updated 3:45:12 PM" while
 * Current Conditions and Data Status, reading the same city, correctly
 * said "Data delayed · Updated 24 min ago". The badge now takes the same
 * `freshness` value and real last-updated label the rest of the dashboard
 * uses, so this header can never contradict them. API connectivity is
 * still shown (via the icon and the offline retry affordance) but no
 * longer drives the freshness wording on its own.
 *
 * Backward compatible: same exports, same route import. `lastUpdated`
 * (raw wall-clock string) was replaced by `freshness` + `lastUpdatedLabel`
 * — the route already computes both for Current Conditions/Data Status.
 */

import { RefreshCw, Download, Megaphone, WifiOff, Signal } from "lucide-react";
import { Pill } from "@/components/ui-bits";
import type { EnvHealthBand } from "@/lib/environmental-health";
import { freshnessColor, type DataFreshness } from "@/lib/data-freshness";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { FADE_UP, TAP_PRESS, HOVER_LIFT_SM, DUR_MD, EASE_OUT } from "@/lib/motion";

export function DashboardHeader({
  cityName, country, band, envBand, isApiConnected,
  freshness, lastUpdatedLabel, onRefresh, isRefreshing, onExport, onAdvisory,
}: {
  cityName:        string;
  country:         string;
  band:            { label: string; color: string };
  envBand:         EnvHealthBand;
  isApiConnected:  boolean;
  freshness:       DataFreshness;
  lastUpdatedLabel:string;
  onRefresh:       () => void;
  isRefreshing?:   boolean;
  onExport:        () => void;
  onAdvisory:      () => void;
}) {
  const prefersReduced = useReducedMotion();

  const envTone =
    envBand.label === "Excellent" || envBand.label === "Healthy"
      ? "success"
      : envBand.label === "Moderate"
        ? "warning"
        : "destructive";

  const aqiTone =
    band.label === "Good" ? "success" : band.label === "Moderate" ? "warning" : "destructive";

  const freshnessDotColor = freshnessColor(freshness);
  const freshnessText =
    freshness === "current" ? "Live" : freshness === "delayed" ? "Data delayed" : "Data unavailable";

  return (
    <motion.header
      variants={FADE_UP}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
          Citizen dashboard
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          {cityName}, {country}
        </h1>

        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-sm">
          {/* Environmental health pill */}
          <motion.div whileHover={prefersReduced ? undefined : HOVER_LIFT_SM}>
            <Pill tone={envTone}>
              <span className="size-1.5 rounded-full" style={{ background: envBand.color }} />{" "}
              {envBand.label}
            </Pill>
          </motion.div>

          {/* AQI pill */}
          <motion.div whileHover={prefersReduced ? undefined : HOVER_LIFT_SM}>
            <Pill tone={aqiTone}>
              <span className="size-1.5 rounded-full" style={{ background: band.color }} />
              {" AQI "}
              {band.label}
            </Pill>
          </motion.div>

          {/* Data freshness indicator — Phase 2A: driven by the same
              `freshness` state as Current Conditions/Data Status (not raw
              API connectivity + a ticking clock), so this can never say
              "Live" while the rest of the dashboard reports stale data. */}
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: `color-mix(in oklab, ${freshnessDotColor} 10%, transparent)`,
              border: `1px solid color-mix(in oklab, ${freshnessDotColor} 30%, transparent)`,
              color: `color-mix(in oklab, ${freshnessDotColor} 85%, var(--color-foreground))`,
              transition: "background 0.3s, border-color 0.3s, color 0.3s",
            }}
          >
            {isApiConnected ? (
              <Signal className="size-3.5 shrink-0" />
            ) : (
              <WifiOff className="size-3.5 shrink-0" />
            )}
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                freshness === "current" && !prefersReduced && "pulse-dot",
              )}
              style={{ background: freshnessDotColor }}
            />
            {freshnessText}
            {freshness !== "unavailable" && (
              <span className="text-muted-foreground">· Updated {lastUpdatedLabel}</span>
            )}
          </div>

          {!isApiConnected && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              style={{ color: "var(--color-warning)" }}
              aria-label="Live connection unavailable, retry"
            >
              <WifiOff className="size-3.5" />
              Live connection unavailable — Retry
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <motion.button
          whileTap={prefersReduced ? undefined : TAP_PRESS}
          whileHover={prefersReduced ? undefined : HOVER_LIFT_SM}
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "glass rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5",
            "hover:bg-primary/8 hover:border-primary/35",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </motion.button>

        {/* Export */}
        <motion.button
          whileTap={prefersReduced ? undefined : TAP_PRESS}
          whileHover={prefersReduced ? undefined : HOVER_LIFT_SM}
          onClick={onExport}
          className={cn(
            "glass rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5",
            "hover:bg-primary/8 hover:border-primary/35",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <Download className="size-3.5" />
          Export
        </motion.button>

        {/* Issue Advisory — the one clearly-primary action in this row */}
        <motion.button
          whileTap={prefersReduced ? undefined : TAP_PRESS}
          onClick={onAdvisory}
          className={cn(
            "aurora text-primary-foreground rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5 font-medium",
            "hover:opacity-88 transition-opacity duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          )}
        >
          <Megaphone className="size-3.5" />
          Issue advisory
        </motion.button>
      </div>
    </motion.header>
  );
}
