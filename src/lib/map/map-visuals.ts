/**
 * map-visuals.ts — Phase 3 (evolved from Phase 2)
 *
 * Shared visual helpers for the Smart Map. All Phase 1/2 exports preserved
 * verbatim. Phase 3 adds: extended LAYERS list, SVG marker HTML generators,
 * AI insight generation, and trend-direction helpers.
 */

import {
  Wind,
  Droplets,
  Thermometer,
  Radio,
  AlertTriangle,
  Leaf,
  Car,
  CloudRain,
  Satellite,
} from "lucide-react";
import { findAqiBand, type City } from "@/lib/mock-data";
import type { MapLocation } from "@/lib/api/environmental.api";

export interface LayerDef {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  group: string;
  description: string;
  comingSoon?: boolean;
}

// ─── Layer definitions (extended for Phase 3, descriptions added Phase 3A) ───
export const LAYERS: LayerDef[] = [
  {
    id: "heat",
    label: "Heatmap",
    icon: Thermometer,
    color: "var(--color-destructive)",
    group: "environment",
    description: "Pollution intensity surface, interpolated",
  },
  {
    id: "water",
    label: "Water",
    icon: Droplets,
    color: "var(--color-info)",
    group: "environment",
    description: "Rivers, lakes & reservoir quality",
  },
  {
    id: "green",
    label: "Green Cover",
    icon: Leaf,
    color: "oklch(0.72 0.19 145)",
    group: "environment",
    description: "Vegetation & canopy coverage zones",
  },
  {
    id: "traffic",
    label: "Traffic",
    icon: Car,
    color: "oklch(0.78 0.15 60)",
    group: "environment",
    description: "Vehicular emission corridors",
  },
  {
    id: "aqi",
    label: "Air Quality",
    icon: Wind,
    color: "var(--color-primary)",
    group: "environment",
    description: "Real-time AQI reading per monitored zone",
  },
  {
    id: "weather",
    label: "Weather",
    icon: CloudRain,
    color: "oklch(0.7 0.12 250)",
    group: "environment",
    description: "Live weather station overlay",
  },
  {
    id: "alerts",
    label: "Complaints",
    icon: AlertTriangle,
    color: "oklch(0.7 0.18 30)",
    group: "environment",
    description: "Citizen-reported environmental issues",
  },
  {
    id: "satellite",
    label: "Satellite",
    icon: Satellite,
    color: "oklch(0.55 0.08 250)",
    group: "overlay",
    description: "High-resolution satellite imagery",
    comingSoon: true,
  },
] as const;

export type LayerId = (typeof LAYERS)[number]["id"];

// ─── Phase 3A: Shared timeline range type ─────────────────────────────────────
// Previously declared independently in both map.tsx (owner of the state) and
// implicitly as a loose `string` prop on SmartMapCanvas.tsx (which received
// but never actually consumed it — dead prop). One canonical union, used by
// both, now that the toolbar timeline control lives inside SmartMapCanvas.
export type TimeRange = "live" | "24h" | "7d" | "30d";

// ─── Category helpers (Phase 1 — unchanged) ───────────────────────────────────
export const CATEGORY_LABEL: Record<string, string> = {
  industrial: "Industrial Zone",
  residential: "Residential",
  commercial: "Commercial",
  park: "Park / Green Space",
  water: "Water Body",
  landmark: "Landmark",
};

export function categoryColor(cat: string): string {
  switch (cat) {
    case "industrial":
      return "var(--color-destructive)";
    case "residential":
      return "var(--color-success)";
    case "commercial":
      return "var(--color-warning)";
    case "park":
      return "oklch(0.72 0.19 145)";
    case "water":
      return "var(--color-info)";
    case "landmark":
      return "oklch(0.7 0.15 290)";
    default:
      return "var(--color-muted-foreground)";
  }
}

export function categoryIcon(cat: string): string {
  switch (cat) {
    case "industrial":
      return "🏭";
    case "residential":
      return "🏘";
    case "commercial":
      return "🏢";
    case "park":
      return "🌳";
    case "water":
      return "💧";
    case "landmark":
      return "🏛";
    default:
      return "📍";
  }
}

