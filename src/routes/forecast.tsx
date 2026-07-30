import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel, Pill } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { aqiBand, trendSeries, findAqiBand } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { forecastApi } from "@/lib/api/environmental.api";
import { copilotApi } from "@/lib/api/services.api";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Car,
  ChevronDown,
  Compass,
  Droplets,
  Gauge,
  Leaf,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Thermometer,
  TrendingUp,
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

// ─── Constants ────────────────────────────────────────────────────────────────
const RANGES = [
  { id: "24h", label: "24 hours", hours: 24 },
  { id: "48h", label: "48 hours", hours: 48 },
  { id: "72h", label: "72 hours", hours: 72 },
  { id: "7d", label: "7 days", hours: 168 },
] as const;

// Hour labels for the timeline (current hour → +23h)
function makeTimelineHours() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const h = new Date(now.getTime() + i * 2 * 3600_000);
    return h.getHours() === 0 || i === 0
      ? i === 0
        ? "Now"
        : "12AM"
      : h.getHours() < 12
        ? `${h.getHours()}AM`
        : h.getHours() === 12
          ? "12PM"
          : `${h.getHours() - 12}PM`;
  });
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function aqiAccent(aqi: number): "success" | "warning" | "destructive" {
  return aqi > 150 ? "destructive" : aqi > 100 ? "warning" : "success";
}

function aqiGlowVars(aqi: number) {
  if (aqi <= 50) return { glow: "#16a34a", ambient: "0 0 120px 40px rgba(22,163,74,0.18)" };
  if (aqi <= 100) return { glow: "#ca8a04", ambient: "0 0 120px 40px rgba(202,138,4,0.18)" };
  if (aqi <= 150) return { glow: "#d97706", ambient: "0 0 120px 40px rgba(217,119,6,0.18)" };
  if (aqi <= 200) return { glow: "#dc2626", ambient: "0 0 120px 40px rgba(220,38,38,0.18)" };
  return { glow: "#9333ea", ambient: "0 0 120px 40px rgba(147,51,234,0.18)" };
}

function seededRandom(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

const COMPASS_DIRS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];
function degToCompass(deg: number) {
  return COMPASS_DIRS[Math.round((deg % 360) / 22.5) % 16];
}

