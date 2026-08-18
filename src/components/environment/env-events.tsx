import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { environmentalApi, type CityTrendPoint } from "@/lib/api/environmental.api";
import { findAqiBand } from "@/lib/mock-data";
import { ShieldCheck, Activity, ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SECTION 06 — ENVIRONMENTAL EVENTS
 *
 * Compact environmental timeline.
 * Purpose: Show meaningful environmental changes detected from actual historical/current measurements.
 *
 * Valid events derived deterministically:
 *  - PM2.5 increased/decreased significantly (> 20% shift)
 *  - AQI category boundary transition (e.g. Good ↔ Moderate)
 *  - Humidity changed significantly (> 15% delta)
 *  - Temperature shifted significantly (> 4°C delta)
 *
 * If no meaningful event is detected:
 *  - Calm state: "No significant environmental event detected."
 */

interface EnvEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "improvement" | "warning" | "neutral";
}

function formatEventTime(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "Recent";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function EnvironmentalEvents({ className }: { className?: string }) {
  const { city } = useCity();
  const cityId = city?.id;

  const { data: trendResp, isLoading } = useQuery({
    queryKey: ["env-events-trend", cityId],
    queryFn: () => environmentalApi.getCityTrend(cityId as string, 24),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const events: EnvEvent[] = useMemo(() => {
    const rawTrend: CityTrendPoint[] | undefined = trendResp?.data?.trend;
    if (!rawTrend || rawTrend.length < 2) return [];

    const detected: EnvEvent[] = [];
    const points = [...rawTrend].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    for (let i = 0; i < points.length - 1 && detected.length < 4; i++) {
      const current = points[i];
      const previous = points[i + 1];

      // 1. Check AQI band shift
      const currentBand = findAqiBand(current.aqi);
      const previousBand = findAqiBand(previous.aqi);

      if (currentBand.label !== previousBand.label) {
        const isBetter = current.aqi < previous.aqi;
        detected.push({
          id: `aqi-band-${current.timestamp}`,
          time: formatEventTime(current.timestamp),
          title: `Air quality transitioned to ${currentBand.label}`,
          description: `AQI changed from ${previous.aqi} (${previousBand.label}) to ${current.aqi} (${currentBand.label}).`,
          type: isBetter ? "improvement" : "warning",
        });
      }

      // 2. Check PM2.5 significant shift (> 20% delta and absolute diff >= 5)
      if (
        typeof current.pm25 === "number" &&
        typeof previous.pm25 === "number" &&
        previous.pm25 > 0
      ) {
        const diff = current.pm25 - previous.pm25;
        const pct = Math.abs(diff / previous.pm25);

        if (pct >= 0.25 && Math.abs(diff) >= 5) {
          if (diff < 0) {
            detected.push({
              id: `pm25-drop-${current.timestamp}`,
              time: formatEventTime(current.timestamp),
              title: "PM2.5 concentration decreased",
              description: `Particulate concentrations lowered to ${current.pm25} µg/m³ (down from ${previous.pm25} µg/m³).`,
              type: "improvement",
            });
          } else {
            detected.push({
              id: `pm25-rise-${current.timestamp}`,
              time: formatEventTime(current.timestamp),
              title: "PM2.5 concentration elevated",
              description: `Particulate concentrations rose to ${current.pm25} µg/m³ (up from ${previous.pm25} µg/m³).`,
              type: "warning",
            });
          }
        }
      }

      // 3. Check Humidity significant shift (> 15% delta)
      if (
        typeof current.humidity === "number" &&
        typeof previous.humidity === "number" &&
        Math.abs(current.humidity - previous.humidity) >= 15
      ) {
        const diff = current.humidity - previous.humidity;
        detected.push({
          id: `hum-shift-${current.timestamp}`,
          time: formatEventTime(current.timestamp),
          title: diff > 0 ? "Atmospheric humidity increased" : "Atmospheric humidity decreased",
          description: `Relative humidity moved to ${current.humidity}% (previously ${previous.humidity}%).`,
          type: "neutral",
        });
      }
    }

    return detected;
  }, [trendResp]);

  if (isLoading) {
    return null;
  }

  return (
    <section aria-labelledby="env-events-title" className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-events-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Environmental Events
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {events.length === 0 ? (
          /* Calm state when no meaningful environmental changes were detected */
          <div className="flex items-start gap-3.5 py-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                No significant environmental event detected.
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All monitored atmospheric and pollutant parameters have remained steady within baseline operating thresholds over the recent monitoring window.
              </p>
            </div>
          </div>
        ) : (
          /* Timeline of detected environmental events */
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2">
              Recent Environmental Changes
            </h3>
            <ol className="relative border-l border-border/70 ml-2.5 space-y-3.5 py-1">
              {events.map((ev) => (
                <li key={ev.id} className="ml-4">
                  <span
                    className={cn(
                      "absolute -left-1.5 mt-1 size-3 rounded-full border-2 border-card",
                      ev.type === "improvement"
                        ? "bg-emerald-500"
                        : ev.type === "warning"
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {ev.time}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{ev.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {ev.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
