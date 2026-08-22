// ─── Phase 2: Transparent EcoScore (mirrors backend/src/services/ecoScore.service.ts) ─
// The backend is the single source of truth for this calculation — these
// types just describe the shape of what it returns so the frontend can
// display it without recomputing anything.
export type EcoScoreMetricKey =
  "airQuality" | "greenCover" | "renewableEnergy" | "waterQuality" | "wasteDiversion";

export interface EcoScoreMetricBreakdown {
  rawValue: number | null;
  normalizedScore: number | null;
  weight: number;
  effectiveWeight: number;
  contribution: number;
  available: boolean;
}

export interface EcoScoreBreakdown {
  score: number;
  grade: string;
  dataComplete: boolean;
  missingMetrics: EcoScoreMetricKey[];
  breakdown: Record<EcoScoreMetricKey, EcoScoreMetricBreakdown>;
}

export type City = {
  id: string;
  name: string;
  country: string;
  aqi: number;
  water: number;
  risk: number;
  eco: number;
  temp: number;
  humidity: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co2: number;
  carbon: number;
  alerts: number;
  lat: number;
  lng: number;
  /** km/h — same unit convention already used across map popups and the
   *  Administrator city directory. Optional: only present once a real
   *  reading (live API or this offline fallback) has been resolved. */
  windSpeed?: number;
  windDirection?: number;
  pressure?: number;
  apparentTemperature?: number;
  weatherCode?: number | null;
  rainfall?: number;
  rain?: number;
  isDay?: boolean;
  renewableShare?: number;
  co?: number;
  so2?: number;
  greenCover?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  ph?: number;
  /** ISO timestamp of the underlying reading, used for a relative
   *  "Last updated X ago" display. Undefined for the static offline
   *  fallback rows below, since they don't represent a real reading time. */
  updatedAt?: string;
  /** Phase 2 — transparent EcoScore breakdown from the backend EcoScore
   *  engine. Undefined only in the fully-offline mock fallback, since the
   *  static rows below aren't backed by a real per-metric reading to
   *  explain. See ecoGrade()/eco for the offline-fallback equivalent. */
  ecoScore?: EcoScoreBreakdown;
};

