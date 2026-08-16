import { Wind, CircleCheck } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { StatusChip } from "@/components/map/intelligence-ui";
import { Panel } from "@/components/ui-bits";
import { bandToneFromLabel, AIR_FOCUS_BY_TONE } from "./green-actions-data";

/**
 * TodaysEnvironmentalFocus — Green Actions, Section 1.
 *
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

  return (
    <Panel surface="card" className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        <div className="size-11 rounded-xl grid place-items-center shrink-0 bg-[color-mix(in_oklab,var(--color-info)_16%,transparent)] text-[var(--color-info)]">
          <Wind className="size-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="text-lg font-semibold tracking-tight">{focus.headline}</h3>
            <StatusChip tone={tone}>
              AQI {city.aqi} · {band.label}
            </StatusChip>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{focus.explanation}</p>

          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Recommended actions
            </div>
            <ul className="grid sm:grid-cols-3 gap-2">
              {focus.actions.map((action) => (
                <li
                  key={action}
                  className="flex items-start gap-2 text-sm rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                >
                  <CircleCheck className="size-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
