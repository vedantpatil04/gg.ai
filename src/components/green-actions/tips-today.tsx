import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { bandToneFromLabel, getTipsToday } from "./green-actions-data";

/**
 * GreenGuardTipsToday — Green Actions, Section 6.
 *
 * A compact set of 3–4 tips, each with an emoji, a short title, and a
 * one-line explanation — no numbering, no fake impact metrics. Where
 * existing AQI data indicates elevated conditions, the air-quality-specific
 * tip leads; otherwise this gracefully falls back to evergreen curated
 * guidance. No recommendation engine, no invented dynamic values — Phase 2
 * scope.
 */
export function GreenGuardTipsToday() {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);
  const tone = bandToneFromLabel(band.label);
  const tips = getTipsToday(tone);

  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
      {tips.map((tip) => (
        <div key={tip.title} className="flex items-start gap-3">
          <span className="text-lg leading-none shrink-0 mt-0.5" aria-hidden="true">
            {tip.emoji}
          </span>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold tracking-tight">{tip.title}</h4>
            <p className="text-sm text-muted-foreground leading-snug">{tip.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
