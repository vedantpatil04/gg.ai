/**
 * GreenGuard AI — Centralized Weather Interpretation & Condition Mapping
 *
 * Single source of truth for converting WMO weather interpretation codes
 * ("weather_code") returned by the project's real Open-Meteo weather data
 * provider into normalized condition states, accurate human-readable labels,
 * day/night responsive icons, and chromatic styling.
 *
 * Reference: WMO code table documented by Open-Meteo (https://open-meteo.com/en/docs)
 */

import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Snowflake,
  CloudLightning,
  CloudOff,
  type LucideIcon,
} from "lucide-react";

export type NormalizedWeatherCondition =
  | "CLEAR"
  | "PARTLY_CLOUDY"
  | "CLOUDY"
  | "OVERCAST"
  | "FOG"
  | "MIST"
  | "DRIZZLE"
  | "RAIN"
  | "HEAVY_RAIN"
  | "FREEZING_RAIN"
  | "SNOW"
  | "HEAVY_SNOW"
  | "THUNDERSTORM"
  | "UNKNOWN";

export type WeatherConditionKind =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "showers"
  | "snow-showers"
  | "thunderstorm";

export interface WeatherCondition {
  label: string;
  kind: WeatherConditionKind;
}

export interface WeatherConditionMeta {
  code: number | null | undefined;
  normalized: NormalizedWeatherCondition;
  label: string;
  isDay: boolean;
  Icon: LucideIcon;
  color: string;
  glow: string;
  bgTint: string;
}

const WEATHER_CODE_MAP: Record<
  number,
  { label: string; kind: WeatherConditionKind; normalized: NormalizedWeatherCondition }
> = {
  0: { label: "Clear sky", kind: "clear", normalized: "CLEAR" },
  1: { label: "Mainly clear", kind: "clear", normalized: "PARTLY_CLOUDY" },
  2: { label: "Partly cloudy", kind: "partly-cloudy", normalized: "PARTLY_CLOUDY" },
  3: { label: "Overcast", kind: "cloudy", normalized: "OVERCAST" },
  45: { label: "Fog", kind: "fog", normalized: "FOG" },
  48: { label: "Depositing rime fog", kind: "fog", normalized: "FOG" },
  51: { label: "Light drizzle", kind: "drizzle", normalized: "DRIZZLE" },
  53: { label: "Moderate drizzle", kind: "drizzle", normalized: "DRIZZLE" },
  55: { label: "Dense drizzle", kind: "drizzle", normalized: "DRIZZLE" },
  56: { label: "Light freezing drizzle", kind: "freezing-rain", normalized: "FREEZING_RAIN" },
  57: { label: "Dense freezing drizzle", kind: "freezing-rain", normalized: "FREEZING_RAIN" },
  61: { label: "Light rain", kind: "rain", normalized: "RAIN" },
  63: { label: "Moderate rain", kind: "rain", normalized: "RAIN" },
  65: { label: "Heavy rain", kind: "rain", normalized: "HEAVY_RAIN" },
  66: { label: "Light freezing rain", kind: "freezing-rain", normalized: "FREEZING_RAIN" },
  67: { label: "Heavy freezing rain", kind: "freezing-rain", normalized: "FREEZING_RAIN" },
  71: { label: "Light snow", kind: "snow", normalized: "SNOW" },
  73: { label: "Moderate snow", kind: "snow", normalized: "SNOW" },
  75: { label: "Heavy snow", kind: "snow", normalized: "HEAVY_SNOW" },
  77: { label: "Snow grains", kind: "snow", normalized: "SNOW" },
  80: { label: "Light rain showers", kind: "showers", normalized: "RAIN" },
  81: { label: "Moderate rain showers", kind: "showers", normalized: "RAIN" },
  82: { label: "Violent rain showers", kind: "showers", normalized: "HEAVY_RAIN" },
  85: { label: "Light snow showers", kind: "snow-showers", normalized: "SNOW" },
  86: { label: "Heavy snow showers", kind: "snow-showers", normalized: "HEAVY_SNOW" },
  95: { label: "Thunderstorm", kind: "thunderstorm", normalized: "THUNDERSTORM" },
  96: { label: "Thunderstorm with slight hail", kind: "thunderstorm", normalized: "THUNDERSTORM" },
  99: { label: "Thunderstorm with heavy hail", kind: "thunderstorm", normalized: "THUNDERSTORM" },
};

