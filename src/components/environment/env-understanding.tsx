import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { AQI_BANDS, findAqiBand, type AqiBandInfo } from "@/lib/mock-data";
import {
  AQI_MEANING,
  POLLUTANT_EXPLANATIONS,
  WEATHER_EXPLANATIONS,
} from "@/lib/environmental-explanations";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EnvUnderstandingSkeleton } from "@/components/environment/env-loading-skeletons";
import { cn } from "@/lib/utils";

/**
 * EnvironmentalUnderstanding — Environmental Overview, Phase 2.
 *
 * "What do these measurements mean? Why do they matter?"
 *
 * Sits directly beneath Current Conditions (Phase 1) and reuses its data
 * and methodology rather than introducing a parallel one:
 *  — AQI severity comes from the existing `AQI_BANDS` / `findAqiBand`
 *    (the app's single source of truth, also used by Current Conditions
 *    and the City Environmental Context summary).
 *  — Only pollutants Current Conditions actually renders (PM2.5 / PM10 /
 *    O₃ — whichever are present on the live city record) get an
 *    explanation card; nothing is invented for fields the record doesn't
 *    have.
 *  — There is no separate per-pollutant severity system anywhere in the
 *    app, so "today's reading" copy for a pollutant is phrased around the
 *    overall AQI band rather than fabricating one.
 *  — Weather measurements (temperature/humidity/wind/pressure) get short,
 *    non-causal descriptions only — no claims about what's driving today's
 *    AQI, which is Phase 3 (relationships/trends) scope.
 *
 * Interaction model is deliberately contextual, not a stacked "What is
 * AQI? What is PM2.5?" wall: the AQI scale is always visible (compact),
 * pollutant detail expands in place via Collapsible ("Learn more"), and
 * weather context is a small inline Popover per measurement — all
 * keyboard-accessible, none hover-only.
 */

function AqiScale({ aqi, band }: { aqi: number; band: AqiBandInfo }) {
  // Bounded visual domain: the first five bands have real upper bounds
  // (50/100/150/200/300); the final "Hazardous" band is open-ended, so it's
  // given a fixed visual width equal to the previous segment rather than an
  // arbitrary/fabricated upper bound. The marker position is clamped to this
  // same domain.
  const domainMax = 400;
  let prevMax = 0;
  const segments = AQI_BANDS.map((b) => {
    const segMax = b.max === Infinity ? domainMax : b.max;
    const width = segMax - prevMax;
    const start = prevMax;
    prevMax = segMax;
    return { ...b, start, width };
  });

  const markerPct = (Math.min(Math.max(aqi, 0), domainMax) / domainMax) * 100;

  return (
    <div className="space-y-2">
      <div
        className="relative h-2.5 rounded-full overflow-hidden flex"
        role="img"
        aria-label={`Air quality scale. Current reading ${aqi}, in the ${band.label} range.`}
      >
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.width / domainMax) * 100}%`, background: s.color }}
            className="h-full first:rounded-l-full last:rounded-r-full"
            aria-hidden="true"
          />
        ))}
        <div
          className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full border-2 border-background shadow"
          style={{ left: `calc(${markerPct}% - 7px)`, background: band.color }}
          aria-hidden="true"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Good</span>
        <span className="hidden xs:inline">Moderate</span>
        <span className="hidden sm:inline">Unhealthy</span>
        <span>Hazardous</span>
      </div>
    </div>
  );
}

function AqiUnderstanding({ aqi }: { aqi: number }) {
  const band = findAqiBand(aqi);
  const interpretation = `Air quality is currently in the ${band.label} range.`;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Understanding the AQI</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{AQI_MEANING}</p>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: band.color, fontFamily: "var(--font-display)" }}
        >
          {aqi}
        </span>
        <span className="text-sm font-medium text-muted-foreground">· {band.label}</span>
      </div>

      <AqiScale aqi={aqi} band={band} />

      <p className="text-sm leading-relaxed text-foreground/90">{interpretation}</p>
    </div>
  );
}

function PollutantCard({
  pollutantKey,
  value,
  unit,
  aqi,
  band,
}: {
  pollutantKey: string;
  value: number;
  unit: string;
  aqi: number;
  band: AqiBandInfo;
}) {
  const [open, setOpen] = useState(false);
  const info = POLLUTANT_EXPLANATIONS[pollutantKey];
  if (!info) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{info.label}</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {value} {unit}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{info.whatItIs}</p>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1.5 py-1"
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Learn more about"} ${info.label}`}
          >
            {open ? "Hide" : "Learn more"}
            <ChevronDown
              className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pt-3 mt-3 border-t border-border space-y-2.5 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              What it is
            </p>
            <p className="mt-0.5 text-foreground/90 leading-relaxed">{info.whatItIs}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Common sources
            </p>
            <p className="mt-0.5 text-foreground/90 leading-relaxed">{info.commonSources}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Why it matters
            </p>
            <p className="mt-0.5 text-foreground/90 leading-relaxed">{info.whyItMatters}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Today's reading
            </p>
            <p className="mt-0.5 text-foreground/90 leading-relaxed">
              Today's {info.label} reading is {value} {unit}, measured alongside an overall AQI of{" "}
              {aqi}, which is currently in the {band.label} range.
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function WeatherItem({
  measureKey,
  value,
  unit,
}: {
  measureKey: string;
  value: number;
  unit: string;
}) {
  const info = WEATHER_EXPLANATIONS[measureKey];
  if (!info) return null;

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-muted-foreground">{info.label}</span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/70 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full shrink-0"
              aria-label={`What is ${info.label}?`}
            >
              <Info className="size-3.5" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-xs leading-relaxed p-3">
            {info.description}
          </PopoverContent>
        </Popover>
      </div>
      <span className="text-sm font-semibold tabular-nums shrink-0">
        {value}
        <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
      </span>
    </div>
  );
}

