import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel, Pill, EmptyState } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { findAqiBand, AQI_BANDS } from "@/lib/mock-data";
import { describeWeatherCode, type WeatherConditionKind } from "@/lib/weather-codes";
import { formatRelativeTime } from "@/lib/format-time";
import { useQuery } from "@tanstack/react-query";
import { forecastApi } from "@/lib/api/environmental.api";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvCurrentConditionsSkeleton } from "@/components/environment/env-loading-skeletons";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Gauge,
  MapPin,
  Sun,
  Thermometer,
  Wind as WindIcon,
} from "lucide-react";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Forecast Center — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <Forecast />
    </AppLayout>
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// GreenGuard Forecast Center — Phase 2: Current Conditions, 24-Hour AQI &
// Rain Forecast.
//
// Scope (locked): exactly three sections — Current Conditions, Rain
// Forecast, 24-Hour AQI Forecast — driven end-to-end by the real Phase 1
// backend (Open-Meteo via forecastProvider.service.ts). Nothing here is
// generated, guessed, or AI-produced; fields that aren't available from the
// backend are shown as "—" rather than filled in with a placeholder value.
// Phase 3–6 functionality (humanized hourly/7-day forecast, pollutant
// outlook, AI forecast insight, health advisory, environmental health
// score) is intentionally not implemented in this file.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Real forecast series shape (see backend forecast.controller.ts) ─────────
interface ForecastSeriesPoint {
  hour: number;
  timestamp: string;
  /** Real US AQI (0–500) for this hour — null only when the provider had no reading. */
  predicted: number | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  /** WMO weather code — see src/lib/weather-codes.ts. */
  weatherCode: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
}

interface ForecastApiResponse {
  series?: ForecastSeriesPoint[];
}

type ChartPoint = ForecastSeriesPoint & { chartLabel: string };

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function aqiAccent(aqi: number): "success" | "warning" | "destructive" {
  return aqi > 150 ? "destructive" : aqi > 100 ? "warning" : "success";
}

const COMPASS_DIRS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];
function degToCompass(deg: number) {
  return COMPASS_DIRS[Math.round((deg % 360) / 22.5) % 16];
}

