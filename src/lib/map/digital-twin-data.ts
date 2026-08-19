/**
 * digital-twin-data.ts — Phase 9: Digital Twin & Executive Operations Center
 *
 * Assembles cross-module intelligence into a unified operational picture.
 * Correlates: City, Sensors (hotspots), Zones, Complaints (MapComplaint),
 * Phase 6 AQ, Phase 7 Hazard, Phase 8 AI Command — into a single
 * DigitalTwinData record that drives the Digital Twin tab.
 *
 * Also manages workspace layout preferences (Section 11) persisted to
 * localStorage under key "gg-dt-workspace".
 *
 * No new backend APIs.
 */

import type { City } from "@/lib/mock-data";
import { CITIES, findAqiBand } from "@/lib/mock-data";
import type { MapLocation, MapComplaint, EnvZones } from "@/lib/api/environmental.api";
import { generateHazardData, scoreToLevel, levelColor, levelLabel } from "./hazard-data";
import { generateAirQualityData } from "./air-quality-data";
import { generateWeatherData } from "./weather-data";

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function seeded(seed: string, i: number): number {
  let h = i * 2654435761;
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 0x9e3779b9);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

// ─── Operational timeline event ───────────────────────────────────────────────
export type OpsEventCategory =
  "aqi" | "weather" | "hazard" | "complaint" | "sensor" | "authority" | "ai";

export interface OpsEvent {
  id: string;
  category: OpsEventCategory;
  title: string;
  detail: string;
  time: string;
  severity: "info" | "warning" | "critical";
  color: string;
  /** Location id this event relates to (for map sync) */
  locationId?: string;
  lat?: number;
  lng?: number;
}

// ─── Zone intelligence ────────────────────────────────────────────────────────
export interface ZoneIntelligence {
  name: string;
  key: keyof EnvZones;
  score: number; // 0–100 (raw zone value)
  aqi: number;
  complaintCount: number;
  sensorCount: number;
  hazardLevel: string;
  authorityNote: string;
  trend: "improving" | "stable" | "degrading";
  color: string;
}

// ─── Sensor operation card ────────────────────────────────────────────────────
export interface SensorOps {
  id: string;
  name: string;
  lat: number;
  lng: number;
  online: boolean;
  lastReading: string;
  aqi: number;
  category: string;
  coverageRadius: number; // metres (rough)
  nearbyComplaints: number;
  health: number; // 0–100
}

// ─── Authority operation ──────────────────────────────────────────────────────
export type AuthorityUrgency = "Immediate" | "High" | "Moderate" | "Routine";

export interface AuthorityOps {
  zone: string;
  urgency: AuthorityUrgency;
  primaryAction: string;
  aqiImpact: string;
  timeframe: string;
  pendingComplaints: number;
  activeAlerts: number;
}

// ─── Cross-module correlation (Section 6/12) ──────────────────────────────────
export interface CorrelatedLocation {
  sensor: SensorOps;
  nearbyEvents: OpsEvent[];
  aqiBand: string;
  aqiBandColor: string;
  hazardLevel: string;
  hazardColor: string;
  authorityNote: string;
  aiSummary: string;
}

// ─── Executive KPI ────────────────────────────────────────────────────────────
export interface ExecKpi {
  label: string;
  value: string | number;
  unit?: string;
  score: number; // 0–100 for the radial/bar
  color: string;
  trend: "up" | "down" | "stable";
  detail: string;
}

// ─── Workspace panel config (Section 11) ─────────────────────────────────────
export type PanelId =
  "executive" | "timeline" | "zones" | "sensors" | "authority" | "citizen" | "correlation";

export interface PanelState {
  id: PanelId;
  label: string;
  collapsed: boolean;
  pinned: boolean;
  order: number;
}

