/**
 * DataStatus — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 * Phase 2A: Correction & Production Polish
 *
 * Compact, enterprise-style connection/freshness strip. There is no
 * per-city "monitoring stations" concept in the current data model, so
 * this deliberately does NOT show a fabricated station count (e.g.
 * "12/12 stations reporting") — only states we can actually derive from
 * the live reading: connection status and how fresh environmental/weather
 * data is.
 *
 * Phase 2A fix: the connection pill previously read "Live" whenever the
 * API was reachable (`isConnected`), regardless of how stale the reading
 * actually was — so this card could show "● Live" directly above
 * "Environmental data — Delayed" for the same reading. The pill now uses
 * the same `freshness` state as the rest of the card (and as Current
 * Conditions), so "Live" only ever appears when the data is genuinely
 * current; a reachable-but-stale connection reads "Delayed", and a
 * reachable-but-truly-stale/missing reading reads "Unavailable".
 *
 * Phase 2A layout: reflowed from a stacked pill-row + 2-column grid into
 * one balanced 3-column row (connection · environmental · weather) so the
 * card uses the panel's available width instead of leaving most of it
 * empty. Environmental and weather data are kept as two distinct columns
 * — both currently read from the same underlying reading, so they show
 * the same state today, but each carries its own label/timestamp so a
 * future source with independently-tracked freshness doesn't require a
 * layout change.
 */

import { Panel, Pill } from "@/components/ui-bits";
import { freshnessColor, freshnessLabel, type DataFreshness } from "@/lib/data-freshness";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function FreshnessColumn({
  label,
  freshness,
  lastUpdatedLabel,
}: {
  label: string;
  freshness: DataFreshness;
  lastUpdatedLabel: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium" style={{ color: freshnessColor(freshness) }}>
        {freshnessLabel(freshness)}
      </div>
      {freshness !== "unavailable" && (
        <div className="text-xs text-muted-foreground mt-0.5">Updated {lastUpdatedLabel}</div>
      )}
    </div>
  );
}

export function DataStatus({
  isConnected,
  freshness,
  lastUpdatedLabel,
}: {
  isConnected: boolean;
  freshness: DataFreshness;
  lastUpdatedLabel: string;
}) {
  const prefersReduced = useReducedMotion();
  const dotColor = freshnessColor(freshness);
  const pillTone = !isConnected
    ? "muted"
    : freshness === "current"
      ? "success"
      : freshness === "delayed"
        ? "warning"
        : "muted";
  // Deliberately mirrors the Current Conditions/Data Status wording
  // ("Live" / "Data delayed" / "Data unavailable") so the same state is
  // never described two different ways on the same page. "Offline" is the
  // one addition here — it's the one place on the dashboard that actually
  // knows the API call itself failed, versus the reading merely being old.
  const connectionText = !isConnected
    ? "Offline"
    : freshness === "current"
      ? "Live"
      : freshness === "delayed"
        ? "Data delayed"
        : "Data unavailable";

  return (
    <Panel title="Data Status" surface="card">
      <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 sm:gap-1.5 sm:border-r sm:border-border sm:pr-6">
          <Pill tone={pillTone}>
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                isConnected && freshness === "current" && !prefersReduced && "pulse-dot",
              )}
              style={{ background: dotColor }}
            />
            {connectionText}
          </Pill>
          <div className="text-xs text-muted-foreground">
            {freshness === "unavailable" ? "Status unavailable" : `Updated ${lastUpdatedLabel}`}
          </div>
        </div>

        <FreshnessColumn label="Environmental data" freshness={freshness} lastUpdatedLabel={lastUpdatedLabel} />
        <FreshnessColumn label="Weather data" freshness={freshness} lastUpdatedLabel={lastUpdatedLabel} />
      </div>
    </Panel>
  );
}
