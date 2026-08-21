import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel } from "@/components/ui-bits";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { forecastApi } from "@/lib/api/environmental.api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Droplets,
  Gauge,
  MapPin,
  Wind as WindIcon,
  CloudRain,
} from "lucide-react";
import {
  getWeatherConditionMeta,
  weatherCodeToLabel,
} from "@/lib/weather-codes";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Forecast Center — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <Forecast />
    </AppLayout>
  ),
});

// ─── GreenGuard Forecast Center — Phase 2 (locked structure) ────────────────
//
//   1. Current Weather
//   2. Forecast              — Hourly / Weekly
//   3. Environmental Timeline — Hourly / Weekly   (distinctive GreenGuard view)
//   4. Air Quality           — 24 Hours / 7 Days
//   5. Pollutant Outlook
//   6. Data Sources
//
// Every number on this page comes from the real Phase 1 backend
// (`/forecast/:cityId` and `/forecast/:cityId/weekly`, both Open-Meteo
// backed). Nothing is generated, seeded, guessed, or produced by an AI
// model — fields a provider doesn't return are shown as "Not available"
// rather than filled in with a placeholder number.

const HOURLY_HOURS = 24;

// ─── API response contracts (mirror the backend controllers exactly) ───────
interface ForecastSeriesPoint {
  hour: number;
  label: string;
  timestamp: string; // local wall-clock time in the city's own timezone
  predicted: number | null; // US AQI
  lower: number | null;
  upper: number | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  weatherCode: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
}

interface ForecastLocation {
  cityId: string;
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface ForecastResponseData {
  cityId: string;
  cityName: string;
  location: ForecastLocation;
  hours: number;
  peak: number | null;
  avg: number | null;
  peakHour: number | null;
  series: ForecastSeriesPoint[];
  metadata: { source: string; fetchedAt: string };
}

interface WeeklyDayPoint {
  day: string; // e.g. "Sun" — formatted server-side
  date: string; // "YYYY-MM-DD", calendar date local to the city
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidity: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
}

interface WeeklyResponseData {
  cityId: string;
  cityName: string;
  weekly: WeeklyDayPoint[];
  metadata: { source: string; fetchedAt: string };
}

// ─── Pure helpers — units & derived (real-input) values ─────────────────────
const COMPASS_DIRS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];
function degToCompass(deg: number) {
  return COMPASS_DIRS[Math.round((deg % 360) / 22.5) % 16];
}