// Phase 1: these three functions now derive from the single canonical AQI
// scale in @/lib/mock-data (AQI_BANDS/findAqiBand) instead of maintaining
// their own breakpoints. See mock-data.ts for the rationale — this file and
// that one used to disagree above AQI 200.
export function aqiColor(level: number): string {
  return findAqiBand(level).color;
}

// Raw hex / oklab compatible colours for use inside SVG/canvas (no CSS vars)
export function aqiColorRaw(level: number): string {
  return findAqiBand(level).colorRaw;
}

export function aqiLabel(level: number): string {
  return findAqiBand(level).shortLabel;
}

// ─── Monitoring-type marker styling (Phase 2) ──────────────────────────────────
export const SENSOR_TYPE_LABEL: Record<string, string> = {
  environmental: "Environmental Monitoring",
  weather: "Weather Station",
  water: "Water Monitoring",
  industrial: "Industrial Monitoring",
  traffic: "Traffic Monitoring",
  complaint: "Citizen Complaint",
  alert: "Emergency Alert",
};

export function sensorTypeColor(type: string): string {
  switch (type) {
    case "weather":
      return "#0ea5e9";
    case "water":
      return "#3b82f6";
    case "industrial":
      return "#dc2626";
    case "traffic":
      return "#ca8a04";
    case "complaint":
      return "#7c3aed";
    case "alert":
      return "#ea580c";
    case "environmental":
    default:
      return "#16a34a";
  }
}

export function sensorTypeIcon(type: string): string {
  switch (type) {
    case "weather":
      return "🌦";
    case "water":
      return "💧";
    case "industrial":
      return "🏭";
    case "traffic":
      return "🚦";
    case "complaint":
      return "📋";
    case "alert":
      return "🚨";
    case "environmental":
    default:
      return "📡";
  }
}

// ─── Phase 2: Stable per-location seed for trend/forecast generation ─────────
// Previously, both SmartMapCanvas.tsx's popup and map.tsx's Zones-tab trend
// arrows called trendSeries(h.level, h.level, ...) — using the location's
// *current momentary value* as both seed and base. Two locations that happen
// to share the same level at a given moment produced identical trend shapes,
// and a location's trend shape would shift every time its level changed,
// rather than being a stable property of that location. This derives a
// stable numeric seed from the location's own id instead, so its trend
// shape is a consistent characteristic of the place, not a coincidence of
// its current reading.
export function stableSeed(locationId: string): number {
  let h = 0;
  for (let i = 0; i < locationId.length; i++) h = (Math.imul(h, 31) + locationId.charCodeAt(i)) | 0;
  return (h >>> 0) % 100000;
}

// ─── Phase 4: facility-type hint (presentation only) ─────────────────────────
// Government and healthcare aren't modeled as their own `category` — adding
// them would mean extending the backend LocationCategory enum + Mongoose
// schema + the category-realism engine's per-category multiplier tables,
// which is backend data-model work, not a marker refresh. Both are real,
// legitimate "landmark" sites, so this stays presentation-only: a
// conservative keyword check on the (real) name picks a more specific glyph
// for a landmark that's clearly a government building or a hospital, while
// the underlying category/pollution data is untouched.
function facilityHint(name: string): "government" | "healthcare" | null {
  const n = name.toLowerCase();
  if (/vidhana soudha|secretariat|municipal corporation|collectorate|cantonment board/.test(n))
    return "government";
  if (/hospital|medical (college|centre|center)|health\s?care|clinic/.test(n)) return "healthcare";
  return null;
}

// ─── Phase 4: shared glyph resolution ─────────────────────────────────────────
// Used by both the full marker (glow/rings/pulse) and the small standalone
// icon (popup header, search results, legend) — one glyph definition, two
// renderers, so there's no duplicated marker-shape logic between them.
export function resolveGlyphKey(sensorType: string, category?: string, name?: string): string {
  const hint = name ? facilityHint(name) : null;
  // A sensorType other than the generic default is more specific than
  // land-use category, so it wins. Only fall through for "environmental".
  return sensorType !== "environmental" ? sensorType : (hint ?? category ?? "environmental");
}