/**
 * Normalizes a raw weather code into one of the standardized condition categories.
 */
export function normalizeWeatherCode(code: number | null | undefined): NormalizedWeatherCondition {
  if (code === null || code === undefined) return "UNKNOWN";
  return WEATHER_CODE_MAP[code]?.normalized ?? "UNKNOWN";
}

/**
 * Returns human-readable condition description from the real weather data code.
 */
export function weatherCodeToLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return "Weather condition unavailable";
  return WEATHER_CODE_MAP[code]?.label ?? "Weather condition unavailable";
}

/**
 * Legacy describeWeatherCode helper — preserved for 100% backward compatibility.
 */
export function describeWeatherCode(code: number | null | undefined): WeatherCondition | null {
  if (code === null || code === undefined) return null;
  const entry = WEATHER_CODE_MAP[code];
  if (!entry) return null;
  return { label: entry.label, kind: entry.kind };
}

/**
 * Returns complete visual metadata including day/night aware icon, chromatic styling, and glow.
 */
export function getWeatherConditionMeta(
  code: number | null | undefined,
  isDay = true,
): WeatherConditionMeta {
  const normalized = normalizeWeatherCode(code);
  const label = weatherCodeToLabel(code);

  switch (normalized) {
    case "CLEAR":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: isDay ? Sun : Moon,
        color: isDay ? "#F59E0B" : "#93C5FD",
        glow: isDay ? "rgba(245, 158, 11, 0.35)" : "rgba(147, 197, 253, 0.28)",
        bgTint: isDay ? "rgba(245, 158, 11, 0.08)" : "rgba(147, 197, 253, 0.08)",
      };

    case "PARTLY_CLOUDY":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: isDay ? CloudSun : CloudMoon,
        color: isDay ? "#FBBF24" : "#A5B4FC",
        glow: isDay ? "rgba(251, 191, 36, 0.3)" : "rgba(165, 180, 252, 0.25)",
        bgTint: isDay ? "rgba(251, 191, 36, 0.07)" : "rgba(165, 180, 252, 0.07)",
      };

    case "OVERCAST":
    case "CLOUDY":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: Cloud,
        color: "#94A3B8",
        glow: "rgba(148, 163, 184, 0.25)",
        bgTint: "rgba(148, 163, 184, 0.08)",
      };

    case "FOG":
    case "MIST":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudFog,
        color: "#94A3B8",
        glow: "rgba(148, 163, 184, 0.25)",
        bgTint: "rgba(148, 163, 184, 0.08)",
      };

    case "DRIZZLE":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudDrizzle,
        color: "#38BDF8",
        glow: "rgba(56, 189, 248, 0.3)",
        bgTint: "rgba(56, 189, 248, 0.08)",
      };

    case "RAIN":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudRain,
        color: "#60A5FA",
        glow: "rgba(96, 165, 250, 0.35)",
        bgTint: "rgba(96, 165, 250, 0.09)",
      };

    case "HEAVY_RAIN":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudRain,
        color: "#3B82F6",
        glow: "rgba(59, 130, 246, 0.4)",
        bgTint: "rgba(59, 130, 246, 0.1)",
      };

    case "FREEZING_RAIN":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudSnow,
        color: "#7DD3FC",
        glow: "rgba(125, 211, 252, 0.35)",
        bgTint: "rgba(125, 211, 252, 0.09)",
      };

    case "SNOW":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudSnow,
        color: "#BAE6FD",
        glow: "rgba(186, 230, 253, 0.35)",
        bgTint: "rgba(186, 230, 253, 0.09)",
      };

    case "HEAVY_SNOW":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: Snowflake,
        color: "#E0F2FE",
        glow: "rgba(224, 242, 254, 0.45)",
        bgTint: "rgba(224, 242, 254, 0.1)",
      };

    case "THUNDERSTORM":
      return {
        code,
        normalized,
        label,
        isDay,
        Icon: CloudLightning,
        color: "#FBBF24",
        glow: "rgba(251, 191, 36, 0.45)",
        bgTint: "rgba(251, 191, 36, 0.1)",
      };

    case "UNKNOWN":
    default:
      return {
        code,
        normalized: "UNKNOWN",
        label: "Weather condition unavailable",
        isDay,
        Icon: CloudOff,
        color: "var(--color-muted-foreground)",
        glow: "transparent",
        bgTint: "transparent",
      };
  }
}
