import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CloudSun, ArrowRight, TrendingUp, TrendingDown, Minus,
  Wind, Droplets, Thermometer, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { environmentalApi } from "@/lib/api/environmental.api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Phase 4 — Forecast Gateway: Intelligent Environmental Preview.
 *
 * Upgrades over Phase 3:
 *
 *  1. When forecast data is available, shows a compact intelligence preview:
 *     - Expected AQI trend (improving / stable / worsening) derived from
 *       the forecast days array — no fabrication, computed from real data.
 *     - Key condition changes: temperature range, precipitation indicator,
 *       wind shift — each phrased as a natural language sentence.
 *     - AI confidence indicator (derived from data availability).
 *     - Pollution outlook sentence.
 *
 *  2. When forecast is unavailable, the gateway card still shows current
 *     conditions as context, so the section is never empty.
 *
 *  3. The CTA button is always visible — this remains a gateway, not a
 *     full forecast module.
 *
 * All data from existing getCityWeatherForecast endpoint — no new API calls.
 */

// ─── Forecast day shape (matches what the API returns) ───────────────────────

interface ForecastDay {
  date?: string;
  aqi?: number;
  avgAqi?: number;
  temp?: number;
  maxTemp?: number;
  minTemp?: number;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
  description?: string;
}

// ─── Derived intelligence from forecast data ──────────────────────────────────

function deriveForecastIntelligence(
  currentAqi: number,
  days: ForecastDay[],
): {
  aqiTrend: "improving" | "stable" | "worsening";
  aqiTrendLabel: string;
  pollutionOutlook: string;
  weatherNotes: string[];
  confidence: "High" | "Moderate" | "Limited";
} | null {
  if (!days || days.length < 2) return null;

  // AQI trend: compare first half vs second half of forecast
  const forecastAqis = days
    .map((d) => d.aqi ?? d.avgAqi)
    .filter((v): v is number => typeof v === "number");

  if (forecastAqis.length < 2) return null;

  const avgAqi = forecastAqis.reduce((s, v) => s + v, 0) / forecastAqis.length;
  const firstHalfAvg = forecastAqis.slice(0, Math.ceil(forecastAqis.length / 2))
    .reduce((s, v) => s + v, 0) / Math.ceil(forecastAqis.length / 2);
  const secondHalfAvg = forecastAqis.slice(Math.ceil(forecastAqis.length / 2))
    .reduce((s, v) => s + v, 0) / Math.floor(forecastAqis.length / 2);

  const diff = secondHalfAvg - firstHalfAvg;
  const aqiTrend =
    Math.abs(diff) < avgAqi * 0.08 ? "stable" :
    diff < 0 ? "improving" : "worsening";

  const aqiTrendLabel =
    aqiTrend === "improving" ? `Air quality is expected to improve over the coming days (avg AQI ${Math.round(avgAqi)}).`
    : aqiTrend === "worsening" ? `Air quality is expected to worsen over the coming days (avg AQI ${Math.round(avgAqi)}).`
    : `Air quality is expected to remain broadly stable (avg AQI ${Math.round(avgAqi)}).`;

  const currentBand = findAqiBand(currentAqi);
  const forecastBand = findAqiBand(Math.round(avgAqi));
  const pollutionOutlook = forecastBand.label === currentBand.label
    ? `Pollution levels are forecast to remain ${forecastBand.label.toLowerCase()} throughout the period.`
    : aqiTrend === "improving"
      ? `Conditions are forecast to shift from ${currentBand.label} toward ${forecastBand.label} by the end of the period.`
      : `Conditions may deteriorate from ${currentBand.label} toward ${forecastBand.label} conditions.`;

  // Weather notes
  const weatherNotes: string[] = [];
  const temps = days.map((d) => d.temp ?? d.maxTemp).filter((v): v is number => typeof v === "number");
  if (temps.length >= 2) {
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    if (maxT - minT > 5) {
      weatherNotes.push(`Temperatures vary from ${minT}°C to ${maxT}°C over the forecast period.`);
    } else {
      weatherNotes.push(`Temperatures are expected to remain around ${Math.round(temps.reduce((s, v) => s + v, 0) / temps.length)}°C.`);
    }
  }
  const hasPrecip = days.some((d) => typeof d.precipitation === "number" && d.precipitation > 0.5);
  if (hasPrecip) {
    weatherNotes.push("Precipitation is forecast — rain typically reduces particulate pollution levels.");
  }
  const winds = days.map((d) => d.windSpeed).filter((v): v is number => typeof v === "number");
  if (winds.length >= 2) {
    const avgWind = winds.reduce((s, v) => s + v, 0) / winds.length;
    if (avgWind > 15) {
      weatherNotes.push(`Moderate to strong winds (avg ${Math.round(avgWind)} km/h) should help disperse pollutants.`);
    }
  }

  const confidence: "High" | "Moderate" | "Limited" =
    forecastAqis.length >= 5 ? "High" : forecastAqis.length >= 3 ? "Moderate" : "Limited";

  return { aqiTrend, aqiTrendLabel, pollutionOutlook, weatherNotes, confidence };
}

