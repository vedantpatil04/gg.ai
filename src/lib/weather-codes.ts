/**
 * GreenGuard Forecast Center — Phase 2.
 *
 * WMO weather-interpretation codes ("weather_code") as returned by
 * Open-Meteo's hourly/daily weather forecast (see
 * backend/src/services/forecastProvider.service.ts and
 * backend/src/services/weather.service.ts). This is the standard WMO code
 * table Open-Meteo documents (https://open-meteo.com/en/docs) — not an
 * invented mapping or a fabricated severity system.
 *
 * Used only to turn a raw numeric code into a human-readable condition
 * label/icon (e.g. "Partly cloudy" instead of `weather_code = 2`). Never
 * used as a source of truth for any measurement — the underlying data
 * (temperature, precipitation, AQI, …) always comes from the real backend
 * response.
 */

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

const WEATHER_CODE_MAP: Record<number, WeatherCondition> = {
  0: { label: "Clear sky", kind: "clear" },
  1: { label: "Mainly clear", kind: "clear" },
  2: { label: "Partly cloudy", kind: "partly-cloudy" },
  3: { label: "Overcast", kind: "cloudy" },
  45: { label: "Fog", kind: "fog" },
  48: { label: "Depositing rime fog", kind: "fog" },
  51: { label: "Light drizzle", kind: "drizzle" },
  53: { label: "Moderate drizzle", kind: "drizzle" },
  55: { label: "Dense drizzle", kind: "drizzle" },
  56: { label: "Light freezing drizzle", kind: "freezing-rain" },
  57: { label: "Dense freezing drizzle", kind: "freezing-rain" },
  61: { label: "Slight rain", kind: "rain" },
  63: { label: "Moderate rain", kind: "rain" },
  65: { label: "Heavy rain", kind: "rain" },
  66: { label: "Light freezing rain", kind: "freezing-rain" },
  67: { label: "Heavy freezing rain", kind: "freezing-rain" },
  71: { label: "Slight snow fall", kind: "snow" },
  73: { label: "Moderate snow fall", kind: "snow" },
  75: { label: "Heavy snow fall", kind: "snow" },
  77: { label: "Snow grains", kind: "snow" },
  80: { label: "Slight rain showers", kind: "showers" },
  81: { label: "Moderate rain showers", kind: "showers" },
  82: { label: "Violent rain showers", kind: "showers" },
  85: { label: "Slight snow showers", kind: "snow-showers" },
  86: { label: "Heavy snow showers", kind: "snow-showers" },
  95: { label: "Thunderstorm", kind: "thunderstorm" },
  96: { label: "Thunderstorm with slight hail", kind: "thunderstorm" },
  99: { label: "Thunderstorm with heavy hail", kind: "thunderstorm" },
};

/** Returns null (never a guessed condition) when the code is missing or unrecognized. */
export function describeWeatherCode(code: number | null | undefined): WeatherCondition | null {
  if (code === null || code === undefined) return null;
  return WEATHER_CODE_MAP[code] ?? null;
}
