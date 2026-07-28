/**
 * air-quality-data.ts — Phase 6: Environmental Intelligence Platform
 *
 * All data is derived deterministically from existing City fields
 * (aqi, pm25, pm10, no2, o3, co2, carbon, humidity, temp).
 * SO₂, CO, and NH₃ are synthesised via seeded per-city ratios that
 * reflect realistic urban emission profiles.  No new backend APIs.
 *
 * Exports consumed by AirQualityPanel.tsx.
 */

import type { City } from "@/lib/mock-data";
import { AQI_BANDS, findAqiBand } from "@/lib/mock-data";

// ─── Pollutant catalogue ──────────────────────────────────────────────────────
export type PollutantId = "pm25" | "pm10" | "no2" | "o3" | "co" | "so2" | "nh3" | "co2";

export interface PollutantMeta {
  id: PollutantId;
  label: string;
  unit: string;
  /** WHO 24h guideline value (µg/m³ or ppm) */
  guideline: number;
  /** "safe" ceiling — above this, colour shifts to warning tier */
  safeMax: number;
  description: string;
  color: string;
}

export const POLLUTANTS: PollutantMeta[] = [
  {
    id: "pm25",
    label: "PM₂.₅",
    unit: "µg/m³",
    guideline: 15,
    safeMax: 25,
    description: "Fine particulate matter — penetrates deep into lungs",
    color: "var(--color-warning)",
  },
  {
    id: "pm10",
    label: "PM₁₀",
    unit: "µg/m³",
    guideline: 45,
    safeMax: 70,
    description: "Coarse particulate matter — respiratory irritant",
    color: "oklch(0.72 0.18 50)",
  },
  {
    id: "no2",
    label: "NO₂",
    unit: "ppb",
    guideline: 25,
    safeMax: 53,
    description: "Nitrogen dioxide — traffic & industrial combustion",
    color: "oklch(0.70 0.16 55)",
  },
  {
    id: "o3",
    label: "O₃",
    unit: "ppb",
    guideline: 50,
    safeMax: 70,
    description: "Ground-level ozone — formed from NOx + VOCs + sunlight",
    color: "var(--color-info)",
  },
  {
    id: "co",
    label: "CO",
    unit: "ppm",
    guideline: 4,
    safeMax: 9,
    description: "Carbon monoxide — combustion by-product",
    color: "oklch(0.62 0.14 25)",
  },
  {
    id: "so2",
    label: "SO₂",
    unit: "ppb",
    guideline: 20,
    safeMax: 35,
    description: "Sulphur dioxide — fossil fuel combustion & industry",
    color: "oklch(0.68 0.18 80)",
  },
  {
    id: "nh3",
    label: "NH₃",
    unit: "ppb",
    guideline: 1,
    safeMax: 2,
    description: "Ammonia — agriculture & waste treatment",
    color: "oklch(0.65 0.12 145)",
  },
  {
    id: "co2",
    label: "CO₂",
    unit: "ppm",
    guideline: 400,
    safeMax: 450,
    description: "Carbon dioxide — greenhouse gas concentration",
    color: "var(--color-muted-foreground)",
  },
];

// ─── Full pollutant reading ───────────────────────────────────────────────────
export interface PollutantReading {
  id: PollutantId;
  value: number;
  /** 0–1 fraction of safeMax; drives the progress bar width */
  fraction: number;
  /** True if above WHO guideline */
  exceedingGuideline: boolean;
  /** True if above "safe" ceiling */
  elevated: boolean;
  meta: PollutantMeta;
}

export interface AirQualityData {
  aqi: number;
  band: { label: string; color: string; colorRaw: string };
  pollutants: PollutantReading[];
  /** Dominant pollutant — the one contributing most to AQI */
  dominant: PollutantId;
  health: HealthGuidance;
  timeline: TimelinePoint[];
  cityComparison: CityRank[];
  insights: AqiInsight[];
}

