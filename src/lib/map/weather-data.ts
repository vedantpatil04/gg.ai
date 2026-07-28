/**
 * weather-data.ts — Phase 5: Advanced Weather Intelligence Platform
 *
 * All weather data is deterministically generated from existing City fields
 * (temp, humidity, windSpeed, aqi, lat, lng) — no new backend APIs, no DB
 * changes. The generator produces realistic, internally-consistent readings
 * that feel like real weather data while remaining fully offline-capable.
 *
 * Exports used by WeatherIntelligencePanel.tsx and (future) weather markers
 * in SmartMapCanvas.tsx.
 */

import type { City } from "@/lib/mock-data";

// ─── Core weather reading ─────────────────────────────────────────────────────
export interface WeatherData {
  // Current conditions
  condition: WeatherCondition;
  conditionLabel: string;
  temp: number; // °C
  feelsLike: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // degrees (0=N, 90=E, 180=S, 270=W)
  windDirectionLabel: string;
  pressure: number; // hPa
  visibility: number; // km
  uvIndex: number; // 0–11+
  cloudCover: number; // %
  dewPoint: number; // °C
  rainChance: number; // %
  rainIntensity: number; // mm/h (0 = no rain)
  sunrise: string; // "06:14"
  sunset: string; // "18:42"
  // Hourly forecast (next 12 h)
  hourly: HourlyForecast[];
  // Daily forecast (next 5 days)
  daily: DailyForecast[];
  // Derived theme
  theme: WeatherTheme;
  // Risk level
  riskLevel: "low" | "moderate" | "elevated" | "high" | "severe";
  riskLabel: string;
  // Key highlights
  highlights: WeatherHighlight[];
}

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "light-rain"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "haze"
  | "fog"
  | "windy";

export interface HourlyForecast {
  hour: number; // 0–23
  label: string; // "Now", "+1h", "+3h" etc.
  temp: number;
  condition: WeatherCondition;
  rainChance: number;
  windSpeed: number;
  cloudCover: number;
}

export interface DailyForecast {
  dayLabel: string; // "Mon", "Tue" etc.
  tempHigh: number;
  tempLow: number;
  condition: WeatherCondition;
  rainChance: number;
  uvIndex: number;
}

export interface WeatherHighlight {
  label: string;
  value: string;
  severity: "info" | "warning" | "alert";
}