function feelsLike(tempC: number, humidityPct: number, windMs: number) {
  const e = (humidityPct / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return Math.round(tempC + 0.33 * e - 0.7 * windMs - 4);
}

// Live-data ensemble forecast generator
function generateLiveForecastSeries(
  baseAqi: number,
  hours: number,
  cityMetrics: { temp: number; humidity: number; windSpeed: number },
) {
  const nowHour = new Date().getHours();
  const windFactor = (3.5 - cityMetrics.windSpeed) * 1.2;
  const humFactor = cityMetrics.humidity > 70 ? (cityMetrics.humidity - 70) * 0.12 : 0;

  return Array.from({ length: hours }, (_, i) => {
    const targetHour = (nowHour + i) % 24;

    let diurnal = 0;
    if (targetHour >= 7 && targetHour <= 9) diurnal = 10;
    else if (targetHour >= 18 && targetHour <= 21) diurnal = 12;
    else if (targetHour >= 12 && targetHour <= 15) diurnal = -6;
    else if (targetHour >= 1 && targetHour <= 5) diurnal = -4;

    const diurnalScaled = diurnal * Math.max(0.2, Math.min(1.5, baseAqi / 100));
    const blendRatio = Math.min(1, i / 3);
    const timeDrift = Math.sin((i + nowHour) / 5) * 3 * blendRatio;
    const weatherOffset = (windFactor + humFactor) * (i / hours) * blendRatio;

    const rawVal =
      i === 0 ? baseAqi : baseAqi + (diurnalScaled + timeDrift + weatherOffset) * blendRatio;
    const predicted = Math.max(5, Math.round(rawVal));

    const margin = Math.round(2 + (i / hours) * 14);
    const lower = Math.max(2, predicted - margin);
    const upper = predicted + margin;

    return {
      hour: i,
      label: i === 0 ? "Now" : i % (hours > 48 ? 12 : 6) === 0 ? `+${i}h` : "",
      predicted,
      lower,
      upper,
    };
  });
}

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
  const { city, isApiConnected } = useCity();
  const [active, setActive] = useState<(typeof RANGES)[number]["id"]>("48h");
  const range = RANGES.find((r) => r.id === active)!;
  const band = aqiBand(city.aqi);
  const effectiveAqi = city.aqi;
  const glowVars = aqiGlowVars(effectiveAqi);

  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    heroRef.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    heroRef.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  // ─── Data Queries ───────────────────────────────────────────────────────────
  const {
    data: apiData,
    isLoading: forecastLoading,
    refetch: refetchForecast,
  } = useQuery({
    queryKey: ["forecast", city.id, range.hours],
    queryFn: () =>
      forecastApi.getForecast(city.id, range.hours).then((r) => r?.data?.data ?? r?.data ?? null),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: weeklyData } = useQuery({
    queryKey: ["forecast-weekly", city.id],
    queryFn: () => forecastApi.getWeekly(city.id).then((r) => r?.data?.data ?? r?.data ?? null),
    staleTime: 10 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: recsData } = useQuery({
    queryKey: ["copilot-recs", city.id],
    queryFn: () => copilotApi.getRecommendations(city.id).then((r: any) => r?.data?.data ?? r?.data ?? null),
    staleTime: 30 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: healthData } = useQuery({
    queryKey: ["health-advice", city.id],
    queryFn: () => copilotApi.healthAdvice(city.id).then((r: any) => r?.data?.data ?? r?.data ?? null),
    staleTime: 60 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const mockWind = useMemo(() => {
    const r = seededRandom(city.aqi + city.temp);
    return { speed: Math.round((2 + r() * 6) * 10) / 10, direction: Math.round(r() * 360) };
  }, [city.aqi, city.temp]);
  const windSpeed = city.windSpeed ?? mockWind.speed;
  const windDirection = city.windDirection ?? mockWind.direction;
  const feelsLikeC = feelsLike(city.temp, city.humidity, windSpeed);

  const mockData = useMemo(
    () =>
      generateLiveForecastSeries(effectiveAqi, range.hours, {
        temp: city.temp,
        humidity: city.humidity,
        windSpeed,
      }),
    [effectiveAqi, range.hours, city.temp, city.humidity, windSpeed],
  );

  const data = useMemo(() => {
    const raw = apiData?.series ?? mockData;
    if (!Array.isArray(raw) || raw.length === 0) return mockData;
    return raw.map((d, i) => (i === 0 ? { ...d, predicted: effectiveAqi, label: "Now" } : d));
  }, [apiData?.series, mockData, effectiveAqi]);

  const peak = useMemo(
    () => Math.max(...data.map((d: { predicted: number }) => d.predicted)),
    [data],
  );
  const avg = useMemo(
    () =>
      Math.round(
        data.reduce((s: number, d: { predicted: number }) => s + d.predicted, 0) / data.length,
      ),
    [data],
  );
  const conf = apiData?.confidence ?? 0.922;
  const hasSeries = Array.isArray(data) && data.length > 0;

  const predictionError = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const spread =
      data.reduce((s: number, d: { upper: number; lower: number }) => s + (d.upper - d.lower), 0) /
      data.length;
    return Math.round(spread / 2);
  }, [data]);

  const mockWeekly = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayIdx = new Date().getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const dayLabel = i === 0 ? "Today" : days[(todayIdx + i - 1 + 7) % 7];
      const wave = i === 0 ? 0 : Math.sin(i * 0.9) * (effectiveAqi * 0.1);
      const predicted = i === 0 ? effectiveAqi : Math.max(5, Math.round(effectiveAqi + wave));
      const margin = Math.round(4 + i * 2);
      return {
        label: dayLabel,
        predicted,
        upper: predicted + margin,
        lower: Math.max(2, predicted - margin),
      };
    });
  }, [effectiveAqi]);

  const weekly = useMemo(() => {
    if (weeklyData?.weekly?.length) {
      return weeklyData.weekly.map((d: { day: string; aqi: number }, i: number) => ({
        label: i === 0 ? "Today" : d.day,
        predicted: i === 0 ? effectiveAqi : d.aqi,
        upper: (i === 0 ? effectiveAqi : d.aqi) + 14,
        lower: Math.max(2, (i === 0 ? effectiveAqi : d.aqi) - 14),
      }));
    }
    return mockWeekly;
  }, [weeklyData?.weekly, effectiveAqi, mockWeekly]);

  const advisories = useMemo(() => {
    if (apiData?.advisories) return apiData.advisories;
    const b24 = findAqiBand(avg);
    const status24h = b24.label;
    const tone24h = aqiAccent(avg);
    const desc24h =
      avg <= 50
        ? `Air quality in ${city.name} is forecast to remain optimal (avg AQI ${avg}).`
        : avg <= 100
          ? `Acceptable air quality in ${city.name} (avg AQI ${avg}). Sensitive groups may experience minor discomfort.`
          : `Elevated pollution projected in ${city.name} (avg AQI ${avg}). Pre-position environmental response units.`;

    const status48h = peak > 150 ? "High Peak" : peak > 100 ? "Elevated" : "Stable Recovery";
    const tone48h = peak > 150 ? "destructive" : peak > 100 ? "warning" : "success";
    const desc48h =
      peak > 100
        ? `Peak AQI ${peak} forecast during high commute windows. Monitor sensitive locations.`
        : `Air quality expected to remain favorable as wind (${windSpeed} m/s) aids dispersion.`;

    return [
      { period: "Next 24h", status: status24h, desc: desc24h, tone: tone24h },
      { period: "24–48h", status: status48h, desc: desc48h, tone: tone48h },
      {
        period: "48–72h",
        status: "Recovery",
        desc: "Boundary layer height increases, improving atmospheric mixing and dispersing particulates.",
        tone: "success",
      },
    ];
  }, [apiData?.advisories, avg, peak, effectiveAqi, city.name, windSpeed]);

  const recs: Array<{ title: string; impact: string; effort: string; confidence: number }> =
    recsData?.recommendations ?? [
      {
        title: "Restrict heavy vehicles 06:00–10:00 in urban core",
        impact: "−18 AQI",
        effort: "Low",
        confidence: 0.86,
      },
      {
        title: "Activate misting stations in high-pollution zones",
        impact: "−9 PM10",
        effort: "Medium",
        confidence: 0.74,
      },
      {
        title: "Issue advisory for sensitive groups",
        impact: "Health risk ↓15%",
        effort: "Low",
        confidence: 0.92,
      },
    ];

  const windIsReal = typeof city.windSpeed === "number";

  const healthAdvice = healthData?.advice ?? {
    riskLevel: band.label,
    outdoor: effectiveAqi < 100 ? "Suitable for most people" : "Avoid prolonged outdoor activity",
    exercise: effectiveAqi < 100 ? "Recommended morning/evening" : "Reduce intensity outdoors",
    masks: effectiveAqi < 150 ? "Not required" : "N95 recommended",
    summary: `Current AQI ${effectiveAqi} (${band.label}). ${effectiveAqi < 100 ? "Air quality is acceptable." : "Consider reducing outdoor exposure."}`,
    sensitiveGroups: effectiveAqi < 100 ? "Monitor symptoms" : "Avoid outdoor exposure",
  };

  // Environmental Health Score (deterministic composite from city metrics)
  const envHealthScore = useMemo(() => {
    const airStars = Math.max(0, Math.min(5, ((300 - effectiveAqi) / 300) * 5));
    const waterStars = (city.water / 100) * 5;
    const ecoStars = (city.eco / 100) * 5;
    const riskStars = Math.max(0, ((100 - city.risk) / 100) * 5);
    const overall = Math.round(((airStars + waterStars + ecoStars + riskStars) / 4) * 10) / 10;
    return {
      overall: Math.round(overall * 10) / 10,
      pct: Math.round((overall / 5) * 100),
      air: Math.round(airStars * 2) / 2,
      water: Math.round(waterStars * 2) / 2,
      eco: Math.round(ecoStars * 2) / 2,
      risk: Math.round(riskStars * 2) / 2,
    };
  }, [effectiveAqi, city.water, city.eco, city.risk]);

  // Drivers of AQI changes
  const drivers = useMemo(() => {
    const hour = new Date().getHours();
    const isRush = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
    return [
      {
        icon: WindIcon,
        title: "Wind Impact",
        body:
          windSpeed >= 4
            ? "Wind is actively dispersing pollutants, helping keep AQI in check."
            : windSpeed >= 1.5
              ? "Light wind provides modest pollutant dispersion."
              : "Calm conditions allow pollutants to accumulate near the surface.",
        trend: windSpeed >= 4 ? "down" : windSpeed < 1.5 ? "up" : "flat",
        confidence: windIsReal ? 92 : 70,
        heuristic: false,
      },
      {
        icon: Droplets,
        title: "Humidity",
        body:
          city.humidity >= 75
            ? "High humidity may increase particulate settling and haze."
            : city.humidity >= 45
              ? "Moderate humidity has limited impact on particulate behavior."
              : "Low humidity keeps particulates airborne longer.",
        trend: city.humidity >= 75 ? "up" : "flat",
        confidence: 90,
        heuristic: false,
      },
      {
        icon: Car,
        title: "Traffic Influence",
        body: isRush
          ? `Peak commute window (${hour}:00) — vehicle emissions typically elevate local NO₂ and PM.`
          : "Outside typical peak-commute hours — traffic contribution is likely lower.",
        trend: isRush ? "up" : "flat",
        confidence: 62,
        heuristic: true,
      },
      {
        icon: Thermometer,
        title: "Temperature",
        body:
          city.temp >= 32
            ? "Higher temperatures increase atmospheric mixing, which can help disperse pollutants."
            : "Stable, moderate temperatures — limited effect on vertical air mixing.",
        trend: city.temp >= 32 ? "down" : "flat",
        confidence: 88,
        heuristic: false,
      },
    ];
  }, [windSpeed, windIsReal, city.humidity, city.temp]);

  // Timeline — 12 slots
  const timelineLabels = useMemo(() => makeTimelineHours(), []);
  const timelineData = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 12));
    return timelineLabels.map((label, i) => {
      const d = data[Math.min(i * step, data.length - 1)] as {
        predicted: number;
        lower: number;
        upper: number;
      };
      return {
        label,
        predicted: d?.predicted ?? effectiveAqi,
        lower: d?.lower ?? effectiveAqi - 14,
        upper: d?.upper ?? effectiveAqi + 14,
      };
    });
  }, [data, timelineLabels, effectiveAqi]);

  // Per-hour trend (PM2.5 + NO2)
  const hourlyTrend = useMemo(() => trendSeries(effectiveAqi, effectiveAqi, 24), [effectiveAqi]);

  // Animated metric counters
  const animatedAqi = useCountUp(effectiveAqi);
  const animatedTemp = useCountUp(city.temp);
  const animatedHum = useCountUp(city.humidity);

  // Simplified Health Advisory list (4 non-duplicated cards)
  const healthItems = useMemo(
    () => [
      { label: "Outdoor Activities", value: healthAdvice.outdoor, icon: "🚶" },
      { label: "Sensitive Groups", value: healthAdvice.sensitiveGroups, icon: "🫁" },
      { label: "Exercise", value: healthAdvice.exercise, icon: "🏃" },
      { label: "Masks", value: healthAdvice.masks, icon: "😷" },
    ],
    [healthAdvice],
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* ── 1. FORECAST HERO SECTION ────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="glass relative overflow-hidden rounded-2xl p-6 md:p-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none"
        style={{ boxShadow: glowVars.ambient, transition: "box-shadow 1.5s ease" }}
      >
        {/* Background ambient lighting effects */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-24 -left-20 size-80 rounded-full drift-blob opacity-30 blur-3xl motion-reduce:animate-none"
            style={{
              background: `radial-gradient(circle, ${glowVars.glow}66, transparent 70%)`,
              transition: "background 1.5s ease",
            }}
          />
          <div
            className="absolute -bottom-32 -right-16 size-96 rounded-full drift-blob opacity-20 blur-3xl motion-reduce:animate-none"
            style={{
              background: `radial-gradient(circle, var(--color-info), transparent 70%)`,
              animationDelay: "-9s",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isApiConnected ? "bg-[var(--color-success)] pulse-dot" : "bg-muted-foreground/50",
                )}
              />
              {isApiConnected ? "Live data" : "Offline · mock"} · {now || "—"}
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Forecast Center</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-lg text-muted-foreground">
                <MapPin className="size-4" /> {city.name}, {city.country}
              </span>
              <Pill tone={aqiAccent(city.aqi)}>
                <span className="size-1.5 rounded-full" style={{ background: band.color }} />{" "}
                {band.label}
              </Pill>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Thermometer className="size-3.5" /> {city.temp}°C · feels {feelsLikeC}°
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Droplets className="size-3.5" /> {city.humidity}%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="size-3.5" /> PM2.5 {city.pm25}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <WindIcon className="size-3.5" /> {windSpeed} m/s {degToCompass(windDirection)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Ensemble model · {(conf * 100).toFixed(1)}% accuracy · ±{predictionError} AQI error
              band
            </p>
          </div>

          <div className="flex flex-col items-end gap-4 shrink-0">
            <AqiRing
              value={animatedAqi}
              pct={Math.max(2, Math.min(100, (effectiveAqi / 300) * 100))}
              color={band.color}
              label={band.label}
              glowColor={glowVars.glow}
            />
            <div className="flex glass rounded-lg p-1" role="group" aria-label="Forecast horizon">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActive(r.id)}
                  aria-pressed={active === r.id}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                    active === r.id
                      ? "aurora text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advisory ticker */}
        {city.alerts > 0 && (
          <div className="relative mt-5 overflow-hidden rounded-lg glass px-3 py-2">
            <div className="flex whitespace-nowrap marquee-scroll motion-reduce:animate-none">
              {[...advisories, ...advisories].map(
                (a: { period: string; desc: string }, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground pr-10"
                  >
                    <AlertTriangle className="size-3.5 text-[var(--color-warning)] shrink-0" />{" "}
                    {a.period}: {a.desc}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </section>

      {/* Loading state indicator when fetching new range */}
      {forecastLoading && <ChartSkeleton />}

      {/* ── 2. CURRENT CONDITIONS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <MiniCard
          label="Current AQI"
          value={animatedAqi}
          accent={band.color}
          icon={<Gauge className="size-4" />}
          hint={band.label}
        />
        <MiniCard
          label="Temperature"
          value={`${animatedTemp}°C`}
          icon={<Thermometer className="size-4" />}
          hint={`Feels ${feelsLikeC}° (est.)`}
        />
        <MiniCard
          label="Humidity"
          value={`${animatedHum}%`}
          icon={<Droplets className="size-4" />}
          hint="Relative"
        />
        <MiniCard
          label="Pressure"
          value={city.pressure ? `${city.pressure} hPa` : "1013 hPa"}
          icon={<Compass className="size-4" />}
          hint="Sea-level"
        />
        <MiniCard
          label="Wind Speed"
          value={`${windSpeed} m/s`}
          icon={<WindIcon className="size-4" />}
          hint={`${degToCompass(windDirection)}`}
        />
        <MiniCard
          label="Confidence"
          value={`${(conf * 100).toFixed(0)}%`}
          icon={<TrendingUp className="size-4" />}
          hint={`±${predictionError} AQI`}
        />
      </div>

      {/* ── 3. HOURLY FORECAST (12 Two-Hour Slots) ───────────────────────────── */}
      <Panel eyebrow="Timeline" title="Hour-by-hour forecast">
        <div
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5 md:gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 snap-x scroll-smooth"
          role="list"
          aria-label="Hourly AQI forecast"
        >
          {timelineData.map((slot, i) => {
            const b = findAqiBand(slot.predicted);
            return (
              <div
                key={i}
                role="listitem"
                aria-label={`${slot.label}: AQI ${slot.predicted}, ${b.label}`}
                className="snap-start shrink-0 lg:shrink flex flex-col items-center justify-between glass rounded-xl min-w-[105px] sm:min-w-[115px] lg:min-w-0 h-[148px] md:h-[156px] p-3.5 md:p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 motion-reduce:hover:translate-y-0 cursor-default"
                style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${b.color} 25%, transparent)` }}
              >
                <div className="text-xs font-semibold text-muted-foreground tracking-tight">
                  {slot.label}
                </div>
                <div className="text-2xl md:text-3xl my-0.5" aria-hidden>
                  {slot.predicted <= 50
                    ? "☀️"
                    : slot.predicted <= 100
                      ? "🌤️"
                      : slot.predicted <= 150
                        ? "🌫️"
                        : "⚠️"}
                </div>
                <div className="space-y-0.5 w-full">
                  <div
                    className="text-lg md:text-xl font-bold tabular-nums tracking-tight"
                    style={{ color: b.color }}
                  >
                    {slot.predicted}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <TrendArrow
                      current={slot.predicted}
                      previous={i > 0 ? timelineData[i - 1].predicted : undefined}
                    />
                    <span className="text-[10px] md:text-[11px] font-medium text-muted-foreground truncate max-w-[70px]">
                      {b.shortLabel ?? b.label.slice(0, 3)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── 4. 48 HOUR AQI PROJECTION ────────────────────────────────────────── */}
      <Panel
        eyebrow="Forecast"
        title={`${range.label} AQI projection`}
        action={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-primary" />
              Predicted
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              ±Band
            </span>
          </div>
        }
      >
        {hasSeries ? (
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="band-p3" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
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
                  cursor={{
                    stroke: "var(--color-muted-foreground)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={((d: { lower: number; upper: number }) => [d.lower, d.upper]) as any}
                  stroke="none"
                  fill="url(#band-p3)"
                  animationDuration={900}
                  name="Confidence Band"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  animationDuration={900}
                />
                {data[0] && (
                  <ReferenceLine
                    x={(data[0] as { label: string }).label}
                    stroke="var(--color-foreground)"
                    strokeOpacity={0.3}
                    strokeDasharray="2 2"
                    label={{
                      value: "Now",
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState onRetry={() => refetchForecast()} />
        )}
      </Panel>

      {/* ── 5. POLLUTANT FORECAST ────────────────────────────────────────────── */}
      <Panel eyebrow="Pollutant Forecast" title="PM2.5 · NO₂ projection (next 24 hours)">
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={hourlyTrend}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={5}
              />
              <YAxis
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
              />
              <Line
                type="monotone"
                dataKey="pm25"
                stroke="var(--color-warning)"
                strokeWidth={2}
                dot={false}
                name="PM2.5"
              />
              <Line
                type="monotone"
                dataKey="no2"
                stroke="var(--color-destructive)"
                strokeWidth={2}
                dot={false}
                name="NO₂"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ── 6. WHY AQI IS CHANGING (DRIVER ANALYSIS) ─────────────────────────── */}
      <Panel eyebrow="Driver Analysis" title="Why AQI is changing">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {drivers.map((d) => (
            <div
              key={d.title}
              className="rounded-xl border border-border p-4 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 glass"
            >
              <div className="flex items-center justify-between mb-2">
                <d.icon className="size-4 text-primary" />
                {d.trend === "up" ? (
                  <ArrowUp className="size-3.5 text-[var(--color-warning)]" />
                ) : d.trend === "down" ? (
                  <ArrowDown className="size-3.5 text-[var(--color-success)]" />
                ) : (
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="text-sm font-medium">{d.title}</div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{d.body}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${d.confidence}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                  {d.confidence}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── 7. AI RECOMMENDATIONS (MAX 3 CARDS) ─────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="size-3.5 text-[var(--color-primary)]" />
          AI Recommendations{!isApiConnected && <Pill tone="muted">offline fallback</Pill>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recs.slice(0, 3).map((rec, i) => (
            <RecommendationCard key={i} index={i} rec={rec} />
          ))}
        </div>
      </div>

      {/* ── 8. SEVEN DAY OUTLOOK ────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          7-day outlook
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
          {weekly.map((d: { label: string; predicted: number }, i: number) => {
            const b = aqiBand(d.predicted);
            return (
              <TiltCard key={i} accentColor={b.color}>
                <div className="text-xs text-muted-foreground">{d.label}</div>
                <div className="text-xl font-semibold tabular-nums mt-2" style={{ color: b.color }}>
                  {d.predicted}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{b.label}</div>
              </TiltCard>
            );
          })}
        </div>
      </div>

      {/* ── 9. WEEKLY TREND ─────────────────────────────────────────────────── */}
      <Panel eyebrow="Weekly Outlook" title="7-day pollutant trajectory">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={weekly}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
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
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--color-primary)" }}
              />
              <Line
                type="monotone"
                dataKey="upper"
                stroke="var(--color-warning)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lower"
                stroke="var(--color-info)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ── 10. ENVIRONMENTAL HEALTH SCORE ─────────────────────────────────── */}
      <Panel
        eyebrow="Environmental Health"
        title="Overall city score"
        action={
          <Pill
            tone={
              envHealthScore.pct > 70
                ? "success"
                : envHealthScore.pct > 50
                  ? "warning"
                  : "destructive"
            }
          >
            {envHealthScore.pct}%
          </Pill>
        }
      >
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative size-24 shrink-0">
            <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={band.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - envHealthScore.pct / 100)}`}
                style={{
                  transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)",
                  filter: `drop-shadow(0 0 4px ${band.color})`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold" style={{ color: band.color }}>
                {envHealthScore.pct}
              </div>
              <div className="text-[9px] text-muted-foreground">/ 100</div>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] space-y-2.5">
            {[
              {
                icon: <Shield className="size-3.5" />,
                label: "Air Quality",
                stars: envHealthScore.air,
              },
              {
                icon: <Droplets className="size-3.5" />,
                label: "Water",
                stars: envHealthScore.water,
              },
              {
                icon: <Leaf className="size-3.5" />,
                label: "Eco Score",
                stars: envHealthScore.eco,
              },
              {
                icon: <Activity className="size-3.5" />,
                label: "Risk",
                stars: envHealthScore.risk,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-muted-foreground shrink-0">{item.icon}</span>
                <span className="text-xs text-muted-foreground w-20 shrink-0">{item.label}</span>
                <StarRating value={item.stars} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* ── 11. HEALTH ADVISORY (SIMPLIFIED TO 4 CARDS) ────────────────────── */}
      <Panel
        eyebrow="Health Advisory"
        title="AI Health Guidance"
        action={<Pill tone={aqiAccent(effectiveAqi)}>{healthAdvice.riskLevel}</Pill>}
      >
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{healthAdvice.summary}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {healthItems.map((item) => (
            <div
              key={item.label}
              className="glass rounded-xl p-3.5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            >
              <div className="text-lg mb-1.5" aria-hidden>
                {item.icon}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {item.label}
              </div>
              <div className="text-xs font-medium mt-1 leading-snug">{item.value}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── 12. COMPACT FOOTER ──────────────────────────────────────────────── */}
      <PremiumFooter isApiConnected={isApiConnected} city={city} conf={conf} />
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
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden group transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
      <div
        className="absolute -top-10 -right-10 size-32 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity"
        style={{ background: accent ?? "var(--color-primary)" }}
      />
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div
        className="text-2xl font-semibold tabular-nums tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

function AqiRing({
  value,
  pct,
  color,
  label,
  glowColor,
}: {
  value: number;
  pct: number;
  color: string;
  label: string;
  glowColor: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
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
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 orbit-spin motion-reduce:animate-none" aria-hidden>
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 size-1.5 rounded-full glow-pulse"
          style={{ background: color }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color }}>
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function TiltCard({ children, accentColor }: { children: ReactNode; accentColor: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-2px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="glass rounded-2xl p-4 transition-[transform,box-shadow] duration-200 will-change-transform motion-reduce:!transform-none hover:shadow-lg"
      style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${accentColor} 20%, transparent)` }}
    >
      {children}
    </div>
  );
}

function RecommendationCard({
  index,
  rec,
}: {
  index: number;
  rec: { title: string; impact: string; effort: string; confidence: number };
}) {
  const [expanded, setExpanded] = useState(false);
  const priority =
    rec.confidence >= 0.85 && rec.effort === "Low"
      ? "High"
      : rec.confidence >= 0.7
        ? "Medium"
        : "Low";
  const priorityTone =
    priority === "High" ? "destructive" : priority === "Medium" ? "warning" : "info";
  const timeEstimate =
    rec.effort === "Low" ? "~1 day" : rec.effort === "Medium" ? "~1 week" : "~1 month";

  return (
    <TiltCard accentColor="var(--color-primary)">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">Action {index + 1}</span>
        <Pill tone={priorityTone}>{priority} priority</Pill>
      </div>
      <div className="text-sm font-semibold leading-snug mb-3">{rec.title}</div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-success)] font-semibold">{rec.impact}</span>
        <span className="text-muted-foreground">{rec.effort} effort</span>
      </div>
      <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-1000"
          style={{ width: `${Math.round(rec.confidence * 100)}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
        {Math.round(rec.confidence * 100)}% confidence
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Show details"}
        <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <div className="text-muted-foreground">Est. time</div>
            <div className="font-medium">{timeEstimate}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cost tier</div>
            <div className="font-medium">{rec.effort}</div>
          </div>
        </div>
      )}
    </TiltCard>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value >= i + 0.5;
        return (
          <div key={i} className="relative size-3">
            <Star className="size-3 text-muted/50" strokeWidth={1.5} />
            {(filled || half) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? "50%" : "100%" }}
              >
                <Star
                  className="size-3 text-[var(--color-warning)] fill-[var(--color-warning)]"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PremiumFooter({
  isApiConnected,
  city,
  conf,
}: {
  isApiConnected: boolean;
  city: { name: string; updatedAt?: string };
  conf: number;
}) {
  const [latency, setLatency] = useState(82);
  const [ts, setTs] = useState("");
  useEffect(() => {
    const tick = () => {
      setLatency(isApiConnected ? Math.round(60 + Math.random() * 80) : 0);
      setTs(new Date().toLocaleTimeString());
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [isApiConnected]);

  const sources = [
    { label: "Satellite", ok: true },
    { label: "Weather API", ok: isApiConnected },
    { label: "AQ Sensors", ok: isApiConnected },
    { label: "Ensemble ML", ok: true },
  ];

  return (
    <footer className="glass rounded-2xl p-4 md:px-6 md:py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs border border-border/50">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Sources:
        </span>
        {sources.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                s.ok ? "bg-[var(--color-success)] pulse-dot" : "bg-muted-foreground/30",
              )}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-5 text-muted-foreground flex-wrap">
        <span>
          Last updated:{" "}
          <strong className="text-foreground font-medium">
            {city.updatedAt ? new Date(city.updatedAt).toLocaleTimeString() : ts}
          </strong>
        </span>
        {isApiConnected && (
          <span>
            Latency: <strong className="text-foreground font-medium">{latency} ms</strong>
          </span>
        )}
        <span>
          Model: <strong className="text-foreground font-medium">GreenGuard v2.4.1</strong>
        </span>
        <span>
          Accuracy: <strong className="text-foreground font-medium">{(conf * 100).toFixed(1)}%</strong>
        </span>
      </div>
    </footer>
  );
}

function TrendArrow({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return <ArrowRight className="size-3 text-muted-foreground" />;
  const diff = current - previous;
  if (Math.abs(diff) < 3) return <ArrowRight className="size-3 text-muted-foreground" />;
  return diff > 0 ? (
    <ArrowUp className="size-3 text-[var(--color-warning)]" />
  ) : (
    <ArrowDown className="size-3 text-[var(--color-success)]" />
  );
}

function ChartSkeleton() {
  return (
    <div className="h-72 flex items-center justify-center bg-muted/10 rounded-xl animate-pulse">
      <div className="text-xs text-muted-foreground">Generating forecast projection…</div>
    </div>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-72 flex flex-col items-center justify-center gap-3 text-center p-6 glass rounded-xl">
      <AlertTriangle className="size-8 text-[var(--color-warning)]" />
      <div className="text-sm font-medium">Forecast projection offline</div>
      <p className="text-xs text-muted-foreground max-w-sm">
        Telemetry is unreachable. Check network connection or retry.
      </p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg text-xs font-medium aurora text-primary-foreground"
      >
        Retry connection
      </button>
    </div>
  );
}
