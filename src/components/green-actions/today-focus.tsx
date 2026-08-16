import { Wind, CircleCheck } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { StatusChip, type Tone } from "@/components/map/intelligence-ui";
import { bandToneFromLabel, AIR_FOCUS_BY_TONE } from "./green-actions-data";

/** Local tone → color mapping. `StatusChip`'s own mapping isn't exported,
 *  and this component needs the raw color (not just the chip) for the
 *  tinted anchor panel below, so it's kept small and local here. */
const TONE_COLOR: Record<Tone, string> = {
  critical: "var(--color-destructive)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
  good: "var(--color-success)",
  neutral: "var(--color-muted-foreground)",
};

/**
 * TodaysEnvironmentalFocus — Green Actions, Section 1.
 *
 * The visual anchor of the page: a single guidance panel, tinted subtly by
 * today's condition, leading with what to do rather than the raw number.
 * Reuses the same city context and AQI-band helper already powering the
 * Sustainability and Environmental Overview pages. No new data source, no
 * fabricated values — when a live reading isn't available, `useCity()`
 * already falls back to the existing offline city record, and the "neutral"
 * tone below covers the case where that fallback itself is unavailable.
 */
export function TodaysEnvironmentalFocus() {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);
  const tone = bandToneFromLabel(band.label);
  const focus = AIR_FOCUS_BY_TONE[tone];
  const color = TONE_COLOR[tone];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        border: `1px solid color-mix(in oklab, ${color} 22%, var(--card-border))`,
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 6%, var(--card-bg)) 0%, var(--card-bg) 60%)`,
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: color }}
        aria-hidden="true"
      />

      <div className="pl-5 pr-4 py-5 sm:pl-7 sm:pr-6 sm:py-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        <div
          className="size-11 rounded-xl grid place-items-center shrink-0"
          style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
        >
          <Wind className="size-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{focus.headline}</h3>
            <StatusChip tone={tone}>
              AQI {city.aqi} · {band.label}
            </StatusChip>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {focus.explanation}
          </p>

          <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 pt-1">
            {focus.actions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-sm">
                <CircleCheck className="size-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
