/**
 * EnvironmentalTimeline — Phase 10 (new in this phase)
 *
 * A vertical timeline of significant environmental events derived from the
 * 7-day AQI history already fetched by the dashboard. No new API call.
 *
 * Events are produced by deriveTimelineEvents() below, which works through
 * the chartSeries in chronological order and picks out moments where the AQI
 * crossed a tier boundary, hit a daily peak/trough, or when today's reading
 * is notably different from yesterday's.
 *
 * All animations use Framer Motion transform/opacity only.
 * prefers-reduced-motion suppresses the reveal animation.
 */

import { Panel, EmptyState } from "@/components/ui-bits";
import { GlowCard } from "@/components/dashboard/motion-primitives";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { STAGGER, FADE_UP } from "@/lib/motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Droplets,
  Wind,
  CircleDot,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Event derivation ──────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  label: string; // Day label, e.g. "Mon" or "Today"
  description: string;
  kind: "improve" | "worsen" | "peak" | "trough" | "stable" | "now";
  aqi: number;
  /** If true this is the final (current) entry */
  isCurrent: boolean;
}

function aqiTier(aqi: number): string {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy-sg";
  if (aqi <= 200) return "unhealthy";
  return "very-unhealthy";
}

/**
 * Derives a concise set of timeline events from the already-fetched
 * chartSeries (7 daily history points). Avoids inventing data: every
 * event is a real observation from the actual values in the series.
 *
 * Rules:
 *  - If AQI tier crossed between two consecutive days → "improved" / "worsened"
 *  - Maximum value in the series → "peak"
 *  - Minimum value in the series (if not the same day as peak) → "trough"
 *  - Most recent point → "current conditions" (always shown last)
 *  - At most 5 events so the timeline doesn't become a scrolling wall
 */
export function deriveTimelineEvents(
  series: Array<{ label: string; aqi: number }>,
): TimelineEvent[] {
  if (series.length === 0) return [];

  const events: TimelineEvent[] = [];
  const seen = new Set<number>(); // indices already captured

  // Find peak and trough indices
  let peakIdx = 0,
    troughIdx = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].aqi > series[peakIdx].aqi) peakIdx = i;
    if (series[i].aqi < series[troughIdx].aqi) troughIdx = i;
  }

  // Tier crossings between consecutive days
  for (let i = 1; i < series.length - 1; i++) {
    // exclude last (current)
    const prev = aqiTier(series[i - 1].aqi);
    const curr = aqiTier(series[i].aqi);
    if (curr !== prev) {
      const improved = series[i].aqi < series[i - 1].aqi;
      events.push({
        id: `cross-${i}`,
        label: series[i].label,
        description: improved
          ? `Air quality improved from ${series[i - 1].aqi} to ${series[i].aqi} AQI.`
          : `Air quality declined from ${series[i - 1].aqi} to ${series[i].aqi} AQI.`,
        kind: improved ? "improve" : "worsen",
        aqi: series[i].aqi,
        isCurrent: false,
      });
      seen.add(i);
    }
  }

  // Peak day (unless it's the last point)
  if (peakIdx < series.length - 1 && !seen.has(peakIdx)) {
    events.push({
      id: `peak-${peakIdx}`,
      label: series[peakIdx].label,
      description: `Highest AQI of the week: ${series[peakIdx].aqi}.`,
      kind: "peak",
      aqi: series[peakIdx].aqi,
      isCurrent: false,
    });
    seen.add(peakIdx);
  }

  // Trough day (unless same as peak or last point)
  if (troughIdx !== peakIdx && troughIdx < series.length - 1 && !seen.has(troughIdx)) {
    events.push({
      id: `trough-${troughIdx}`,
      label: series[troughIdx].label,
      description: `Lowest AQI of the week: ${series[troughIdx].aqi}.`,
      kind: "trough",
      aqi: series[troughIdx].aqi,
      isCurrent: false,
    });
    seen.add(troughIdx);
  }

  // Sort by original index
  events.sort((a, b) => {
    const ai = parseInt(a.id.split("-")[1]);
    const bi = parseInt(b.id.split("-")[1]);
    return ai - bi;
  });

  // Trim to 4 max before the "Now" entry
  const trimmed = events.slice(-4);

  // Current conditions — always last
  const last = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  let nowDesc = `Current AQI: ${last.aqi}.`;
  if (prev) {
    const delta = last.aqi - prev.aqi;
    if (Math.abs(delta) >= 5) {
      nowDesc +=
        delta < 0 ? ` Down ${Math.abs(delta)} from yesterday.` : ` Up ${delta} from yesterday.`;
    }
  }

  trimmed.push({
    id: "now",
    label: "Now",
    description: nowDesc,
    kind: "now",
    aqi: last.aqi,
    isCurrent: true,
  });

  return trimmed;
}

