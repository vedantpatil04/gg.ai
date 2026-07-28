/**
 * hazard-data.ts — Phase 7: Disaster & Hazard Intelligence Platform
 *
 * All hazard data is derived deterministically from existing City fields:
 *   risk, temp, humidity, aqi, water, lat, lng, windSpeed, alerts, eco
 *
 * No new backend APIs, no database changes.  The generator produces
 * internally consistent multi-hazard readings that reflect real
 * environmental stressors (coastal floods, heat stress, drought, etc.).
 *
 * Exports consumed by HazardIntelligencePanel.tsx.
 */

import type { City } from "@/lib/mock-data";

// ─── Hazard catalogue ─────────────────────────────────────────────────────────
export type HazardType = "flood" | "storm" | "heatwave" | "wildfire" | "landslide" | "drought";

export type RiskLevel = "low" | "moderate" | "high" | "severe" | "critical";

export interface HazardMeta {
  id: HazardType;
  label: string;
  description: string;
  /** Primary visual colour (CSS value) */
  color: string;
  /** Secondary colour for gradients */
  colorSecondary: string;
  /** Lucide icon name (used as string key; panel imports directly) */
  icon: string;
}

export const HAZARDS: HazardMeta[] = [
  {
    id: "flood",
    label: "Flood Risk",
    description: "Inundation risk from rainfall, river overflow or coastal surge",
    color: "oklch(0.62 0.16 230)",
    colorSecondary: "oklch(0.50 0.18 245)",
    icon: "Waves",
  },
  {
    id: "storm",
    label: "Storm Risk",
    description: "Severe weather — high winds, lightning, and storm surges",
    color: "oklch(0.60 0.18 290)",
    colorSecondary: "oklch(0.48 0.20 270)",
    icon: "Zap",
  },
  {
    id: "heatwave",
    label: "Heatwave Risk",
    description: "Extreme heat stress — public health and infrastructure risk",
    color: "oklch(0.70 0.20 40)",
    colorSecondary: "oklch(0.60 0.22 20)",
    icon: "Thermometer",
  },
  {
    id: "wildfire",
    label: "Wildfire Risk",
    description: "Uncontrolled fire risk from drought, wind, and dry vegetation",
    color: "oklch(0.68 0.22 35)",
    colorSecondary: "oklch(0.55 0.24 20)",
    icon: "Flame",
  },
  {
    id: "landslide",
    label: "Landslide Risk",
    description: "Slope failure risk from rainfall saturation and seismic activity",
    color: "oklch(0.62 0.10 60)",
    colorSecondary: "oklch(0.50 0.12 50)",
    icon: "MountainSnow",
  },
  {
    id: "drought",
    label: "Drought Risk",
    description: "Water scarcity from sustained low rainfall and high evaporation",
    color: "oklch(0.72 0.15 75)",
    colorSecondary: "oklch(0.60 0.17 60)",
    icon: "Droplets",
  },
];

// ─── Risk level helpers ───────────────────────────────────────────────────────
export function scoreToLevel(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 70) return "severe";
  if (score >= 50) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

export function levelColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low: "var(--color-success)",
    moderate: "var(--color-warning)",
    high: "oklch(0.72 0.18 50)",
    severe: "var(--color-destructive)",
    critical: "oklch(0.45 0.22 10)",
  };
  return map[level];
}

export function levelLabel(level: RiskLevel): string {
  return { low: "Low", moderate: "Moderate", high: "High", severe: "Severe", critical: "Critical" }[
    level
  ];
}

// ─── Individual hazard reading ────────────────────────────────────────────────
export interface HazardReading {
  meta: HazardMeta;
  score: number; // 0–100
  level: RiskLevel;
  trend: "rising" | "stable" | "falling";
  activeAlert: boolean;
  summary: string; // 1-sentence contextual summary
  mitigations: string[]; // 2–3 action items
  /** Approximate GIS bounding box for this hazard in the city (lat/lng) */
  bounds?: { n: number; s: number; e: number; w: number };
}