export const CITIES: City[] = [
  {
    id: "belagavi",
    name: "Belagavi",
    country: "India",
    aqi: 62,
    water: 78,
    risk: 34,
    eco: 71,
    temp: 26,
    humidity: 64,
    pm25: 22,
    pm10: 48,
    no2: 18,
    o3: 41,
    co2: 412,
    carbon: 4.2,
    alerts: 2,
    lat: 15.85,
    lng: 74.5,
    windSpeed: 9.4,
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    country: "India",
    aqi: 118,
    water: 64,
    risk: 58,
    eco: 62,
    temp: 28,
    humidity: 58,
    pm25: 54,
    pm10: 92,
    no2: 38,
    o3: 56,
    co2: 438,
    carbon: 6.1,
    alerts: 5,
    lat: 12.97,
    lng: 77.59,
    windSpeed: 11.2,
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    aqi: 156,
    water: 52,
    risk: 72,
    eco: 48,
    temp: 31,
    humidity: 78,
    pm25: 78,
    pm10: 134,
    no2: 52,
    o3: 62,
    co2: 451,
    carbon: 7.8,
    alerts: 7,
    lat: 19.07,
    lng: 72.87,
    windSpeed: 14.6,
  },
  {
    id: "delhi",
    name: "Delhi",
    country: "India",
    aqi: 248,
    water: 41,
    risk: 88,
    eco: 32,
    temp: 33,
    humidity: 42,
    pm25: 142,
    pm10: 224,
    no2: 78,
    o3: 84,
    co2: 478,
    carbon: 9.4,
    alerts: 12,
    lat: 28.61,
    lng: 77.21,
    windSpeed: 7.8,
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    country: "India",
    aqi: 98,
    water: 68,
    risk: 48,
    eco: 64,
    temp: 30,
    humidity: 52,
    pm25: 44,
    pm10: 78,
    no2: 32,
    o3: 48,
    co2: 428,
    carbon: 5.6,
    alerts: 4,
    lat: 17.38,
    lng: 78.48,
    windSpeed: 10.5,
  },
  {
    id: "chennai",
    name: "Chennai",
    country: "India",
    aqi: 112,
    water: 58,
    risk: 54,
    eco: 58,
    temp: 32,
    humidity: 74,
    pm25: 52,
    pm10: 88,
    no2: 36,
    o3: 54,
    co2: 434,
    carbon: 6.4,
    alerts: 5,
    lat: 13.08,
    lng: 80.27,
    windSpeed: 13.1,
  },
  {
    id: "pune",
    name: "Pune",
    country: "India",
    aqi: 104,
    water: 66,
    risk: 50,
    eco: 66,
    temp: 27,
    humidity: 62,
    pm25: 48,
    pm10: 82,
    no2: 34,
    o3: 52,
    co2: 430,
    carbon: 5.8,
    alerts: 4,
    lat: 18.52,
    lng: 73.85,
    windSpeed: 12.0,
  },
  {
    id: "kolkata",
    name: "Kolkata",
    country: "India",
    aqi: 168,
    water: 48,
    risk: 76,
    eco: 44,
    temp: 30,
    humidity: 80,
    pm25: 84,
    pm10: 146,
    no2: 58,
    o3: 66,
    co2: 458,
    carbon: 8.2,
    alerts: 8,
    lat: 22.57,
    lng: 88.36,
    windSpeed: 8.6,
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    country: "India",
    aqi: 134,
    water: 56,
    risk: 64,
    eco: 52,
    temp: 34,
    humidity: 38,
    pm25: 64,
    pm10: 108,
    no2: 44,
    o3: 58,
    co2: 442,
    carbon: 7.0,
    alerts: 6,
    lat: 23.02,
    lng: 72.57,
    windSpeed: 10.9,
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    aqi: 42,
    water: 88,
    risk: 22,
    eco: 82,
    temp: 14,
    humidity: 70,
    pm25: 12,
    pm10: 24,
    no2: 22,
    o3: 32,
    co2: 408,
    carbon: 3.1,
    alerts: 1,
    lat: 51.5,
    lng: -0.12,
    windSpeed: 16.3,
  },
  {
    id: "newyork",
    name: "New York",
    country: "USA",
    aqi: 54,
    water: 82,
    risk: 30,
    eco: 76,
    temp: 18,
    humidity: 62,
    pm25: 18,
    pm10: 36,
    no2: 28,
    o3: 38,
    co2: 416,
    carbon: 4.6,
    alerts: 2,
    lat: 40.71,
    lng: -74,
    windSpeed: 15.1,
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    aqi: 48,
    water: 92,
    risk: 24,
    eco: 86,
    temp: 30,
    humidity: 82,
    pm25: 14,
    pm10: 28,
    no2: 24,
    o3: 34,
    co2: 412,
    carbon: 3.4,
    alerts: 1,
    lat: 1.35,
    lng: 103.82,
    windSpeed: 8.2,
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    aqi: 58,
    water: 86,
    risk: 28,
    eco: 80,
    temp: 22,
    humidity: 66,
    pm25: 20,
    pm10: 38,
    no2: 26,
    o3: 36,
    co2: 414,
    carbon: 4.0,
    alerts: 2,
    lat: 35.68,
    lng: 139.69,
    windSpeed: 9.9,
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    aqi: 124,
    water: 60,
    risk: 62,
    eco: 54,
    temp: 38,
    humidity: 44,
    pm25: 58,
    pm10: 142,
    no2: 42,
    o3: 60,
    co2: 446,
    carbon: 7.2,
    alerts: 5,
    lat: 25.2,
    lng: 55.27,
    windSpeed: 17.4,
  },
];

// ─── Phase 1: Canonical AQI banding — SINGLE SOURCE OF TRUTH ──────────────────
// Previously this file and src/lib/map/map-visuals.ts each maintained their own
// independent AQI breakpoints. They agreed for 0–200 but diverged above it
// (map-visuals had no "Very Unhealthy" tier and mis-colored everything past 200
// as plain dark red). This table — the more complete, EPA-standard six-tier
// scale — is now the only place these breakpoints are defined anywhere in the
// app. map-visuals.ts's aqiColor()/aqiColorRaw()/aqiLabel() derive from it.
export interface AqiBandInfo {
  /** Inclusive upper bound of this band (Infinity for the last one) */
  max: number;
  label: string;
  /** Abbreviated label for space-constrained UI (map popups, markers) */
  shortLabel: string;
  /** Theme-aware CSS color (var()/oklch()) */
  color: string;
  /** Raw hex fallback for canvas/SVG contexts that can't resolve CSS vars */
  colorRaw: string;
}