const DEFAULT_PANELS: PanelState[] = [
  { id: "executive", label: "Executive Dashboard", collapsed: false, pinned: true, order: 0 },
  { id: "timeline", label: "Operational Timeline", collapsed: false, pinned: false, order: 1 },
  { id: "zones", label: "Zone Intelligence", collapsed: false, pinned: false, order: 2 },
  { id: "sensors", label: "Monitoring Operations", collapsed: true, pinned: false, order: 3 },
  { id: "authority", label: "Authority Operations", collapsed: true, pinned: false, order: 4 },
  { id: "citizen", label: "Citizen Intelligence", collapsed: false, pinned: false, order: 5 },
  { id: "correlation", label: "Cross-Module Intel", collapsed: true, pinned: false, order: 6 },
];

const WS_KEY = "gg-dt-workspace";

export function loadWorkspace(): PanelState[] {
  try {
    if (typeof window === "undefined") return DEFAULT_PANELS;
    const raw = localStorage.getItem(WS_KEY);
    if (!raw) return DEFAULT_PANELS;
    const saved: PanelState[] = JSON.parse(raw);
    // Merge: use saved state where ids match, add new defaults for any missing
    const byId = Object.fromEntries(saved.map((p) => [p.id, p]));
    return DEFAULT_PANELS.map((d) => byId[d.id] ?? d).sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_PANELS;
  }
}

export function saveWorkspace(panels: PanelState[]): void {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(panels));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────
export interface DigitalTwinData {
  execKpis: ExecKpi[];
  zoneIntelligence: ZoneIntelligence[];
  sensorOps: SensorOps[];
  authorityOps: AuthorityOps[];
  opsTimeline: OpsEvent[];
  correlatedSelected: CorrelatedLocation | null;
  overallHealth: number; // 0–100 composite
  overallHealthColor: string;
  overallHealthLabel: string;
}