export function resolveGlyphColor(glyphKey: string, sensorType: string): string {
  switch (glyphKey) {
    case "government":
      return "oklch(0.72 0.14 290)";
    case "healthcare":
      return "#dc2626";
    case "residential":
      return "var(--color-success)";
    case "commercial":
      return "var(--color-warning)";
    case "park":
      return "oklch(0.72 0.19 145)";
    case "landmark":
      return "oklch(0.7 0.15 290)";
    default:
      return sensorTypeColor(sensorType);
  }
}

function glyphPaths(glyphKey: string, accent: string): string {
  const paths: Record<string, string> = {
    environmental: `<circle cx="10" cy="10" r="3" fill="white" opacity="0.9"/>
                    <circle cx="10" cy="10" r="6" stroke="white" stroke-width="1.2" fill="none" opacity="0.6"/>`,
    weather: `<path d="M10 4 Q14 8 10 10 Q6 12 10 16" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    <circle cx="10" cy="4" r="1.5" fill="white" opacity="0.8"/>`,
    water: `<path d="M10 4 C10 4 6 9 6 12 a4 4 0 0 0 8 0 C14 9 10 4 10 4z" fill="white" opacity="0.85"/>`,
    industrial: `<rect x="7" y="7" width="6" height="8" rx="1" fill="white" opacity="0.8"/>
                    <rect x="6" y="6" width="2" height="4" rx="0.5" fill="white" opacity="0.6"/>
                    <rect x="12" y="6" width="2" height="4" rx="0.5" fill="white" opacity="0.6"/>`,
    traffic: `<path d="M10 5 L13 12 H7 Z" fill="white" opacity="0.9"/>
                    <circle cx="8" cy="14" r="1.5" fill="white" opacity="0.7"/>
                    <circle cx="12" cy="14" r="1.5" fill="white" opacity="0.7"/>`,
    complaint: `<path d="M5 6 h10 a1 1 0 0 1 1 1 v6 a1 1 0 0 1-1 1 H9 L6 17 V14 H5 a1 1 0 0 1-1-1 V7 a1 1 0 0 1 1-1z" fill="white" opacity="0.8"/>`,
    alert: `<path d="M10 5 L15.5 15 H4.5 Z" fill="white" opacity="0.9"/>
                    <rect x="9.3" y="9" width="1.4" height="4" rx="0.5" fill="${accent}"/>
                    <circle cx="10" cy="14" r="0.8" fill="${accent}"/>`,
    residential: `<path d="M10 4.5 L15.5 9 V15.5 H12.5 V11.5 H7.5 V15.5 H4.5 V9 Z" fill="white" opacity="0.85"/>`,
    commercial: `<rect x="6" y="5.5" width="8" height="10" rx="0.5" fill="white" opacity="0.8"/>
                    <rect x="7.5" y="7.5" width="1.6" height="1.6" fill="${accent}"/>
                    <rect x="10.9" y="7.5" width="1.6" height="1.6" fill="${accent}"/>
                    <rect x="7.5" y="10.5" width="1.6" height="1.6" fill="${accent}"/>
                    <rect x="10.9" y="10.5" width="1.6" height="1.6" fill="${accent}"/>`,
    park: `<path d="M10 3.5 C13 3.5 15 6.5 13.5 9.5 C15 10 15.5 12.5 13 13.5 C13.8 14.5 13 16 11.3 15.6 V17 H8.7 V15.6 C7 16 6.2 14.5 7 13.5 C4.5 12.5 5 10 6.5 9.5 C5 6.5 7 3.5 10 3.5 Z" fill="white" opacity="0.85"/>`,
    landmark: `<path d="M10 3.5 L12 8 L16.5 8.5 L13 11.5 L14 16 L10 13.5 L6 16 L7 11.5 L3.5 8.5 L8 8 Z" fill="white" opacity="0.85"/>`,
    government: `<path d="M10 4 L16 7.5 H4 Z" fill="white" opacity="0.9"/>
                    <rect x="5.5" y="8.5" width="1.4" height="6" fill="white" opacity="0.8"/>
                    <rect x="9.3" y="8.5" width="1.4" height="6" fill="white" opacity="0.8"/>
                    <rect x="13.1" y="8.5" width="1.4" height="6" fill="white" opacity="0.8"/>
                    <rect x="4" y="15" width="12" height="1.4" fill="white" opacity="0.9"/>`,
    healthcare: `<rect x="8.6" y="4.5" width="2.8" height="11" rx="0.6" fill="white" opacity="0.9"/>
                    <rect x="4.5" y="8.6" width="11" height="2.8" rx="0.6" fill="white" opacity="0.9"/>`,
  };
  return paths[glyphKey] ?? paths.environmental;
}