export const AQI_BANDS: AqiBandInfo[] = [
  {
    max: 50,
    label: "Good",
    shortLabel: "Good",
    color: "var(--color-success)",
    colorRaw: "#16a34a",
  },
  {
    max: 100,
    label: "Moderate",
    shortLabel: "Moderate",
    color: "var(--color-warning)",
    colorRaw: "#ca8a04",
  },
  {
    max: 150,
    label: "Unhealthy (SG)",
    shortLabel: "USG",
    color: "oklch(0.72 0.18 50)",
    colorRaw: "#d97706",
  },
  {
    max: 200,
    label: "Unhealthy",
    shortLabel: "Unhealthy",
    color: "var(--color-destructive)",
    colorRaw: "#dc2626",
  },
  {
    max: 300,
    label: "Very Unhealthy",
    shortLabel: "Very Unhealthy",
    color: "oklch(0.5 0.22 320)",
    colorRaw: "#9333ea",
  },
  {
    max: Infinity,
    label: "Hazardous",
    shortLabel: "Hazardous",
    color: "oklch(0.4 0.2 20)",
    colorRaw: "#7f1d1d",
  },
];

export function findAqiBand(aqi: number): AqiBandInfo {
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

export function aqiBand(aqi: number) {
  const b = findAqiBand(aqi);
  return { label: b.label, color: b.color };
}

// ─── EcoScore grade — offline-fallback mirror ─────────────────────────────────
// The authoritative grade mapping lives on the backend
// (backend/src/services/ecoScore.service.ts — gradeForEcoScore) and is
// returned as city.ecoScore.grade whenever real data is available. This is
// only the same thresholds mirrored client-side for the fully-offline demo
// state, where no city.ecoScore exists to explain. Used by both
// sustainability.tsx and copilot-panel.tsx so the fallback grade can't
// drift between the two.
export function ecoGradeFallback(eco: number): string {
  if (eco >= 85) return "A+";
  if (eco >= 75) return "A";
  if (eco >= 65) return "B+";
  if (eco >= 55) return "B";
  if (eco >= 45) return "C+";
  return "C";
}

// Deterministic pseudo-random
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export function trendSeries(seed: number, base: number, n = 24, amp = 18) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => ({
    t: i,
    label: `${i.toString().padStart(2, "0")}:00`,
    aqi: Math.max(8, Math.round(base + Math.sin(i / 3) * amp + (r() - 0.5) * amp)),
    pm25: Math.max(
      4,
      Math.round(base * 0.55 + Math.cos(i / 4) * amp * 0.7 + (r() - 0.5) * amp * 0.6),
    ),
    no2: Math.max(
      4,
      Math.round(base * 0.35 + Math.sin(i / 5) * amp * 0.5 + (r() - 0.5) * amp * 0.4),
    ),
  }));
}

export function forecastSeries(seed: number, base: number, hours: number) {
  const r = rng(seed + hours);
  return Array.from({ length: hours }, (_, i) => {
    const drift = Math.sin(i / 6) * 14 + (r() - 0.5) * 12;
    return {
      hour: i,
      label: i % (hours > 48 ? 12 : 6) === 0 ? `+${i}h` : "",
      predicted: Math.max(10, Math.round(base + drift)),
      lower: Math.max(5, Math.round(base + drift - 14)),
      upper: Math.round(base + drift + 14),
    };
  });
}

export const ALERTS = [
  {
    id: "a1",
    severity: "critical",
    title: "PM2.5 spike detected",
    area: "Industrial Zone B",
    time: "2 min ago",
    desc: "Sensor cluster reporting 168 µg/m³, 3× safe limit.",
  },
  {
    id: "a2",
    severity: "warning",
    title: "Water turbidity rising",
    area: "River Intake 04",
    time: "18 min ago",
    desc: "Turbidity at 12 NTU; trending upward across last 6 readings.",
  },
  {
    id: "a3",
    severity: "warning",
    title: "Traffic-induced NO₂",
    area: "Corridor A-19",
    time: "47 min ago",
    desc: "Peak-hour NO₂ exceeds 80 ppb threshold.",
  },
  {
    id: "a4",
    severity: "info",
    title: "Forecast advisory",
    area: "City-wide",
    time: "1 hr ago",
    desc: "Stagnant air mass predicted in 36h window; expect AQI rise.",
  },
  {
    id: "a5",
    severity: "critical",
    title: "Heatwave warning",
    area: "Southern grid",
    time: "2 hr ago",
    desc: "Surface temp forecast to exceed 41°C for 3 consecutive days.",
  },
];

