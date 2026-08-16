import { Sparkles } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { bandToneFromLabel, getTipsToday } from "./green-actions-data";

/**
 * GreenGuardTipsToday — Green Actions, Section 6.
 *
 * A compact set of 3–5 tips. Where existing AQI data indicates elevated
 * conditions, the air-quality-specific guidance leads; otherwise this
 * gracefully falls back to evergreen curated guidance. No recommendation
 * engine, no invented dynamic values — Phase 2 scope.
 */
export function GreenGuardTipsToday() {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);
  const tone = bandToneFromLabel(band.label);
  const tips = getTipsToday(tone);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-[var(--color-primary)]" />
        <h3 className="text-sm font-semibold tracking-tight">GreenGuard Tips Today</h3>
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {tips.map((tip, i) => (
          <li key={tip} className="flex items-start gap-2.5 text-sm">
            <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0 mt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground leading-snug">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