interface PollutantField {
  key: string;
  value: number;
  unit: string;
}

interface WeatherField {
  key: string;
  value: number;
  unit: string;
}

export function EnvironmentalUnderstanding({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError } = useCity();

  if (isCityListLoading) {
    return <EnvUnderstandingSkeleton className={className} />;
  }

  // Errors and the fully-empty case are already surfaced by Current
  // Conditions directly above this section — avoid stacking a second,
  // redundant empty/error state under it.
  if (isCityError || !city || typeof city.aqi !== "number") {
    return null;
  }

  const band = findAqiBand(city.aqi);

  const pollutants: PollutantField[] = [];
  if (typeof city.pm25 === "number")
    pollutants.push({ key: "pm25", value: city.pm25, unit: "µg/m³" });
  if (typeof city.pm10 === "number")
    pollutants.push({ key: "pm10", value: city.pm10, unit: "µg/m³" });
  if (typeof city.o3 === "number") pollutants.push({ key: "o3", value: city.o3, unit: "ppb" });

  const weatherFields: WeatherField[] = [];
  if (typeof city.temp === "number")
    weatherFields.push({ key: "temp", value: city.temp, unit: "°C" });
  if (typeof city.humidity === "number")
    weatherFields.push({ key: "humidity", value: city.humidity, unit: "%" });
  if (typeof city.windSpeed === "number")
    weatherFields.push({ key: "wind", value: city.windSpeed, unit: "km/h" });
  if (typeof city.pressure === "number")
    weatherFields.push({ key: "pressure", value: city.pressure, unit: "hPa" });

  return (
    <section aria-labelledby="env-understanding-title" className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-understanding-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Understanding These Readings
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4">
        <AqiUnderstanding aqi={city.aqi} />

        <div className="space-y-4">
          {pollutants.length > 0 && (
            <div className="space-y-2.5">
              {pollutants.map((p) => (
                <PollutantCard
                  key={p.key}
                  pollutantKey={p.key}
                  value={p.value}
                  unit={p.unit}
                  aqi={city.aqi}
                  band={band}
                />
              ))}
            </div>
          )}

          {weatherFields.length > 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-1 divide-y divide-border">
              {weatherFields.map((w) => (
                <WeatherItem key={w.key} measureKey={w.key} value={w.value} unit={w.unit} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