// ─── Health guidance ──────────────────────────────────────────────────────────
export interface HealthGuidance {
  outdoor: { label: string; severity: "safe" | "caution" | "avoid" };
  sensitive: { label: string; severity: "safe" | "caution" | "avoid" };
  exercise: { label: string; severity: "safe" | "caution" | "avoid" };
  mask: { label: string; severity: "safe" | "caution" | "avoid" };
}

function deriveHealth(aqi: number): HealthGuidance {
  if (aqi <= 50)
    return {
      outdoor: { label: "No restrictions", severity: "safe" },
      sensitive: { label: "No restrictions", severity: "safe" },
      exercise: { label: "Suitable for all activities", severity: "safe" },
      mask: { label: "Not required", severity: "safe" },
    };
  if (aqi <= 100)
    return {
      outdoor: { label: "Generally safe", severity: "safe" },
      sensitive: { label: "Consider reducing prolonged outdoor exposure", severity: "caution" },
      exercise: { label: "Moderate outdoor activity is fine", severity: "safe" },
      mask: { label: "Optional for sensitive groups", severity: "caution" },
    };
  if (aqi <= 150)
    return {
      outdoor: { label: "Limit prolonged exertion outdoors", severity: "caution" },
      sensitive: { label: "Avoid prolonged outdoor exposure", severity: "avoid" },
      exercise: { label: "Consider indoor exercise", severity: "caution" },
      mask: { label: "Recommended for sensitive groups", severity: "caution" },
    };
  if (aqi <= 200)
    return {
      outdoor: { label: "Reduce outdoor activity", severity: "caution" },
      sensitive: { label: "Stay indoors if possible", severity: "avoid" },
      exercise: { label: "Exercise indoors", severity: "avoid" },
      mask: { label: "Mask recommended for all", severity: "caution" },
    };
  if (aqi <= 300)
    return {
      outdoor: { label: "Avoid all non-essential outdoor activity", severity: "avoid" },
      sensitive: { label: "Remain indoors", severity: "avoid" },
      exercise: { label: "No outdoor exercise", severity: "avoid" },
      mask: { label: "N95 mask required outdoors", severity: "avoid" },
    };
  return {
    outdoor: { label: "Emergency conditions — remain indoors", severity: "avoid" },
    sensitive: { label: "Do not go outdoors", severity: "avoid" },
    exercise: { label: "No outdoor activity at all", severity: "avoid" },
    mask: { label: "N95 mandatory; minimise all outdoor time", severity: "avoid" },
  };
}

// ─── Timeline (last 12 h + next 6 h) ─────────────────────────────────────────
export interface TimelinePoint {
  label: string;
  aqi: number;
  pm25: number;
  isFuture: boolean;
  bandColor: string;
}

function seeded(seed: string, i: number): number {
  let h = i * 2654435761;
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 0x9e3779b9);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

function deriveTimeline(city: City): TimelinePoint[] {
  const now = new Date().getHours();
  const pts: TimelinePoint[] = [];
  for (let i = -11; i <= 6; i++) {
    const h = (((now + i) % 24) + 24) % 24;
    const r = seeded(city.id, i + 20);
    const delta = Math.round((r - 0.45) * city.aqi * 0.4);
    const aqi = Math.max(5, city.aqi + delta);
    const pm25 = Math.max(2, Math.round(city.pm25 + (r - 0.5) * 20));
    const isFuture = i > 0;
    const label = i === 0 ? "Now" : `${h.toString().padStart(2, "0")}:00`;
    pts.push({ label, aqi, pm25, isFuture, bandColor: findAqiBand(aqi).color });
  }
  return pts;
}

// ─── City comparison (all CITIES relative to current) ────────────────────────
export interface CityRank {
  name: string;
  aqi: number;
  band: string;
  color: string;
  isCurrent: boolean;
}

// ─── Insights ─────────────────────────────────────────────────────────────────
export interface AqiInsight {
  label: string;
  detail: string;
  severity: "info" | "warning" | "critical";
}

