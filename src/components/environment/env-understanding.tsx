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
import { EnvUnderstandingSkeleton } from "@/components/environment/env-loading-skeletons";
import { cn } from "@/lib/utils";

/**
 * SECTION 04 — UNDERSTANDING THE ENVIRONMENT
 *
 * "What do these measurements mean? Why do they matter?"
 *
 * Features:
 *  - Renamed from "Understanding These Readings" to "Understanding the Environment"
 *  - Compact AQI meaning and interactive scale
 *  - Progressive disclosure / expandable explanations for:
 *      • AQI
 *      • PM2.5, PM10, O₃ (whichever present in live data)
 *      • Temperature, Humidity, Wind, Pressure (whichever present in live data)
 *  - Default state is compact and breathable, never an overwhelming wall of text.
 */

function AqiScale({ aqi, band }: { aqi: number; band: AqiBandInfo }) {
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
        className="relative h-2 rounded-full overflow-hidden flex"
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

function AqiUnderstandingCard({ aqi }: { aqi: number }) {
  const band = findAqiBand(aqi);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
      <div>
        <h3 className="text-xs sm:text-sm font-semibold text-foreground">Understanding the AQI</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{AQI_MEANING}</p>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl sm:text-3xl font-bold tabular-nums"
          style={{ color: band.color, fontFamily: "var(--font-display)" }}
        >
          {aqi}
        </span>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">· {band.label}</span>
      </div>

      <AqiScale aqi={aqi} band={band} />

      <p className="text-xs leading-relaxed text-foreground/80 border-t border-border/50 pt-2.5">
        Current composite score across all standard monitored particulate and gaseous pollutants.
      </p>
    </div>
  );
}

function ExpandableItem({
  label,
  value,
  unit,
  shortDesc,
  fullDesc,
  commonSources,
  whyItMatters,
  currentReadingNote,
}: {
  label: string;
  value?: number;
  unit: string;
  shortDesc: string;
  fullDesc?: string;
  commonSources?: string;
  whyItMatters?: string;
  currentReadingNote?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/70 bg-card/60 px-3.5 py-2.5 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold text-foreground">{label}</span>
            {typeof value === "number" && (
              <span className="text-xs tabular-nums text-muted-foreground font-medium">
                {value} {unit}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{shortDesc}</p>
        </div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-primary cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1.5 py-1"
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Learn more about"} ${label}`}
          >
            {open ? "Less" : "Learn more"}
            <ChevronDown
              className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pt-3 mt-2.5 border-t border-border/50 space-y-2 text-xs">
          {fullDesc && (
            <div>
              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                What it is
              </span>
              <p className="mt-0.5 text-foreground/90 leading-relaxed">{fullDesc}</p>
            </div>
          )}
          {commonSources && (
            <div>
              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                Common sources
              </span>
              <p className="mt-0.5 text-foreground/90 leading-relaxed">{commonSources}</p>
            </div>
          )}
          {whyItMatters && (
            <div>
              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                Why it matters
              </span>
              <p className="mt-0.5 text-foreground/90 leading-relaxed">{whyItMatters}</p>
            </div>
          )}
          {currentReadingNote && (
            <div>
              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                Today&apos;s observation
              </span>
              <p className="mt-0.5 text-foreground/90 leading-relaxed">{currentReadingNote}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EnvironmentalUnderstanding({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError } = useCity();

  if (isCityListLoading) {
    return <EnvUnderstandingSkeleton className={className} />;
  }

  if (isCityError || !city || typeof city.aqi !== "number") {
    return null;
  }

  const band = findAqiBand(city.aqi);

  // Pollutants present in current city
  const pollutants = [
    typeof city.pm25 === "number"
      ? {
          key: "pm25",
          label: "PM2.5",
          value: city.pm25,
          unit: "µg/m³",
          info: POLLUTANT_EXPLANATIONS.pm25,
        }
      : null,
    typeof city.pm10 === "number"
      ? {
          key: "pm10",
          label: "PM10",
          value: city.pm10,
          unit: "µg/m³",
          info: POLLUTANT_EXPLANATIONS.pm10,
        }
      : null,
    typeof city.o3 === "number"
      ? {
          key: "o3",
          label: "O₃",
          value: city.o3,
          unit: "ppb",
          info: POLLUTANT_EXPLANATIONS.o3,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: number;
    unit: string;
    info: (typeof POLLUTANT_EXPLANATIONS)[string];
  }>;

  // Atmospheric items present in current city
  const atmospheric = [
    typeof city.temp === "number"
      ? {
          key: "temp",
          label: "Temperature",
          value: city.temp,
          unit: "°C",
          info: WEATHER_EXPLANATIONS.temp,
        }
      : null,
    typeof city.humidity === "number"
      ? {
          key: "humidity",
          label: "Humidity",
          value: city.humidity,
          unit: "%",
          info: WEATHER_EXPLANATIONS.humidity,
        }
      : null,
    typeof city.windSpeed === "number"
      ? {
          key: "wind",
          label: "Wind Speed",
          value: city.windSpeed,
          unit: "km/h",
          info: WEATHER_EXPLANATIONS.wind,
        }
      : null,
    typeof city.pressure === "number"
      ? {
          key: "pressure",
          label: "Atmospheric Pressure",
          value: city.pressure,
          unit: "hPa",
          info: WEATHER_EXPLANATIONS.pressure,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: number;
    unit: string;
    info: (typeof WEATHER_EXPLANATIONS)[string];
  }>;

  return (
    <section aria-labelledby="env-understanding-title" className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-understanding-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Understanding the Environment
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
        <AqiUnderstandingCard aqi={city.aqi} />

        <div className="space-y-2">
          {pollutants.map((p) => (
            <ExpandableItem
              key={p.key}
              label={p.label}
              value={p.value}
              unit={p.unit}
              shortDesc={p.info?.whatItIs ?? ""}
              fullDesc={p.info?.whatItIs}
              commonSources={p.info?.commonSources}
              whyItMatters={p.info?.whyItMatters}
              currentReadingNote={`Today's ${p.label} is ${p.value} ${p.unit} alongside an overall AQI of ${city.aqi} (${band.label}).`}
            />
          ))}

          {atmospheric.map((w) => (
            <ExpandableItem
              key={w.key}
              label={w.label}
              value={w.value}
              unit={w.unit}
              shortDesc={w.info?.description ?? ""}
              fullDesc={w.info?.description}
              currentReadingNote={`Current recorded ${w.label.toLowerCase()} is ${w.value} ${w.unit}.`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
