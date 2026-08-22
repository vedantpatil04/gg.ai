/**
 * Hero Scene Logic — Phase 10
 *
 * Pure functions that map live environmental data to a `SceneCondition`
 * object. The React components import this and use the condition to decide
 * which visual layers to show — keeping all environmental decision-making
 * in one testable, documented place.
 *
 * Data sources used (all already in city-context.tsx):
 *   aqi, temp, humidity, windSpeed
 *
 * No "weather condition" string exists in the backend — we derive a
 * plausible condition from the metrics we have rather than fabricate a
 * field that doesn't exist.
 */

// ─── Time slot ────────────────────────────────────────────────────────────────

export type TimeSlot = "night" | "dawn" | "morning" | "afternoon" | "golden" | "evening";

export function getTimeSlot(hour: number): TimeSlot {
  if (hour < 5) return "night";
  if (hour < 7) return "dawn";
  if (hour < 12) return "morning";
  if (hour < 16) return "afternoon";
  if (hour < 19) return "golden";
  if (hour < 22) return "evening";
  return "night";
}

// ─── AQI tier ─────────────────────────────────────────────────────────────────

export type AQITier = "good" | "moderate" | "poor" | "hazardous";

export function getAQITier(aqi: number): AQITier {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 200) return "poor";
  return "hazardous";
}

// ─── Weather proxy ────────────────────────────────────────────────────────────
// No weather-condition string exists in the backend (OpenWeather integration
// only exposes temp/humidity/pressure/wind for the current build).
// We derive a plausible condition from available metrics:
//   - High humidity (≥80%) + high wind (≥12 km/h) + cool temp → rain-like
//   - High humidity (≥75%) → cloudy
//   - High wind (≥15 km/h) + low humidity → windy/clear
//   - Default → sunny / clear

export type WeatherProxy = "clear" | "cloudy" | "rainy" | "windy" | "foggy";

export function getWeatherProxy({
  weatherCode,
  humidity,
  windSpeed,
  temp,
}: {
  weatherCode?: number | null;
  humidity?: number;
  windSpeed?: number;
  temp?: number;
}): WeatherProxy {
  if (weatherCode != null) {
    if (
      (weatherCode >= 51 && weatherCode <= 67) ||
      (weatherCode >= 80 && weatherCode <= 82) ||
      (weatherCode >= 95 && weatherCode <= 99)
    ) {
      return "rainy";
    }
    if (weatherCode === 45 || weatherCode === 48) return "foggy";
    if (weatherCode === 2 || weatherCode === 3) return "cloudy";
    if (weatherCode === 0 || weatherCode === 1) return "clear";
  }

  const h = humidity ?? 50;
  const w = windSpeed ?? 8;
  const t = temp ?? 25;

  if (h >= 90 && t < 18) return "foggy";
  if (h >= 75) return "cloudy";
  if (w >= 20 && h < 60) return "windy";
  return "clear";
}

// ─── Sky gradient ─────────────────────────────────────────────────────────────
// Returns two oklch stops that define the hero background gradient.
// AQI tier shifts hue toward warmer/redder tones for poor air quality.

export interface SkyGradient {
  top: string;
  bottom: string;
  /** Accent glow colour for the ambient blob, matching the band colour. */
  glow: string;
}