// ─── Visual config per event kind ─────────────────────────────────────────────

function eventIcon(kind: TimelineEvent["kind"], aqi: number) {
  if (kind === "now") {
    const color =
      aqi <= 50
        ? "var(--color-success)"
        : aqi <= 100
          ? "var(--color-warning)"
          : "var(--color-destructive)";
    return { Icon: CircleDot, color };
  }
  if (kind === "improve") return { Icon: TrendingDown, color: "var(--color-success)" };
  if (kind === "worsen") return { Icon: TrendingUp, color: "var(--color-destructive)" };
  if (kind === "peak") return { Icon: Zap, color: "var(--color-warning)" };
  if (kind === "trough") return { Icon: CheckCircle2, color: "var(--color-success)" };
  return { Icon: Minus, color: "var(--color-muted-foreground)" };
}

// ─── Component ────────────────────────────────────────────────────────────────

const ITEM_VARIANT = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0 },
};

export function EnvironmentalTimeline({
  series,
  isLoading,
}: {
  series: Array<{ label: string; aqi: number }>;
  isLoading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  const events = deriveTimelineEvents(series);

  return (
    <GlowCard glowVar="--glow-chart" lift={false} className="p-0">
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              7-day history
            </div>
            <div className="text-base font-semibold tracking-tight mt-0.5">
              Environmental Timeline
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5" ref={ref}>
        {isLoading ? (
          <CardSkeleton rows={4} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Minus className="size-4" />}
            title="No timeline data available yet."
            description="Environmental history will appear here once at least two days of readings have been recorded."
          />
        ) : (
          <motion.div
            className="relative"
            variants={STAGGER(0.1)}
            initial={prefersReduced ? false : "hidden"}
            animate={inView ? "show" : "hidden"}
          >
            {/* Vertical connector line */}
            <div
              aria-hidden
              className="absolute left-[19px] top-2 bottom-2 w-px"
              style={{ background: "color-mix(in oklab, var(--color-border) 80%, transparent)" }}
            />

            <div className="space-y-1">
              {events.map((event, idx) => {
                const { Icon, color } = eventIcon(event.kind, event.aqi);
                const isLast = idx === events.length - 1;

                return (
                  <motion.div
                    key={event.id}
                    variants={ITEM_VARIANT}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-3 group"
                  >
                    {/* Dot / icon */}
                    <div
                      className="relative z-10 mt-2 shrink-0 size-9 rounded-full grid place-items-center transition-transform duration-150 group-hover:scale-110"
                      style={{
                        background: `color-mix(in oklab, ${color} 14%, var(--color-background))`,
                        border: `1.5px solid color-mix(in oklab, ${color} 35%, transparent)`,
                        boxShadow: isLast
                          ? `0 0 12px color-mix(in oklab, ${color} 30%, transparent)`
                          : "none",
                      }}
                    >
                      {isLast && !prefersReduced && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full pulse-dot"
                          style={{ background: color, opacity: 0 }}
                        />
                      )}
                      <Icon className="size-3.5" style={{ color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 rounded-xl p-3 transition-colors duration-150 group-hover:bg-muted/30">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color }}
                        >
                          {event.label}
                        </div>
                        <div
                          className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-full"
                          style={{
                            color,
                            background: `color-mix(in oklab, ${color} 10%, transparent)`,
                          }}
                        >
                          AQI {event.aqi}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </GlowCard>
  );
}