export function generateDigitalTwinData(
  city: City,
  hotspots: MapLocation[],
  zones: EnvZones,
  complaints: MapComplaint[],
  selectedId: string | null,
): DigitalTwinData {
  const r = (i: number) => seeded(city.id, i + 300);
  const hazard = generateHazardData(city);
  const aq = generateAirQualityData(city, CITIES);
  const wx = generateWeatherData(city);
  const aqBand = findAqiBand(city.aqi);

  // ── Executive KPIs ──────────────────────────────────────────────────────────
  const sensorsOnline = hotspots.filter((h) => h.sensor).length;
  const sensorPct = hotspots.length > 0 ? Math.round((sensorsOnline / hotspots.length) * 100) : 0;
  const openComplaints = complaints.filter((c) => c.status !== "resolved").length;
  const criticalComplaints = complaints.filter((c) => c.severity === "critical").length;
  const envHealth = Math.round(
    (100 - city.aqi / 3) * 0.3 +
      city.water * 0.2 +
      city.eco * 0.2 +
      (100 - hazard.overallScore) * 0.3,
  );
  const opReadiness = Math.round(
    (100 - hazard.overallScore) * 0.45 + sensorPct * 0.3 + ((city.water * 0.25) / 100) * 100 * 0.25,
  );
  const coveragePct = Math.round(60 + r(1) * 35);
  const alertScore = Math.max(0, 100 - city.alerts * 7);

  const kvColor = (v: number) =>
    v >= 70
      ? "var(--color-success)"
      : v >= 45
        ? "var(--color-warning)"
        : "var(--color-destructive)";

  const execKpis: ExecKpi[] = [
    {
      label: "Env Health",
      value: envHealth,
      unit: "/100",
      score: envHealth,
      color: kvColor(envHealth),
      trend: city.aqi < 100 ? "up" : "down",
      detail: `AQI ${city.aqi} · Water ${city.water} · Eco ${city.eco}`,
    },
    {
      label: "Op Readiness",
      value: opReadiness,
      unit: "/100",
      score: opReadiness,
      color: kvColor(opReadiness),
      trend: hazard.overallScore < 50 ? "up" : "stable",
      detail: `Hazard ${hazard.overallScore}/100 · Sensors ${sensorPct}%`,
    },
    {
      label: "Sensor Health",
      value: sensorPct,
      unit: "%",
      score: sensorPct,
      color: kvColor(sensorPct),
      trend: sensorPct > 75 ? "up" : "stable",
      detail: `${sensorsOnline} of ${hotspots.length} online`,
    },
    {
      label: "Alert Status",
      value: alertScore,
      unit: "/100",
      score: alertScore,
      color: kvColor(alertScore),
      trend: city.alerts < 3 ? "up" : "down",
      detail: `${city.alerts} active alerts`,
    },
    {
      label: "Coverage",
      value: coveragePct,
      unit: "%",
      score: coveragePct,
      color: kvColor(coveragePct),
      trend: "stable",
      detail: "Spatial monitoring coverage",
    },
    {
      label: "Complaints",
      value: openComplaints,
      score: Math.max(0, 100 - openComplaints * 8),
      color:
        openComplaints === 0
          ? "var(--color-success)"
          : openComplaints < 5
            ? "var(--color-warning)"
            : "var(--color-destructive)",
      trend: criticalComplaints > 0 ? "down" : "stable",
      detail: `${criticalComplaints} critical · ${complaints.filter((c) => c.status === "resolved").length} resolved`,
    },
  ];

  // ── Zone intelligence ────────────────────────────────────────────────────────
  const zoneComplaintMap: Record<string, number> = {
    residential: 0,
    industrial: 0,
    commercial: 0,
    greenCover: 0,
  };
  complaints.forEach((c) => {
    if (c.issueType?.includes("air") || c.issueType?.includes("smoke"))
      zoneComplaintMap.industrial++;
    else if (c.issueType?.includes("water")) zoneComplaintMap.residential++;
    else if (c.issueType?.includes("waste")) zoneComplaintMap.commercial++;
    else zoneComplaintMap.residential++;
  });

  const zoneHotspotMap: Record<string, number> = {
    residential: 0,
    industrial: 0,
    commercial: 0,
    greenCover: 0,
  };
  hotspots.forEach((h) => {
    const cat = h.category?.toString() ?? "residential";
    if (cat in zoneHotspotMap) zoneHotspotMap[cat]++;
    else zoneHotspotMap.residential++;
  });

  const zoneIntelligence: ZoneIntelligence[] = [
    {
      key: "residential",
      name: "Residential",
      score: zones.residential,
      aqi: Math.round(city.aqi * 0.85 + r(10) * 20),
      complaintCount: zoneComplaintMap.residential,
      sensorCount: zoneHotspotMap.residential,
      hazardLevel: levelLabel(scoreToLevel(hazard.overallScore * 0.8)),
      authorityNote: "Standard residential monitoring active",
      trend: city.aqi < 100 ? "improving" : "stable",
      color: "oklch(0.68 0.14 145)",
    },
    {
      key: "industrial",
      name: "Industrial",
      score: zones.industrial,
      aqi: Math.round(city.aqi * 1.25 + r(11) * 30),
      complaintCount: zoneComplaintMap.industrial,
      sensorCount: zoneHotspotMap.industrial,
      hazardLevel: levelLabel(scoreToLevel(hazard.overallScore)),
      authorityNote: "Enhanced emission monitoring required",
      trend: city.aqi > 120 ? "degrading" : "stable",
      color: "var(--color-destructive)",
    },
    {
      key: "commercial",
      name: "Commercial",
      score: zones.commercial,
      aqi: Math.round(city.aqi * 1.05 + r(12) * 15),
      complaintCount: zoneComplaintMap.commercial,
      sensorCount: zoneHotspotMap.commercial,
      hazardLevel: levelLabel(scoreToLevel(hazard.overallScore * 0.9)),
      authorityNote: "Traffic management in progress",
      trend: "stable",
      color: "var(--color-warning)",
    },
    {
      key: "greenCover",
      name: "Green Cover",
      score: zones.greenCover,
      aqi: Math.round(city.aqi * 0.65 + r(13) * 10),
      complaintCount: zoneComplaintMap.greenCover,
      sensorCount: zoneHotspotMap.greenCover,
      hazardLevel: levelLabel(scoreToLevel(hazard.overallScore * 0.5)),
      authorityNote: "Ecosystem health maintained",
      trend: "improving",
      color: "oklch(0.72 0.19 145)",
    },
  ];

  // ── Sensor operations ────────────────────────────────────────────────────────
  const sensorOps: SensorOps[] = hotspots.slice(0, 12).map((h, i) => {
    const online = h.sensor ?? r(i + 20) > 0.15;
    const nearbyC = complaints.filter((c) => {
      if (!c.lat || !c.lng) return false;
      const dlat = c.lat - h.latitude;
      const dlng = c.lng - h.longitude;
      return Math.sqrt(dlat * dlat + dlng * dlng) < 0.03;
    }).length;
    const minsAgo = Math.floor(r(i + 30) * 45);
    return {
      id: h.id,
      name: h.name,
      lat: h.latitude,
      lng: h.longitude,
      online,
      lastReading: online ? (minsAgo === 0 ? "Just now" : `${minsAgo} min ago`) : "Offline",
      aqi: h.level ?? Math.round(city.aqi + (r(i + 40) - 0.5) * 40),
      category: h.category?.toString() ?? "environmental",
      coverageRadius: Math.round(300 + r(i + 50) * 700),
      nearbyComplaints: nearbyC,
      health: online ? Math.round(60 + r(i + 60) * 40) : Math.round(r(i + 70) * 30),
    };
  });

  // ── Authority operations (derived from hazard plan) ──────────────────────────
  const urgencyMap: Record<string, AuthorityUrgency> = {
    critical: "Immediate",
    severe: "Immediate",
    high: "High",
    moderate: "Moderate",
    low: "Routine",
  };
  const authorityOps: AuthorityOps[] = zoneIntelligence.map((z) => ({
    zone: z.name,
    urgency: urgencyMap[z.hazardLevel.toLowerCase()] ?? "Routine",
    primaryAction:
      z.key === "industrial"
        ? "Inspect and reduce industrial emission sources"
        : z.key === "residential"
          ? "Deploy mobile monitoring units to densely populated blocks"
          : z.key === "commercial"
            ? "Enforce traffic flow optimisation during peak hours"
            : "Maintain green infrastructure and planting schedules",
    aqiImpact: `−${Math.round(r(zoneIntelligence.indexOf(z) + 80) * 18 + 5)} estimated`,
    timeframe:
      z.hazardLevel === "Critical" || z.hazardLevel === "Severe"
        ? "24 hours"
        : z.hazardLevel === "High"
          ? "72 hours"
          : "7 days",
    pendingComplaints: z.complaintCount,
    activeAlerts: city.alerts > 0 ? Math.ceil(city.alerts / 4) : 0,
  }));

  // ── Operational timeline ─────────────────────────────────────────────────────
  const opsTimeline: OpsEvent[] = [];

  // AQI event
  opsTimeline.push({
    id: "aq-live",
    category: "aqi",
    title: `Live AQI: ${city.aqi} — ${aqBand.label}`,
    detail: `PM₂.₅ ${city.pm25} µg/m³ · Dominant: ${aq.dominant.toUpperCase()}`,
    time: "Now",
    severity: city.aqi > 150 ? "critical" : city.aqi > 100 ? "warning" : "info",
    color: aqBand.color,
  });

  // Weather event
  opsTimeline.push({
    id: "wx-live",
    category: "weather",
    title: `Weather: ${wx.conditionLabel} ${city.temp}°C`,
    detail: `Humidity ${city.humidity}% · Wind ${wx.windSpeed} km/h · ${wx.riskLabel}`,
    time: "Now",
    severity: wx.riskLevel === "high" || wx.riskLevel === "severe" ? "warning" : "info",
    color: wx.theme.accent,
  });

  // Hazard events
  hazard.alerts.slice(0, 3).forEach((ha, i) => {
    opsTimeline.push({
      id: `h-${i}`,
      category: "hazard",
      title: ha.title,
      detail: ha.description,
      time: ha.issuedAt,
      severity: ha.severity === "emergency" || ha.severity === "warning" ? "critical" : "warning",
      color: ha.color,
    });
  });

  // Complaint events
  complaints.slice(0, 4).forEach((c, i) => {
    opsTimeline.push({
      id: `c-${i}`,
      category: "complaint",
      title: c.title,
      detail: `${c.address ?? "Unknown location"} · ${c.status}`,
      time: (() => {
        const d = new Date(c.createdAt);
        const diff = Date.now() - d.getTime();
        const h = Math.floor(diff / 3_600_000);
        return h === 0 ? "< 1 h ago" : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
      })(),
      severity: c.severity === "critical" ? "critical" : c.severity === "high" ? "warning" : "info",
      color:
        c.severity === "critical"
          ? "var(--color-destructive)"
          : c.severity === "high"
            ? "var(--color-warning)"
            : "var(--color-info)",
      lat: c.lat,
      lng: c.lng,
    });
  });

  // Sensor outage events
  const offlineSensors = sensorOps.filter((s) => !s.online);
  if (offlineSensors.length > 0) {
    opsTimeline.push({
      id: "sensor-outage",
      category: "sensor",
      title: `${offlineSensors.length} Sensor${offlineSensors.length > 1 ? "s" : ""} Offline`,
      detail: offlineSensors
        .slice(0, 3)
        .map((s) => s.name)
        .join(", "),
      time: `${Math.round(r(90) * 3 + 1)} h ago`,
      severity: offlineSensors.length > 3 ? "critical" : "warning",
      color: "var(--color-warning)",
    });
  }

  // AI insight event
  opsTimeline.push({
    id: "ai-brief",
    category: "ai",
    title: "AI Executive Brief Updated",
    detail:
      city.aqi > 150
        ? `Critical AQI conditions in ${city.name} — immediate health advisory recommended`
        : `Multi-module analysis complete — ${hazard.alerts.length} active hazard alerts`,
    time: "Just now",
    severity: "info",
    color: "var(--color-primary)",
  });

  // Sort: Now first, then chronological
  opsTimeline.sort((a, b) =>
    a.time === "Now" || a.time === "Just now"
      ? -1
      : b.time === "Now" || b.time === "Just now"
        ? 1
        : 0,
  );

  // ── Correlated selected location ─────────────────────────────────────────────
  let correlatedSelected: CorrelatedLocation | null = null;
  if (selectedId) {
    const sensor = sensorOps.find((s) => s.id === selectedId);
    if (sensor) {
      const nearbyEvents = opsTimeline
        .filter(
          (e) =>
            (e.lat != null &&
              e.lng != null &&
              Math.abs(e.lat - sensor.lat) < 0.05 &&
              Math.abs(e.lng - sensor.lng) < 0.05) ||
            e.category === "aqi" ||
            e.category === "weather",
        )
        .slice(0, 4);

      const localAqi = sensor.aqi;
      const localBand = findAqiBand(localAqi);
      const hLevel = scoreToLevel(hazard.overallScore);
      const hColor = levelColor(hLevel);
      const zoneForSensor =
        zoneIntelligence.find((z) => z.key === (sensor.category ?? "residential")) ??
        zoneIntelligence[0];

      correlatedSelected = {
        sensor,
        nearbyEvents,
        aqiBand: localBand.label,
        aqiBandColor: localBand.color,
        hazardLevel: levelLabel(hLevel),
        hazardColor: hColor,
        authorityNote: zoneForSensor.authorityNote,
        aiSummary:
          localAqi > 150
            ? `Sensor ${sensor.name} is in a critically polluted zone. Immediate emission source investigation recommended.`
            : localAqi > 100
              ? `Elevated readings at ${sensor.name} — consistent with ${aq.dominant.toUpperCase()} build-up pattern in ${city.name}.`
              : `${sensor.name} is reporting normal environmental conditions within the ${zoneForSensor.name} zone.`,
      };
    }
  }

  // ── Overall health composite ─────────────────────────────────────────────────
  const overallHealth = Math.round((envHealth + opReadiness + sensorPct) / 3);
  const overallHealthColor = kvColor(overallHealth);
  const overallHealthLabel =
    overallHealth >= 75 ? "Nominal" : overallHealth >= 50 ? "Elevated Risk" : "Critical";

  return {
    execKpis,
    zoneIntelligence,
    sensorOps,
    authorityOps,
    opsTimeline,
    correlatedSelected,
    overallHealth,
    overallHealthColor,
    overallHealthLabel,
  };
}