function deriveInsights(city: City, readings: PollutantReading[]): AqiInsight[] {
  const out: AqiInsight[] = [];
  const band = findAqiBand(city.aqi);

  if (city.aqi > 200)
    out.push({
      label: "Hazardous AQI",
      detail: `AQI ${city.aqi} — ${band.label}. Avoid all outdoor exposure.`,
      severity: "critical",
    });
  else if (city.aqi > 150)
    out.push({
      label: "Unhealthy Air",
      detail: `AQI ${city.aqi} — sensitive groups at risk.`,
      severity: "critical",
    });
  else if (city.aqi > 100)
    out.push({
      label: "Moderate Pollution",
      detail: `AQI ${city.aqi} — consider limiting prolonged outdoor activity.`,
      severity: "warning",
    });
  else
    out.push({
      label: "Air Quality Acceptable",
      detail: `AQI ${city.aqi} — ${band.label}. No restrictions for most people.`,
      severity: "info",
    });

  const pm25r = readings.find((r) => r.id === "pm25");
  if (pm25r && pm25r.exceedingGuideline)
    out.push({
      label: "PM₂.₅ Above Guideline",
      detail: `${city.pm25} µg/m³ exceeds WHO 24h guideline of 15 µg/m³.`,
      severity: pm25r.elevated ? "critical" : "warning",
    });

  const no2r = readings.find((r) => r.id === "no2");
  if (no2r && no2r.elevated)
    out.push({
      label: "Elevated NO₂",
      detail: `${city.no2} ppb — likely traffic or industrial source.`,
      severity: "warning",
    });

  if (city.humidity > 75 && city.aqi > 80)
    out.push({
      label: "Humid + Polluted",
      detail: "High humidity amplifies PM₂.₅ particle formation.",
      severity: "warning",
    });

  // AI-ready placeholder
  out.push({
    label: "AI Prediction",
    detail: "Predictive AQI modelling coming in Phase 8.",
    severity: "info",
  });

  return out;
}

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateAirQualityData(city: City, allCities: City[]): AirQualityData {
  const r = (i: number) => seeded(city.id, i);

  // Synthesise SO₂, CO, NH₃ from existing fields
  const so2 = Math.round(city.no2 * 0.55 + r(1) * 8);
  const co = +(city.pm25 * 0.035 + r(2) * 2).toFixed(1);
  const nh3 = +(r(3) * 3.5).toFixed(1);

  const rawValues: Record<PollutantId, number> = {
    pm25: city.pm25,
    pm10: city.pm10,
    no2: city.no2,
    o3: city.o3,
    co2: city.co2,
    co,
    so2,
    nh3,
  };

  const pollutants: PollutantReading[] = POLLUTANTS.map((meta) => {
    const value = rawValues[meta.id];
    return {
      id: meta.id,
      value,
      fraction: Math.min(value / meta.safeMax, 1.5),
      exceedingGuideline: value > meta.guideline,
      elevated: value > meta.safeMax,
      meta,
    };
  });

  // Dominant pollutant = highest fraction of its safeMax
  const dominant = pollutants.reduce((a, b) => (a.fraction > b.fraction ? a : b)).id;

  const band = findAqiBand(city.aqi);
  const bandInfo = AQI_BANDS.find((b) => city.aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];

  const cityComparison: CityRank[] = [...allCities]
    .sort((a, b) => a.aqi - b.aqi)
    .map((c) => ({
      name: c.name,
      aqi: c.aqi,
      band: findAqiBand(c.aqi).label,
      color: findAqiBand(c.aqi).color,
      isCurrent: c.id === city.id,
    }));

  return {
    aqi: city.aqi,
    band: { label: band.label, color: band.color, colorRaw: bandInfo.colorRaw },
    pollutants,
    dominant,
    health: deriveHealth(city.aqi),
    timeline: deriveTimeline(city),
    cityComparison,
    insights: deriveInsights(city, pollutants),
  };
}
