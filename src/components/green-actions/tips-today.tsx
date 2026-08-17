import type { Tone } from "@/components/map/intelligence-ui";
import { getTipsToday, tipsTodayContextNote, type FocusTopic } from "./green-actions-data";

/**
 * GreenGuardTipsToday — Green Actions, Section 6. The main Phase 2
 * intelligence surface: 3–5 tips selected from curated, approved guidance
 * based on today's relevant topic (see `topic`, resolved once in
 * green-actions-page.tsx), falling back gracefully to the evergreen
 * curated pool when neither AQI nor Water Quality needs particular
 * attention. Each tip is an emoji + short title + one-line explanation —
 * no numbering, no fake impact metrics. A 3-column grid on wide desktop
 * screens makes this read as a horizontal panel rather than a narrow list.
 */
export function GreenGuardTipsToday({ topic, tone }: { topic: FocusTopic; tone: Tone }) {
  const tips = getTipsToday(topic, tone);
  const note = tipsTodayContextNote(topic);

  return (
    <div>
      {note && <p className="text-sm text-muted-foreground mb-4">{note}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
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
    </div>
  );
}