export function getSkyGradient(
  slot: TimeSlot,
  aqiTier: AQITier,
  weather: WeatherProxy,
): SkyGradient {
  // Hazardous / poor AQI overrides time-of-day completely
  if (aqiTier === "hazardous") {
    return {
      top: "oklch(0.22 0.09 22)",
      bottom: "oklch(0.16 0.07 18)",
      glow: "oklch(0.5 0.22 25 / 0.5)",
    };
  }
  if (aqiTier === "poor") {
    return {
      top: "oklch(0.26 0.08 48)",
      bottom: "oklch(0.20 0.06 42)",
      glow: "oklch(0.62 0.20 55 / 0.45)",
    };
  }

  // Fog mutes everything
  if (weather === "foggy") {
    return {
      top: "oklch(0.32 0.02 220)",
      bottom: "oklch(0.26 0.02 220)",
      glow: "oklch(0.60 0.04 220 / 0.3)",
    };
  }

  // Rainy darkens and cools
  if (weather === "rainy") {
    return {
      top: "oklch(0.24 0.05 240)",
      bottom: "oklch(0.18 0.04 240)",
      glow: "oklch(0.55 0.08 230 / 0.4)",
    };
  }

  // Time-of-day palette
  switch (slot) {
    case "night":
      return {
        top: "oklch(0.13 0.05 256)",
        bottom: "oklch(0.10 0.04 265)",
        glow: "oklch(0.55 0.12 280 / 0.3)",
      };
    case "dawn":
      return {
        top: "oklch(0.25 0.10 295)",
        bottom: "oklch(0.32 0.12 28)",
        glow: "oklch(0.68 0.18 30 / 0.45)",
      };
    case "morning":
      return aqiTier === "good"
        ? {
            top: "oklch(0.24 0.09 205)",
            bottom: "oklch(0.20 0.06 195)",
            glow: "oklch(0.65 0.16 195 / 0.4)",
          }
        : {
            top: "oklch(0.26 0.07 210)",
            bottom: "oklch(0.21 0.05 200)",
            glow: "oklch(0.60 0.14 200 / 0.4)",
          };
    case "afternoon":
      return aqiTier === "good"
        ? {
            top: "oklch(0.22 0.10 205)",
            bottom: "oklch(0.18 0.08 195)",
            glow: "oklch(0.68 0.17 200 / 0.38)",
          }
        : {
            top: "oklch(0.25 0.08 215)",
            bottom: "oklch(0.19 0.06 205)",
            glow: "oklch(0.60 0.14 205 / 0.35)",
          };
    case "golden":
      return {
        top: "oklch(0.26 0.11 48)",
        bottom: "oklch(0.20 0.09 345)",
        glow: "oklch(0.72 0.20 42 / 0.5)",
      };
    case "evening":
      return {
        top: "oklch(0.18 0.08 295)",
        bottom: "oklch(0.14 0.06 265)",
        glow: "oklch(0.55 0.18 295 / 0.4)",
      };
  }
}

// ─── Composite SceneCondition ──────────────────────────────────────────────────

export interface SceneCondition {
  slot: TimeSlot;
  aqiTier: AQITier;
  weather: WeatherProxy;
  sky: SkyGradient;
  /** Show sun disc */
  showSun: boolean;
  /** Sun is near horizon (dawn / golden) */
  sunLow: boolean;
  /** Show moon */
  showMoon: boolean;
  /** Show stars */
  showStars: boolean;
  /** Show cloud layers */
  showClouds: boolean;
  /** Cloud opacity multiplier */
  cloudOpacity: number;
  /** Show animated rain streaks */
  showRain: boolean;
  /** Show moving fog/mist layers */
  showFog: boolean;
  /** Particle kind */
  particleKind: "leaves" | "dust" | "rain" | "none";
  /** Show the eco-city SVG illustration on the right */
  showIllustration: boolean;
  /** AQI glow color for the ambient blob */
  glowColor: string;
}

export function computeSceneCondition({
  aqi = 30,
  temp,
  humidity,
  windSpeed,
  weatherCode,
}: {
  aqi?: number;
  temp?: number;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number | null;
}): SceneCondition {
  const hour = new Date().getHours();
  const slot = getTimeSlot(hour);
  const aqiTier = getAQITier(aqi);
  const weather = getWeatherProxy({ weatherCode, humidity, windSpeed, temp });
  const sky = getSkyGradient(slot, aqiTier, weather);

  const isDay = slot === "morning" || slot === "afternoon";
  const isDusk = slot === "golden" || slot === "dawn" || slot === "evening";
  const isNight = slot === "night";

  return {
    slot,
    aqiTier,
    weather,
    sky,
    showSun: (isDay || isDusk) && weather !== "rainy" && aqiTier !== "hazardous",
    sunLow: isDusk,
    showMoon: isNight || slot === "dawn",
    showStars: isNight || slot === "dawn",
    showClouds: weather === "cloudy" || weather === "rainy" || aqiTier === "poor",
    cloudOpacity: weather === "rainy" ? 0.9 : weather === "cloudy" ? 0.7 : 0.4,
    showRain: weather === "rainy",
    showFog: weather === "foggy" || aqiTier === "hazardous",
    particleKind:
      aqiTier === "hazardous"
        ? "dust"
        : aqiTier === "poor"
          ? "dust"
          : weather === "rainy"
            ? "rain"
            : isDay && aqiTier === "good"
              ? "leaves"
              : "none",
    showIllustration: aqiTier !== "hazardous",
    glowColor: sky.glow,
  };
}