function feelsLike(tempC: number, humidityPct: number, windMs: number) {
  const e = (humidityPct / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return Math.round(tempC + 0.33 * e - 0.7 * windMs - 4);
}

/** Extracts "2 PM" style clock time from an Open-Meteo local-timezone
 *  timestamp ("YYYY-MM-DDTHH:mm") without going through the browser's own
 *  timezone (new Date() would silently reinterpret the hour). */
function formatHourLabel(iso: string): string {
  const match = /T(\d{2}):/.exec(iso);
  if (!match) return "";
  const h = parseInt(match[1], 10);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

/** "this afternoon" / "tomorrow morning" / "tonight" — from an hour offset
 *  relative to now. Used only for the Rain Forecast headline sentence. */
function describeDayPart(hoursFromNow: number): string {
  const target = new Date(Date.now() + hoursFromNow * 3600_000);
  const now = new Date();
  const sameDay = target.toDateString() === now.toDateString();
  const hour = target.getHours();
  const bucket =
    hour < 5
      ? "overnight"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 21
            ? "evening"
            : "overnight";
  if (bucket === "overnight") return sameDay ? "tonight" : "tomorrow night";
  return sameDay ? `this ${bucket}` : `tomorrow ${bucket}`;
}

type LucideIcon = ComponentType<{ className?: string }>;

function conditionIcon(kind: WeatherConditionKind | undefined): LucideIcon {
  switch (kind) {
    case "clear":
      return Sun;
    case "partly-cloudy":
      return CloudSun;
    case "cloudy":
      return Cloud;
    case "fog":
      return CloudFog;
    case "drizzle":
      return CloudDrizzle;
    case "rain":
    case "freezing-rain":
    case "showers":
      return CloudRain;
    case "snow":
    case "snow-showers":
      return CloudSnow;
    case "thunderstorm":
      return CloudLightning;
    default:
      return Cloud;
  }
}

// Rain-likelihood tiers — a simple, transparent UI threshold (not a
// meteorological standard), used only to pick the headline wording and pill
// tone. The underlying probability shown to the user is always the real
// value from the provider.
const RAIN_LIKELY_THRESHOLD = 50;
const RAIN_POSSIBLE_THRESHOLD = 20;

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      prev.current = target;
      return;
    }
    const from = prev.current;
    const delta = target - from;
    if (delta === 0) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

// ─── Main Forecast Center Component ───────────────────────────────────────────
function Forecast() {
  const { t } = useTranslation("forecast");
  const { city, isApiConnected, isCityListLoading, isCityError, refreshCity } = useCity();
  const band = findAqiBand(city.aqi);

  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Forecast data query — single real source for both Rain Forecast and
  // 24-Hour AQI Forecast (Phase 2 locks the horizon to 24 hours; no
  // 48h/72h/7d switcher). ────────────────────────────────────────────────────
  const {
    data: apiData,
    isLoading: forecastLoading,
    isError: forecastError,
    refetch: refetchForecast,
  } = useQuery({
    queryKey: ["forecast", city.id, 24],
    queryFn: async (): Promise<ForecastApiResponse | null> => {
      // forecastApi.getForecast already unwraps the axios response — this
      // resolves to the raw JSON body `{ success, data }` from
      // backend forecast.controller.ts.
      const body = (await forecastApi.getForecast(city.id, 24)) as {
        data?: ForecastApiResponse;
      } | null;
      return body?.data ?? null;
    },
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const series: ForecastSeriesPoint[] = useMemo(() => apiData?.series ?? [], [apiData]);
  const hasSeries = series.length > 0;
  const nowPoint = hasSeries ? series[0] : null;

  // Current weather condition comes from the forecast bundle's "now" hour —
  // the live city reading (city.*) has no weather-code field of its own.
  const condition = describeWeatherCode(nowPoint?.weatherCode ?? null);
  const ConditionIcon = conditionIcon(condition?.kind);

  // Wind: prefer the live current reading; fall back to the forecast
  // bundle's real "now" hour (also real Open-Meteo data) rather than
  // inventing a value when the live reading hasn't populated it yet.
  const windSpeed =
    typeof city.windSpeed === "number"
      ? city.windSpeed
      : typeof nowPoint?.windSpeed === "number"
        ? nowPoint.windSpeed
        : null;
  const windDirection =
    typeof city.windDirection === "number"
      ? city.windDirection
      : typeof nowPoint?.windDirection === "number"
        ? nowPoint.windDirection
        : null;
  const pressure = typeof city.pressure === "number" ? city.pressure : null;
  const feelsLikeC = windSpeed !== null ? feelsLike(city.temp, city.humidity, windSpeed) : null;

  const animatedAqi = useCountUp(city.aqi);
  const animatedTemp = useCountUp(city.temp);
  const animatedHum = useCountUp(city.humidity);

  // ─── 24-Hour AQI chart data — the hour-0 point is anchored to the live
  // current AQI reading (the same number shown in Current Conditions) so the
  // chart doesn't visually jump between two independently-polled real
  // sources; hours 1–23 are the untouched real forecast. ────────────────────
  const chartData: ChartPoint[] = useMemo(() => {
    if (!hasSeries) return [];
    return series.map((p, i) => ({
      ...p,
      predicted: i === 0 ? city.aqi : p.predicted,
      chartLabel: i === 0 ? t("now") : formatHourLabel(p.timestamp),
    }));
  }, [series, hasSeries, city.aqi, t]);

  const aqiStats = useMemo(() => {
    const values = chartData
      .map((d) => d.predicted)
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    const peak = Math.max(...values);
    const peakIdx = chartData.findIndex((d) => d.predicted === peak);
    return { avg, peak, peakLabel: peakIdx >= 0 ? chartData[peakIdx].chartLabel : null };
  }, [chartData]);

  const yDomainMax = useMemo(() => {
    const values = chartData
      .map((d) => d.predicted)
      .filter((v): v is number => typeof v === "number");
    const maxVal = values.length ? Math.max(...values) : 50;
    return Math.max(60, Math.ceil((maxVal + 20) / 25) * 25);
  }, [chartData]);

  // Background AQI-category bands — the same AQI_BANDS thresholds used
  // everywhere else in the app (mock-data.ts), never a separate/invented
  // scale, clipped to the chart's visible range.
  const visibleBands = useMemo(() => {
    let lower = 0;
    const bands: Array<{ label: string; color: string; y1: number; y2: number }> = [];
    for (const b of AQI_BANDS) {
      if (lower >= yDomainMax) break;
      bands.push({ label: b.label, color: b.colorRaw, y1: lower, y2: Math.min(b.max, yDomainMax) });
      lower = b.max;
    }
    return bands;
  }, [yDomainMax]);

  const tickInterval = Math.max(0, Math.floor(chartData.length / 6) - 1);

  // ─── Rain Forecast — deterministic summary computed from the real hourly
  // precipitation series (no Gemini, no custom rain model). ─────────────────
  const rain = useMemo(() => {
    if (!hasSeries) return null;
    const probs = series
      .map((p) => p.precipitationProbability)
      .filter((v): v is number => typeof v === "number");
    if (probs.length === 0) return null;

    const peakProb = Math.max(...probs);
    const likelyIdxs = series.reduce<number[]>((acc, p, i) => {
      if (
        typeof p.precipitationProbability === "number" &&
        p.precipitationProbability >= RAIN_LIKELY_THRESHOLD
      ) {
        acc.push(i);
      }
      return acc;
    }, []);
    const peakIdx = series.findIndex((p) => p.precipitationProbability === peakProb);

    const rainAmounts = series
      .map((p) => p.precipitation)
      .filter((v): v is number => typeof v === "number");
    const hasRainAmount = rainAmounts.length > 0;
    const totalRain = Math.round(rainAmounts.reduce((s, v) => s + v, 0) * 10) / 10;

    let periodLabel: string | null = null;
    if (likelyIdxs.length > 0) {
      const start = series[likelyIdxs[0]];
      const end = series[likelyIdxs[likelyIdxs.length - 1]];
      periodLabel =
        start === end
          ? formatHourLabel(start.timestamp)
          : `${formatHourLabel(start.timestamp)} – ${formatHourLabel(end.timestamp)}`;
    }

    const tier: "likely" | "possible" | "unlikely" =
      peakProb >= RAIN_LIKELY_THRESHOLD
        ? "likely"
        : peakProb >= RAIN_POSSIBLE_THRESHOLD
          ? "possible"
          : "unlikely";

    const referenceIdx =
      tier === "unlikely" ? Math.max(peakIdx, 0) : (likelyIdxs[0] ?? Math.max(peakIdx, 0));
    const dayPart = describeDayPart(referenceIdx);

    const statusMessage =
      tier === "likely"
        ? `Rain is likely ${dayPart}.`
        : tier === "possible"
          ? `A slight chance of rain ${dayPart}.`
          : "No significant rain expected over the next 24 hours.";

    return { peakProb, totalRain, hasRainAmount, periodLabel, tier, statusMessage };
  }, [series, hasSeries]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full overflow-hidden">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="space-y-1.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
        <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <span
            className={cn(
              "size-1.5 rounded-full shrink-0",
              isApiConnected ? "bg-[var(--color-success)] pulse-dot" : "bg-muted-foreground/50",
            )}
          />
          {isApiConnected ? "Live data" : "Offline · mock"} · {now || "—"}
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {/* ── 1. CURRENT CONDITIONS ────────────────────────────────────────── */}
      <section aria-labelledby="current-conditions-heading" className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
          <span
            id="current-conditions-heading"
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
          >
            {t("currentConditions")}
          </span>
        </div>

        {isCityListLoading ? (
          <EnvCurrentConditionsSkeleton />
        ) : isCityError ? (
          <EmptyState
            icon={<AlertTriangle className="size-5 text-[var(--color-warning)]" />}
            title="Unable to load current conditions"
            description="Check your connection and try again."
            action={
              <button
                onClick={() => refreshCity()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium aurora text-primary-foreground"
              >
                Retry
              </button>
            }
          />
        ) : (
          <div className="glass rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-medium">
                <MapPin className="size-4 shrink-0 text-primary" /> {city.name}, {city.country}
              </span>
              <Pill tone={aqiAccent(city.aqi)}>
                <span className="size-1.5 rounded-full" style={{ background: band.color }} />{" "}
                {band.label}
              </Pill>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 mt-5">
              <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-2 shrink-0">
                <AqiRing
                  value={animatedAqi}
                  pct={Math.max(2, Math.min(100, (city.aqi / 300) * 100))}
                  color={band.color}
                  label={band.label}
                />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  US AQI scale
                </span>
              </div>

              <div className="hidden sm:block w-px self-stretch bg-border" aria-hidden="true" />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4 flex-1 min-w-0">
                <MiniCard
                  label="Condition"
                  value={condition?.label ?? "Unavailable"}
                  icon={<ConditionIcon className="size-4" />}
                />
                <MiniCard
                  label={t("temperature")}
                  value={`${animatedTemp}°C`}
                  icon={<Thermometer className="size-4" />}
                />
                <MiniCard
                  label={t("feelsLike")}
                  value={feelsLikeC !== null ? `${feelsLikeC}°C` : "—"}
                  icon={<Thermometer className="size-4" />}
                />
                <MiniCard
                  label={t("humidity")}
                  value={`${animatedHum}%`}
                  icon={<Droplets className="size-4" />}
                />
                <MiniCard
                  label={t("windSpeed")}
                  value={
                    windSpeed !== null
                      ? `${windSpeed} m/s${windDirection !== null ? ` ${degToCompass(windDirection)}` : ""}`
                      : "—"
                  }
                  icon={<WindIcon className="size-4" />}
                />
                <MiniCard
                  label={t("pressure")}
                  value={pressure !== null ? `${pressure} hPa` : "—"}
                  icon={<Gauge className="size-4" />}
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/50 text-xs text-muted-foreground">
              Updated {formatRelativeTime(city.updatedAt)}
            </div>
          </div>
        )}
      </section>

      {/* ── 2. RAIN FORECAST ─────────────────────────────────────────────── */}
      <Panel
        eyebrow="Rain Forecast"
        title="Will it rain?"
        action={
          rain ? (
            <Pill
              tone={
                rain.tier === "likely" ? "info" : rain.tier === "possible" ? "warning" : "success"
              }
            >
              {rain.tier === "likely"
                ? "Likely"
                : rain.tier === "possible"
                  ? "Possible"
                  : "Unlikely"}
            </Pill>
          ) : undefined
        }
      >
        {forecastLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-64 max-w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
            <div className="flex items-end justify-between gap-2 h-24 sm:h-28">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-full rounded-t-md" />
              ))}
            </div>
          </div>
        ) : forecastError ? (
          <EmptyState
            icon={<AlertTriangle className="size-5 text-[var(--color-warning)]" />}
            title={t("noForecastData")}
            description="Telemetry is unreachable. Check your connection or retry."
            action={
              <button
                onClick={() => refetchForecast()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium aurora text-primary-foreground"
              >
                Retry
              </button>
            }
          />
        ) : !hasSeries || !rain ? (
          <EmptyState
            icon={<CloudRain className="size-5 text-muted-foreground" />}
            title={t("noForecastData")}
            description="Rain forecast will appear once data is available."
          />
        ) : (
          <div className="space-y-5">
            <p className="text-sm sm:text-base font-medium leading-relaxed">{rain.statusMessage}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <MiniCard
                label="Highest chance"
                value={`${Math.round(rain.peakProb)}%`}
                icon={<CloudRain className="size-4" />}
              />
              <MiniCard
                label="Expected rainfall"
                value={rain.hasRainAmount ? `${rain.totalRain.toFixed(1)} mm` : "—"}
                icon={<Droplets className="size-4" />}
              />
              <MiniCard
                label="Likely period"
                value={rain.periodLabel ?? "—"}
                icon={<Clock className="size-4" />}
                className="col-span-2 sm:col-span-1"
              />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
                Hourly chance of rain
              </div>
              <RainTrendStrip series={series} nowLabel={t("now")} />
            </div>
          </div>
        )}
      </Panel>

      {/* ── 3. 24-HOUR AQI FORECAST ──────────────────────────────────────── */}
      <Panel
        eyebrow="Air Quality"
        title="24-Hour Air Quality Forecast"
        action={
          aqiStats ? (
            <div className="text-[11px] sm:text-xs text-muted-foreground text-right whitespace-nowrap">
              Avg{" "}
              <strong className="text-foreground font-semibold tabular-nums">{aqiStats.avg}</strong>
              {" · "}
              Peak{" "}
              <strong className="text-foreground font-semibold tabular-nums">
                {aqiStats.peak}
              </strong>
              {aqiStats.peakLabel ? ` at ${aqiStats.peakLabel}` : ""}
            </div>
          ) : undefined
        }
      >
        {forecastLoading ? (
          <Skeleton className="h-56 sm:h-72 md:h-80 w-full rounded-xl" />
        ) : forecastError ? (
          <EmptyState
            icon={<AlertTriangle className="size-5 text-[var(--color-warning)]" />}
            title={t("noForecastData")}
            description="Telemetry is unreachable. Check your connection or retry."
            action={
              <button
                onClick={() => refetchForecast()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium aurora text-primary-foreground"
              >
                Retry
              </button>
            }
          />
        ) : !hasSeries ? (
          <EmptyState
            icon={<Activity className="size-5 text-muted-foreground" />}
            title={t("noForecastData")}
            description="24-hour forecast will appear once data is available."
          />
        ) : (
          <>
            <div className="h-56 sm:h-72 md:h-80 w-full overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aqi-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {visibleBands.map((b) => (
                    <ReferenceArea
                      key={b.label}
                      y1={b.y1}
                      y2={b.y2}
                      fill={b.color}
                      fillOpacity={0.07}
                      stroke="none"
                      ifOverflow="hidden"
                    />
                  ))}
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="chartLabel"
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={tickInterval}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={[0, yDomainMax]}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value} · ${findAqiBand(value).label}`, "AQI"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#aqi-fill)"
                    dot={false}
                    activeDot={{ r: 5 }}
                    animationDuration={700}
                    connectNulls
                  />
                  {chartData[0] && (
                    <ReferenceLine
                      x={chartData[0].chartLabel}
                      stroke="var(--color-foreground)"
                      strokeOpacity={0.25}
                      strokeDasharray="2 2"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border/50">
              {visibleBands.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground"
                >
                  <span className="size-2 rounded-full shrink-0" style={{ background: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniCard({
  label,
  value,
  icon,
  hint,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass rounded-xl sm:rounded-2xl p-3.5 sm:p-4 relative overflow-hidden group transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 flex flex-col justify-between min-w-0",
        className,
      )}
    >
      <div
        className="absolute -top-10 -right-10 size-32 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
        style={{ background: accent ?? "var(--color-primary)" }}
      />
      <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold truncate">
          {label}
        </div>
        <div className="text-muted-foreground shrink-0">{icon}</div>
      </div>
      <div>
        <div
          className="text-sm sm:text-base font-bold tabular-nums tracking-tight truncate"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </div>
        {hint && (
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{hint}</div>
        )}
      </div>
    </div>
  );
}

function AqiRing({
  value,
  pct,
  color,
  label,
}: {
  value: number;
  pct: number;
  color: string;
  label: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative size-24 sm:size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-24 sm:size-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1), stroke 1.5s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight"
          style={{ color }}
        >
          {value}
        </div>
        <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}

/** Compact hourly precipitation-probability strip — real data only, sampled
 *  every 3 hours across the real 24-hour series (never a fixed clock
 *  template, since the series always starts at "now"). Deliberately simple
 *  (no chart library) per the Phase 2 "keep it simple, no large second
 *  graph" requirement. */
function RainTrendStrip({ series, nowLabel }: { series: ForecastSeriesPoint[]; nowLabel: string }) {
  const sampleIdxs = [0, 3, 6, 9, 12, 15, 18, 21].filter((i) => i < series.length);
  return (
    <div
      className="flex items-end justify-between gap-1.5 sm:gap-2 h-24 sm:h-28"
      role="list"
      aria-label="Hourly chance of rain"
    >
      {sampleIdxs.map((i) => {
        const p = series[i];
        const prob =
          typeof p.precipitationProbability === "number" ? p.precipitationProbability : null;
        const heightPct = prob !== null ? Math.max(4, prob) : 4;
        return (
          <div
            key={i}
            role="listitem"
            aria-label={`${i === 0 ? nowLabel : formatHourLabel(p.timestamp)}: ${prob !== null ? `${Math.round(prob)}% chance of rain` : "no data"}`}
            className="flex flex-col items-center justify-end flex-1 h-full gap-1.5 min-w-0"
          >
            <span className="text-[10px] sm:text-xs font-semibold tabular-nums text-foreground">
              {prob !== null ? `${Math.round(prob)}%` : "—"}
            </span>
            <div
              className="w-full max-w-[22px] flex-1 rounded-t-md bg-muted/40 overflow-hidden flex items-end"
              aria-hidden="true"
            >
              <div
                className="w-full rounded-t-md bg-[var(--color-info)] transition-[height] duration-700"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {i === 0 ? nowLabel : formatHourLabel(p.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