// ─── Emergency alert ──────────────────────────────────────────────────────────
export type AlertSeverity = "advisory" | "watch" | "warning" | "emergency";

export interface HazardAlert {
  id: string;
  type: HazardType;
  severity: AlertSeverity;
  title: string;
  description: string;
  location: string;
  issuedAt: string; // relative label e.g. "2 h ago"
  action: string;
  color: string;
}

// ─── Full hazard intelligence record ─────────────────────────────────────────
export interface HazardData {
  /** Composite 0–100 risk score across all hazards */
  overallScore: number;
  overallLevel: RiskLevel;
  activeHazards: HazardReading[];
  allHazards: HazardReading[];
  /** Highest-scoring hazard */
  primaryHazard: HazardReading;
  alerts: HazardAlert[];
  analytics: HazardAnalytics;
  recommendations: string[];
}

export interface HazardAnalytics {
  /** Distribution of hazard scores by severity tier */
  distribution: { level: RiskLevel; count: number; color: string }[];
  /** % of city population estimated at elevated risk — derived heuristic */
  populationAtRisk: number;
  /** % of infrastructure under stress */
  infrastructureRisk: number;
  /** Summary sentence */
  environmentalSummary: string;
}

// ─── Seeded RNG (same approach as weather-data / air-quality-data) ────────────
function seeded(seed: string, i: number): number {
  let h = i * 2654435761;
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 0x9e3779b9);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Per-hazard score derivations ─────────────────────────────────────────────
/**
 * Each hazard score uses a primary driver from City fields plus secondary
 * factors and seeded variance, so every city has a realistic, distinct profile.
 */
function deriveScores(city: City): Record<HazardType, number> {
  const r = (i: number) => seeded(city.id, i);

  // Flood: driven by humidity, water quality (low = stressed), coastal proximity
  const coastalFactor = Math.abs(city.lat) < 25 ? 15 : 0; // tropics → higher flood
  const flood = clamp(
    city.humidity * 0.45 + (100 - city.water) * 0.25 + coastalFactor + r(1) * 12 - 5,
    0,
    100,
  );

  // Storm: driven by city risk score + wind speed + temp differential
  const storm = clamp(city.risk * 0.5 + (city.windSpeed ?? 10) * 1.2 + r(2) * 15 - 5, 0, 100);

  // Heatwave: driven by temperature + low humidity + AQI
  const heatwave = clamp(
    (city.temp - 15) * 2.8 + (100 - city.humidity) * 0.18 + city.aqi * 0.08 + r(3) * 10 - 3,
    0,
    100,
  );

  // Wildfire: driven by temp + low humidity + low eco score
  const wildfire = clamp(
    (city.temp - 20) * 2.2 + (100 - city.humidity) * 0.35 + (100 - city.eco) * 0.2 + r(4) * 12 - 6,
    0,
    100,
  );

  // Landslide: driven by humidity + hill terrain proxy (lat variance) + risk
  const terrain = Math.abs(Math.sin(city.lat * 0.8)) * 20; // simple terrain proxy
  const landslide = clamp(
    city.humidity * 0.28 + terrain + city.risk * 0.25 + r(5) * 14 - 8,
    0,
    100,
  );

  // Drought: inverse of humidity + high temp + low water
  const drought = clamp(
    (100 - city.humidity) * 0.4 + (city.temp - 20) * 1.5 + (100 - city.water) * 0.3 + r(6) * 10 - 5,
    0,
    100,
  );

  return { flood, storm, heatwave, wildfire, landslide, drought };
}

