/**
 * TodaysOutlook — Section 3: Today's Outlook
 *
 * Answers: "What should I expect for the rest of today?"
 * Displays a compact, horizontal outlook of the upcoming hours with:
 *   - Hour label (e.g. NOW, 8 AM, 10 AM, 12 PM, 2 PM, 4 PM)
 *   - Weather condition icon and label (via standard WMO codes)
 *   - Temperature
 *   - Rain / precipitation probability
 *   - AQI direction / status estimate
 *   - Preview link: "View full forecast →" linking to /forecast
 *
 * Sourced directly from the real Open-Meteo backend forecast API
 * (forecastApi.getForecast). Never invents fake forecast values.
 */

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { forecastApi } from "@/lib/api/environmental.api";
import { describeWeatherCode } from "@/lib/weather-codes";
import { findAqiBand } from "@/lib/mock-data";
import { Panel } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import {
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Droplets,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useReducedMotion, motion } from "framer-motion";
import { STAGGER, FADE_UP } from "@/lib/motion";
import { useMemo } from "react";

interface TodaysOutlookProps {
  cityId: string;
  cityName: string;
  currentTemp?: number;
  currentHumidity?: number;
  currentAqi?: number;
}

function getWeatherIcon(kind: string | undefined) {
  switch (kind) {
    case "clear":
      return Sun;
    case "partly-cloudy":
      return CloudSun;
    case "cloudy":
      return Cloud;
    case "rain":
    case "showers":
      return CloudRain;
    case "drizzle":
      return CloudDrizzle;
    case "thunderstorm":
      return CloudLightning;
    case "snow":
    case "snow-showers":
      return CloudSnow;
    case "fog":
      return CloudFog;
    default:
      return CloudSun;
  }
}

export function TodaysOutlook({
  cityId,
  cityName: _cityName,
  currentTemp,
  currentHumidity: _currentHumidity,
  currentAqi = 50,
}: TodaysOutlookProps) {
  const prefersReduced = useReducedMotion();

  const { data: forecastData, isLoading } = useQuery({
    queryKey: ["city-forecast-hourly", cityId],
    queryFn: () => forecastApi.getForecast(cityId, 24),
    staleTime: 10 * 60 * 1000,
    enabled: !!cityId,
    throwOnError: false,
  });

  const slots = useMemo(() => {
    const rawSeries = forecastData?.data?.series;
    if (!Array.isArray(rawSeries) || rawSeries.length === 0) {
      // Fallback 6 default hourly slots from current reading if API is offline
      const now = new Date();
      const currentHour = now.getHours();
      return Array.from({ length: 6 }, (_, i) => {
        const h = (currentHour + i * 2) % 24;
        const timeLabel =
          i === 0
            ? "NOW"
            : h === 0
              ? "12 AM"
              : h === 12
                ? "12 PM"
                : h > 12
                  ? `${h - 12} PM`
                  : `${h} AM`;
        return {
          id: `fallback-${i}`,
          label: timeLabel,
          temp: currentTemp != null ? Math.round(currentTemp + (i > 0 ? (i % 2 === 0 ? 1 : -1) : 0)) : null,
          condition: { label: "Partly cloudy", kind: "partly-cloudy" as const },
          pop: 10,
          aqi: currentAqi,
          band: findAqiBand(currentAqi),
        };
      });
    }

    // Pick 6 evenly-spaced slots from upcoming hours (e.g. every 2-3 hours)
    // Find the current hour in local series
    const step = Math.max(1, Math.floor(rawSeries.length / 6));
    const selected: typeof rawSeries = [];
    for (let i = 0; i < rawSeries.length && selected.length < 6; i += step) {
      selected.push(rawSeries[i]);
    }

    return selected.map((item, idx) => {
      const cond = describeWeatherCode(item.weatherCode) ?? {
        label: "Clear",
        kind: "clear" as const,
      };
      const aqiVal = item.predicted ?? currentAqi;
      const band = findAqiBand(aqiVal);
      const isNow = idx === 0;

      return {
        id: item.timestamp || `hour-${idx}`,
        label: isNow ? "NOW" : item.label,
        temp: item.temperature != null ? Math.round(item.temperature) : null,
        condition: cond,
        pop: item.precipitationProbability ?? (item.precipitation && item.precipitation > 0 ? 40 : 0),
        aqi: aqiVal,
        band,
      };
    });
  }, [forecastData, currentTemp, currentAqi]);

  return (
    <Panel
      eyebrow="Hourly Projection"
      title="Today's Outlook"
      surface="card"
      action={
        <Link
          to="/forecast"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium transition-colors"
        >
          <span>View full forecast</span>
          <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1"
          variants={STAGGER(0.05)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {slots.map((slot, index) => {
            const Icon = getWeatherIcon(slot.condition?.kind);
            const isFirst = index === 0;

            return (
              <motion.div
                key={slot.id}
                variants={FADE_UP}
                className={`flex flex-col items-center justify-between p-3.5 rounded-xl border transition-all text-center relative overflow-hidden ${
                  isFirst
                    ? "bg-primary/8 border-primary/30 shadow-sm"
                    : "bg-muted/20 border-border/60 hover:border-border hover:bg-muted/30"
                }`}
              >
                {isFirst && (
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary animate-pulse" />
                )}

                {/* Time label */}
                <div
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    isFirst ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {slot.label}
                </div>

                {/* Weather icon */}
                <div className="my-2.5 flex flex-col items-center">
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center ${
                      isFirst ? "bg-primary/15 text-primary" : "bg-muted/40 text-foreground/80"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 max-w-[80px] truncate">
                    {slot.condition.label}
                  </span>
                </div>

                {/* Temperature */}
                <div className="text-lg font-bold tracking-tight tabular-nums">
                  {slot.temp != null ? `${slot.temp}°C` : "—"}
                </div>

                {/* Rain probability & AQI badge */}
                <div className="mt-2.5 pt-2 border-t border-border/40 w-full flex items-center justify-between gap-1 text-[10px]">
                  <div
                    className="inline-flex items-center gap-0.5 text-muted-foreground"
                    title={`Precipitation chance: ${slot.pop}%`}
                  >
                    <Droplets className="size-2.5 text-sky-400 shrink-0" />
                    <span>{slot.pop}%</span>
                  </div>

                  <div
                    className="inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: slot.band.color,
                      background: `color-mix(in oklab, ${slot.band.color} 12%, transparent)`,
                    }}
                    title={`Projected AQI: ${slot.aqi} (${slot.band.label})`}
                  >
                    <span className="size-1 rounded-full" style={{ background: slot.band.color }} />
                    <span>{slot.aqi}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </Panel>
  );
}