// ─── Context-aware visual theme (Section 9) ───────────────────────────────────
export interface WeatherTheme {
  /** CSS gradient for the hero card background */
  heroBg: string;
  /** Primary accent colour for current-condition display */
  accent: string;
  /** Secondary / complementary colour */
  secondary: string;
  /** Glow colour for the animated icon */
  glow: string;
  /** Text on the hero card */
  heroText: string;
  /** Label for the theme (used for the animated icon variant) */
  name: "sunny" | "cloudy" | "rain" | "storm" | "night" | "haze";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Cheap pseudo-random seeded from a string — keeps values stable per city */
function seededRand(seed: string, index: number): number {
  let h = index * 2654435761;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x9e3779b9);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

function windLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Determine primary weather condition from city ambient data */
function deriveCondition(city: City, r: (i: number) => number): WeatherCondition {
  const { humidity, aqi, temp } = city;
  // High-AQI cities trend toward haze/overcast even on nominally clear days
  if (aqi > 200 && r(0) > 0.3) return "haze";
  if (humidity > 85 && r(1) > 0.4) return r(2) > 0.6 ? "rain" : "overcast";
  if (humidity > 75 && r(3) > 0.5) return r(4) > 0.55 ? "light-rain" : "cloudy";
  if (humidity > 65 && r(5) > 0.6) return "partly-cloudy";
  if (temp > 36 && r(6) > 0.7) return r(7) > 0.5 ? "thunderstorm" : "heavy-rain";
  if (r(8) > 0.85) return "windy";
  return "clear";
}

function conditionLabel(c: WeatherCondition): string {
  const MAP: Record<WeatherCondition, string> = {
    clear: "Clear Sky",
    "partly-cloudy": "Partly Cloudy",
    cloudy: "Cloudy",
    overcast: "Overcast",
    "light-rain": "Light Rain",
    rain: "Rain",
    "heavy-rain": "Heavy Rain",
    thunderstorm: "Thunderstorm",
    haze: "Haze",
    fog: "Fog",
    windy: "Windy",
  };
  return MAP[c];
}

function conditionToHourVariant(c: WeatherCondition, hour: number): WeatherCondition {
  // Night hours drift toward clearer conditions (clouds often dissipate at night)
  if (hour >= 22 || hour < 5) {
    if (c === "partly-cloudy") return "clear";
    if (c === "cloudy") return "partly-cloudy";
  }
  return c;
}

function deriveTheme(condition: WeatherCondition, isNight: boolean): WeatherTheme {
  if (isNight) {
    return {
      name: "night",
      heroBg:
        "linear-gradient(135deg, oklch(0.14 0.04 260) 0%, oklch(0.10 0.06 280) 60%, oklch(0.08 0.04 300) 100%)",
      accent: "oklch(0.72 0.12 260)",
      secondary: "oklch(0.6 0.08 280)",
      glow: "oklch(0.72 0.12 260 / 0.35)",
      heroText: "oklch(0.92 0.04 260)",
    };
  }
  switch (condition) {
    case "clear":
      return {
        name: "sunny",
        heroBg:
          "linear-gradient(135deg, oklch(0.55 0.18 55) 0%, oklch(0.65 0.14 45) 50%, oklch(0.72 0.10 35) 100%)",
        accent: "oklch(0.82 0.18 75)",
        secondary: "oklch(0.70 0.14 55)",
        glow: "oklch(0.82 0.18 75 / 0.45)",
        heroText: "oklch(0.98 0.01 90)",
      };
    case "partly-cloudy":
      return {
        name: "cloudy",
        heroBg:
          "linear-gradient(135deg, oklch(0.48 0.10 220) 0%, oklch(0.55 0.07 200) 50%, oklch(0.62 0.05 180) 100%)",
        accent: "oklch(0.78 0.08 220)",
        secondary: "oklch(0.68 0.06 200)",
        glow: "oklch(0.78 0.08 220 / 0.35)",
        heroText: "oklch(0.96 0.01 220)",
      };
    case "cloudy":
    case "overcast":
      return {
        name: "cloudy",
        heroBg:
          "linear-gradient(135deg, oklch(0.32 0.04 240) 0%, oklch(0.38 0.03 230) 50%, oklch(0.44 0.02 220) 100%)",
        accent: "oklch(0.72 0.04 230)",
        secondary: "oklch(0.60 0.03 220)",
        glow: "oklch(0.72 0.04 230 / 0.25)",
        heroText: "oklch(0.92 0.01 230)",
      };
    case "light-rain":
    case "rain":
    case "heavy-rain":
      return {
        name: "rain",
        heroBg:
          "linear-gradient(135deg, oklch(0.28 0.08 230) 0%, oklch(0.34 0.10 245) 50%, oklch(0.40 0.08 260) 100%)",
        accent: "oklch(0.72 0.14 230)",
        secondary: "oklch(0.60 0.10 245)",
        glow: "oklch(0.72 0.14 230 / 0.4)",
        heroText: "oklch(0.94 0.02 230)",
      };
    case "thunderstorm":
      return {
        name: "storm",
        heroBg:
          "linear-gradient(135deg, oklch(0.14 0.06 280) 0%, oklch(0.18 0.10 270) 40%, oklch(0.24 0.08 260) 100%)",
        accent: "oklch(0.78 0.20 280)",
        secondary: "oklch(0.62 0.15 265)",
        glow: "oklch(0.78 0.20 280 / 0.55)",
        heroText: "oklch(0.96 0.02 280)",
      };
    case "haze":
    case "fog":
      return {
        name: "haze",
        heroBg:
          "linear-gradient(135deg, oklch(0.38 0.06 60) 0%, oklch(0.44 0.04 50) 50%, oklch(0.50 0.03 40) 100%)",
        accent: "oklch(0.72 0.10 60)",
        secondary: "oklch(0.62 0.07 50)",
        glow: "oklch(0.72 0.10 60 / 0.35)",
        heroText: "oklch(0.92 0.02 60)",
      };
    default:
      return {
        name: "cloudy",
        heroBg: "linear-gradient(135deg, oklch(0.30 0.05 240) 0%, oklch(0.36 0.04 250) 100%)",
        accent: "oklch(0.70 0.08 240)",
        secondary: "oklch(0.60 0.05 245)",
        glow: "oklch(0.70 0.08 240 / 0.30)",
        heroText: "oklch(0.92 0.01 240)",
      };
  }
}

function deriveRisk(
  condition: WeatherCondition,
  uv: number,
  wind: number,
): { level: WeatherData["riskLevel"]; label: string } {
  if (condition === "thunderstorm") return { level: "severe", label: "Severe weather risk" };
  if (condition === "heavy-rain" || wind > 60) return { level: "high", label: "High weather risk" };
  if (uv >= 8 || wind > 45 || condition === "rain")
    return { level: "elevated", label: "Elevated weather risk" };
  if (uv >= 6 || condition === "light-rain")
    return { level: "moderate", label: "Moderate conditions" };
  return { level: "low", label: "Favourable conditions" };
}

function buildHighlights(w: Omit<WeatherData, "highlights">): WeatherHighlight[] {
  const h: WeatherHighlight[] = [];
  if (w.uvIndex >= 8)
    h.push({ label: "UV Index", value: `${w.uvIndex} — Very High`, severity: "alert" });
  else if (w.uvIndex >= 6)
    h.push({ label: "UV Index", value: `${w.uvIndex} — High`, severity: "warning" });
  if (w.windSpeed > 50)
    h.push({ label: "Wind Alert", value: `${w.windSpeed} km/h — Strong winds`, severity: "alert" });
  else if (w.windSpeed > 35)
    h.push({ label: "Wind", value: `${w.windSpeed} km/h — Breezy`, severity: "warning" });
  if (w.rainChance > 75)
    h.push({ label: "Rain", value: `${w.rainChance}% chance of rain`, severity: "warning" });
  if (w.condition === "thunderstorm")
    h.push({ label: "Storm Alert", value: "Thunderstorm active", severity: "alert" });
  if (w.visibility < 3)
    h.push({ label: "Visibility", value: `${w.visibility} km — Poor`, severity: "warning" });
  if (h.length === 0)
    h.push({ label: "Conditions", value: "No active weather alerts", severity: "info" });
  return h;
}

// ─── Sunrise/sunset approximation from lat (simplified) ───────────────────────
function approxSunTimes(lat: number): { sunrise: string; sunset: string } {
  // Very rough approximation: equatorial = 06:00/18:00, higher lat offsets by ~±1h per 20°
  const offset = (Math.abs(lat) / 20) * 60; // minutes
  const srMin = 360 + offset; // ~6:00 AM
  const ssMin = 1080 - offset; // ~6:00 PM
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { sunrise: fmt(srMin), sunset: fmt(ssMin) };
}

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateWeatherData(city: City): WeatherData {
  const r = (i: number) => seededRand(city.id, i);
  const condition = deriveCondition(city, r);

  // Current hour (used for night detection)
  const nowHour = new Date().getHours();
  const isNight = nowHour < 5 || nowHour >= 20;

  const windSpeed = Math.round(city.windSpeed ?? lerp(5, 25, r(10)));
  const windDir = Math.round(r(11) * 360);
  const pressure = Math.round(lerp(1008, 1020, r(12)));
  const visibility = +(lerp(2, 15, 1 - city.humidity / 100) + r(13) * 2).toFixed(1);
  const uvIndex = isNight ? 0 : Math.round(lerp(1, 11, (city.temp - 10) / 30) * r(14) + 1);
  const cloudCover = Math.round(lerp(5, 90, city.humidity / 100) + r(15) * 15);
  const dewPoint = Math.round(city.temp - (100 - city.humidity) / 5);
  const rainChance =
    condition.includes("rain") || condition === "thunderstorm"
      ? Math.round(60 + r(16) * 35)
      : Math.round(r(17) * 25);
  const rainIntensity = rainChance > 60 ? +(r(18) * 8).toFixed(1) : 0;
  const feelsLike = Math.round(
    city.temp -
      (windSpeed > 20 ? (windSpeed - 20) * 0.15 : 0) +
      (city.humidity > 70 ? (city.humidity - 70) * 0.05 : 0),
  );

  const { sunrise, sunset } = approxSunTimes(city.lat);

  const theme = deriveTheme(isNight ? "clear" : condition, isNight);
  const { level: riskLevel, label: riskLabel } = deriveRisk(condition, uvIndex, windSpeed);

  // Hourly forecast (Now + 11 future hours)
  const hourly: HourlyForecast[] = Array.from({ length: 12 }, (_, i) => {
    const h = (nowHour + i) % 24;
    const tempDelta = Math.round((r(20 + i) - 0.5) * 4);
    const rainDelta = Math.round((r(32 + i) - 0.4) * 20);
    const windDelta = Math.round((r(44 + i) - 0.5) * 6);
    return {
      hour: h,
      label: i === 0 ? "Now" : `+${i}h`,
      temp: clamp(city.temp + tempDelta, city.temp - 5, city.temp + 5),
      condition: conditionToHourVariant(condition, h),
      rainChance: clamp(rainChance + rainDelta, 0, 100),
      windSpeed: clamp(windSpeed + windDelta, 0, 80),
      cloudCover: clamp(cloudCover + Math.round((r(56 + i) - 0.5) * 20), 0, 100),
    };
  });

  // Daily forecast (Today + 4 more days)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDow = new Date().getDay();
  const daily: DailyForecast[] = Array.from({ length: 5 }, (_, i) => {
    const highDelta = Math.round((r(70 + i) - 0.3) * 5);
    const lowDelta = Math.round((r(76 + i) - 0.6) * 4);
    const rChance = clamp(rainChance + Math.round((r(82 + i) - 0.5) * 30), 0, 100);
    const dayCondition: WeatherCondition =
      rChance > 70
        ? r(88 + i) > 0.6
          ? "rain"
          : "light-rain"
        : rChance > 40
          ? "partly-cloudy"
          : r(94 + i) > 0.7
            ? "cloudy"
            : "clear";
    return {
      dayLabel: i === 0 ? "Today" : days[(todayDow + i) % 7],
      tempHigh: city.temp + highDelta,
      tempLow: city.temp - 5 + lowDelta,
      condition: dayCondition,
      rainChance: rChance,
      uvIndex: clamp(uvIndex + Math.round((r(100 + i) - 0.5) * 2), 0, 11),
    };
  });

  const partial: Omit<WeatherData, "highlights"> = {
    condition,
    conditionLabel: conditionLabel(condition),
    temp: city.temp,
    feelsLike,
    humidity: city.humidity,
    windSpeed,
    windDirection: windDir,
    windDirectionLabel: windLabel(windDir),
    pressure,
    visibility,
    uvIndex,
    cloudCover,
    dewPoint,
    rainChance,
    rainIntensity,
    sunrise,
    sunset,
    hourly,
    daily,
    theme,
    riskLevel,
    riskLabel,
  };

  return { ...partial, highlights: buildHighlights(partial) };
}

// ─── Condition icon SVG paths (inline, no extra deps) ─────────────────────────
export function conditionIconPath(condition: WeatherCondition): string {
  switch (condition) {
    case "clear":
      return "M12 3v2M12 19v2M3 12H1M23 12h-2M5.636 5.636 4.222 4.222M19.778 19.778l-1.414-1.414M5.636 18.364l-1.414 1.414M19.778 4.222l-1.414 1.414M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z";
    case "partly-cloudy":
      return "M12 2a5 5 0 0 1 5 5 5 5 0 0 1-.1 1A5.5 5.5 0 1 1 7 12.9 5 5 0 0 1 12 2z";
    case "cloudy":
    case "overcast":
      return "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z";
    case "light-rain":
    case "rain":
      return "M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25M8 19v2M12 21v-2M16 19v2";
    case "heavy-rain":
      return "M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25M8 19l-2 4M12 21l-2 4M16 19l-2 4";
    case "thunderstorm":
      return "M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9M13 11l-4 6h6l-4 6";
    case "haze":
    case "fog":
      return "M5 12h14M5 8h14M5 16h14";
    case "windy":
      return "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2";
    default:
      return "M12 3v2M12 19v2M3 12H1M23 12h-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z";
  }
}

export function uvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export function uvColor(uv: number): string {
  if (uv <= 2) return "#16a34a";
  if (uv <= 5) return "#ca8a04";
  if (uv <= 7) return "#ea580c";
  if (uv <= 10) return "#dc2626";
  return "#7c3aed";
}