// ─── Contextual summaries ─────────────────────────────────────────────────────
function summary(type: HazardType, score: number, city: City): string {
  const level = scoreToLevel(score);
  const city_n = city.name;
  const S: Record<HazardType, Record<RiskLevel, string>> = {
    flood: {
      low: `${city_n} shows low flood susceptibility under current conditions.`,
      moderate: `Localised low-lying areas in ${city_n} face moderate inundation risk.`,
      high: `Several drainage catchments in ${city_n} are at high flood risk; monitor rainfall.`,
      severe: `Severe flood risk across key districts of ${city_n} — pre-position response assets.`,
      critical: `Critical flood emergency potential in ${city_n}; infrastructure vulnerability is high.`,
    },
    storm: {
      low: `Storm risk in ${city_n} is within normal seasonal parameters.`,
      moderate: `Moderate storm risk — gusty conditions and localised damage possible in ${city_n}.`,
      high: `High storm risk in ${city_n}; wind-induced structural and transport disruption likely.`,
      severe: `Severe storm conditions approaching ${city_n}; restrict outdoor operations.`,
      critical: `Critical storm emergency in ${city_n} — activate emergency protocols immediately.`,
    },
    heatwave: {
      low: `Temperatures in ${city_n} are within safe thresholds.`,
      moderate: `Moderate heat stress risk — vulnerable populations in ${city_n} should take precautions.`,
      high: `High heat risk in ${city_n}; cooling centres advised for vulnerable residents.`,
      severe: `Severe heatwave in ${city_n}; health system stress expected.`,
      critical: `Critical heat emergency — mortality risk elevated in ${city_n}.`,
    },
    wildfire: {
      low: `Wildfire conditions in ${city_n} are currently unfavourable.`,
      moderate: `Moderate wildfire risk — dry peri-urban vegetation in ${city_n} is susceptible.`,
      high: `High wildfire risk; firebreaks and alert systems should be verified in ${city_n}.`,
      severe: `Severe wildfire danger in ${city_n} — active monitoring of green-belt corridors essential.`,
      critical: `Critical wildfire risk in ${city_n} — immediate pre-suppression deployment recommended.`,
    },
    landslide: {
      low: `Slope stability in ${city_n} is adequate under current conditions.`,
      moderate: `Moderate landslide risk in elevated terrains near ${city_n}.`,
      high: `High slope failure risk; saturated soils increase mass-movement potential in ${city_n}.`,
      severe: `Severe landslide risk — hillside settlements in ${city_n} should be assessed urgently.`,
      critical: `Critical geo-hazard risk in ${city_n} — hillside evacuations may be warranted.`,
    },
    drought: {
      low: `Water balance in ${city_n} is within seasonal norms.`,
      moderate: `Moderate drought stress — agricultural and reservoir levels declining in ${city_n}.`,
      high: `High drought risk; water restrictions and demand management needed in ${city_n}.`,
      severe: `Severe drought conditions — essential services under water stress in ${city_n}.`,
      critical: `Critical drought emergency in ${city_n} — emergency water rationing required.`,
    },
  };
  return S[type][level];
}

function mitigations(type: HazardType, level: RiskLevel): string[] {
  const base: Record<HazardType, string[]> = {
    flood: [
      "Check drainage clearance in low-lying areas",
      "Pre-position sandbags at flood-prone entry points",
      "Alert communities near watercourses",
    ],
    storm: [
      "Inspect and secure loose structures",
      "Brief emergency response teams",
      "Activate public weather alert channels",
    ],
    heatwave: [
      "Open cooling centres for vulnerable residents",
      "Issue hydration advisories",
      "Schedule heat-risk checks for elderly populations",
    ],
    wildfire: [
      "Deploy pre-positioned fire crews to peri-urban perimeter",
      "Issue public fire-risk advisory",
      "Inspect firebreaks and access roads",
    ],
    landslide: [
      "Monitor rainfall-triggered slope sensors",
      "Restrict access to high-risk hillside zones",
      "Brief geotechnical inspection teams",
    ],
    drought: [
      "Enforce water conservation measures",
      "Monitor reservoir levels daily",
      "Engage with agricultural sector on demand reduction",
    ],
  };
  // At low risk, only show first mitigation
  if (level === "low") return base[type].slice(0, 1);
  if (level === "moderate") return base[type].slice(0, 2);
  return base[type];
}