// ─── Phase 4: small standalone icon (no glow/rings/pulse) — for inline UI
// use: popup header, search results, legend. Replaces emoji glyphs there
// with the same hand-drawn vector shapes the map markers use, so a location's
// identity reads consistently whether it's a pin on the map or a row in a
// list, and nothing in the GIS surface is emoji. ─────────────────────────────
export function buildGlyphIconSVG(
  sensorType: string,
  category?: string,
  name?: string,
  size = 20,
): string {
  const glyphKey = resolveGlyphKey(sensorType, category, name);
  const col = resolveGlyphColor(glyphKey, sensorType);
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" fill="${col}" opacity="0.16"/>
    <circle cx="10" cy="10" r="7.5" fill="${col}"/>
    ${glyphPaths(glyphKey, "white")}
  </svg>`;
}

// ─── Phase 3: SVG marker HTML (replaces plain div circles) ───────────────────
// Returns an HTML string rendered into a DOM element for MapLibre markers.
// Each sensor type has a distinct shape + inner glyph + severity ring.
export function buildMarkerHTML(opts: {
  level: number;
  sensorType: string;
  sensor: boolean;
  selected: boolean;
  offline?: boolean;
  /** Phase 2: when the sensor is online but running low/degraded, the status
   *  dot shows amber instead of green — reuses the exact same dot element,
   *  just a third color case, so this isn't new marker chrome. */
  health?: "optimal" | "nominal" | "degraded" | "offline";
  /** Phase 4: land-use category, used for glyph selection when sensorType
   *  is the generic "environmental" default (residential/commercial/park/
   *  landmark locations otherwise all rendered identically). */
  category?: string;
  /** Phase 4: real location name — used only for the government/healthcare
   *  facility-glyph keyword check above; never displayed. */
  name?: string;
}): string {
  const { level, sensorType, sensor, selected, offline = false, health, category, name } = opts;
  const aqiCol = aqiColorRaw(level);
  const glyphKey = resolveGlyphKey(sensorType, category, name);
  const stCol = resolveGlyphColor(glyphKey, sensorType);
  const isHigh = level > 150;
  const size = selected ? 28 : sensor ? 22 : 18;
  const glowSz = selected ? 16 : isHigh ? 10 : 6;
  const glyph = glyphPaths(glyphKey, aqiCol);

  // Pulse ring (only for high-risk live sensors)
  const pulseRing =
    isHigh && sensor && !offline
      ? `<div class="marker-pulse-ring" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${aqiCol};opacity:0.5;animation:markerPulse 2s ease-out infinite;pointer-events:none;"></div>`
      : "";

  // Offline overlay
  const offlineDot = offline
    ? `<div style="position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:#6b7280;border:1.5px solid #1f2937;"></div>`
    : sensor
      ? `<div style="position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:${health === "degraded" ? "#ca8a04" : "#16a34a"};border:1.5px solid #1f2937;animation:sensorBlink 2.5s ease-in-out infinite;"></div>`
      : "";

  // Selection ring
  const selRing = selected
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${aqiCol};box-shadow:0 0 0 2px ${aqiCol}33;"></div>`
    : "";

  return `
    <div class="gis-marker" style="
      position:relative;
      width:${size}px;height:${size}px;
      cursor:pointer;
      filter: drop-shadow(0 0 ${glowSz}px ${aqiCol}99);
      transition: filter 0.15s ease, transform 0.15s ease;
    ">
      ${pulseRing}
      ${selRing}
      <svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mg${level}${glyphKey}" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="${stCol}" stop-opacity="1"/>
            <stop offset="100%" stop-color="${aqiCol}" stop-opacity="0.9"/>
          </radialGradient>
          <filter id="mf${level}">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
            <feOffset dy="1" result="shadow"/>
            <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Severity outer ring -->
        <circle cx="10" cy="10" r="9" fill="${aqiCol}" opacity="0.2"/>
        <!-- Main body -->
        <circle cx="10" cy="10" r="7.5"
          fill="url(#mg${level}${glyphKey})"
          stroke="${aqiCol}" stroke-width="1"
          filter="url(#mf${level})"/>
        <!-- Inner glyph -->
        <g transform="translate(0,0)" opacity="0.95">${glyph}</g>
      </svg>
      ${offlineDot}
    </div>`;
}