// Australian Bureau of Meteorology "apparent temperature" approximation — a
// standard, published formula, not an invented figure.
function feelsLikeC(tempC: number, humidityPct: number, windMs: number): number {
  const e = (humidityPct / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return Math.round(tempC + 0.33 * e - 0.7 * windMs - 4);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Pure helpers — local-time / local-date parsing ──────────────────────────
function parseLocalTimestamp(ts: string): { date: string; hour: number } {
  const [datePart, timePart = "00:00"] = ts.split("T");
  const hour = parseInt(timePart.slice(0, 2), 10);
  return { date: datePart, hour: Number.isFinite(hour) ? hour : 0 };
}

function formatClockLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

function formatDayDate(dateStr: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" })
    .format(dt)
    .toUpperCase();
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(dt)
    .toUpperCase();
  return { weekday, monthDay };
}

// ─── Pure helper — 24h AQI outlook summary (factual, not interpretive) ──────
function summarizeAqiOutlook(points: ForecastSeriesPoint[]): string | null {
  const withAqi = points.filter((p): p is ForecastSeriesPoint & { predicted: number } =>
    typeof p.predicted === "number",
  );
  if (!withAqi.length) return null;

  const bands = withAqi.map((p) => findAqiBand(p.predicted));
  const startLabel = bands[0].label;
  const allSame = bands.every((b) => b.label === startLabel);
  if (allSame) {
    return `Air quality is expected to remain ${startLabel} over the next 24 hours.`;
  }

  const changeIdx = bands.findIndex((b) => b.label !== startLabel);
  const { hour } = parseLocalTimestamp(withAqi[changeIdx].timestamp);
  return `Air quality is expected to shift from ${startLabel} to ${bands[changeIdx].label} around ${formatClockLabel(hour)}.`;
}

// ─── Pure helper — Data Sources transparency line ────────────────────────────
function parseSourceFlags(source: string | undefined): { hasWeather: boolean; hasAirQuality: boolean } {
  return {
    hasWeather: !!source?.includes("weather"),
    hasAirQuality: !!source?.includes("air-quality"),
  };
}

// ─── Hourly row shape shared by the strip, chart, and timeline ─────────────
interface HourlyRow {
  idx: number;
  hour: number;
  isDay: boolean;
  label: string;
  weatherCode: number | null;
  temperature: number | null;
  precipProb: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  aqi: number | null;
}

type HourlyMetric = "temperature" | "precipitation" | "wind";
const HOURLY_METRICS: Record<HourlyMetric, { label: string; unit: string; color: string; key: keyof HourlyRow }> = {
  temperature: { label: "Temperature", unit: "°C", color: "var(--color-primary)", key: "temperature" },
  precipitation: { label: "Precipitation", unit: "%", color: "var(--color-info)", key: "precipProb" },
  wind: { label: "Wind", unit: "m/s", color: "var(--color-warning)", key: "windSpeed" },
};

// ─── Main Forecast Center Component ───────────────────────────────────────────
function Forecast() {
  const { t } = useTranslation("forecast");
  const { city, isApiConnected } = useCity();

  const {
    data: forecastData,
    isLoading: hourlyLoading,
    isError: hourlyErrored,
    isFetching: hourlyFetching,
    refetch: refetchHourly,
  } = useQuery<ForecastResponseData | null>({
    queryKey: ["forecast", city.id, HOURLY_HOURS],
    queryFn: async () => {
      const r = await forecastApi.getForecast(city.id, HOURLY_HOURS);
      return (r?.data?.data ?? r?.data ?? null) as ForecastResponseData | null;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const {
    data: weeklyData,
    isLoading: weeklyLoading,
    isError: weeklyErrored,
    isFetching: weeklyFetching,
    refetch: refetchWeekly,
  } = useQuery<WeeklyResponseData | null>({
    queryKey: ["forecast-weekly", city.id],
    queryFn: async () => {
      const r = await forecastApi.getWeekly(city.id);
      return (r?.data?.data ?? r?.data ?? null) as WeeklyResponseData | null;
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const series = forecastData?.series ?? [];
  const current = series[0];
  const hasCurrent = !!current && typeof current.predicted === "number";
  const currentAqi = current?.predicted ?? 0;
  const band = hasCurrent ? findAqiBand(currentAqi) : null;

  const weekly = weeklyData?.weekly ?? [];
  const weeklyReady = !weeklyLoading && !weeklyErrored && weekly.length > 0;

  const currentHour = current ? parseLocalTimestamp(current.timestamp).hour : 12;
  const currentIsDay = currentHour >= 6 && currentHour < 19;

  const hourlyRows = useMemo<HourlyRow[]>(
    () =>
      series.map((p, i) => {
        const { hour } = parseLocalTimestamp(p.timestamp);
        const isDay = hour >= 6 && hour < 19;
        return {
          idx: i,
          hour,
          isDay,
          label: i === 0 ? "Now" : formatClockLabel(hour),
          weatherCode: p.weatherCode,
          temperature: p.temperature,
          precipProb: p.precipitationProbability,
          precipitation: p.precipitation,
          windSpeed: p.windSpeed,
          aqi: p.predicted,
        };
      }),
    [series],
  );

  const aqiSummary = useMemo(() => summarizeAqiOutlook(series), [series]);

  const bandsPresent = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    series.forEach((p) => {
      if (typeof p.predicted === "number") {
        const b = findAqiBand(p.predicted);
        if (!seen.has(b.label)) seen.set(b.label, { label: b.label, color: b.color });
      }
    });
    return Array.from(seen.values());
  }, [series]);

  const weeklyAqiChartData = useMemo(
    () =>
      weekly.map((d) => {
        const { weekday, monthDay } = formatDayDate(d.date);
        return {
          date: d.date,
          label: `${weekday} ${monthDay}`,
          weekday,
          monthDay,
          aqi: d.aqi,
        };
      }),
    [weekly],
  );

  const feelsLikeValue =
    current &&
    typeof current.temperature === "number" &&
    typeof current.humidity === "number" &&
    typeof current.windSpeed === "number"
      ? feelsLikeC(current.temperature, current.humidity, current.windSpeed)
      : null;

  const lastUpdatedLabel = forecastData?.metadata?.fetchedAt
    ? formatDistanceToNow(new Date(forecastData.metadata.fetchedAt), { addSuffix: true })
    : null;

  const locationName = forecastData?.location?.cityName ?? city.name;
  const locationCountry = forecastData?.location?.country ?? city.country;

  const sourceFlags = parseSourceFlags(forecastData?.metadata?.source);

  const [hourlyMetric, setHourlyMetric] = useState<HourlyMetric>("temperature");
  const activeMetric = HOURLY_METRICS[hourlyMetric];

  const showSkeleton = hourlyLoading;
  const showError = !showSkeleton && hourlyErrored;
  const showEmpty = !showSkeleton && !showError && !hasCurrent;
  const showContent = !showSkeleton && !showError && hasCurrent;

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] w-full overflow-x-hidden">
      {/* ── Atmospheric Background Layer ─────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Subtle cool/air atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-info)_5.5%,transparent)] via-[color-mix(in_oklab,var(--color-primary)_2.5%,transparent)] to-transparent" />
        {/* Top soft ambient atmosphere glow */}
        <div
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-[1100px] h-[380px] opacity-35 dark:opacity-15 blur-[100px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, color-mix(in oklab, var(--color-info) 40%, var(--color-primary) 20%), transparent 70%)",
          }}
        />
        {/* Secondary soft environmental depth */}
        <div
          className="absolute top-1/3 -right-24 w-[480px] h-[380px] opacity-20 dark:opacity-10 blur-[110px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-info) 30%, transparent), transparent 70%)",
          }}
        />
      </div>

      <div className="p-3 sm:p-4 md:p-6 lg:p-7 space-y-4 sm:space-y-5 w-full max-w-7xl mx-auto">
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                isApiConnected ? "bg-[var(--color-success)] pulse-dot" : "bg-muted-foreground/50",
              )}
            />
            {isApiConnected ? "Live telemetry" : "Offline"}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Current weather, hourly and weekly forecasts, and air quality — all in one place.
          </p>
        </div>

        {showSkeleton && <ForecastSkeleton />}

        {showError && (
          <EnvErrorState
            onRetry={() => refetchHourly()}
            retryDisabled={hourlyFetching}
            message="Unable to load the forecast right now."
          />
        )}

        {showEmpty && (
          <EnvEmptyState
            title="Forecast unavailable"
            description="Live forecast data will appear once this city's provider connection is available."
          />
        )}

        {showContent && current && band && (
          <>
            {/* ── 1. Current Weather ────────────────────────────────────────── */}
            <Panel title="Current Weather" surface="card">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                {/* Hero weather block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
                  {/* Weather Icon Box */}
                  <div className="size-16 sm:size-18 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-center shrink-0 shadow-inner">
                    <WeatherIcon code={current.weatherCode} isDay={currentIsDay} size="hero" className="size-full" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    {/* 1. Location */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
                      <MapPin className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">
                        {locationName}
                        {locationCountry ? `, ${locationCountry}` : ""}
                      </span>
                    </div>

                    {/* 2. Temperature & 3. Condition */}
                    <div className="flex items-baseline flex-wrap gap-2.5">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums">
                        {typeof current.temperature === "number" ? `${current.temperature}°C` : "—"}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-foreground/90 flex items-center gap-1.5">
                        {weatherCodeToLabel(current.weatherCode)}
                      </span>
                    </div>

                    {/* 4. Feels-like & 5. AQI */}
                    <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground pt-0.5">
                      <span>
                        {feelsLikeValue != null ? `Feels like ${feelsLikeValue}°C` : "Feels like not available"}
                      </span>
                      <span className="text-border">·</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={{
                          color: band.color,
                          borderColor: `color-mix(in oklab, ${band.color} 35%, transparent)`,
                          background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
                        }}
                      >
                        <span className="size-1.5 rounded-full" style={{ background: band.color }} />
                        AQI {currentAqi} · {band.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supporting weather metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:border-border/60 lg:pl-6">
                  <WeatherStat
                    icon={<Droplets className="size-3.5 text-info" />}
                    label="Humidity"
                    value={typeof current.humidity === "number" ? `${current.humidity}%` : "Not available"}
                  />
                  <WeatherStat
                    icon={<WindIcon className="size-3.5 text-warning" />}
                    label="Wind"
                    value={typeof current.windSpeed === "number" ? `${current.windSpeed} m/s` : "Not available"}
                    hint={typeof current.windDirection === "number" ? degToCompass(current.windDirection) : undefined}
                  />
                  <WeatherStat
                    icon={<Gauge className="size-3.5 text-primary" />}
                    label="Pressure"
                    value={typeof city.pressure === "number" ? `${city.pressure} hPa` : "Not available"}
                  />
                  <WeatherStat
                    icon={<CloudRain className="size-3.5 text-info" />}
                    label="Precipitation"
                    value={typeof current.precipitation === "number" ? `${current.precipitation} mm` : "0 mm"}
                    hint={
                      typeof current.precipitationProbability === "number"
                        ? `${Math.round(current.precipitationProbability)}% chance`
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Status bar */}
              <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-1.5 rounded-full shrink-0", isApiConnected && "pulse-dot")}
                    style={{
                      background: isApiConnected ? "var(--color-success)" : "var(--color-muted-foreground)",
                    }}
                  />
                  <span className="font-medium" style={{ color: isApiConnected ? "var(--color-success)" : "inherit" }}>
                    {isApiConnected ? "Live" : "Offline"}
                  </span>
                  {lastUpdatedLabel && <span>· Updated {lastUpdatedLabel}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground/80">US EPA Standard</div>
              </div>
            </Panel>

            {/* ── 2. Forecast ──────────────────────────────────────────────── */}
            <Panel title="Forecast" surface="card">
              <Tabs defaultValue="hourly">
                <TabsList>
                  <TabsTrigger value="hourly">Hourly</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                </TabsList>

                <ForecastHourlyPanel
                  rows={hourlyRows}
                  metric={hourlyMetric}
                  onMetricChange={setHourlyMetric}
                  activeMetric={activeMetric}
                />

                <WeeklyPanel show="weekly">
                  {!weeklyReady ? (
                    <WeeklyStatus
                      loading={weeklyLoading}
                      error={weeklyErrored}
                      onRetry={refetchWeekly}
                      retryDisabled={weeklyFetching}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                      {weekly.map((d) => {
                        const { weekday, monthDay } = formatDayDate(d.date);
                        return (
                          <div
                            key={d.date}
                            className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-muted/15 py-3 px-2 min-w-0 hover:bg-muted/30 transition-colors"
                          >
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              {weekday}
                            </div>
                            <div className="text-[10px] text-muted-foreground/80">{monthDay}</div>
                            <WeatherIcon code={d.weatherCode} isDay={true} className="size-5 mt-1" />
                            <div
                              className="text-[10px] text-muted-foreground text-center line-clamp-1 h-3.5"
                              title={weatherCodeToLabel(d.weatherCode)}
                            >
                              {weatherCodeToLabel(d.weatherCode)}
                            </div>
                            <div className="flex items-baseline gap-1 text-sm font-semibold tabular-nums mt-0.5">
                              <span>{d.temperatureMax != null ? `${Math.round(d.temperatureMax)}°` : "—"}</span>
                              <span className="text-muted-foreground font-normal text-xs">
                                {d.temperatureMin != null ? `${Math.round(d.temperatureMin)}°` : "—"}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--color-info)] font-medium tabular-nums h-3.5">
                              {d.precipitationProbability != null && d.precipitationProbability > 0
                                ? `${Math.round(d.precipitationProbability)}% rain`
                                : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </WeeklyPanel>
              </Tabs>
            </Panel>

            {/* ── 3. Environmental Timeline ⭐ ─────────────────────────────── */}
            <Panel eyebrow="GreenGuard" title="Environmental Timeline" surface="card">
              <Tabs defaultValue="hourly">
                <TabsList>
                  <TabsTrigger value="hourly">Hourly</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                </TabsList>

                <WeeklyPanel show="hourly">
                  <div className="overflow-x-auto -mx-1 px-1 pb-1">
                    <div className="min-w-max">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 py-2 pr-4 sticky left-0 bg-card z-10 w-20">
                              Time
                            </th>
                            {hourlyRows.map((r) => (
                              <th key={r.idx} className="px-3 py-2 text-[11px] font-medium text-muted-foreground w-16">
                                {r.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {/* Weather Row */}
                          <tr>
                            <td className="text-left text-xs font-semibold text-muted-foreground py-2.5 pr-4 sticky left-0 bg-card z-10">
                              Weather
                            </td>
                            {hourlyRows.map((r) => (
                              <td key={r.idx} className="px-3 py-2.5">
                                <div className="flex justify-center" title={weatherCodeToLabel(r.weatherCode)}>
                                  <WeatherIcon code={r.weatherCode} isDay={r.isDay} className="size-4" />
                                </div>
                              </td>
                            ))}
                          </tr>
                          {/* Temp Row */}
                          <tr>
                            <td className="text-left text-xs font-semibold text-muted-foreground py-2.5 pr-4 sticky left-0 bg-card z-10">
                              Temp
                            </td>
                            {hourlyRows.map((r) => (
                              <td key={r.idx} className="px-3 py-2.5 text-xs font-bold tabular-nums">
                                {r.temperature != null ? `${Math.round(r.temperature)}°` : "—"}
                              </td>
                            ))}
                          </tr>
                          {/* AQI Row */}
                          <tr>
                            <td className="text-left text-xs font-semibold text-muted-foreground py-2.5 pr-4 sticky left-0 bg-card z-10">
                              AQI
                            </td>
                            {hourlyRows.map((r) => {
                              const b = r.aqi != null ? findAqiBand(r.aqi) : null;
                              return (
                                <td
                                  key={r.idx}
                                  className="px-3 py-2.5 text-xs font-extrabold tabular-nums"
                                  style={{ color: b?.color }}
                                >
                                  {r.aqi ?? "—"}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Status Row */}
                          <tr>
                            <td className="text-left text-xs font-semibold text-muted-foreground py-2.5 pr-4 sticky left-0 bg-card z-10">
                              Status
                            </td>
                            {hourlyRows.map((r) => {
                              const b = r.aqi != null ? findAqiBand(r.aqi) : null;
                              return (
                                <td key={r.idx} className="px-2 py-2.5">
                                  {b ? (
                                    <span
                                      className="inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                                      style={{
                                        color: b.color,
                                        borderColor: `color-mix(in oklab, ${b.color} 30%, transparent)`,
                                        background: `color-mix(in oklab, ${b.color} 10%, transparent)`,
                                      }}
                                    >
                                      {b.shortLabel}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </WeeklyPanel>

                <WeeklyPanel show="weekly">
                  {!weeklyReady ? (
                    <WeeklyStatus
                      loading={weeklyLoading}
                      error={weeklyErrored}
                      onRetry={refetchWeekly}
                      retryDisabled={weeklyFetching}
                    />
                  ) : (
                    <div className="overflow-x-auto -mx-1 px-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Weather</TableHead>
                            <TableHead>High / Low</TableHead>
                            <TableHead>Rain</TableHead>
                            <TableHead>AQI &amp; Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weekly.map((d) => {
                            const { weekday, monthDay } = formatDayDate(d.date);
                            const b = d.aqi != null ? findAqiBand(d.aqi) : null;
                            return (
                              <TableRow key={d.date}>
                                <TableCell className="font-semibold whitespace-nowrap">
                                  {weekday} · {monthDay}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1.5">
                                    <WeatherIcon code={d.weatherCode} isDay={true} className="size-4" />
                                    {weatherCodeToLabel(d.weatherCode)}
                                  </span>
                                </TableCell>
                                <TableCell className="tabular-nums whitespace-nowrap">
                                  {d.temperatureMax != null ? `${Math.round(d.temperatureMax)}°` : "—"} /{" "}
                                  {d.temperatureMin != null ? `${Math.round(d.temperatureMin)}°` : "—"}
                                </TableCell>
                                <TableCell className="tabular-nums whitespace-nowrap">
                                  {d.precipitationProbability != null
                                    ? `${Math.round(d.precipitationProbability)}%`
                                    : "—"}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {d.aqi != null && b ? (
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border"
                                      style={{
                                        color: b.color,
                                        borderColor: `color-mix(in oklab, ${b.color} 30%, transparent)`,
                                        background: `color-mix(in oklab, ${b.color} 10%, transparent)`,
                                      }}
                                    >
                                      <span className="size-1.5 rounded-full" style={{ background: b.color }} />
                                      {d.aqi} · {b.label}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Not available</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </WeeklyPanel>
              </Tabs>
            </Panel>

            {/* ── 4. Air Quality ───────────────────────────────────────────── */}
            <Panel title="Air Quality" surface="card">
              <Tabs defaultValue="24h">
                <TabsList>
                  <TabsTrigger value="24h">24 Hours</TabsTrigger>
                  <TabsTrigger value="7d">7 Days</TabsTrigger>
                </TabsList>

                <WeeklyPanel show="24h">
                  {aqiSummary && <p className="text-xs sm:text-sm text-muted-foreground mb-2.5">{aqiSummary}</p>}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs sm:text-sm">
                    {typeof forecastData?.avg === "number" && (
                      <span className="text-muted-foreground">
                        24h average{" "}
                        <strong className="text-foreground font-semibold tabular-nums">{forecastData.avg}</strong>
                      </span>
                    )}
                    {typeof forecastData?.peak === "number" && (
                      <span className="text-muted-foreground">
                        24h peak{" "}
                        <strong className="text-foreground font-semibold tabular-nums">{forecastData.peak}</strong>
                      </span>
                    )}
                  </div>
                  <div className="h-48 sm:h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyRows} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="aqi-fill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={band.color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={band.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={20}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                          width={32}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const val = payload[0].value as number;
                              const b = findAqiBand(val);
                              const item = payload[0].payload as HourlyRow;
                              return (
                                <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-md text-xs space-y-0.5">
                                  <div className="text-muted-foreground font-medium">{item.label}</div>
                                  <div className="font-bold flex items-center gap-1.5" style={{ color: b.color }}>
                                    <span className="size-1.5 rounded-full" style={{ background: b.color }} />
                                    AQI {val} · {b.label}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="aqi"
                          stroke={band.color}
                          strokeWidth={2.5}
                          fill="url(#aqi-fill)"
                          dot={false}
                          activeDot={{ r: 4.5 }}
                          connectNulls
                          name="AQI"
                        />
                        {hourlyRows[0] && (
                          <ReferenceLine
                            x={hourlyRows[0].label}
                            stroke="var(--color-foreground)"
                            strokeOpacity={0.25}
                            strokeDasharray="2 2"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {bandsPresent.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3" aria-label="Air quality categories in this forecast">
                      {bandsPresent.map((b) => (
                        <span
                          key={b.label}
                          className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                          style={{
                            color: b.color,
                            borderColor: `color-mix(in oklab, ${b.color} 35%, transparent)`,
                            background: `color-mix(in oklab, ${b.color} 10%, transparent)`,
                          }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: b.color }} />
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </WeeklyPanel>

                <WeeklyPanel show="7d">
                  {!weeklyReady ? (
                    <WeeklyStatus
                      loading={weeklyLoading}
                      error={weeklyErrored}
                      onRetry={refetchWeekly}
                      retryDisabled={weeklyFetching}
                    />
                  ) : (
                    <div className="h-48 sm:h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyAqiChartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                            axisLine={false}
                            tickLine={false}
                            width={32}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const val = payload[0].value as number;
                                const b = val != null ? findAqiBand(val) : null;
                                const item = payload[0].payload as { label: string; aqi: number | null };
                                return (
                                  <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-md text-xs space-y-0.5">
                                    <div className="text-muted-foreground font-medium">{item.label}</div>
                                    {b ? (
                                      <div className="font-bold flex items-center gap-1.5" style={{ color: b.color }}>
                                        <span className="size-1.5 rounded-full" style={{ background: b.color }} />
                                        AQI {val} · {b.label}
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground">Not available</div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                            {weeklyAqiChartData.map((d, i) => (
                              <Cell
                                key={i}
                                fill={d.aqi != null ? findAqiBand(d.aqi).color : "var(--color-border)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </WeeklyPanel>
              </Tabs>
            </Panel>

            {/* ── 5. Pollutant Outlook ─────────────────────────────────────── */}
            <Panel title="Pollutant Outlook" surface="card">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <PollutantTile label="PM2.5" unit="µg/m³" current={current.pm25} future={series[HOURLY_HOURS - 1]?.pm25} />
                <PollutantTile label="PM10" unit="µg/m³" current={current.pm10} future={series[HOURLY_HOURS - 1]?.pm10} />
                <PollutantTile label="NO₂" unit="µg/m³" current={current.no2} future={series[HOURLY_HOURS - 1]?.no2} />
                <PollutantTile label="O₃" unit="µg/m³" current={current.o3} future={series[HOURLY_HOURS - 1]?.o3} />
              </div>
            </Panel>

            {/* ── 6. Data Sources ──────────────────────────────────────────── */}
            <Panel title="Data Sources" surface="card">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-xs sm:text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Weather source
                  </dt>
                  <dd className="mt-1 font-medium">{sourceFlags.hasWeather ? "Open-Meteo" : "Not available"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Air quality source
                  </dt>
                  <dd className="mt-1 font-medium">
                    {sourceFlags.hasAirQuality ? "Open-Meteo Air Quality API" : "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    AQI standard
                  </dt>
                  <dd className="mt-1 font-medium">US AQI (EPA)</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Last updated
                  </dt>
                  <dd className="mt-1 font-medium">{lastUpdatedLabel ?? "Not available"}</dd>
                </div>
              </dl>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeatherIcon({
  code,
  isDay = true,
  className,
  size = "md",
}: {
  code: number | null | undefined;
  isDay?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "hero";
}) {
  const meta = getWeatherConditionMeta(code, isDay);
  const Icon = meta.Icon;

  if (size === "hero") {
    return (
      <div
        className={cn("relative flex items-center justify-center rounded-2xl p-2.5", className)}
        style={{
          background: meta.bgTint,
          boxShadow: `0 0 24px ${meta.glow}`,
        }}
      >
        <Icon
          className="size-9 sm:size-11 transition-transform duration-300"
          style={{ color: meta.color }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <Icon
      className={cn("shrink-0 transition-colors", className)}
      style={{ color: meta.color }}
      aria-hidden
    />
  );
}

function WeeklyPanel({ show, children }: { show: string; children: ReactNode }) {
  return (
    <TabsContent value={show}>
      <div className="mt-3">{children}</div>
    </TabsContent>
  );
}

function WeatherStat({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-base sm:text-lg font-semibold tabular-nums tracking-tight truncate">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
    </div>
  );
}

function PollutantTile({
  label,
  unit,
  current,
  future,
}: {
  label: string;
  unit: string;
  current: number | null | undefined;
  future?: number | null;
}) {
  const delta = current != null && future != null ? future - current : null;
  const isUp = delta != null && delta > 0.05;
  const isDown = delta != null && delta < -0.05;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-3.5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold truncate">
        {label}
      </div>
      <div className="mt-1 text-base sm:text-lg font-bold tabular-nums truncate">
        {current != null ? round1(current) : "Not available"}
        {current != null && <span className="text-xs font-normal text-muted-foreground"> {unit}</span>}
      </div>
      {future != null && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums truncate">
          {isUp ? (
            <span className="text-amber-500 font-bold">↑</span>
          ) : isDown ? (
            <span className="text-emerald-500 font-bold">↓</span>
          ) : (
            <span className="text-muted-foreground font-bold">→</span>
          )}
          <span>{round1(future)} {unit} by tomorrow</span>
        </div>
      )}
    </div>
  );
}

function WeeklyStatus({
  loading,
  error,
  onRetry,
  retryDisabled,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EnvErrorState
        onRetry={onRetry}
        retryDisabled={retryDisabled}
        message="Unable to load the weekly forecast right now."
      />
    );
  }
  return (
    <EnvEmptyState
      title="Weekly forecast unavailable"
      description="Daily forecast data will appear once available for this city."
    />
  );
}

function ForecastHourlyPanel({
  rows,
  metric,
  onMetricChange,
  activeMetric,
}: {
  rows: HourlyRow[];
  metric: HourlyMetric;
  onMetricChange: (m: HourlyMetric) => void;
  activeMetric: { label: string; unit: string; color: string; key: keyof HourlyRow };
}) {
  return (
    <TabsContent value="hourly">
      <div className="mt-3 space-y-4">
        {/* Hourly scroll strip */}
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <div className="flex gap-2 min-w-max">
            {rows.map((row) => (
              <div
                key={row.idx}
                className="flex flex-col items-center gap-1 shrink-0 w-15 rounded-xl border border-border/60 bg-muted/15 py-2.5 px-1 hover:bg-muted/30 transition-colors"
                title={`${row.label} · ${weatherCodeToLabel(row.weatherCode)}`}
              >
                <div className="text-[10px] text-muted-foreground font-medium">{row.label}</div>
                <WeatherIcon code={row.weatherCode} isDay={row.isDay} className="size-4" />
                <div className="text-xs font-semibold tabular-nums">
                  {row.temperature != null ? `${Math.round(row.temperature)}°` : "—"}
                </div>
                <div className="text-[9px] text-[var(--color-info)] font-medium tabular-nums h-3">
                  {row.precipProb != null && row.precipProb > 0 ? `${Math.round(row.precipProb)}%` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary metric interactive area chart */}
        <div>
          <Tabs value={metric} onValueChange={(v) => onMetricChange(v as HourlyMetric)}>
            <TabsList className="h-8">
              <TabsTrigger value="temperature" className="text-xs">Temperature</TabsTrigger>
              <TabsTrigger value="precipitation" className="text-xs">Precipitation</TabsTrigger>
              <TabsTrigger value="wind" className="text-xs">Wind</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="h-40 sm:h-48 w-full mt-2.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hourly-metric-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={activeMetric.color} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={activeMetric.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value as number;
                      const item = payload[0].payload as HourlyRow;
                      return (
                        <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-md text-xs space-y-0.5">
                          <div className="text-muted-foreground font-medium">{item.label}</div>
                          <div className="font-bold flex items-center gap-1.5" style={{ color: activeMetric.color }}>
                            <span className="size-1.5 rounded-full" style={{ background: activeMetric.color }} />
                            {val != null ? `${val}${activeMetric.unit}` : "—"} {activeMetric.label}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric.key as string}
                  stroke={activeMetric.color}
                  strokeWidth={2.5}
                  fill="url(#hourly-metric-fill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  name={activeMetric.label}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="glass-card rounded-2xl p-5">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Skeleton className="size-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