// ─── Alert generator ──────────────────────────────────────────────────────────
function generateAlerts(city: City, scores: Record<HazardType, number>): HazardAlert[] {
  const alerts: HazardAlert[] = [];
  const r = (i: number) => seeded(city.id, i + 50);
  const hoursAgo = (i: number) => {
    const h = Math.floor(r(i) * 18);
    return h === 0 ? "Just now" : h === 1 ? "1 h ago" : `${h} h ago`;
  };

  const push = (
    type: HazardType,
    score: number,
    threshold: number,
    alertFn: () => Omit<HazardAlert, "id" | "type" | "color">,
  ) => {
    if (score >= threshold) {
      const meta = HAZARDS.find((h) => h.id === type)!;
      alerts.push({ id: `${city.id}-${type}`, type, color: meta.color, ...alertFn() });
    }
  };

  push("flood", scores.flood, 45, () => ({
    severity: scores.flood >= 70 ? "warning" : "watch",
    title: scores.flood >= 70 ? "Flood Warning" : "Flood Watch",
    description: `Water levels in key catchments around ${city.name} are elevated.`,
    location: `${city.name} lowland districts`,
    issuedAt: hoursAgo(51),
    action: "Monitor drainage systems; avoid low-lying areas.",
  }));

  push("storm", scores.storm, 50, () => ({
    severity: scores.storm >= 75 ? "warning" : "watch",
    title: scores.storm >= 75 ? "Storm Warning" : "Storm Watch",
    description: `Wind speeds and convective activity increasing over ${city.name}.`,
    location: `${city.name} metropolitan area`,
    issuedAt: hoursAgo(52),
    action: "Secure outdoor fixtures; brief emergency teams.",
  }));

  push("heatwave", scores.heatwave, 55, () => ({
    severity: scores.heatwave >= 80 ? "emergency" : scores.heatwave >= 65 ? "warning" : "advisory",
    title: scores.heatwave >= 80 ? "Heat Emergency" : "Heatwave Warning",
    description: `Extended high temperatures forecast for ${city.name}; heat stress risk elevated.`,
    location: `${city.name} urban core`,
    issuedAt: hoursAgo(53),
    action: "Activate cooling centres; issue public health guidance.",
  }));

  push("wildfire", scores.wildfire, 55, () => ({
    severity: scores.wildfire >= 75 ? "warning" : "advisory",
    title: scores.wildfire >= 75 ? "Wildfire Warning" : "Fire Risk Advisory",
    description: `Dry, windy conditions increase fire risk in peri-urban zones around ${city.name}.`,
    location: `${city.name} peripheral greenbelts`,
    issuedAt: hoursAgo(54),
    action: "Deploy fire crews; enforce open-burn restrictions.",
  }));

  push("drought", scores.drought, 60, () => ({
    severity: scores.drought >= 80 ? "warning" : "advisory",
    title: scores.drought >= 80 ? "Drought Warning" : "Drought Advisory",
    description: `Reservoir levels declining; water stress indicators rising in ${city.name}.`,
    location: `${city.name} water supply catchments`,
    issuedAt: hoursAgo(55),
    action: "Enforce water-use restrictions; accelerate demand management.",
  }));

  return alerts;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function buildAnalytics(readings: HazardReading[], city: City): HazardAnalytics {
  const counts: Record<RiskLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
    severe: 0,
    critical: 0,
  };
  readings.forEach((r) => counts[r.level]++);

  const distribution = (Object.keys(counts) as RiskLevel[])
    .filter((k) => counts[k] > 0)
    .map((k) => ({ level: k, count: counts[k], color: levelColor(k) }));

  const topScore = Math.max(...readings.map((r) => r.score));
  const populationAtRisk = Math.round(clamp(topScore * 0.65 + city.risk * 0.2, 0, 95));
  const infrastructureRisk = Math.round(clamp(city.risk * 0.55 + topScore * 0.25, 0, 90));

  const primaryLevel = scoreToLevel(topScore);
  const environmentalSummary =
    primaryLevel === "low" || primaryLevel === "moderate"
      ? `Environmental conditions in ${city.name} are broadly stable. Routine monitoring is sufficient.`
      : primaryLevel === "high"
        ? `${city.name} faces elevated multi-hazard risk. Coordinated monitoring and early action is recommended.`
        : `${city.name} is under significant multi-hazard stress. Emergency preparedness protocols should be active.`;

  return { distribution, populationAtRisk, infrastructureRisk, environmentalSummary };
}