export const INSIGHTS = [
  {
    icon: "trend",
    title: "PM2.5 down 14% this week",
    body: "Wind patterns and reduced industrial output drove improvement in north sectors.",
    tag: "Air Quality",
  },
  {
    icon: "leaf",
    title: "Tree-cover sequestration up 6%",
    body: "New plantation in Ward 12 contributed 84 t CO₂ offset in Q3.",
    tag: "Sustainability",
  },
  {
    icon: "alert",
    title: "High-risk window: 36–48h",
    body: "Stagnation + low boundary layer height suggests pollutant build-up.",
    tag: "Forecast",
  },
  {
    icon: "drop",
    title: "River intake 03 stable",
    body: "Turbidity and dissolved-O₂ within normal envelope for 14 consecutive days.",
    tag: "Water",
  },
];

export const RECOMMENDATIONS = [
  {
    title: "Restrict heavy-vehicle entry 06:00–10:00",
    impact: "−18 AQI",
    effort: "Low",
    confidence: 0.86,
  },
  {
    title: "Activate misting stations in Zone C",
    impact: "−9 PM10",
    effort: "Medium",
    confidence: 0.74,
  },
  {
    title: "Issue public advisory for sensitive groups",
    impact: "Health risk ↓",
    effort: "Low",
    confidence: 0.92,
  },
  {
    title: "Audit Industrial cluster B emissions",
    impact: "−24 PM2.5",
    effort: "High",
    confidence: 0.68,
  },
];

export const REPORTS = [
  {
    id: "r1",
    title: "Q3 Environmental Health Report",
    type: "Quarterly",
    size: "4.2 MB",
    date: "Oct 02, 2025",
    pages: 48,
  },
  {
    id: "r2",
    title: "Air Quality Trend Analysis — 30d",
    type: "Analytics",
    size: "2.1 MB",
    date: "Oct 28, 2025",
    pages: 22,
  },
  {
    id: "r3",
    title: "Water Sanitation Compliance Audit",
    type: "Compliance",
    size: "1.6 MB",
    date: "Sep 18, 2025",
    pages: 18,
  },
  {
    id: "r4",
    title: "Carbon Footprint — Municipal Operations",
    type: "Sustainability",
    size: "3.4 MB",
    date: "Aug 30, 2025",
    pages: 34,
  },
  {
    id: "r5",
    title: "Citizen Complaint Resolution Summary",
    type: "Operations",
    size: "880 KB",
    date: "Oct 12, 2025",
    pages: 12,
  },
  {
    id: "r6",
    title: "Forecast Accuracy Benchmark",
    type: "Analytics",
    size: "1.2 MB",
    date: "Sep 04, 2025",
    pages: 14,
  },
];

export const COMPLAINTS = [
  {
    id: "c1",
    title: "Open burning near Lake Road",
    status: "resolved",
    date: "Oct 28",
    priority: "high",
  },
  {
    id: "c2",
    title: "Sewage overflow on 5th Cross",
    status: "in-progress",
    date: "Oct 29",
    priority: "critical",
  },
  {
    id: "c3",
    title: "Smoke from factory chimney",
    status: "in-progress",
    date: "Oct 30",
    priority: "high",
  },
  {
    id: "c4",
    title: "Illegal dumping at park edge",
    status: "pending",
    date: "Nov 01",
    priority: "medium",
  },
];

export const HOTSPOTS = [
  { id: "h1", name: "Industrial Zone B", x: 28, y: 32, level: 92 },
  { id: "h2", name: "Highway Corridor", x: 56, y: 44, level: 78 },
  { id: "h3", name: "Port Sector", x: 72, y: 68, level: 84 },
  { id: "h4", name: "Old Town", x: 42, y: 60, level: 56 },
  { id: "h5", name: "Stadium Ring", x: 64, y: 22, level: 48 },
  { id: "h6", name: "Eastern Suburbs", x: 84, y: 50, level: 34 },
  { id: "h7", name: "River Mouth", x: 22, y: 78, level: 64 },
];