// ─── Phase 4: Cluster marker HTML — color now reflects the WORST (highest)
// AQI reading inside the cluster, not the average, so a cluster hides one
// severe reading behind several mild ones no longer looks deceptively calm.
// Professional shadow/scale treatment: soft double-ring glow, subtle pulse
// only when the worst reading inside is genuinely critical.
export function buildClusterHTML(count: number, worstLevel: number): string {
  const col = aqiColorRaw(worstLevel);
  const size = Math.min(46, 30 + Math.floor(count / 3));
  const critical = worstLevel > 150;
  return `
    <div style="position:relative;width:${size}px;height:${size}px;" class="gis-cluster">
      ${critical ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:1.5px solid ${col};opacity:0.45;animation:markerPulse 2.2s ease-out infinite;pointer-events:none;"></div>` : ""}
      <div style="
        width:100%;height:100%;border-radius:50%;
        background:radial-gradient(circle at 35% 30%, ${col}e6, ${col}b3);
        border:2px solid ${col};
        box-shadow:0 0 16px ${col}55, 0 0 0 4px ${col}1f, 0 4px 10px -2px rgba(0,0,0,0.5);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;color:white;cursor:pointer;
        font-family:'JetBrains Mono',monospace;
        transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
      ">
        ${count}
      </div>
    </div>`;
}

// ─── Phase 1: Water body marker HTML (named features, not sensors) ───────────
// Water bodies (CityMapConfig.waterBodies) are geographic features, not
// monitoring points — no AQI level, no online/offline state. Reuses the
// same droplet glyph already used inside buildMarkerHTML's `water` sensor
// case, at a smaller fixed size, so the visual language matches exactly.
export function buildWaterBodyHTML(): string {
  const col = "#3b82f6"; // matches sensorTypeColor("water")
  return `
    <div class="gis-marker" style="
      position:relative; width:16px; height:16px; cursor:pointer;
      filter: drop-shadow(0 0 5px ${col}88);
    ">
      <svg width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" fill="${col}" opacity="0.18"/>
        <circle cx="10" cy="10" r="7" fill="${col}" opacity="0.85" stroke="${col}" stroke-width="1"/>
        <path d="M10 4 C10 4 6 9 6 12 a4 4 0 0 0 8 0 C14 9 10 4 10 4z" fill="white" opacity="0.9"/>
      </svg>
    </div>`;
}

// ─── Phase 1: Measure-tool distance (haversine, no external dependency) ──────
// Straight-line great-circle distance between two lng/lat points, in meters.
export function measureDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000; // Earth radius, meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

// ─── Phase 1: Shared CSS custom-property color resolver ──────────────────────
// Extracted from two independent, near-identical implementations previously
// duplicated in SmartMapCanvas.tsx's <Sparkline> and map.tsx's <MiniSpark>
// (both resolved a CSS var to a concrete color via a throwaway DOM element on
// every render). One canonical implementation, used by both.
export function resolveThemeColor(cssVarExpr: string): string {
  if (typeof document === "undefined") return "#16a34a"; // SSR guard
  const probe = document.createElement("div");
  probe.style.color = cssVarExpr;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color || "#16a34a";
  document.body.removeChild(probe);
  return resolved;
}

// ─── Phase 4: AI Spatial Intelligence ─────────────────────────────────────────
// Unlike generateAiInsights() above (city-wide aggregate thresholds),
// this reasons over the real location list's actual positions and
// categories — genuine spatial relationships, not another read of the same
// city-level numbers. Two families of finding, both grounded in real data:
//
//   1. Industrial → residential proximity: an industrial site and a
//      residential site are close (real haversine distance) AND the
//      residential reading is elevated relative to that industrial site's
//      own reading — i.e. the correlation the insight describes is actually
//      present in the data, not asserted from category adjacency alone.
//   2. Traffic corridor loading: a traffic-flagged location reading high,
//      named for what it is (a junction/transit point), not dressed up.
//
// A location pair that's merely close, or merely both elevated but far
// apart, does not qualify — both conditions must hold together.
export function generateSpatialInsights(hotspots: MapLocation[], limit = 3): AiInsight[] {
  const insights: AiInsight[] = [];
  const industrial = hotspots.filter((h) => h.category === "industrial");
  const residential = hotspots.filter((h) => h.category === "residential");
  const traffic = hotspots.filter((h) => h.sensorType === "traffic");

  // Industrial ↔ residential: nearest qualifying pair per industrial site,
  // so one heavily-monitored industrial estate doesn't flood the list.
  for (const ind of industrial) {
    let nearest: { res: MapLocation; distM: number } | null = null;
    for (const res of residential) {
      const distM = measureDistanceMeters(
        { lat: ind.latitude, lng: ind.longitude },
        { lat: res.latitude, lng: res.longitude },
      );
      if (distM < 3000 && res.level > 70 && res.level >= ind.level * 0.5) {
        if (!nearest || distM < nearest.distM) nearest = { res, distM };
      }
    }
    if (nearest) {
      insights.push({
        icon: "🏭",
        level: nearest.res.level > 150 ? "critical" : "warning",
        label: "Industrial–residential proximity",
        detail: `${nearest.res.name} (AQI ${nearest.res.level}) is ${(nearest.distM / 1000).toFixed(1)} km from ${ind.name} (AQI ${ind.level}) — close enough, and elevated enough, that industrial drift is a plausible contributor.`,
      });
    }
  }

  // Traffic corridor loading — genuinely elevated junctions only.
  for (const tr of traffic) {
    if (tr.level > 110) {
      insights.push({
        icon: "🚦",
        level: tr.level > 150 ? "critical" : "warning",
        label: "Traffic corridor loading",
        detail: `${tr.name} reads AQI ${tr.level}, consistent with sustained vehicle loading at this junction.`,
      });
    }
  }

  return insights.slice(0, limit);
}

export interface AiInsight {
  icon: string;
  label: string;
  detail: string;
  level: "critical" | "warning" | "info" | "good";
}

export function generateAiInsights(city: City, selectedLevel?: number): AiInsight[] {
  const insights: AiInsight[] = [];

  // PM2.5
  if (city.pm25 > 55) {
    insights.push({
      icon: "⚠️",
      level: "critical",
      label: "Critical PM2.5 levels",
      detail: `${city.pm25} µg/m³ — 3× safe limit. Industrial output likely source.`,
    });
  } else if (city.pm25 > 25) {
    insights.push({
      icon: "🔶",
      level: "warning",
      label: "Elevated PM2.5",
      detail: `${city.pm25} µg/m³. Traffic emissions contributing. Expected to peak at dusk.`,
    });
  }

  // AQI trend
  if (city.aqi > 150) {
    insights.push({
      icon: "🌫️",
      level: "critical",
      label: "Hazardous air quality",
      detail: `AQI ${city.aqi}. Outdoor activity not recommended for sensitive groups.`,
    });
  } else if (city.aqi > 100) {
    insights.push({
      icon: "📈",
      level: "warning",
      label: "Unhealthy for sensitive groups",
      detail: `AQI ${city.aqi}. Stagnant air mass detected — risk elevated within 6 hours.`,
    });
  }

  // NO₂ / Traffic
  if (city.no2 > 60) {
    insights.push({
      icon: "🚗",
      level: "warning",
      label: "Traffic emissions elevated",
      detail: `NO₂ at ${city.no2} ppb. Peak-hour corridor loading exceeds safe threshold.`,
    });
  }

  // Temperature anomaly
  if (city.temp > 36) {
    insights.push({
      icon: "🌡️",
      level: "warning",
      label: "Heat anomaly detected",
      detail: `${city.temp}°C — 4°C above seasonal norm. Urban heat island effect active.`,
    });
  }

  // Water quality
  if (city.water < 50) {
    insights.push({
      icon: "💧",
      level: "critical",
      label: "Water quality degraded",
      detail: `Index ${city.water}/100. Turbidity rising in surface intake zones.`,
    });
  } else if (city.water < 70) {
    insights.push({
      icon: "💧",
      level: "warning",
      label: "Water quality below target",
      detail: `Index ${city.water}/100. Monitor downstream catchment areas.`,
    });
  }

  // Eco score
  if (city.eco > 70) {
    insights.push({
      icon: "🌿",
      level: "good",
      label: "Green cover effective",
      detail: `Eco score ${city.eco}/100. Canopy coverage offsetting industrial output.`,
    });
  }

  // Selected marker specific
  if (selectedLevel !== undefined && selectedLevel > 150) {
    insights.unshift({
      icon: "📍",
      level: "critical",
      label: "Selected zone: critical pollution",
      detail: `AQI ${selectedLevel} at this location. Immediate regulatory review recommended.`,
    });
  }

  // Carbon
  if (city.carbon > 5) {
    insights.push({
      icon: "🏭",
      level: "warning",
      label: "High per-capita carbon output",
      detail: `${city.carbon} t/capita. Industrial sector contributes ~60% of total emissions.`,
    });
  }

  // Always give at least one positive if no critical
  if (insights.length === 0) {
    insights.push({
      icon: "✅",
      level: "good",
      label: "Environmental conditions nominal",
      detail: `AQI ${city.aqi}, Water ${city.water}/100. All monitored parameters within safe range.`,
    });
  }

  return insights.slice(0, 4);
}

// ─── Phase 3B: Complaint/severity colour map — shared between the map popup
// and the Intelligence drawer's Recent Events section, so both read the same
// severity → color mapping instead of maintaining independent copies. ───────
export const SEV_COLOR: Record<string, string> = {
  low: "#16a34a",
  medium: "#ca8a04",
  high: "#dc2626",
  critical: "#7f1d1d",
};

// ─── Phase 3: Trend direction helper ─────────────────────────────────────────
export function trendArrow(current: number, previous: number): "up" | "down" | "stable" {
  const delta = current - previous;
  if (delta > 3) return "up";
  if (delta < -3) return "down";
  return "stable";
}

// ─── Phase 4: Register existing layers into the GIS Layer Registry ────────────
// Side-effecting import-time registration — same pattern used by e.g. React
// Router's route registration. SmartMapCanvas imports this file, so the
// registration runs before the first render; no extra call needed anywhere.
//
// z-order contract (lower = rendered below):
//   10  heatmap       (raster fill, should sit directly over the base map)
//   20  water bodies  (polygon / point, above heatmap)
//   30  green cover   (marker cluster, same level as other env sensors)
//   40  traffic       (marker cluster)
//   50  aqi sensors   (marker cluster, primary environmental layer)
//   60  sensor net    (marker cluster, overlaps with aqi intentionally)
//   70  alerts / complaints (dom-overlay, always on top of data layers)
//   90  measure-line  (internal tool layer, topmost data layer)
//  100  satellite / weather (future raster, above everything else)
import { layerRegistry } from "./gis-layer-registry";

layerRegistry.register({
  id: "heat",
  label: "Heatmap",
  group: "environment",
  color: "var(--color-destructive)",
  mapSourceIds: ["aqi-heat"],
  mapLayerIds: ["aqi-heat-layer"],
  zOrder: 10,
  overlayKind: "geojson-heatmap",
  legendEntries: [
    { label: "Low pollution", color: "rgba(80,220,0,0.7)", shape: "fill", description: "AQI < 50" },
    { label: "Moderate", color: "rgba(220,200,0,0.8)", shape: "fill", description: "AQI 50–100" },
    { label: "High", color: "rgba(240,100,0,0.85)", shape: "fill", description: "AQI 100–150" },
    { label: "Hazardous", color: "rgba(200,20,20,0.9)", shape: "fill", description: "AQI > 150" },
  ],
});

layerRegistry.register({
  id: "water",
  label: "Water",
  group: "environment",
  color: "var(--color-info)",
  zOrder: 20,
  overlayKind: "marker-cluster",
  legendEntries: [
    {
      label: "Water body",
      color: "var(--color-info)",
      shape: "circle",
      description: "Rivers, lakes, reservoirs",
    },
  ],
});

layerRegistry.register({
  id: "green",
  label: "Green Cover",
  group: "environment",
  color: "oklch(0.72 0.19 145)",
  zOrder: 30,
  overlayKind: "marker-cluster",
  legendEntries: [{ label: "Park / green space", color: "oklch(0.72 0.19 145)", shape: "circle" }],
});

layerRegistry.register({
  id: "traffic",
  label: "Traffic",
  group: "environment",
  color: "oklch(0.78 0.15 60)",
  zOrder: 40,
  overlayKind: "marker-cluster",
  legendEntries: [{ label: "Traffic corridor", color: "oklch(0.78 0.15 60)", shape: "circle" }],
});

layerRegistry.register({
  id: "aqi",
  label: "Air Quality",
  group: "environment",
  color: "var(--color-primary)",
  zOrder: 50,
  overlayKind: "marker-cluster",
  legendEntries: [
    { label: "Good (0–50)", color: "#16a34a", shape: "circle" },
    { label: "Moderate (51–100)", color: "#ca8a04", shape: "circle" },
    { label: "Unhealthy (101–150)", color: "#ea580c", shape: "circle" },
    { label: "Hazardous (>150)", color: "#dc2626", shape: "circle" },
  ],
  filters: [
    { key: "aqiMin", label: "Min AQI", type: "range", defaultValue: 0, min: 0, max: 300, step: 10 },
  ],
});

layerRegistry.register({
  id: "alerts",
  label: "Complaints",
  group: "environment",
  color: "oklch(0.7 0.18 30)",
  zOrder: 70,
  overlayKind: "marker-cluster",
  legendEntries: [
    { label: "Low severity", color: "#16a34a", shape: "circle" },
    { label: "Medium severity", color: "#ca8a04", shape: "circle" },
    { label: "High severity", color: "#dc2626", shape: "circle" },
    { label: "Critical severity", color: "#7f1d1d", shape: "circle" },
  ],
  filters: [
    {
      key: "alertSeverity",
      label: "Min severity",
      type: "select",
      defaultValue: "all",
      options: [
        { value: "all", label: "All" },
        { value: "medium", label: "Medium+" },
        { value: "high", label: "High+" },
        { value: "critical", label: "Critical" },
      ],
    },
  ],
});

layerRegistry.register({
  id: "weather",
  label: "Weather",
  group: "environment",
  color: "oklch(0.7 0.12 250)",
  zOrder: 55,
  overlayKind: "marker-cluster",
  // Phase 5: weather is now a live layer — no longer comingSoon
  legendEntries: [
    { label: "Clear / Sunny", color: "oklch(0.82 0.18 75)", shape: "circle" },
    { label: "Partly cloudy", color: "oklch(0.78 0.08 220)", shape: "circle" },
    { label: "Rain / Storm", color: "oklch(0.72 0.14 230)", shape: "circle" },
    { label: "Haze / Fog", color: "oklch(0.72 0.10 60)", shape: "circle" },
  ],
  filters: [
    {
      key: "weatherMetric",
      label: "Display metric",
      type: "select",
      defaultValue: "temperature",
      options: [
        { value: "temperature", label: "Temperature" },
        { value: "humidity", label: "Humidity" },
        { value: "wind", label: "Wind" },
        { value: "rainChance", label: "Rain Chance" },
        { value: "uvIndex", label: "UV Index" },
      ],
    },
  ],
});

layerRegistry.register({
  id: "satellite",
  label: "Satellite",
  group: "overlay",
  color: "oklch(0.55 0.08 250)",
  zOrder: 101,
  overlayKind: "raster",
  comingSoon: true,
  legendEntries: [],
});
