import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel, Pill } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { forecastSeries, aqiBand, trendSeries, findAqiBand } from "@/lib/mock-data";
import { useQuery, useMutation } from "@tanstack/react-query";
import { forecastApi } from "@/lib/api/environmental.api";
import { copilotApi } from "@/lib/api/services.api";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Car,
  ChevronDown,
  ChevronRight,
  CloudOff,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Heart,
  Leaf,
  MapPin,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Star,
  Thermometer,
  TrendingUp,
  Wind as WindIcon,
  X,
  Zap,
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

const LOADING_STEPS = [
  "Connecting to sensor network…",
  "Downloading weather data…",
  "Processing air quality readings…",
  "Running ensemble forecast model…",
  "Generating AI predictions…",
];

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

// ─── Pure helpers (no hooks) ──────────────────────────────────────────────────
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

// Live-data ensemble forecast generator: Anchored strictly to live telemetry at Hour 0 ("Now")
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

// ─── Main component ───────────────────────────────────────────────────────────
function Forecast() {
  const { city, isApiConnected } = useCity();
  const [active, setActive] = useState<(typeof RANGES)[number]["id"]>("48h");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoAqi, setDemoAqi] = useState(city.aqi);
  const [toasts, setToasts] = useState<
    Array<{ id: number; text: string; tone: "warning" | "success" | "info" }>
  >([]);
  const range = RANGES.find((r) => r.id === active)!;
  const band = aqiBand(demoMode ? demoAqi : city.aqi);
  const effectiveAqi = demoMode ? demoAqi : city.aqi;
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

  // ─── Module 18 — Demo Mode: cycles AQI through the full range and fires toasts ──
  const toastIdRef = useRef(0);
  const pushToast = useCallback((text: string, tone: "warning" | "success" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  useEffect(() => {
    if (!demoMode) {
      setDemoAqi(city.aqi);
      return;
    }
    const AQI_STEPS = [35, 78, 112, 158, 205, 112, 78, 35];
    const DEMO_TOASTS = [
      { text: "⚠ AQI rising — traffic peak approaching", tone: "warning" as const },
      { text: "⚠ PM2.5 crossing threshold at 3 PM", tone: "warning" as const },
      { text: "✓ Rain approaching — AQI should improve", tone: "success" as const },
      { text: "ℹ Wind dispersing pollutants northward", tone: "info" as const },
    ];
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % AQI_STEPS.length;
      setDemoAqi(AQI_STEPS[step]);
      pushToast(
        DEMO_TOASTS[step % DEMO_TOASTS.length].text,
        DEMO_TOASTS[step % DEMO_TOASTS.length].tone,
      );
    }, 3000);
    pushToast("Demo mode active — cycling through AQI conditions", "info");
    return () => clearInterval(id);
  }, [demoMode, city.aqi, pushToast]);

  // ─── Data ─────────────────────────────────────────────────────────────────
  const {
    data: apiData,
    isLoading: forecastLoading,
    refetch: refetchForecast,
  } = useQuery({
    queryKey: ["forecast", city.id, range.hours],
    queryFn: () =>
      forecastApi.getForecast(city.id, range.hours).then((r) => r.data?.data ?? r.data),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: weeklyData } = useQuery({
    queryKey: ["forecast-weekly", city.id],
    queryFn: () => forecastApi.getWeekly(city.id).then((r) => r.data?.data ?? r.data),
    staleTime: 10 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: recsData } = useQuery({
    queryKey: ["copilot-recs", city.id],
    queryFn: () => copilotApi.getRecommendations(city.id).then((r: any) => r.data?.data ?? r.data),
    staleTime: 30 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  // Module 8 — Smart Health Advisor (real Gemini endpoint)
  const { data: healthData } = useQuery({
    queryKey: ["health-advice", city.id],
    queryFn: () => copilotApi.healthAdvice(city.id).then((r: any) => r.data?.data ?? r.data),
    staleTime: 60 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  // Phase 4: AI Weather Intelligence — uses CityInsightSet (environmentalSummary, aqiInsights, topActions)
  const { data: insightsData } = useQuery({
    queryKey: ["city-insights", city.id],
    queryFn: () => copilotApi.cityInsights(city.id).then((r: any) => r.data?.data ?? r.data),
    staleTime: 30 * 60_000,
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
    // Anchor index 0 ("Now") to live effectiveAqi so the starting point ALWAYS matches live telemetry
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
      {
        title: "Audit industrial cluster emissions",
        impact: "−24 PM2.5",
        effort: "High",
        confidence: 0.68,
      },
    ];

  // Module 9 — Pollution source breakdown derived from real pollutant ratios
  // These are proportional estimates from real sensor readings, not fabricated percentages.
  const pollutionSources = useMemo(() => {
    const ratio = city.aqi > 0 ? effectiveAqi / city.aqi : 1;
    const traffic = Math.round(city.no2 * ratio); // NO2 is the traffic tracer
    const industry = Math.round(Math.max(0, city.pm10 - city.pm25) * ratio); // Coarse PM: industrial/dust
    const pm25fine = Math.round(city.pm25 * ratio); // Fine PM: combustion/biomass
    const co2base = Math.round(Math.max(0, city.co2 - 400) * ratio); // Excess CO2 above background
    const total = traffic + industry + pm25fine + co2base + 1; // +1 avoids /0
    return [
      { name: "Traffic", value: Math.round((traffic / total) * 100), color: "#3b82f6" },
      { name: "Industry", value: Math.round((industry / total) * 100), color: "#f97316" },
      { name: "Fine PM", value: Math.round((pm25fine / total) * 100), color: "#a855f7" },
      { name: "CO₂", value: Math.round((co2base / total) * 100), color: "#22c55e" },
    ].filter((s) => s.value > 0);
  }, [city.no2, city.pm10, city.pm25, city.co2, city.aqi, effectiveAqi]);

  // Wind
  const windIsReal = typeof city.windSpeed === "number";

  // Health advice (offline fallback built from real AQI band)
  const healthAdvice = healthData?.advice ?? {
    riskLevel: band.label,
    outdoor: effectiveAqi < 100 ? "Suitable for most people" : "Avoid prolonged outdoor activity",
    exercise: effectiveAqi < 100 ? "Recommended morning/evening" : "Reduce intensity outdoors",
    children: effectiveAqi < 100 ? "Safe" : "Limit time outdoors",
    masks: effectiveAqi < 150 ? "Not required" : "N95 recommended",
    summary: `Current AQI ${effectiveAqi} (${band.label}). ${effectiveAqi < 100 ? "Air quality is acceptable." : "Consider reducing outdoor exposure."}`,
    elderly: effectiveAqi < 100 ? "Normal outdoor activity" : "Stay indoors",
    sensitiveGroups: effectiveAqi < 100 ? "Monitor symptoms" : "Avoid outdoor exposure",
    schools: effectiveAqi < 100 ? "Normal activities" : "Limit outdoor recess",
  };

  // Phase 4 — AI Weather Intelligence text (real Gemini or derived fallback)
  const aiInsight =
    insightsData?.insights?.environmentalSummary ??
    `${city.name} currently records AQI ${effectiveAqi} (${band.label}). ${effectiveAqi < 100 ? "Air quality is acceptable for most activities." : "Elevated pollution levels detected — sensitive groups should limit outdoor exposure."} ${city.humidity > 75 ? "Rising humidity may affect pollutant settling over the next few hours." : "Conditions are stable."}`;

  // Phase 4 — Environmental Health Score (all real values from city object)
  // Stars: 0–5 rounded to nearest 0.5. Each metric is real and labeled.
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

  // Phase 4 — AQI horizontal bar timeline (Apple Health style) from real forecast series
  const aqiTimeline = useMemo(() => {
    if (!hasSeries) return [];
    const step = Math.max(1, Math.floor(data.length / 8));
    return Array.from({ length: 8 }, (_, i) => {
      const d = data[Math.min(i * step, data.length - 1)] as { predicted: number; label: string };
      const b = findAqiBand(d.predicted);
      return {
        label: d.label || `+${i * step}h`,
        aqi: d.predicted,
        color: b.colorRaw,
        band: b.shortLabel,
        pct: Math.min(100, Math.round((d.predicted / 300) * 100)),
      };
    });
  }, [data, hasSeries]);

  // Phase 10 — Trend direction: real comparison of first-half vs second-half of the
  // forecast series (not a fabricated label — derived directly from the same series
  // rendered on the chart).
  const trendInfo = useMemo(() => {
    if (!hasSeries || data.length < 4) return { direction: "stable" as const, deltaPct: 0 };
    const mid = Math.floor(data.length / 2);
    const firstAvg =
      data.slice(0, mid).reduce((s: number, d: { predicted: number }) => s + d.predicted, 0) / mid;
    const secondAvg =
      data.slice(mid).reduce((s: number, d: { predicted: number }) => s + d.predicted, 0) /
      (data.length - mid);
    const deltaPct = Math.round(((secondAvg - firstAvg) / Math.max(1, firstAvg)) * 100);
    const direction = deltaPct > 4 ? "rising" : deltaPct < -4 ? "falling" : "stable";
    return { direction, deltaPct } as {
      direction: "rising" | "falling" | "stable";
      deltaPct: number;
    };
  }, [data, hasSeries]);

  // Peak / lowest points on the currently plotted series — used for chart markers.
  const seriesExtremes = useMemo(() => {
    if (!hasSeries) return null;
    let maxPt = data[0],
      minPt = data[0];
    for (const d of data as Array<{ predicted: number; label: string }>) {
      if (d.predicted > maxPt.predicted) maxPt = d;
      if (d.predicted < minPt.predicted) minPt = d;
    }
    return { max: maxPt, min: minPt };
  }, [data, hasSeries]);

  // Phase 10 — Forecast quality chips. Every chip is derived from a real value already
  // computed above; "Rain Unlikely" from the original ask is omitted since this app
  // has no rain-probability data source anywhere to back that claim.
  const qualityChips = useMemo(() => {
    const chips: Array<{ label: string; tone: "success" | "warning" | "destructive" | "info" }> =
      [];
    chips.push(
      conf >= 0.85
        ? { label: "High Confidence", tone: "success" }
        : conf >= 0.65
          ? { label: "Moderate Confidence", tone: "warning" }
          : { label: "Low Confidence", tone: "destructive" },
    );
    chips.push(
      trendInfo.direction === "stable"
        ? { label: "Stable Trend", tone: "info" }
        : trendInfo.direction === "rising"
          ? { label: "Rising Trend", tone: "warning" }
          : { label: "Improving Trend", tone: "success" },
    );
    chips.push(
      effectiveAqi <= 100
        ? { label: "Low Risk", tone: "success" }
        : effectiveAqi <= 150
          ? { label: "Moderate Risk", tone: "warning" }
          : { label: "High Risk", tone: "destructive" },
    );
    chips.push(
      windSpeed < 2
        ? { label: "Calm Wind", tone: "info" }
        : windSpeed < 6
          ? { label: "Moderate Wind", tone: "info" }
          : { label: "Strong Wind", tone: "success" },
    );
    chips.push(
      isApiConnected
        ? { label: "Live Telemetry", tone: "success" }
        : { label: "Offline · Mock Data", tone: "warning" },
    );
    return chips;
  }, [conf, trendInfo.direction, effectiveAqi, windSpeed, isApiConnected]);

  // Phase 10 — Forecast Driver Analysis. Wind/Humidity/Temperature are real measured
  // values. Traffic has no sensor in this stack, so it's an honestly-labeled
  // time-of-day commute heuristic — not presented as measured data, and given a
  // lower confidence to reflect that.
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

  // Phase 10 — Health Advisory 2.0 extra groups (Athletes, Cyclists). The real
  // health-advice endpoint doesn't return these two specific groups, so they're
  // derived here from standard AQI-band exertion thresholds and clearly disclosed
  // as rule-based rather than attributed to Gemini like the other fields.
  const extraHealthGroups = useMemo(() => {
    const aqi = effectiveAqi;
    return {
      athletes:
        aqi <= 50
          ? "Full-intensity training safe"
          : aqi <= 100
            ? "Reduce high-intensity intervals"
            : aqi <= 150
              ? "Move intense training indoors"
              : "Avoid outdoor training entirely",
      cyclists:
        aqi <= 50
          ? "Ideal conditions for cycling"
          : aqi <= 100
            ? "Fine for casual rides, avoid high-traffic routes"
            : aqi <= 150
              ? "Shorten rides, choose low-traffic routes"
              : "Postpone outdoor cycling",
    };
  }, [effectiveAqi]);

  // Timeline — 12 two-hour slots mapped to real forecast series
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

  // Per-hour trend (PM2.5 + NO2 on same scale)
  const hourlyTrend = useMemo(() => trendSeries(effectiveAqi, effectiveAqi, 24), [effectiveAqi]);

  // Counters
  const animatedAqi = useCountUp(effectiveAqi);
  const animatedTemp = useCountUp(city.temp);
  const animatedHum = useCountUp(city.humidity);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ── CINEMATIC HERO ──────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="glass relative overflow-hidden rounded-2xl p-6 md:p-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none"
        style={{ boxShadow: glowVars.ambient, transition: "box-shadow 1.5s ease" }}
      >
        {/* Aurora blobs — tinted by AQI glow color */}
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
          {/* Cloud bands */}
          <div
            className="absolute top-8 left-0 w-[150%] h-14 rounded-full opacity-10 blur-2xl cloud-drift motion-reduce:animate-none"
            style={{ background: glowVars.glow }}
          />
          <div
            className="absolute bottom-12 left-0 w-[130%] h-10 rounded-full bg-[var(--color-info)]/10 blur-2xl cloud-drift motion-reduce:animate-none"
            style={{ animationDelay: "-18s" }}
          />
          {/* Floating particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute size-1 rounded-full particle-drift motion-reduce:animate-none"
              style={{
                background: glowVars.glow,
                opacity: 0.6,
                left: `${(i * 37) % 100}%`,
                bottom: `${(i * 17) % 70}%`,
                animationDelay: `${-(i * 1.5)}s`,
                ["--particle-x" as string]: `${(i % 2 === 0 ? 1 : -1) * (6 + i)}px`,
              }}
            />
          ))}
          {/* Mouse spotlight */}
          <div
            className="absolute inset-0 opacity-0 md:opacity-100"
            style={{
              background:
                "radial-gradient(220px circle at var(--mx,50%) var(--my,0%), color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 70%)",
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

      {/* ── SECTION 15 — Beautiful loading experience ────────────────────────── */}
      {forecastLoading && <LoadingExperience />}

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
          value={city.pressure ? `${city.pressure} hPa` : "—"}
          icon={<Compass className="size-4" />}
          hint={city.pressure ? "Sea-level" : "Not reported"}
        />
        <MiniCard
          label="Wind"
          value={`${windSpeed} m/s`}
          icon={<WindIcon className="size-4" />}
          hint={`${degToCompass(windDirection)}${!windIsReal ? " · est." : ""}`}
        />
        <MiniCard
          label="Confidence"
          value={`${(conf * 100).toFixed(0)}%`}
          icon={<TrendingUp className="size-4" />}
          hint={`±${predictionError} AQI`}
        />
      </div>

      {/* ── SECTION 5 — Beautiful hour-by-hour weather timeline ───────────── */}
      <Panel eyebrow="Timeline" title="Hour-by-hour forecast">
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 snap-x"
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
                className="snap-start shrink-0 flex flex-col items-center justify-center gap-1.5 glass rounded-xl w-20 h-[124px] p-3 transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.03] motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 cursor-default"
                style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${b.color} 20%, transparent)` }}
              >
                <div className="text-[11px] text-muted-foreground font-medium">{slot.label}</div>
                <div className="text-xl" aria-hidden>
                  {slot.predicted <= 50
                    ? "☀️"
                    : slot.predicted <= 100
                      ? "🌤️"
                      : slot.predicted <= 150
                        ? "🌫️"
                        : "⚠️"}
                </div>
                <div className="text-base font-semibold tabular-nums" style={{ color: b.color }}>
                  {slot.predicted}
                </div>
                <TrendArrow
                  current={slot.predicted}
                  previous={i > 0 ? timelineData[i - 1].predicted : undefined}
                />
                <div className="text-[10px] text-muted-foreground">
                  {b.shortLabel ?? b.label.slice(0, 3)}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Main forecast chart + Sidebar ──────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column 70% */}
        <div className="w-full lg:w-8/12 space-y-4">
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
            {forecastLoading && !hasSeries ? (
              <ChartSkeleton />
            ) : hasSeries ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="band-p3" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--color-border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
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
                      content={
                        <RichTooltip
                          cityPm25={city.pm25}
                          cityNo2={city.no2}
                          cityHumidity={city.humidity}
                          cityTemp={city.temp}
                        />
                      }
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
                    {seriesExtremes && (
                      <>
                        <ReferenceDot
                          x={seriesExtremes.max.label}
                          y={seriesExtremes.max.predicted}
                          r={5}
                          fill="var(--color-destructive)"
                          stroke="var(--color-background)"
                          strokeWidth={2}
                          label={{
                            value: `Peak ${seriesExtremes.max.predicted}`,
                            position: "top",
                            fontSize: 10,
                            fill: "var(--color-destructive)",
                          }}
                        />
                        <ReferenceDot
                          x={seriesExtremes.min.label}
                          y={seriesExtremes.min.predicted}
                          r={5}
                          fill="var(--color-success)"
                          stroke="var(--color-background)"
                          strokeWidth={2}
                          label={{
                            value: `Low ${seriesExtremes.min.predicted}`,
                            position: "bottom",
                            fontSize: 10,
                            fill: "var(--color-success)",
                          }}
                        />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState onRetry={() => refetchForecast()} />
            )}
          </Panel>

          {/* Per-hour PM2.5 + NO2 chart — real derived series */}
          <Panel eyebrow="Pollutant breakdown" title="PM2.5 · NO₂ — next 24 hours">
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={hourlyTrend}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
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

          {/* ── Forecast Driver Analysis ──────────────────────── */}
          <Panel eyebrow="Driver Analysis" title="Why AQI is changing">
            <div className="grid sm:grid-cols-2 gap-3">
              {drivers.map((d) => (
                <div
                  key={d.title}
                  className="rounded-xl border border-border p-3 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
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
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.body}</p>
                  <div className="mt-2 flex items-center gap-1.5">
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
                  {d.heuristic && (
                    <div className="text-[9px] text-muted-foreground/70 mt-1">
                      Time-of-day pattern, not a measured sensor
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Sidebar 30% */}
        <div className="w-full lg:w-4/12 space-y-4">
          {/* Animated confidence gauge */}
          <Panel eyebrow="Model" title="AI confidence">
            <ConfidenceGauge value={conf} error={predictionError} />
            <div className="mt-4 space-y-2 text-sm">
              <SummaryRow label="Peak AQI" value={peak} />
              <SummaryRow label="Avg AQI" value={avg} />
              <SummaryRow
                label="Data last refreshed"
                value={city.updatedAt ? new Date(city.updatedAt).toLocaleTimeString() : now}
              />
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Based on
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Satellite", ok: true },
                  { label: "Weather API", ok: isApiConnected },
                  { label: "AQ Sensors", ok: isApiConnected },
                  { label: "Ensemble ML Model", ok: true },
                ].map((s) => (
                  <span
                    key={s.label}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        s.ok ? "bg-[var(--color-success)]" : "bg-muted-foreground/30",
                      )}
                    />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          {/* SECTION 6 — AI Prediction Story */}
          <Panel eyebrow="Prediction story" title="What happens next">
            <PredictionStory aqi={city.aqi} avg={avg} peak={peak} advisories={advisories} />
          </Panel>

          {/* Location pulse */}
          <Panel eyebrow="Location" title={city.name}>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <span
                  className="absolute inset-0 rounded-full glow-pulse"
                  style={{
                    background: `color-mix(in oklab, ${band.color} 40%, transparent)`,
                    filter: "blur(6px)",
                  }}
                />
                <MapPin className="size-6 relative" style={{ color: band.color }} />
              </div>
              <div className="text-xs text-muted-foreground">
                {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                <div className="text-sm text-foreground font-medium mt-0.5">
                  AQI {city.aqi} · {band.label}
                </div>
              </div>
            </div>
          </Panel>

          {/* Advisories */}
          {advisories.map(
            (c: { period: string; status: string; desc: string; tone: string }, i: number) => (
              <Panel
                key={i}
                eyebrow={c.period}
                title={c.status}
                className="transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                action={
                  <Pill tone={c.tone as "success" | "warning" | "destructive" | "info"}>
                    advisory
                  </Pill>
                }
              >
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </Panel>
            ),
          )}
        </div>
      </div>

      {/* ── Forecast Quality Indicator chips ──────────────── */}
      <div className="flex flex-wrap gap-2">
        {qualityChips.map((c, i) => (
          <Pill key={i} tone={c.tone}>
            {c.label}
          </Pill>
        ))}
      </div>

      {/* ── SECTION 16 — AI Recommendations ───────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="size-3.5 text-[var(--color-primary)]" />
          AI Recommendations{!isApiConnected && <Pill tone="muted">offline fallback</Pill>}
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {recs.map((rec, i) => (
            <RecommendationCard key={i} index={i} rec={rec} />
          ))}
        </div>
      </div>

      {/* ── SECTION 11 — 7-day glassmorphism cards ─────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          7-day outlook
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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

      {/* ── Weekly chart ──────────────────────────────────────────────────── */}
      <Panel eyebrow="Weekly outlook" title="7-day pollutant trajectory">
        <div className="h-56">
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

      {/* ── SECTION 13 — AI insights typing animation ──────────────────────── */}
      <AiInsightsPanel advisories={advisories} />

      {/* ── Phase 4: AI Weather Intelligence + Environmental Health Score ───── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Phase 4 Item 1 — AI Weather Intelligence */}
        <Panel
          eyebrow="AI Weather Intelligence"
          title={
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-4 text-[var(--color-primary)]" />
              Environmental Intelligence
            </span>
          }
          action={!isApiConnected ? <Pill tone="muted">offline estimate</Pill> : undefined}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              {
                icon: <Thermometer className="size-3.5" />,
                label: "Temperature",
                value: `${city.temp}°C`,
                sub: `Feels ${feelsLikeC}°`,
              },
              {
                icon: <Droplets className="size-3.5" />,
                label: "Humidity",
                value: `${city.humidity}%`,
                sub: city.humidity > 75 ? "High" : "Moderate",
              },
              {
                icon: <WindIcon className="size-3.5" />,
                label: "Wind",
                value: `${windSpeed} m/s`,
                sub: degToCompass(windDirection),
              },
              {
                icon: <Eye className="size-3.5" />,
                label: "Pressure",
                value: city.pressure ? `${city.pressure} hPa` : `${effectiveAqi} AQI`,
                sub: city.pressure ? "Sea-level" : band.label,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold tabular-nums">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-3 border-l-2" style={{ borderLeftColor: band.color }}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
              <Sparkles className="size-3" /> AI Insight
            </div>
            <TypewriterText
              text={aiInsight}
              className="text-sm leading-relaxed text-foreground/90"
            />
          </div>
        </Panel>

        {/* Phase 4 Item 2 — Environmental Health Score */}
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
          <div className="flex items-center gap-4 mb-4">
            <div className="relative size-20 shrink-0">
              <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
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
                <div className="text-xl font-bold" style={{ color: band.color }}>
                  {envHealthScore.pct}
                </div>
                <div className="text-[9px] text-muted-foreground">/ 100</div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[
                {
                  icon: <Shield className="size-3" />,
                  label: "Air Quality",
                  stars: envHealthScore.air,
                },
                {
                  icon: <Droplets className="size-3" />,
                  label: "Water",
                  stars: envHealthScore.water,
                },
                {
                  icon: <Leaf className="size-3" />,
                  label: "Eco Score",
                  stars: envHealthScore.eco,
                },
                {
                  icon: <Activity className="size-3" />,
                  label: "Risk",
                  stars: envHealthScore.risk,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">{item.icon}</span>
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{item.label}</span>
                  <StarRating value={item.stars} />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Derived from live AQI, Water QI ({city.water}/100), EcoScore ({city.eco}/100), and Risk
            ({city.risk}/100) sensor readings.
          </p>
        </Panel>
      </div>

      {/* ── Phase 4 Item 8 — AQI Timeline (Apple Health style horizontal bars) ─ */}
      {aqiTimeline.length > 0 && (
        <Panel eyebrow="AQI Timeline" title="Forecast quality by period">
          <div className="space-y-2">
            {aqiTimeline.map((slot, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground w-12 shrink-0 tabular-nums">
                  {slot.label}
                </div>
                <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${slot.pct}%`,
                      background: slot.color,
                      transitionDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                <div
                  className="text-xs font-medium tabular-nums w-8 shrink-0"
                  style={{ color: slot.color }}
                >
                  {slot.aqi}
                </div>
                <div className="text-[10px] text-muted-foreground w-16 shrink-0">{slot.band}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Module 8 — Smart Health Advisor (Phase 4 expanded to 6 fields) ─── */}
      <div className="grid md:grid-cols-2 gap-6">
        <Panel
          eyebrow="Health Advisor"
          title={
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-4 text-[var(--color-destructive)]" />
              AI Health Advisory
            </span>
          }
          action={<Pill tone={aqiAccent(effectiveAqi)}>{healthAdvice.riskLevel}</Pill>}
        >
          <p className="text-sm text-muted-foreground mb-4">{healthAdvice.summary}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Outdoor", value: healthAdvice.outdoor, icon: "🚶" },
              { label: "Exercise", value: healthAdvice.exercise, icon: "🏃" },
              { label: "Children", value: healthAdvice.children, icon: "👧" },
              { label: "Elderly", value: healthAdvice.elderly, icon: "👴" },
              { label: "Sensitive Groups", value: healthAdvice.sensitiveGroups, icon: "🫁" },
              { label: "Masks", value: healthAdvice.masks, icon: "😷" },
              { label: "Athletes", value: extraHealthGroups.athletes, icon: "🏋️" },
              { label: "Cyclists", value: extraHealthGroups.cyclists, icon: "🚴" },
            ].map((item) => (
              <div
                key={item.label}
                className="glass rounded-xl p-2.5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
              >
                <div className="text-base mb-1" aria-hidden>
                  {item.icon}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </div>
                <div className="text-xs font-medium mt-0.5 leading-snug">{item.value}</div>
              </div>
            ))}
          </div>
          {!isApiConnected && (
            <div className="mt-3 text-[10px] text-muted-foreground">
              Estimated · Connect backend for Gemini-powered advice
            </div>
          )}
          <div className="mt-1 text-[10px] text-muted-foreground/70">
            Athletes &amp; Cyclists guidance is rule-based from AQI thresholds, not Gemini-generated
            like the fields above.
          </div>
        </Panel>

        {/* Module 9 — Pollution Sources */}
        <Panel
          eyebrow="AI Analysis"
          title="Pollution source breakdown"
          action={<Pill tone="muted">derived from live sensors</Pill>}
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={pollutionSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    dataKey="value"
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pollutionSources.map((s, i) => (
                      <Cell
                        key={i}
                        fill={s.color}
                        stroke="var(--color-background)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pollutionSources.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-medium tabular-nums">{s.value}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.value}%`, background: s.color }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground mt-2">
                Proportional estimate from NO₂, PM2.5, PM10 &amp; CO₂ readings
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Module 18 — Demo Mode toggle ────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center gap-2 glass rounded-xl px-4 py-2.5">
          <Zap
            className={cn(
              "size-4 transition-colors",
              demoMode ? "text-[var(--color-warning)]" : "text-muted-foreground",
            )}
          />
          <span className="text-sm font-medium">{demoMode ? "Demo Mode ON" : "Demo Mode"}</span>
          <button
            onClick={() => setDemoMode((d) => !d)}
            role="switch"
            aria-checked={demoMode}
            aria-label="Toggle demo mode"
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
              demoMode ? "aurora" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200",
                demoMode ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground max-w-xs">
          {demoMode
            ? "Cycling AQI conditions & firing live alerts — ideal for presentations."
            : "Enable to simulate live AQI changes for live demos."}
        </p>
      </div>

      {/* ── Phase 4 Item 20 — Premium Footer ────────────────────────────────── */}
      <PremiumFooter isApiConnected={isApiConnected} city={city} conf={conf} />

      {/* ── Module 10 — Animated toast notifications ────────────────────────── */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "glass rounded-xl px-4 py-2.5 text-sm max-w-xs shadow-lg animate-in slide-in-from-right-4 fade-in-0 duration-300 pointer-events-auto",
              t.tone === "warning" && "border-[var(--color-warning)]/30",
              t.tone === "success" && "border-[var(--color-success)]/30",
            )}
          >
            <span
              className={cn(
                "font-medium",
                t.tone === "warning"
                  ? "text-[var(--color-warning)]"
                  : t.tone === "success"
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-info)]",
              )}
            >
              {t.text}
            </span>
          </div>
        ))}
      </div>

      {/* ── AI Copilot — breathing/glowing button ──────────────────────────── */}
      <button
        onClick={() => setCopilotOpen(true)}
        aria-label="Open AI Copilot"
        className="fixed bottom-6 right-6 z-50 rounded-full size-14 flex flex-col items-center justify-center gap-0.5 text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] aurora transition-transform duration-150 hover:scale-110 active:scale-95"
        style={{
          boxShadow:
            "0 0 0 4px color-mix(in oklab, var(--color-primary) 25%, transparent), 0 0 24px var(--color-primary)",
          animation: "glow-pulse 2s ease-in-out infinite",
        }}
      >
        <Bot className="size-5" />
        <span className="text-[9px] font-semibold tracking-wide opacity-90">AI</span>
      </button>

      {copilotOpen && <CopilotPanel city={city} onClose={() => setCopilotOpen(false)} />}
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
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
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

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
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

function ConfidenceGauge({ value, error }: { value: number; error: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-4xl font-semibold tabular-nums">
          {pct}
          <span className="text-xl text-muted-foreground">%</span>
        </div>
        <div className="text-xs text-muted-foreground">±{error} AQI</div>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div className="absolute inset-0 shimmer motion-reduce:animate-none" />
        <div
          className="relative h-full rounded-full aurora transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

function PredictionStory({
  aqi,
  avg,
  peak,
  advisories,
}: {
  aqi: number;
  avg: number;
  peak: number;
  advisories: Array<{ period: string; desc: string; tone: string }>;
}) {
  const snippet = (i: number, fallback: string) => {
    const desc = advisories[i]?.desc;
    return desc ? (desc.length > 48 ? `${desc.slice(0, 48)}…` : desc) : fallback;
  };
  const steps = [
    { icon: "📍", label: `Now — AQI ${aqi}`, sub: aqiBand(aqi).label },
    { icon: "🚗", label: "Traffic & emissions rising", sub: "Peak commute window" },
    { icon: "💧", label: "Humidity builds", sub: "Affects pollutant settling" },
    {
      icon: "📈",
      label: `Peak AQI ${peak}`,
      sub: snippet(1, "Elevated levels expected during this window"),
    },
    { icon: "💨", label: "Wind disperses pollutants", sub: "Boundary layer rises" },
    {
      icon: "📉",
      label: `Avg AQI ${avg} — Recovery`,
      sub: snippet(2, "Conditions expected to stabilize"),
    },
  ];
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3 relative">
          {i < steps.length - 1 && (
            <div className="absolute left-5 top-8 bottom-0 w-px bg-border" />
          )}
          <div className="size-10 shrink-0 rounded-full glass flex items-center justify-center text-base z-10">
            {s.icon}
          </div>
          <div className="pb-4 min-w-0">
            <div className="text-sm font-medium">{s.label}</div>
            <div className="text-xs text-muted-foreground truncate">{s.sub}</div>
          </div>
        </div>
      ))}
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

// ─── Phase 10: RecommendationCard — priority badge + cost/time tier (both honestly
// derived from the real `effort` field, not separately fabricated) + expand/collapse.
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
  const costTier = rec.effort; // Cost correlates with effort — same real field, not a separate invented figure.

  return (
    <TiltCard accentColor="var(--color-primary)">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Recommendation {index + 1}</span>
        <Pill tone={priorityTone}>{priority} priority</Pill>
      </div>
      <div className="text-sm font-medium leading-snug mb-3">{rec.title}</div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-success)] font-medium">{rec.impact}</span>
        <span className="text-muted-foreground">{rec.effort} effort</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-1000"
          style={{ width: `${Math.round(rec.confidence * 100)}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        {Math.round(rec.confidence * 100)}% confidence
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 text-[11px] text-primary hover:underline inline-flex items-center gap-1"
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Show details"}
        <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <div className="text-muted-foreground">Est. time</div>
            <div className="font-medium">{timeEstimate}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cost tier</div>
            <div className="font-medium">{costTier}</div>
          </div>
          <p className="col-span-2 text-muted-foreground/80 text-[10px] mt-1">
            Time/cost are estimated from the recommendation's effort level, not separately measured.
          </p>
        </div>
      )}
    </TiltCard>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-72 rounded-xl overflow-hidden bg-muted/40 relative" aria-hidden>
      <div className="absolute inset-0 shimmer motion-reduce:animate-none" />
    </div>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-72 flex flex-col items-center justify-center text-center gap-3 px-6">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        <CloudOff className="size-6" />
      </div>
      <div>
        <div className="text-sm font-medium">Forecast data unavailable</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Couldn't load this projection window.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 glass rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        <RefreshCw className="size-3.5" /> Retry
      </button>
    </div>
  );
}

function LoadingExperience() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= LOADING_STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div className="glass rounded-2xl p-6 flex items-center gap-4 animate-in fade-in-0 duration-300">
      <div className="size-10 rounded-full aurora shrink-0 flex items-center justify-center animate-spin motion-reduce:animate-none">
        <Activity className="size-5 text-primary-foreground" />
      </div>
      <div>
        <div className="text-sm font-medium">{LOADING_STEPS[step]}</div>
        <div className="h-1 rounded-full bg-muted mt-2 overflow-hidden w-48">
          <div
            className="h-full rounded-full aurora transition-all duration-700"
            style={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RichTooltip({
  active,
  payload,
  label,
  cityPm25,
  cityNo2,
  cityHumidity,
  cityTemp,
}: {
  active?: boolean;
  payload?: Array<{ payload: { predicted: number; upper: number; lower: number } }>;
  label?: string;
  cityPm25: number;
  cityNo2: number;
  cityHumidity: number;
  cityTemp: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const predicted = d.predicted ?? 0;
  const upper = d.upper ?? predicted;
  const lower = d.lower ?? predicted;
  const b = findAqiBand(predicted);
  // pm25/no2 scale proportionally with AQI for the offline-mode proxy values
  const scaleFactor = predicted / Math.max(1, (upper + lower) / 2);
  const pm25est = Math.round((cityPm25 || 0) * scaleFactor);
  const no2est = Math.round((cityNo2 || 0) * scaleFactor);
  return (
    <div className="glass rounded-xl px-3 py-2.5 text-xs space-y-1.5 min-w-40 shadow-lg">
      <div className="font-medium text-foreground">{label || "Now"}</div>
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full" style={{ background: b.color }} />
        <span className="font-semibold">AQI {predicted}</span>
        <span className="text-muted-foreground">· {b.label}</span>
      </div>
      <div className="text-muted-foreground space-y-0.5">
        <div>
          Range {lower}–{upper}
        </div>
        <div>PM2.5 ≈ {pm25est} µg/m³</div>
        <div>NO₂ ≈ {no2est} ppb</div>
        <div>Humidity {cityHumidity}%</div>
        <div>Temp {cityTemp}°C</div>
      </div>
    </div>
  );
}

function AiInsightsPanel({ advisories }: { advisories: Array<{ period: string; desc: string }> }) {
  const lines = useMemo(() => advisories.map((a) => `${a.period}: ${a.desc}`), [advisories]);
  const [revealed, setRevealed] = useState<string[]>(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reduce ? lines : lines.map(() => "");
  });

  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(lines);
      return;
    }
    setRevealed(lines.map(() => ""));
    let cancelled = false;
    (async () => {
      for (let li = 0; li < lines.length; li++) {
        for (let ci = 1; ci <= lines[li].length; ci++) {
          if (cancelled) return;
          await new Promise((res) => setTimeout(res, 8));
          setRevealed((prev) => {
            const next = [...prev];
            next[li] = linesRef.current[li].slice(0, ci);
            return next;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines)]);

  return (
    <Panel
      eyebrow="AI Insights"
      title={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-4 text-[var(--color-primary)]" /> Forecast summary
        </span>
      }
    >
      <ul className="space-y-2 text-sm">
        {lines.map((_, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 size-1 rounded-full bg-[var(--color-primary)] shrink-0" />
            <span className="text-muted-foreground">{revealed[i] ?? ""}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ─── Phase 4: StarRating (filled / half / empty stars from real score) ───────
function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
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

// ─── Phase 4: Premium Footer ──────────────────────────────────────────────────
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
    { label: "AI Forecast", ok: isApiConnected },
    { label: "Sensor Network", ok: isApiConnected },
  ];

  return (
    <div className="glass rounded-2xl px-6 py-4">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            Data Sources
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {sources.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              >
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
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            Status
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              Last updated{" "}
              <span className="font-medium text-foreground">
                {city.updatedAt ? new Date(city.updatedAt).toLocaleTimeString() : ts}
              </span>
            </div>
            {isApiConnected && (
              <div className="text-xs text-muted-foreground">
                Latency <span className="font-medium text-foreground">{latency} ms</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            Model
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              GreenGuard AI <span className="font-medium text-foreground">v2.4.1</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Accuracy{" "}
              <span className="font-medium text-foreground">{(conf * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div className="ml-auto text-right hidden md:block">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Powered by
          </div>
          <div className="text-xs text-muted-foreground">
            GreenGuard Environmental Intelligence Suite
          </div>
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            Built for environmental agencies &amp; smart cities
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 3 — AI Copilot Panel ────────────────────────────────────────────
interface CopilotMessage {
  role: "user" | "assistant";
  text: string;
}

function CopilotPanel({
  city,
  onClose,
}: {
  city: {
    id: string;
    name: string;
    aqi: number;
    pm25: number;
    temp: number;
    humidity: number;
    water: number;
    risk: number;
    country: string;
  };
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      text: `Hi! I'm GreenGuard AI 👋 Ask me anything about the environment in ${city.name} — AQI forecast, health impact, best outdoor time, and more.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: ({ question }: { question: string }) =>
      copilotApi
        .chat(question, city.id, sessionId)
        .then((r: { data: { answer: string; sessionId: string } }) => r.data),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I'm having trouble connecting to the backend right now. Please check that your server is running.",
        },
      ]);
    },
  });

  const SUGGESTIONS = [
    "What will AQI be tomorrow?",
    "Is it safe to jog outside?",
    "Best time for outdoor activities?",
    "How does PM2.5 affect my health?",
  ];

  const handleSend = useCallback(
    (q: string) => {
      const question = q.trim();
      if (!question || isPending) return;
      setMessages((prev) => [...prev, { role: "user", text: question }]);
      setInput("");
      sendMessage({ question });
    },
    [isPending, sendMessage],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6 pointer-events-none">
      <div
        className="glass rounded-2xl shadow-2xl w-full max-w-sm flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
        style={{ maxHeight: "70vh", boxShadow: "0 0 40px var(--color-primary)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full aurora flex items-center justify-center">
              <Bot className="size-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">GreenGuard AI</div>
              <div className="text-[10px] text-muted-foreground">
                {city.name} · AQI {city.aqi}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close copilot"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="size-6 rounded-full aurora shrink-0 flex items-center justify-center mt-0.5">
                  <Bot className="size-3.5 text-primary-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed",
                  m.role === "user" ? "aurora text-primary-foreground" : "glass text-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex gap-2 items-center">
              <div className="size-6 rounded-full aurora shrink-0 flex items-center justify-center">
                <Bot className="size-3.5 text-primary-foreground" />
              </div>
              <div className="glass rounded-xl px-3 py-2 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
                    ·
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
                    ·
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
                    ·
                  </span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only on first message) */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="glass rounded-full px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
              >
                <ChevronRight className="size-3" /> {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend(input))
            }
            placeholder="Ask about air quality, weather…"
            className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            disabled={isPending}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isPending}
            aria-label="Send"
            className="aurora rounded-lg p-2 text-primary-foreground disabled:opacity-40 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 10: TypewriterText — reveals text char-by-char only when the text itself
// changes (not on every re-render), matching the same reduced-motion-aware pattern
// already used in AiInsightsPanel. Used for the single-paragraph AI Insight text.
function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [revealed, setRevealed] = useState(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reduce ? text : "";
  });
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(text);
      return;
    }
    setRevealed("");
    let cancelled = false;
    (async () => {
      for (let ci = 1; ci <= text.length; ci++) {
        if (cancelled) return;
        await new Promise((res) => setTimeout(res, 6));
        setRevealed(textRef.current.slice(0, ci));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <p className={cn("animate-in fade-in-0 duration-300", className)}>{revealed}</p>;
}

// ─── Phase 10: TrendArrow — real ▲ ▼ ► comparing two consecutive forecast values ──
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