// ─── AQI trend indicator ──────────────────────────────────────────────────────

function TrendIndicator({
  trend,
  label,
}: {
  trend: "improving" | "stable" | "worsening";
  label: string;
}) {
  const Icon = trend === "improving" ? TrendingDown : trend === "worsening" ? TrendingUp : Minus;
  const color =
    trend === "improving" ? "var(--color-success)"
    : trend === "worsening" ? "hsl(28 90% 55%)"
    : "var(--color-muted-foreground)";

  return (
    <div
      className="flex items-start gap-3 rounded-xl p-4"
      style={{
        background: `color-mix(in oklab, ${color} 8%, var(--color-card))`,
        border: `1px solid color-mix(in oklab, ${color} 25%, var(--color-border))`,
      }}
    >
      <div
        className="size-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          AQI Outlook
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{label}</p>
      </div>
    </div>
  );
}

// ─── Weather note pill ────────────────────────────────────────────────────────

function WeatherNote({ note, index }: { note: string; index: number }) {
  const icons = [Thermometer, Wind, Droplets];
  const Icon = icons[index % icons.length];
  return (
    <div className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
      <Icon className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/60" aria-hidden="true" />
      {note}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ForecastOverview({ className }: { className?: string }) {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);

  const { data: days, isLoading, isError } = useQuery({
    queryKey: ["weather-forecast", city.id],
    queryFn: async () => {
      const res = await environmentalApi.getCityWeatherForecast(city.id);
      return res?.data?.days ?? [];
    },
    enabled: !!city.id,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  const isAvailable = !isLoading && !isError && Array.isArray(days) && days.length > 0;
  const intelligence = isAvailable ? deriveForecastIntelligence(city.aqi, days) : null;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-6",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div
            className="size-12 rounded-2xl grid place-items-center shrink-0 border"
            style={{
              background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
              borderColor: "color-mix(in oklab, var(--color-primary) 22%, transparent)",
              color: "var(--color-primary)",
            }}
            aria-hidden="true"
          >
            <CloudSun className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold tracking-tight">Weather & Forecast Intelligence</h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                  isAvailable
                    ? "border-success/30 text-success bg-success/10"
                    : "border-warning/30 text-warning bg-warning/10",
                )}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: isAvailable ? "var(--color-success)" : "var(--color-warning)" }}
                  aria-hidden="true"
                />
                {isAvailable ? "Forecast available" : "Limited data"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              {isAvailable && intelligence
                ? `${intelligence.days ?? days.length}-day forecast for ${city.name}. Full hourly and long-range analysis in the Forecast Center.`
                : `Forecast data for ${city.name} is temporarily limited. The Forecast Center may have additional or cached data.`}
            </p>
          </div>
        </div>

        <Link to="/forecast">
          <Button size="sm" className="gap-1.5 shrink-0 group">
            Open Forecast Center
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {/* Intelligence preview — only when data is available */}
      {intelligence && (
        <div className="space-y-4">
          {/* AQI trend */}
          <TrendIndicator trend={intelligence.aqiTrend} label={intelligence.aqiTrendLabel} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pollution outlook */}
            <div className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Pollution Outlook
              </p>
              <div className="flex items-start gap-2.5">
                {intelligence.aqiTrend === "improving"
                  ? <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} aria-hidden="true" />
                  : <AlertTriangle className="size-3.5 shrink-0 mt-0.5" style={{ color: "hsl(45 85% 55%)" }} aria-hidden="true" />}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {intelligence.pollutionOutlook}
                </p>
              </div>
            </div>

            {/* Weather notes */}
            {intelligence.weatherNotes.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Expected Conditions
                </p>
                <div className="space-y-2">
                  {intelligence.weatherNotes.map((note, i) => (
                    <WeatherNote key={i} note={note} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confidence + disclaimer */}
          <div
            className="flex items-center justify-between gap-2 pt-3 border-t border-border flex-wrap"
          >
            <span className="text-[10px] text-muted-foreground">
              AI confidence: <span className="font-medium">{intelligence.confidence}</span>
              {" · "}Forecast is indicative only — open Forecast Center for full analysis.
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                color: band.color,
                background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
              }}
            >
              Current AQI {city.aqi} · {band.label}
            </span>
          </div>
        </div>
      )}

      {/* Fallback when no data */}
      {!isAvailable && !isLoading && (
        <div className="flex items-start gap-3 rounded-xl p-4 bg-muted/30 border border-border">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Forecast data is temporarily unavailable</p>
            <p className="text-xs text-muted-foreground">
              You can still open the Forecast Center to retry or view any cached data for {city.name}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