// ─── Risk zone bounding boxes (approximate, derived from city centre + hazard profile) ──
function deriveBounds(
  city: City,
  type: HazardType,
  score: number,
): { n: number; s: number; e: number; w: number } | undefined {
  if (score < 30) return undefined;
  // Spread proportional to score — higher risk = larger affected zone
  const spread = 0.02 + (score / 100) * 0.12;
  const r = seeded(city.id + type, 99);
  const offsetLat = (r - 0.5) * spread * 0.5;
  const offsetLng = (seeded(city.id + type, 98) - 0.5) * spread * 0.5;
  return {
    n: city.lat + spread + offsetLat,
    s: city.lat - spread + offsetLat,
    e: city.lng + spread + offsetLng,
    w: city.lng - spread + offsetLng,
  };
}

// ─── Trend derivation ─────────────────────────────────────────────────────────
function trend(city: City, type: HazardType, i: number): HazardReading["trend"] {
  const v = seeded(city.id + type, i + 80);
  return v < 0.3 ? "falling" : v < 0.6 ? "stable" : "rising";
}

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateHazardData(city: City): HazardData {
  const scores = deriveScores(city);

  const allHazards: HazardReading[] = HAZARDS.map((meta, i) => {
    const score = Math.round(scores[meta.id]);
    const level = scoreToLevel(score);
    return {
      meta,
      score,
      level,
      trend: trend(city, meta.id, i),
      activeAlert: score >= 45,
      summary: summary(meta.id, score, city),
      mitigations: mitigations(meta.id, level),
      bounds: deriveBounds(city, meta.id, score),
    };
  });

  const activeHazards = allHazards
    .filter((h) => h.level !== "low")
    .sort((a, b) => b.score - a.score);

  const primaryHazard = allHazards.reduce((a, b) => (a.score > b.score ? a : b));
  const overallScore = Math.round(allHazards.reduce((s, h) => s + h.score, 0) / allHazards.length);
  const overallLevel = scoreToLevel(overallScore);

  const alerts = generateAlerts(city, scores);

  const recommendations = [
    activeHazards.length === 0
      ? "No significant hazards detected — maintain routine environmental monitoring."
      : `Priority: monitor ${primaryHazard.meta.label.toLowerCase()} — currently ${levelLabel(primaryHazard.level).toLowerCase()} risk.`,
    city.risk > 60
      ? "Elevated city-wide risk score — coordinate multi-agency preparedness review."
      : "Maintain standard preparedness posture; review emergency contacts quarterly.",
    alerts.length > 0
      ? `${alerts.length} active alert${alerts.length > 1 ? "s" : ""} require${alerts.length === 1 ? "s" : ""} attention — verify response team readiness.`
      : "No active emergency alerts — continue passive monitoring.",
    "Architecture is AI-ready for Phase 8 predictive hazard modelling.",
  ];

  return {
    overallScore,
    overallLevel,
    activeHazards,
    allHazards,
    primaryHazard,
    alerts,
    analytics: buildAnalytics(allHazards, city),
    recommendations,
  };
}

// ─── Alert severity colour ────────────────────────────────────────────────────
export function alertSeverityColor(s: AlertSeverity): string {
  return {
    advisory: "var(--color-info)",
    watch: "var(--color-warning)",
    warning: "var(--color-destructive)",
    emergency: "oklch(0.45 0.22 10)",
  }[s];
}

export function alertSeverityLabel(s: AlertSeverity): string {
  return { advisory: "Advisory", watch: "Watch", warning: "Warning", emergency: "Emergency" }[s];
}
