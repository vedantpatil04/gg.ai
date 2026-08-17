import { Wind, Droplets, CircleCheck } from "lucide-react";
import type { City, AqiBandInfo } from "@/lib/mock-data";
import { StatusChip, type Tone } from "@/components/map/intelligence-ui";
import { getTodaysFocusContent, type FocusTopic } from "./green-actions-data";

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

function ConditionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/**
 * TodaysEnvironmentalFocus — Green Actions, Section 1.
 *
 * The visual anchor of the page: a single guidance panel, tinted subtly by
 * today's most relevant condition, leading with what to do rather than the
 * raw numbers. `city`, `band`, `tone`, and `topic` are all resolved once in
 * green-actions-page.tsx (the only place that calls useCity()) and passed
 * down here — no independent data fetching, no fabricated values. On wide
 * desktop layouts, a compact "Today's conditions" panel fills the extra
 * width with the two real readings behind the guidance (PM2.5, Water
 * Quality Index) rather than just stretching the existing content.
 */
export function TodaysEnvironmentalFocus({
  city,
  band,
  tone,
  topic,
}: {
  city: City;
  band: AqiBandInfo;
  tone: Tone;
  topic: FocusTopic;
}) {
  const focus = getTodaysFocusContent(topic, tone);
  const color = topic === "water" ? "var(--color-info)" : TONE_COLOR[tone];
  const Icon = topic === "water" ? Droplets : Wind;

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

      <div className="pl-5 pr-4 py-5 sm:pl-7 sm:pr-6 sm:py-6 flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 flex-1 min-w-0">
          <div
            className="size-11 rounded-xl grid place-items-center shrink-0"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            <Icon className="size-5" />
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

        {/* Today's conditions — real readings, gives the wide desktop layout
            something genuinely useful to fill rather than just stretching
            the panel above. Always both AQI and Water Quality, regardless
            of which one is driving today's headline. */}
        <div className="hidden lg:flex flex-col gap-2.5 lg:w-48 shrink-0 lg:border-l lg:border-border/50 lg:pl-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Today's conditions
          </div>
          <ConditionRow label="PM2.5" value={`${city.pm25} µg/m³`} />
          <ConditionRow label="Water quality" value={`${city.water}%`} />
        </div>
      </div>
    </div>
  );
}
