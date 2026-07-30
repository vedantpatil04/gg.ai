/**
 * SmartMapCanvas.tsx — Phase 3 (evolved from Phase 2)
 *
 * Upgrades from Phase 2:
 *  - Premium SVG marker system: per-sensorType shapes, glow, pulse rings,
 *    severity rings, online/offline dot, selection state, hover animations
 *  - Enhanced marker popups: sensor ID, coordinates, PM2.5/PM10/Temp/Humidity,
 *    water quality, status badge, last-updated, 24h sparkline, forecast summary
 *  - AI insight chips on selected marker popup
 *  - Advanced layer panel: grouped layers, animated toggles, coming-soon badges
 *  - Improved GIS toolbar: compass with live bearing, export screenshot,
 *    draw-radius placeholder, measurement toggle
 *  - Animated live system: marker pulses, heatmap fade, blink on data refresh,
 *    smooth camera easing
 *  - Timeline awareness: passes timeRange to canvas (future overlay hook)
 *  - Full Phase 1 + 2 functionality preserved
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GeoPosition, GeolocationStatus } from "@/hooks/use-geolocation";
export { OSM_DARK_STYLE as OSM_STYLE } from "@/lib/map/base-map-config";
import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Minus,
  Locate,
  RotateCcw,
  Maximize2,
  Minimize2,
  Ruler,
  MapPin,
  Search,
  X,
  AlertTriangle,
  Loader2,
  WifiOff,
  Eye,
  EyeOff,
  Layers,
  Activity,
  Camera,
  Circle,
  Clock,
  ChevronDown,
  History,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader, StatusChip, MetricTile } from "@/components/map/intelligence-ui";
import {
  environmentalApi,
  type MapLocation,
  type CityMapData,
  type MapComplaint,
  type WaterBody,
  type CityHistoryDay,
} from "@/lib/api/environmental.api";
import {
  LAYERS,
  type LayerId,
  type TimeRange,
  aqiColor,
  aqiLabel,
  sensorTypeColor,
  sensorTypeIcon,
  SENSOR_TYPE_LABEL,
  SEV_COLOR,
  buildMarkerHTML,
  buildClusterHTML,
  buildWaterBodyHTML,
  buildGlyphIconSVG,
  generateAiInsights,
  measureDistanceMeters,
  formatDistance,
  resolveThemeColor,
  stableSeed,
} from "@/lib/map/map-visuals";
// Phase 4: import base-map config (initialises baseMapRegistry as a side
// effect) so the active style is always read from the registry, not hardcoded
import "@/lib/map/base-map-config";
import {
  layerRegistry,
  baseMapRegistry,
  buildRenderPipeline,
  type GisLayerDescriptor,
} from "@/lib/map/gis-layer-registry";
import { trendSeries, forecastSeries, type City } from "@/lib/mock-data";

// Phase 3 (Stability & Performance): options needed to (re)build a single
// sensor/AQI marker's innerHTML, everything buildMarkerHTML takes except
// `selected` — that flag is supplied at render time by the selection effect.
type MarkerHtmlOpts = Omit<Parameters<typeof buildMarkerHTML>[0], "selected">;

// Phase 4 (Section 9): read the active base-map style from the registry.
// base-map-config.ts registers the OSM dark style at import time (above).
// Future phases add Streets / Satellite / Terrain to that file; this line
// is the only change needed in SmartMapCanvas to pick them up.
const OSM_STYLE =
  baseMapRegistry.active?.style ??
  ({
    version: 8 as const,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      { id: "background", type: "background" as const, paint: { "background-color": "#0c1118" } },
    ],
  } satisfies maplibregl.StyleSpecification);

// ─── Severity / complaint colours now shared via map-visuals.ts (SEV_COLOR) ──

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || data.length < 2) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const w = c.width;
    const h = c.height;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = max - min || 1;

    ctx.clearRect(0, 0, w, h);

    // Resolve CSS variables to actual colors (shared with map.tsx's MiniSpark)
    const resolvedColor =
      color.startsWith("var(") || color.startsWith("oklch(") ? resolveThemeColor(color) : color;

    const grad = ctx.createLinearGradient(0, 0, w, 0);

    grad.addColorStop(0, resolvedColor);
    grad.addColorStop(1, resolvedColor);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();

    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / rng) * (h - 3) - 1.5;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [data, color]);

  return <canvas ref={ref} width={200} height={36} className="w-full" />;
}

// ─── Forecast bar mini chart ──────────────────────────────────────────────────
function ForecastBars({ base, seed }: { base: number; seed: number }) {
  const fc = useMemo(() => forecastSeries(seed, base, 6), [seed, base]);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {fc.map((pt, i) => {
        const col = aqiColor(pt.predicted);
        const pct = Math.max(15, Math.min(100, (pt.predicted / 250) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-sm"
              style={{ height: `${pct}%`, background: col, opacity: 0.8 }}
              title={`+${pt.hour}h: AQI ${pt.predicted}`}
            />
            <span className="text-[7px] text-muted-foreground/50">+{pt.hour}h</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Nominatim result ─────────────────────────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

// ─── Phase 3A: Recent search entry (localStorage, scoped per city) ───────────
interface RecentSearch {
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
}
const recentSearchKey = (cityId: string) => `greenguard.map.recentSearches.${cityId}`;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  city: City;
  hotspots: MapLocation[];
  mapData: CityMapData | null;
  waterBodies: WaterBody[];
  activeLayers: LayerId[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
  onToggleLayer: (id: LayerId) => void;
  sensorsOnline: number;
  highRisk: number;
  band: { label: string; color: string };
  isApiConnected: boolean;
  mapLoaded: boolean;
  lastUpdated: string;
  search: string;
  onSearchChange: (v: string) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (v: TimeRange) => void;
  hasHistory?: boolean;
  historyData?: CityHistoryDay[];
  // ── Phase 10: geolocation ────────────────────────────────────────────────
  /** Current GPS position — null until granted */
  userPosition?: GeoPosition | null;
  /** Geolocation permission/status */
  geoStatus?: GeolocationStatus;
  /** True when live tracking (watchPosition) is active */
  isTracking?: boolean;
  /** Request a single position fix */
  onLocate?: () => void;
  /** Toggle between one-shot and continuous tracking */
  onToggleTracking?: () => void;
}

const TIME_RANGE_OPTS: { id: TimeRange; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export function SmartMapCanvas({
  city,
  hotspots,
  mapData,
  waterBodies,
  activeLayers,
  selectedId,
  onSelectLocation,
  onToggleLayer,
  sensorsOnline,
  highRisk,
  band,
  isApiConnected,
  mapLoaded,
  lastUpdated,
  search,
  onSearchChange,
  timeRange = "live",
  onTimeRangeChange,
  hasHistory = false,
  historyData = [],
  userPosition = null,
  geoStatus = "idle",
  isTracking = false,
  onLocate,
  onToggleTracking,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  // Phase 10 (Section 2): Animated user location marker
  // • A DOM-based maplibregl.Marker holds the blue dot + pulse ring
  // • A MapLibre GeoJSON source + fill layer renders the accuracy circle
  // • Both are managed together in the userPosition effect below
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const markerElsRef = useRef<Map<string, { el: HTMLElement; opts: MarkerHtmlOpts }>>(new Map());
  const prevSelectedIdRef = useRef<string | null>(null);
  const compMarkersRef = useRef<maplibregl.Marker[]>([]);
  const waterMarkersRef = useRef<maplibregl.Marker[]>([]);
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const heatReadyRef = useRef(false);

  const [zoom, setZoom] = useState(12);
  const [bearing, setBearing] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFullscreen, setFullscreen] = useState(false);
  const [heatOpacity, setHeatOpacity] = useState(0.55);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [mapReady, setMapReady] = useState(false);
  // Phase 2: bumped on zoomend/moveend to force the marker-clustering effect
  // to recompute against the map's current bounds/zoom — see that effect
  // for the bug this fixes.
  const [viewTick, setViewTick] = useState(0);
  const [layerGroupOpen, setLayerGroupOpen] = useState<Record<string, boolean>>({
    environment: true,
    network: true,
    overlay: false,
  });
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  // Phase 4: layer search — filters the Layer Manager list in real time
  const [layerSearch, setLayerSearch] = useState("");

  // Search state
  const [geoResults, setGeoResults] = useState<NominatimResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 3A: recent searches (Google-Maps-style), persisted per city so a
  // location's own recent list only ever suggests places within it.
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Popup state (local to canvas — richer than drawer selection)
  const [popupLoc, setPopupLoc] = useState<MapLocation | null>(null);
  const [popupComp, setPopupComp] = useState<MapComplaint | null>(null);

  // Complaints query
  const { data: complaintsResp } = useQuery({
    queryKey: ["mapComplaints", city.id],
    queryFn: () => environmentalApi.getMapComplaints(city.id),
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    enabled: isApiConnected && activeLayers.includes("alerts"),
    throwOnError: false,
  });
  // Phase 3 (Stability): stable fallback so complaintsResp polls don't cause
  // unnecessary re-renders / complaint-marker rebuilds when data is empty.
  const EMPTY_COMPLAINTS = useRef<MapComplaint[]>([]).current;
  const complaints: MapComplaint[] = useMemo(
    () => complaintsResp?.data ?? EMPTY_COMPLAINTS,
    [complaintsResp, EMPTY_COMPLAINTS],
  );

  // Derived: current measurement distance (null until two points are placed)
  const measureDistance = useMemo(() => {
    if (measurePoints.length !== 2) return null;
    return measureDistanceMeters(measurePoints[0], measurePoints[1]);
  }, [measurePoints]);

  // Sparkline data for selected popup (Phase 2: prefers real fetched history
  // over synthetic noise — see historyData prop, previously declared but
  // never actually read here). When the drawer's 7d/30d range has real city
  // history loaded, the trend is derived from it (scaled to this location's
  // own relative intensity, not a second independent guess). In "live" mode,
  // where no history is fetched, it falls back to a deterministic shape
  // seeded by the location's own stable id — not by its current momentary
  // level, which would make the shape drift every time the reading changes
  // and would make two coincidentally-equal-level locations look identical.
  const sparkData = useMemo(() => {
    if (!popupLoc) return [];
    if (historyData.length > 1) {
      const relative = city.aqi > 0 ? popupLoc.level / city.aqi : 1;
      return historyData.slice(-24).map((d) => Math.round(d.aqi.avg * relative));
    }
    return trendSeries(stableSeed(popupLoc.id), popupLoc.level, 24, 12).map((p) => p.aqi);
  }, [popupLoc, historyData, city.aqi]);

  // AI insights for selected popup
  const popupInsights = useMemo(
    () => generateAiInsights(city, popupLoc?.level).slice(0, 2),
    [city, popupLoc],
  );

  // Local hotspot search matches
  const localResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return hotspots.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 5);
  }, [hotspots, search]);

  // ── Inject global animation CSS (once) ─────────────────────────────────────
  useEffect(() => {
    const id = "gis-marker-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes markerPulse {
        0%   { transform: scale(1);   opacity: 0.7; }
        50%  { transform: scale(1.6); opacity: 0.25; }
        100% { transform: scale(2.1); opacity: 0; }
      }
      @keyframes sensorBlink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.3; }
      }
      .gis-marker:hover { transform: scale(1.25) !important; }
      .gis-cluster:hover { transform: scale(1.12) !important; }
      .maplibregl-ctrl-attrib { font-size: 9px !important; opacity: 0.5; }
      .maplibregl-ctrl-scale {
        background: rgba(12,17,24,0.55) !important;
        border-color: rgba(255,255,255,0.35) !important;
        color: rgba(255,255,255,0.75) !important;
        font-size: 9px !important;
        backdrop-filter: blur(6px);
      }
    `;
    document.head.appendChild(s);
  }, []);

  // ── Init MapLibre ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const c = mapData?.center ?? { lat: city.lat, lng: city.lng };
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [c.lng, c.lat],
      zoom: mapData?.zoom ?? 12,
      bearing: mapData?.bearing ?? 0,
      pitch: mapData?.pitch ?? 0,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");

    map.on("load", () => {
      // AQI heatmap source
      map.addSource("aqi-heat", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "aqi-heat-layer",
        type: "heatmap",
        source: "aqi-heat",
        maxzoom: 15,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "level"], 0, 0, 100, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 1.5],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,200,80,0)",
            0.2,
            "rgba(80,220,0,0.5)",
            0.4,
            "rgba(220,200,0,0.65)",
            0.65,
            "rgba(240,100,0,0.8)",
            0.85,
            "rgba(200,20,20,0.9)",
            1,
            "rgba(100,0,180,0.95)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 7, 16, 14, 50],
          "heatmap-opacity": heatOpacity,
        },
        layout: { visibility: activeLayers.includes("heat") ? "visible" : "none" },
      });

      // Measure-tool line source (Phase 1) — follows the same pattern as aqi-heat above
      map.addSource("measure-line", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "measure-line-layer",
        type: "line",
        source: "measure-line",
        layout: { "line-cap": "round" },
        paint: { "line-color": "#22d3ee", "line-width": 2, "line-dasharray": [2, 1.5] },
      });

      heatReadyRef.current = true;
      setMapReady(true);
    });

    map.on("zoom", () => setZoom(+map.getZoom().toFixed(1)));
    map.on("rotate", () => setBearing(Math.round(map.getBearing())));
    map.on("mousemove", (e) =>
      setCoords({ lat: +e.lngLat.lat.toFixed(5), lng: +e.lngLat.lng.toFixed(5) }),
    );
    map.on("mouseleave", () => setCoords(null));
    map.on("click", () => {
      setPopupLoc(null);
      setPopupComp(null);
    });

    mapRef.current = map;

    // Phase 3 (Rendering Performance / Memory Optimization): ResizeObserver
    // on the container so the MapLibre canvas always matches its CSS size.
    // Without this, toggling the intelligence panel, rotating a phone, or
    // resizing the browser leaves the rendered viewport stale until the next
    // full-page repaint. Cleaned up in the same effect return to prevent leaks.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        mapRef.current?.resize();
      });
      if (containerRef.current) ro.observe(containerRef.current);
    }

    return () => {
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      heatReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase 10: Animated user location marker ──────────────────────────────────
  // Renders a blue dot + pulsing accuracy ring when `userPosition` is set.
  // The dot is a DOM-based maplibregl.Marker (stays above tile layers and
  // all sensor clusters); the accuracy circle is a filled GeoJSON polygon
  // managed through a dedicated MapLibre source so it renders cheaply as a
  // GPU-composited layer beneath the dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const SOURCE_ID = "user-accuracy-circle";
    const LAYER_ID = "user-accuracy-fill";

    if (!userPosition) {
      // Remove marker and accuracy circle when position is lost
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      return;
    }

    // ── Accuracy circle as GeoJSON polygon ────────────────────────────────
    // Generates a 64-vertex circle in WGS-84 space approximating the GPS
    // accuracy radius around the user's position.
    const { lat, lng, accuracy } = userPosition;
    const EARTH_R = 6_378_137;
    const dLat = (accuracy / EARTH_R) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);
    const N = 64;
    const ring: [number, number][] = Array.from({ length: N + 1 }, (_, i) => {
      const angle = (i / N) * 2 * Math.PI;
      return [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)];
    });
    const circleGeoJSON: maplibregl.SourceSpecification = {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring] },
            properties: {},
          },
        ],
      },
    };
    if (map.getSource(SOURCE_ID)) {
      (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(
        (circleGeoJSON as maplibregl.GeoJSONSourceSpecification).data as Parameters<
          maplibregl.GeoJSONSource["setData"]
        >[0],
      );
    } else {
      map.addSource(SOURCE_ID, circleGeoJSON);
      map.addLayer({
        id: LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.12,
        },
      });
      // Accuracy circle outline
      map.addLayer({
        id: `${LAYER_ID}-outline`,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#3b82f6",
          "line-opacity": 0.35,
          "line-width": 1.5,
        },
      });
    }

    // ── Animated blue dot DOM marker ─────────────────────────────────────────
    const existingMarker = userMarkerRef.current;
    if (existingMarker) {
      existingMarker.setLngLat([lng, lat]);
    } else {
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.style.cssText = `
        position: relative;
        width: 18px;
        height: 18px;
        cursor: default;
      `;

      // Outer pulse ring (CSS animation)
      const pulse = document.createElement("div");
      pulse.style.cssText = `
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 2px solid #3b82f6;
        opacity: 0;
        animation: user-loc-pulse 2s ease-out infinite;
      `;

      // Inner dot
      const dot = document.createElement("div");
      dot.style.cssText = `
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: #3b82f6;
        border: 2.5px solid white;
        box-shadow: 0 2px 8px rgba(59,130,246,0.6);
      `;

      // Heading indicator (arrow) — only if heading is available
      if (userPosition.heading != null) {
        const arrow = document.createElement("div");
        arrow.style.cssText = `
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) rotate(${userPosition.heading}deg);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 7px solid #3b82f6;
          transform-origin: bottom center;
        `;
        el.appendChild(arrow);
      }

      el.appendChild(pulse);
      el.appendChild(dot);

      // Inject the keyframe animation once if not already present
      if (!document.getElementById("user-loc-keyframes")) {
        const style = document.createElement("style");
        style.id = "user-loc-keyframes";
        style.textContent = `
          @keyframes user-loc-pulse {
            0%   { transform: scale(0.7); opacity: 0.8; }
            70%  { transform: scale(2.0); opacity: 0; }
            100% { transform: scale(2.0); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      userMarkerRef.current = marker;
    }
  }, [userPosition, mapReady]);

  // ── Phase 10: fly to user position ───────────────────────────────────────────
  // Separate from the marker effect so a map.flyTo() doesn't re-trigger the
  // (expensive) circle polygon rebuild on every position update.
  const prevUserPositionRef = useRef<GeoPosition | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userPosition) return;
    // Only fly if this is the first fix (prev was null) or if the user
    // explicitly triggered a one-shot locate (isTracking is false and
    // position just changed from null).
    const prev = prevUserPositionRef.current;
    if (!prev) {
      map.flyTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 1_200,
        easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
      });
    }
    prevUserPositionRef.current = userPosition;
  }, [userPosition, mapReady]);

  // ── Fly to city ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const c = mapData?.center ?? { lat: city.lat, lng: city.lng };
    map.flyTo({
      center: [c.lng, c.lat],
      zoom: mapData?.zoom ?? 12,
      bearing: mapData?.bearing ?? 0,
      pitch: mapData?.pitch ?? 0,
      duration: 1600,
      easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t), // ease-in-out
    });
    // Clear popup on city switch
    setPopupLoc(null);
    setPopupComp(null);
  }, [city.id, city.lat, city.lng, mapData, mapReady]);

  // ── AQI heatmap update ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !heatReadyRef.current) return;
    const src = map.getSource("aqi-heat") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: hotspots.map((h) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [h.longitude, h.latitude] },
        properties: { level: h.level },
      })),
    });
    if (map.getLayer("aqi-heat-layer")) {
      map.setLayoutProperty(
        "aqi-heat-layer",
        "visibility",
        activeLayers.includes("heat") ? "visible" : "none",
      );
      map.setPaintProperty("aqi-heat-layer", "heatmap-opacity", heatOpacity);
    }
  }, [hotspots, activeLayers, heatOpacity, mapReady]);

  // ── Sensor / AQI markers with clustering ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerElsRef.current.clear();

    const showAqi = activeLayers.includes("aqi");
    const showSensors = activeLayers.includes("sensors");
    if (!showAqi && !showSensors) return;

    // Phase 1: gate park/traffic/water-category points behind their own layer
    // toggle *before* clustering (not after) so cluster count badges stay
    // accurate — filtering post-cluster would leave a cluster showing "5"
    // when only 3 of its members are actually visible.
    const visibleHotspots = hotspots.filter((h) => {
      if (h.category === "park" && !activeLayers.includes("green")) return false;
      if (h.sensorType === "traffic" && !activeLayers.includes("traffic")) return false;
      if (h.category === "water" && !activeLayers.includes("water")) return false;
      return true;
    });

    // Build Supercluster
    const sc = new Supercluster({ radius: 48, maxZoom: 14 });
    sc.load(
      visibleHotspots.map((h) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [h.longitude, h.latitude] },
        properties: { ...h },
      })),
    );

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const clusters = sc.getClusters(bbox, Math.floor(map.getZoom()));
    // Read the currently-selected id fresh from the ref (kept in sync by the
    // selection effect below) rather than depending on `selectedId` directly
    // — that's the whole point: rebuilding the full marker set on every
    // click/hover selection change is exactly the unnecessary-recreation
    // cost Phase 3 asks to eliminate. A full rebuild (from hotspots/layer/
    // zoom changes) still renders the right marker as selected on first paint.
    const currentSelectedId = prevSelectedIdRef.current;

    clusters.forEach((cl) => {
      const [lng, lat] = cl.geometry.coordinates;
      const el = document.createElement("div");

      if ((cl.properties as { cluster?: boolean }).cluster) {
        const count = (cl.properties as { point_count: number }).point_count;
        const leaves = sc.getLeaves((cl.properties as { cluster_id: number }).cluster_id, count);
        const worstLevel = Math.max(
          ...leaves.map((l) => (l.properties as { level: number }).level ?? 0),
        );
        el.innerHTML = buildClusterHTML(count, worstLevel);
        el.addEventListener("click", () => {
          map.flyTo({ center: [lng, lat], zoom: map.getZoom() + 2.5, duration: 500 });
        });
      } else {
        const p = cl.properties as MapLocation;
        if (!showAqi && !p.sensor) return;
        if (!showSensors && !showAqi) return;

        const markerOpts: MarkerHtmlOpts = {
          level: p.level,
          sensorType: p.sensorType ?? "environmental",
          sensor: p.sensor,
          offline: !p.sensor,
          health: p.health,
          category: p.category,
          name: p.name,
        };
        el.innerHTML = buildMarkerHTML({ ...markerOpts, selected: p.id === currentSelectedId });
        markerElsRef.current.set(p.id, { el, opts: markerOpts });

        el.addEventListener("mouseenter", () => {
          (el.firstElementChild as HTMLElement).style.transform = "scale(1.28)";
        });
        el.addEventListener("mouseleave", () => {
          const isSelected = p.id === prevSelectedIdRef.current;
          (el.firstElementChild as HTMLElement).style.transform = isSelected
            ? "scale(1.18)"
            : "scale(1)";
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setPopupLoc(hotspots.find((h) => h.id === p.id) ?? null);
          setPopupComp(null);
          onSelectLocation(p.id);
        });
      }

      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      markersRef.current.push(m);
    });

    // Phase 2: re-cluster on zoom/pan end (fixes a real bug — see viewTick
    // state declaration above). Deliberately keyed to zoomend/moveend, not
    // the continuous zoom/move events (which already update `zoom` state
    // for the HUD readout), so re-clustering only happens once per gesture
    // rather than dozens of times per second during an active drag/zoom —
    // this is what "maintain smooth performance" requires here.
    const onViewEnd = () => setViewTick((t) => t + 1);
    map.on("zoomend", onViewEnd);
    map.on("moveend", onViewEnd);
    return () => {
      map.off("zoomend", onViewEnd);
      map.off("moveend", onViewEnd);
    };
  }, [hotspots, activeLayers, mapReady, onSelectLocation, viewTick]);

  // Phase 3 (Stability & Performance): selection highlight, decoupled from
  // the marker-build effect above. Clicking/hovering a marker used to
  // rebuild every marker on the map (full teardown + recreate) just to
  // toggle one selection ring — this patches only the previously-selected
  // and newly-selected marker elements' innerHTML in place, O(1) instead of
  // O(n) in the visible marker count.
  useEffect(() => {
    const registry = markerElsRef.current;
    const prevId = prevSelectedIdRef.current;
    if (prevId && prevId !== selectedId) {
      const prev = registry.get(prevId);
      if (prev) prev.el.innerHTML = buildMarkerHTML({ ...prev.opts, selected: false });
    }
    if (selectedId) {
      const next = registry.get(selectedId);
      if (next) next.el.innerHTML = buildMarkerHTML({ ...next.opts, selected: true });
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  // ── Complaint markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    compMarkersRef.current.forEach((m) => m.remove());
    compMarkersRef.current = [];
    if (!activeLayers.includes("alerts") || complaints.length === 0) return;

    complaints.forEach((c) => {
      const col = SEV_COLOR[c.severity] ?? "#ca8a04";
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width:11px;height:11px;border-radius:50%;
          background:${col};border:1.5px solid rgba(255,255,255,0.3);
          box-shadow:0 0 7px ${col}99;cursor:pointer;
          transition:transform 0.15s ease;
        " class="gis-marker"></div>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setPopupComp(c);
        setPopupLoc(null);
        map.flyTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
      });
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.lng, c.lat])
        .addTo(map);
      compMarkersRef.current.push(m);
    });
  }, [complaints, activeLayers, mapReady]);

  // ── Water body markers (Phase 1 — real lat/lng, not legacy x/y) ───────────────
  // Distinct from the "water"-category MapLocation sensor points handled above:
  // these are named geographic features (rivers/lakes/reservoirs) from
  // CityMapConfig.waterBodies, with no AQI level or online state of their own.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    waterMarkersRef.current.forEach((m) => m.remove());
    waterMarkersRef.current = [];
    if (!activeLayers.includes("water")) return;

    waterBodies.forEach((wb) => {
      // Offline fallback data has no coordinates yet (see WaterBody type comment)
      if (wb.latitude == null || wb.longitude == null) return;
      const lat = wb.latitude,
        lng = wb.longitude;
      const el = document.createElement("div");
      el.innerHTML = buildWaterBodyHTML();
      el.title = wb.name;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 600 });
      });
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      waterMarkersRef.current.push(m);
    });
  }, [waterBodies, activeLayers, mapReady]);

  // ── Measure tool: click handling (Phase 1) ─────────────────────────────────────
  // Registers its own click listener only while `measuring` is on, so it never
  // interferes with the map's default click-to-clear-popup behavior otherwise.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!measuring) {
      setMeasurePoints([]);
      return;
    }

    const onMeasureClick = (e: maplibregl.MapMouseEvent) => {
      const pt = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      // A third click starts a fresh measurement rather than accumulating a third point
      setMeasurePoints((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
    };

    map.on("click", onMeasureClick);
    return () => {
      map.off("click", onMeasureClick);
    };
  }, [measuring, mapReady]);

  // ── Measure tool: render points + line ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    measureMarkersRef.current.forEach((m) => m.remove());
    measureMarkersRef.current = [];

    measurePoints.forEach((pt) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:9px;height:9px;border-radius:50%;background:#22d3ee;" +
        "border:2px solid rgba(255,255,255,0.75);box-shadow:0 0 6px #22d3ee99;";
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);
      measureMarkersRef.current.push(m);
    });

    const src = map.getSource("measure-line") as maplibregl.GeoJSONSource | undefined;
    src?.setData(
      measurePoints.length === 2
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: measurePoints.map((p) => [p.lng, p.lat]),
                },
                properties: {},
              },
            ],
          }
        : { type: "FeatureCollection", features: [] },
    );
  }, [measurePoints, mapReady]);

  // ── Recent searches: load per-city list, and a helper to append to it ────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentSearchKey(city.id));
      setRecentSearches(raw ? (JSON.parse(raw) as RecentSearch[]) : []);
    } catch {
      setRecentSearches([]);
    }
  }, [city.id]);

  const pushRecentSearch = useCallback(
    (entry: RecentSearch) => {
      setRecentSearches((prev) => {
        const next = [entry, ...prev.filter((r) => r.label !== entry.label)].slice(0, 5);
        try {
          localStorage.setItem(recentSearchKey(city.id), JSON.stringify(next));
        } catch {
          /* storage unavailable — non-fatal */
        }
        return next;
      });
    },
    [city.id],
  );

  // ── Geocoder search ───────────────────────────────────────────────────────────
  const handleGeoSearch = useCallback(
    (q: string) => {
      onSearchChange(q);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (q.trim().length < 3) {
        setGeoResults([]);
        return;
      }
      searchTimerRef.current = setTimeout(async () => {
        setGeoLoading(true);
        try {
          const lat = mapData?.center.lat ?? city.lat;
          const lng = mapData?.center.lng ?? city.lng;
          const url =
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5` +
            `&viewbox=${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}&bounded=1`;
          const r = await fetch(url, {
            headers: { "Accept-Language": "en", "User-Agent": "GreenGuardAI/3.0" },
          });
          if (r.ok) setGeoResults(((await r.json()) as NominatimResult[]).slice(0, 5));
        } catch {
          setGeoResults([]);
        } finally {
          setGeoLoading(false);
        }
      }, 400);
    },
    [city.lat, city.lng, mapData, onSearchChange],
  );

  const flyToGeo = useCallback(
    (r: NominatimResult) => {
      const lat = parseFloat(r.lat),
        lng = parseFloat(r.lon);
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 900 });
      pushRecentSearch({ label: r.display_name.split(",")[0], sublabel: r.display_name, lat, lng });
      setGeoResults([]);
      setSearchOpen(false);
    },
    [pushRecentSearch],
  );

  const flyToRecent = useCallback((r: RecentSearch) => {
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 900 });
    setSearchOpen(false);
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────────
  const zoomIn = () => mapRef.current?.zoomIn({ duration: 280 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 280 });
  const resetNorth = () => mapRef.current?.rotateTo(0, { duration: 480 });
  // Phase 10: locateMe now delegates to the parent-provided callback (which
  // drives useGeolocation); long-press → track toggle handled in the JSX.
  const locateMe = onLocate ?? (() => {});
  const resetCamera = () => {
    const c = mapData?.center ?? { lat: city.lat, lng: city.lng };
    mapRef.current?.flyTo({
      center: [c.lng, c.lat],
      zoom: mapData?.zoom ?? 12,
      bearing: mapData?.bearing ?? 0,
      pitch: mapData?.pitch ?? 0,
      duration: 1000,
    });
  };
  const toggleFullscreen = () => {
    const el = containerRef.current?.closest(".smartmap-root") as HTMLElement | null;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => setFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setFullscreen(false))
        .catch(() => {});
    }
  };
  const exportImage = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `greenguard-map-${city.name.toLowerCase()}-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 relative overflow-hidden smartmap-root">
      {/* Real MapLibre canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading overlay */}
      <AnimatePresence>
        {!mapReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-[#0c1118] flex flex-col items-center justify-center z-50 gap-4"
          >
            <div className="relative size-12 grid place-items-center">
              <span className="absolute inset-0 rounded-2xl bg-primary/15 animate-ping" />
              <div className="relative size-12 rounded-2xl aurora grid place-items-center">
                <Loader2 className="size-5 text-primary-foreground animate-spin" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] text-muted-foreground tracking-wider uppercase">
                Initialising GIS Engine…
              </span>
              <div className="w-40 h-0.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-primary"
                  animate={{ x: ["-100%", "220%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          GIS TOOLBAR — Top, full width. One professional row: search,
          layer manager toggle, embedded timeline, map tools. Replaces the
          old floating top-right search panel and the page-level timeline
          bar — consolidating three separate surfaces into one, and freeing
          a full row of vertical space back to the map.
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 inset-x-0 z-30 h-14 glass-panel border-b border-border/40 px-3 flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <div
            className={cn(
              "flex items-center gap-2 px-3 h-9 rounded-lg bg-white/5 border border-white/10 transition-colors focus-within:ring-2 focus-within:ring-primary/40",
              searchOpen && "border-primary/40 bg-white/8",
            )}
          >
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                handleGeoSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder={`Search ${city.name}…`}
              aria-label={`Search ${city.name}`}
              className="bg-transparent outline-none text-[12px] flex-1 min-w-0 placeholder:text-muted-foreground/60"
            />
            {geoLoading && (
              <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
            )}
            {search && !geoLoading && (
              <button
                onClick={() => {
                  onSearchChange("");
                  setGeoResults([]);
                  setSearchOpen(false);
                }}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {searchOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[calc(100%+8px)] left-0 w-[380px] max-w-[85vw] glass-overlay rounded-xl shadow-2xl overflow-hidden z-30 origin-top"
                >
                  <div className="max-h-80 overflow-y-auto">
                    {/* Recent searches — only while the box is empty, Google-Maps style */}
                    {!search && recentSearches.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[8px] uppercase tracking-[0.16em] text-muted-foreground bg-white/2 flex items-center gap-1.5">
                          <History className="size-2.5" /> Recent
                        </div>
                        {recentSearches.map((r) => (
                          <button
                            key={r.label}
                            onClick={() => flyToRecent(r)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left"
                          >
                            <Clock className="size-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] truncate">{r.label}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {search && localResults.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[8px] uppercase tracking-[0.16em] text-muted-foreground bg-white/2">
                          Sensors & Locations
                        </div>
                        {localResults.map((h) => (
                          <button
                            key={h.id}
                            onClick={() => {
                              onSelectLocation(h.id);
                              setPopupLoc(h);
                              setPopupComp(null);
                              pushRecentSearch({
                                label: h.name,
                                sublabel: h.category,
                                lat: h.latitude,
                                lng: h.longitude,
                              });
                              mapRef.current?.flyTo({
                                center: [h.longitude, h.latitude],
                                zoom: 15,
                                duration: 700,
                              });
                              setSearchOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left"
                          >
                            <span className="text-base">
                              {sensorTypeIcon(h.sensorType ?? "environmental")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-medium truncate">{h.name}</div>
                              <div className="text-[9px] text-muted-foreground">
                                AQI {h.level} · {h.category}
                              </div>
                            </div>
                            <span
                              className="text-[10px] font-bold tabular-nums shrink-0"
                              style={{ color: aqiColor(h.level) }}
                            >
                              {h.level}
                            </span>
                          </button>
                        ))}
                      </>
                    )}

                    {search && geoResults.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[8px] uppercase tracking-[0.16em] text-muted-foreground bg-white/2">
                          Places & Roads
                        </div>
                        {geoResults.map((r) => (
                          <button
                            key={r.place_id}
                            onClick={() => flyToGeo(r)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left"
                          >
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] truncate">{r.display_name}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Empty state — searched, nothing found */}
                    {search.trim().length >= 2 &&
                      !geoLoading &&
                      localResults.length === 0 &&
                      geoResults.length === 0 && (
                        <div className="px-3 py-6 text-center">
                          <Search className="size-4 text-muted-foreground/40 mx-auto mb-1.5" />
                          <div className="text-[11px] text-muted-foreground">
                            No matches for “{search}”
                          </div>
                          <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                            Try a sensor name, road, or landmark
                          </div>
                        </div>
                      )}
                    {/* Empty state — nothing typed, no recent history yet */}
                    {!search && recentSearches.length === 0 && (
                      <div className="px-3 py-6 text-center">
                        <div className="text-[10px] text-muted-foreground/60">
                          Search sensors, zones, roads & landmarks
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="h-6 w-px bg-border/40 shrink-0" />

        {/* Layer manager toggle */}
        <button
          onClick={() => setLayerPanelOpen((o) => !o)}
          title="Toggle layer manager"
          aria-label="Toggle layer manager"
          aria-expanded={layerPanelOpen}
          className={cn(
            "shrink-0 h-9 px-3 rounded-lg flex items-center gap-1.5 text-[11px] font-medium transition-colors active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            layerPanelOpen
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/8",
          )}
        >
          <Layers className="size-3.5" />
          <span className="hidden sm:inline">Layers</span>
          <span className="text-[9px] opacity-70 tabular-nums">{activeLayers.length}</span>
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-200",
              layerPanelOpen ? "rotate-180" : "",
            )}
          />
        </button>

        <div className="h-6 w-px bg-border/40 shrink-0 hidden md:block" />

        {/* Timeline — embedded, compact segmented control */}
        <div
          className="hidden md:flex items-center gap-1 shrink-0 h-9 pl-2 pr-1 rounded-lg bg-white/5 border border-white/10"
          role="group"
          aria-label="Time range"
        >
          <Clock className="size-3 text-muted-foreground shrink-0" />
          {TIME_RANGE_OPTS.map((o) => {
            const disabled = o.id !== "live" && !hasHistory;
            return (
              <button
                key={o.id}
                disabled={disabled}
                aria-pressed={timeRange === o.id}
                onClick={() => onTimeRangeChange?.(o.id)}
                title={disabled ? "No historical data available" : undefined}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  timeRange === o.id
                    ? "bg-primary text-primary-foreground"
                    : disabled
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-white/8 hover:text-foreground active:scale-95",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
        <div className="h-6 w-px bg-border/40 shrink-0" />

        {/* Map tools: fullscreen, reset view, export */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={toggleFullscreen}
            title="Fullscreen"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="size-9 grid place-items-center hover:bg-white/8 rounded-lg transition-colors text-muted-foreground active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          <button
            onClick={resetCamera}
            title="Reset view"
            aria-label="Reset map view"
            className="size-9 grid place-items-center hover:bg-white/8 rounded-lg transition-colors text-muted-foreground active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            onClick={exportImage}
            title="Export map image"
            aria-label="Export map image"
            className="size-9 grid place-items-center hover:bg-white/8 rounded-lg transition-colors text-muted-foreground active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Camera className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LAYER MANAGER — Top Left, below toolbar (grouped, animated,
          toolbar-toggleable, now with per-layer descriptions)
      ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {layerPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[4.5rem] left-3 z-20 w-[280px] max-w-[calc(100vw-1.5rem)] origin-top-left"
          >
            {/* ── Professional GIS Layer Manager (Phase 4, Section 3) ─── */}
            <div
              className="rounded-xl overflow-hidden flex flex-col"
              style={{
                background: "oklch(0.12 0.015 240 / 0.92)",
                backdropFilter: "blur(16px) saturate(1.4)",
                border: "1px solid oklch(1 0 0 / 0.12)",
                boxShadow: "0 8px 32px -4px oklch(0 0 0 / 0.5), 0 2px 8px -2px oklch(0 0 0 / 0.3)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ borderBottom: "1px solid oklch(1 0 0 / 0.08)" }}
              >
                <Layers className="size-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground flex-1">
                  Layer Manager
                </span>
                <span
                  className="text-[9px] font-medium tabular-nums px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--color-primary) 18%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  {activeLayers.length} active
                </span>
              </div>

              {/* Search */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}
              >
                <Search className="size-3 text-muted-foreground shrink-0" />
                <input
                  value={layerSearch}
                  onChange={(e) => setLayerSearch(e.target.value)}
                  placeholder="Filter layers…"
                  aria-label="Filter layers"
                  className="bg-transparent outline-none text-[11px] flex-1 min-w-0 placeholder:text-muted-foreground/50"
                />
                {layerSearch && (
                  <button
                    onClick={() => setLayerSearch("")}
                    aria-label="Clear filter"
                    className="text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Layer groups — driven by registry */}
              <div
                className="overflow-y-auto max-h-[calc(100dvh-22rem)] [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
              >
                {layerRegistry.getGroups().map((group) => {
                  const allGroupLayers = layerRegistry.getByGroup(group);
                  const groupLayers = layerSearch
                    ? allGroupLayers.filter((l) =>
                        l.label.toLowerCase().includes(layerSearch.toLowerCase()),
                      )
                    : allGroupLayers;
                  if (groupLayers.length === 0) return null;
                  const isOpen = (layerGroupOpen[group] ?? true) || !!layerSearch;
                  const activeInGroup = groupLayers.filter((l) =>
                    activeLayers.includes(l.id),
                  ).length;

                  // Map from LayerId to LAYERS entry for its icon (registry
                  // stores GisLayerDescriptor; icon lives in LAYERS const)
                  const iconFor = (id: LayerId) => LAYERS.find((l) => l.id === id)?.icon;

                  return (
                    <div
                      key={group}
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}
                      className="last:border-0"
                    >
                      <button
                        onClick={() => setLayerGroupOpen((o) => ({ ...o, [group]: !o[group] }))}
                        aria-expanded={isOpen}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
                      >
                        <span className="text-[8.5px] uppercase tracking-[0.2em] text-muted-foreground/70 flex-1 text-left font-medium">
                          {group}
                        </span>
                        {activeInGroup > 0 && (
                          <span className="text-[8px] text-primary tabular-nums font-medium">
                            {activeInGroup}/{groupLayers.length}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            "size-3 text-muted-foreground/50 transition-transform duration-200",
                            !isOpen && "-rotate-90",
                          )}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            {groupLayers.map((l: GisLayerDescriptor) => {
                              const isOn = activeLayers.includes(l.id);
                              const isDisabled = !!l.comingSoon;
                              const Icon = iconFor(l.id);

                              return (
                                <button
                                  key={l.id}
                                  onClick={() => !isDisabled && onToggleLayer(l.id)}
                                  disabled={isDisabled}
                                  role="switch"
                                  aria-checked={isOn}
                                  aria-label={`${l.label} layer`}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
                                    isDisabled
                                      ? "opacity-30 cursor-not-allowed"
                                      : isOn
                                        ? "bg-white/[0.06]"
                                        : "hover:bg-white/[0.04]",
                                  )}
                                >
                                  {/* Active indicator track */}
                                  <span
                                    className="shrink-0 w-[3px] h-6 rounded-full transition-all duration-200"
                                    style={{
                                      background: isOn ? l.color : "transparent",
                                      boxShadow: isOn ? `0 0 6px ${l.color}` : "none",
                                    }}
                                  />

                                  {/* Icon badge */}
                                  <span
                                    className="size-6 rounded-lg grid place-items-center shrink-0 transition-all duration-200"
                                    style={{
                                      background: isOn
                                        ? `color-mix(in oklab, ${l.color} 20%, transparent)`
                                        : "oklch(1 0 0 / 0.04)",
                                      border: `1px solid ${isOn ? `color-mix(in oklab, ${l.color} 35%, transparent)` : "oklch(1 0 0 / 0.08)"}`,
                                    }}
                                  >
                                    {Icon && (
                                      <Icon
                                        className="size-3"
                                        style={{
                                          color: isOn ? l.color : "var(--color-muted-foreground)",
                                        }}
                                      />
                                    )}
                                  </span>

                                  {/* Label + description */}
                                  <span className="flex-1 text-left min-w-0">
                                    <span
                                      className={cn(
                                        "block text-[10.5px] leading-tight",
                                        isOn
                                          ? "text-foreground font-medium"
                                          : "text-muted-foreground",
                                      )}
                                    >
                                      {l.label}
                                    </span>
                                    <span className="block text-[8.5px] text-muted-foreground/55 truncate leading-tight mt-0.5">
                                      {LAYERS.find((lay) => lay.id === l.id)?.description ?? ""}
                                    </span>
                                  </span>

                                  {/* Status badge */}
                                  {isDisabled ? (
                                    <span
                                      className="text-[7px] font-semibold px-1 py-0.5 rounded shrink-0"
                                      style={{
                                        background: "oklch(1 0 0 / 0.06)",
                                        color: "var(--color-muted-foreground)",
                                      }}
                                    >
                                      SOON
                                    </span>
                                  ) : (
                                    <span
                                      className={cn(
                                        "size-4 grid place-items-center shrink-0 rounded-md transition-all duration-200",
                                        isOn ? "text-primary" : "text-muted-foreground/30",
                                      )}
                                    >
                                      {isOn ? (
                                        <Eye className="size-3" />
                                      ) : (
                                        <EyeOff className="size-3" />
                                      )}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic filter area (Section 8) — only shown for active layers
                  that expose filter config in the registry. Currently: heatmap
                  opacity. Future layers add their own filters by declaring them
                  in the GisLayerDescriptor, nothing else to change here. */}
              {layerRegistry.getActiveFilters(activeLayers).map((f) => {
                if (f.type === "range" && f.key === "heatOpacity") {
                  return (
                    <div
                      key={`${f.layerId}-${f.key}`}
                      className="px-3 py-2.5"
                      style={{ borderTop: "1px solid oklch(1 0 0 / 0.08)" }}
                    >
                      <div className="flex justify-between text-[9px] mb-1.5">
                        <span id="heat-opacity-label" className="text-muted-foreground font-medium">
                          {f.label}
                        </span>
                        <span className="tabular-nums text-foreground/70">
                          {Math.round(heatOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={f.min ?? 0.1}
                        max={f.max ?? 1}
                        step={f.step ?? 0.05}
                        value={heatOpacity}
                        onChange={(e) => setHeatOpacity(+e.target.value)}
                        aria-labelledby="heat-opacity-label"
                        className="w-full accent-primary h-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                      />
                    </div>
                  );
                }
                return null;
              })}

              {/* Quick-toggle footer: all on / all off */}
              <div
                className="flex items-center gap-1.5 px-3 py-2"
                style={{ borderTop: "1px solid oklch(1 0 0 / 0.08)" }}
              >
                <button
                  onClick={() =>
                    layerRegistry
                      .getAll()
                      .filter((l) => !l.comingSoon && !activeLayers.includes(l.id))
                      .forEach((l) => onToggleLayer(l.id))
                  }
                  className="flex-1 text-[9px] font-medium text-muted-foreground hover:text-foreground py-1 hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                >
                  All on
                </button>
                <div className="w-px h-3" style={{ background: "oklch(1 0 0 / 0.1)" }} />
                <button
                  onClick={() => activeLayers.forEach((id) => onToggleLayer(id))}
                  className="flex-1 text-[9px] font-medium text-muted-foreground hover:text-foreground py-1 hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                >
                  All off
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          DYNAMIC LEGEND (Phase 4, Section 5) — driven by the registry.
          Only shows entries for active, non-coming-soon layers. Compact
          on mobile, floating panel on desktop. Hidden when no active
          layers have legend entries (e.g. all layers toggled off).
      ═════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const legendEntries = layerRegistry.getLegendEntries(activeLayers);
        if (legendEntries.length === 0) return null;
        return (
          <div className="absolute bottom-[124px] left-3 sm:left-4 md:bottom-16 lg:bottom-10 z-20">
            <details className="group">
              <summary
                className="rounded-xl px-3 py-2 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{
                  background: "oklch(0.12 0.015 240 / 0.92)",
                  backdropFilter: "blur(16px) saturate(1.4)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                  boxShadow: "0 4px 16px -4px oklch(0 0 0 / 0.4)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="size-3 text-muted-foreground" />
                  <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Legend
                  </span>
                  <span className="text-[8px] text-muted-foreground/60 ml-1">
                    {legendEntries.length} {legendEntries.length === 1 ? "entry" : "entries"}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground/60 ml-auto group-open:rotate-180 transition-transform duration-200" />
                </div>
              </summary>

              <div
                className="mt-1.5 rounded-xl py-2 flex flex-col gap-0"
                style={{
                  background: "oklch(0.12 0.015 240 / 0.92)",
                  backdropFilter: "blur(16px) saturate(1.4)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                  boxShadow: "0 4px 16px -4px oklch(0 0 0 / 0.4)",
                }}
              >
                {/* Group legend entries by layer */}
                {layerRegistry
                  .getAll()
                  .filter(
                    (l) =>
                      activeLayers.includes(l.id) && !l.comingSoon && l.legendEntries.length > 0,
                  )
                  .map((l) => (
                    <div key={l.id} className="px-3 py-1.5">
                      <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground/60 mb-1 font-medium">
                        {l.label}
                      </div>
                      {l.legendEntries.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 py-0.5">
                          {entry.shape === "gradient" && entry.gradient ? (
                            <span
                              className="w-8 h-2 rounded-sm shrink-0"
                              style={{
                                background: `linear-gradient(to right, ${entry.gradient[0]}, ${entry.gradient[1]})`,
                              }}
                            />
                          ) : entry.shape === "line" ? (
                            <span
                              className="w-5 h-0.5 rounded-full shrink-0"
                              style={{ background: entry.color }}
                            />
                          ) : (
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ background: entry.color }}
                            />
                          )}
                          <span className="text-[9px] text-muted-foreground/80 leading-tight">
                            {entry.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </details>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          SYSTEM STATUS — Top Right, below toolbar
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block absolute top-[4.5rem] right-3 z-20">
        <div className="glass-panel rounded-xl px-3 py-4 flex flex-col gap-1.5 min-w-[140px]">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            <Activity className="size-3" /> System Status
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Sensors online</span>
            <span className="font-semibold text-[var(--color-success)]">{sensorsOnline}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Critical zones</span>
            <span
              className="font-semibold"
              style={{ color: highRisk > 0 ? "var(--color-destructive)" : "var(--color-success)" }}
            >
              {highRisk}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Map zoom</span>
            <span className="font-semibold text-[var(--color-primary)] tabular-nums">{zoom}</span>
          </div>
          <div className="h-px bg-border/40 my-0.5" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="size-1.5 rounded-full shrink-0" style={{ background: band.color }} />
            <span className="text-muted-foreground">City AQI</span>
            <span className="font-bold ml-auto tabular-nums" style={{ color: band.color }}>
              {city.aqi} <span className="font-normal text-[9px]">{band.label}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Bearing</span>
            <span className="font-mono text-[9px] text-muted-foreground">{bearing}°</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LEGEND — Bottom Left (collapsible, dynamic — only active layers)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-[124px] left-3 sm:left-4 md:bottom-16 lg:bottom-10 z-20">
        <details className="group">
          <summary className="glass-panel rounded-xl px-3 py-2 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="size-2 rounded-sm" style={{ background: band.color }} />
              Legend
              <span className="text-muted-foreground/50 normal-case tracking-normal">
                {activeLayers.length > 0 ? `· ${activeLayers.length} active` : "· none active"}
              </span>
              <span className="ml-auto group-open:rotate-180 transition-transform duration-200 text-[10px]">
                ▾
              </span>
            </div>
          </summary>
          <div className="glass-panel rounded-xl mt-1 px-3 py-2.5 animate-in fade-in duration-150 min-w-[190px]">
            {activeLayers.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center py-2">
                No active layers — enable one from Layers to see its legend
              </div>
            )}

            {(activeLayers.includes("aqi") || activeLayers.includes("heat")) && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Air Quality Index
                </div>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "Good", range: "0–50", color: "#16a34a" },
                    { label: "Moderate", range: "51–100", color: "#ca8a04" },
                    { label: "Unhealthy", range: "101–150", color: "#d97706" },
                    { label: "Unhealthy+", range: "151–200", color: "#dc2626" },
                    { label: "Hazardous", range: "200+", color: "#7f1d1d" },
                  ].map((e) => (
                    <div key={e.label} className="flex items-center gap-2 text-[10px]">
                      <span
                        className="size-2 rounded-sm shrink-0"
                        style={{ background: e.color }}
                      />
                      <span className="text-foreground w-20">{e.label}</span>
                      <span className="text-muted-foreground tabular-nums">{e.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeLayers.includes("sensors") && (
              <div
                className={cn(
                  activeLayers.includes("aqi") || activeLayers.includes("heat")
                    ? "border-t border-border/40 pt-2 mb-1"
                    : "mb-1",
                )}
              >
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  Sensor Types
                </div>
                {(["environmental", "weather", "water", "industrial", "traffic"] as const).map(
                  (type) => (
                    <div key={type} className="flex items-center gap-1.5 text-[9px] mb-1">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: sensorTypeColor(type) }}
                      />
                      <span className="text-muted-foreground">{SENSOR_TYPE_LABEL[type]}</span>
                    </div>
                  ),
                )}
              </div>
            )}

            {LAYERS.filter(
              (l) => activeLayers.includes(l.id) && !["aqi", "heat", "sensors"].includes(l.id),
            ).map((l) => (
              <div key={l.id} className="flex items-center gap-1.5 text-[9px] mb-1">
                <span className="size-1.5 rounded-full" style={{ background: l.color }} />
                <span className="text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAP CONTROLS — Bottom Right (pure map manipulation: fullscreen,
          reset view & export now live in the top toolbar so they aren't
          duplicated here)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-[124px] right-3 sm:right-4 md:bottom-16 lg:bottom-4 z-20 flex flex-col gap-1.5">
        {/* Coordinates readout */}
        {coords && (
          <div className="glass rounded-lg px-2.5 py-1.5 text-right">
            <div className="text-[9px] font-mono text-muted-foreground tabular-nums">
              {coords.lat.toFixed(4)}°N {coords.lng.toFixed(4)}°E
            </div>
          </div>
        )}

        <div className="glass-control rounded-xl p-1 flex flex-col gap-0.5">
          {/* Compass */}
          <button
            onClick={resetNorth}
            title="Reset North"
            aria-label="Reset map bearing to north"
            className="size-8 grid place-items-center hover:bg-white/5 rounded-lg transition-colors active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span
              className="text-[11px] font-bold font-mono text-primary"
              style={{
                display: "inline-block",
                transform: `rotate(${-bearing}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              N
            </span>
          </button>
          <div className="h-px bg-border/40 mx-1" />

          {/* Zoom */}
          <button
            onClick={zoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="size-10 grid place-items-center hover:bg-white/5 rounded-lg transition-colors active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            onClick={zoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="size-10 grid place-items-center hover:bg-white/5 rounded-lg transition-colors active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Minus className="size-3.5" />
          </button>
          <div className="h-px bg-border/40 mx-1" />

          {/* Locate / Track — Phase 10 ───────────────────────────────────
              Click: one-shot locate. Long press (≥500 ms): toggle continuous
              tracking. Button colour communicates permission state:
                grey = idle/not requested, blue = granted/tracking,
                red = denied/unavailable/timeout, spinner = requesting */}
          <button
            onClick={
              geoStatus === "requesting" ? undefined : isTracking ? onToggleTracking : locateMe
            }
            onContextMenu={(e) => {
              e.preventDefault();
              onToggleTracking?.();
            }}
            title={
              geoStatus === "denied"
                ? "Location permission denied"
                : geoStatus === "unavailable"
                  ? "Location unavailable"
                  : geoStatus === "timeout"
                    ? "Location timed out — click to retry"
                    : isTracking
                      ? "Tracking your position (click to stop)"
                      : "Locate me (right-click or long-press to track)"
            }
            aria-label={isTracking ? "Stop location tracking" : "Locate me"}
            aria-pressed={isTracking}
            className={cn(
              "size-10 grid place-items-center rounded-lg transition-all active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              geoStatus === "denied" || geoStatus === "unavailable" || geoStatus === "timeout"
                ? "text-destructive hover:bg-destructive/10"
                : geoStatus === "granted" || isTracking
                  ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                  : "hover:bg-white/5 text-muted-foreground",
            )}
          >
            {geoStatus === "requesting" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isTracking ? (
              // Pulsing dot inside Locate icon to signal live tracking
              <span className="relative">
                <Locate className="size-3.5" />
                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-blue-400 animate-pulse" />
              </span>
            ) : (
              <Locate className="size-3.5" />
            )}
          </button>

          <div className="h-px bg-border/40 mx-1" />

          {/* Measure */}
          <button
            onClick={() => setMeasuring((m) => !m)}
            title="Measure distance"
            aria-label="Measure distance"
            aria-pressed={measuring}
            className={cn(
              "size-9 grid place-items-center rounded-lg transition-colors active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              measuring ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-muted-foreground",
            )}
          >
            <Ruler className="size-3.5" />
          </button>

          {/* Draw radius (UI placeholder) */}
          <button
            title="Draw radius (coming soon)"
            aria-label="Draw radius (coming soon)"
            disabled
            className="size-9 grid place-items-center rounded-lg opacity-30 cursor-not-allowed text-muted-foreground"
          >
            <Circle className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Measuring banner */}
      <AnimatePresence>
        {measuring && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-[124px] md:bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[90vw]"
          >
            <div className="glass-panel rounded-xl px-4 py-2 text-[11px] flex items-center gap-2 text-primary border border-primary/20">
              <Ruler className="size-3 shrink-0" />
              {measureDistance != null ? (
                <>
                  Distance:{" "}
                  <span className="font-mono font-semibold">{formatDistance(measureDistance)}</span>
                </>
              ) : measurePoints.length === 1 ? (
                "Click a second point to measure"
              ) : (
                "Click two points on the map to measure"
              )}
              {measurePoints.length > 0 && (
                <button
                  onClick={() => setMeasurePoints([])}
                  className="ml-1 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setMeasuring(false)}
                title="Exit measure mode"
                aria-label="Exit measure mode"
                className="ml-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              >
                <X className="size-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          SELECTED LOCATION POPUP — Phase 3B: compact, information-dense.
          Same data as before; primary readings stay visible, secondary
          detail (coordinates, full insight list, forecast) collapses under
          "More detail" so the popup never dominates the map.
      ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {popupLoc && (
          <motion.div
            key={popupLoc.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-xs w-[360px]"
          >
            <div
              className="glass rounded-2xl p-3.5 shadow-2xl pointer-events-auto"
              style={{
                borderColor: `color-mix(in oklab, ${aqiColor(popupLoc.level)} 35%, transparent)`,
                boxShadow: `0 0 40px ${aqiColor(popupLoc.level)}22, 0 24px 60px -16px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Header — identity + close */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className="shrink-0 mt-0.5 size-6"
                    dangerouslySetInnerHTML={{
                      __html: buildGlyphIconSVG(
                        popupLoc.sensorType ?? "environmental",
                        popupLoc.category,
                        popupLoc.name,
                        24,
                      ),
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] leading-snug truncate">
                      {popupLoc.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[9px] text-muted-foreground">
                        {SENSOR_TYPE_LABEL[popupLoc.sensorType ?? "environmental"]}
                      </span>
                      {popupLoc.sensor ? (
                        <StatusChip tone="good" pulse size="xs">
                          Online
                        </StatusChip>
                      ) : (
                        <StatusChip tone="neutral" size="xs">
                          No sensor
                        </StatusChip>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPopupLoc(null)}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/10 size-6 grid place-items-center rounded-lg transition-colors text-xs shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* AQI + 24h trend — one compact row instead of two stacked blocks */}
              <div
                className="rounded-xl px-3 py-2 mb-2.5 flex items-center gap-3"
                style={{
                  background: `color-mix(in oklab, ${aqiColor(popupLoc.level)} 9%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${aqiColor(popupLoc.level)} 22%, transparent)`,
                }}
              >
                <div className="shrink-0">
                  <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground mb-0.5">
                    AQI
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={{ color: aqiColor(popupLoc.level) }}
                    >
                      {popupLoc.level}
                    </span>
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: aqiColor(popupLoc.level) }}
                    >
                      {aqiLabel(popupLoc.level)}
                    </span>
                  </div>
                </div>
                {sparkData.length > 1 && (
                  <div className="flex-1 min-w-0">
                    <div className="text-[7px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">
                      24h trend
                    </div>
                    <Sparkline data={sparkData} color={aqiColor(popupLoc.level)} />
                  </div>
                )}
              </div>

              {/* Unified metrics grid — was two separate grids (pollutants +
                wind/battery/health/alert); merged into one so the same data
                takes one card's worth of chrome instead of two. */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                <MetricTile
                  label="PM2.5"
                  unit="µg"
                  value={
                    popupLoc.pm25 ??
                    Math.round(city.pm25 * (popupLoc.level / Math.max(city.aqi, 1)))
                  }
                />
                <MetricTile
                  label="PM10"
                  unit="µg"
                  value={
                    popupLoc.pm10 ??
                    Math.round(city.pm10 * (popupLoc.level / Math.max(city.aqi, 1)))
                  }
                />
                <MetricTile
                  label="NO₂"
                  unit="ppb"
                  value={
                    popupLoc.no2 ?? Math.round(city.no2 * (popupLoc.level / Math.max(city.aqi, 1)))
                  }
                />
                <MetricTile label="CO" unit="ppm" value={popupLoc.co ?? "—"} />
                <MetricTile label="Temp" unit="C" value={`${popupLoc.temp ?? city.temp}°`} />
                <MetricTile label="Humidity" unit="%" value={popupLoc.humidity ?? city.humidity} />
                <MetricTile label="Wind" unit="km/h" value={popupLoc.windSpeed ?? "—"} />
                <MetricTile
                  label="Health"
                  value={popupLoc.health ?? "n/a"}
                  accent={
                    popupLoc.health === "optimal"
                      ? "var(--color-success)"
                      : popupLoc.health === "nominal" || popupLoc.health === "degraded"
                        ? "var(--color-warning)"
                        : undefined
                  }
                />
              </div>

              {/* Top AI insight — always visible; rest collapses below */}
              {popupInsights.length > 0 && (
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed mb-2.5 px-0.5">
                  <span className="shrink-0">{popupInsights[0].icon}</span>
                  <span>{popupInsights[0].detail}</span>
                </div>
              )}

              {/* Collapsed secondary detail — coordinates, remaining insights,
                6h forecast. Same <details> idiom already used by the map's
                Legend, so this isn't a new interaction pattern. */}
              <details className="mb-2.5 group">
                <summary className="text-[9px] text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1 select-none">
                  <span className="group-open:rotate-90 transition-transform duration-150 inline-block">
                    ▸
                  </span>
                  More detail
                  {popupInsights.length > 1 && (
                    <span className="text-muted-foreground/50">
                      · {popupInsights.length - 1} more insight{popupInsights.length > 2 ? "s" : ""}
                    </span>
                  )}
                </summary>
                <div className="mt-2 space-y-2.5 animate-in fade-in duration-150">
                  {/* ID + coordinates */}
                  <div className="glass rounded-lg px-2.5 py-2 font-mono text-[9px] text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <span>ID</span>{" "}
                    <span className="text-foreground text-right">{popupLoc.id.toUpperCase()}</span>
                    <span>LAT</span>{" "}
                    <span className="text-foreground text-right">
                      {popupLoc.latitude.toFixed(5)}°
                    </span>
                    <span>LNG</span>{" "}
                    <span className="text-foreground text-right">
                      {popupLoc.longitude.toFixed(5)}°
                    </span>
                    <span>CATEGORY</span>
                    <span className="text-foreground text-right capitalize">
                      {popupLoc.category}
                    </span>
                    <span>BATTERY</span>{" "}
                    <span className="text-foreground text-right">
                      {popupLoc.battery != null ? `${popupLoc.battery}%` : "—"}
                    </span>
                    <span>NOISE</span>{" "}
                    <span className="text-foreground text-right">
                      {popupLoc.noise != null ? `${popupLoc.noise} dB` : "—"}
                    </span>
                    <span>WATER Q.I.</span>
                    <span className="text-foreground text-right">{city.water}/100</span>
                  </div>

                  {/* Remaining AI insights */}
                  {popupInsights.length > 1 && (
                    <div className="space-y-1">
                      {popupInsights.slice(1).map((ins, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed"
                        >
                          <span className="shrink-0">{ins.icon}</span>
                          <span>{ins.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 6h forecast */}
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                      6h Forecast
                    </div>
                    <ForecastBars base={popupLoc.level} seed={stableSeed(popupLoc.id)} />
                  </div>
                </div>
              </details>

              {/* Footer — status + actions */}
              <div className="flex items-center justify-between text-[9px] mb-2">
                <span className="text-muted-foreground">Updated {lastUpdated}</span>
                <StatusChip
                  tone={
                    popupLoc.level > 200 ? "critical" : popupLoc.level > 100 ? "warning" : "good"
                  }
                  size="xs"
                >
                  {popupLoc.level > 200 ? "Critical" : popupLoc.level > 100 ? "Elevated" : "Normal"}
                </StatusChip>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() =>
                    mapRef.current?.flyTo({
                      center: [popupLoc.longitude, popupLoc.latitude],
                      zoom: 16,
                      duration: 700,
                    })
                  }
                  className="flex-1 text-[10px] py-1.5 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                >
                  Zoom Here
                </button>
                <button className="flex-1 text-[10px] py-1.5 rounded-lg font-medium bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10 transition-colors">
                  Open Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          COMPLAINT POPUP
      ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {popupComp && (
          <motion.div
            key={popupComp.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-[90vw]"
          >
            <div
              className="glass rounded-2xl p-4 shadow-2xl pointer-events-auto w-64 max-w-full"
              style={{
                borderColor: `color-mix(in oklab, ${SEV_COLOR[popupComp.severity] ?? "#ca8a04"} 30%, transparent)`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle
                    className="size-4 shrink-0 mt-0.5"
                    style={{ color: SEV_COLOR[popupComp.severity] }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm leading-snug truncate">
                      {popupComp.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      {popupComp.issueType.replace(/_/g, " ")} · {popupComp.severity}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPopupComp(null)}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/10 size-6 flex items-center justify-center rounded-lg transition-colors shrink-0 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Status</span>
                <span
                  className="font-medium capitalize px-2 py-0.5 rounded-full text-[9px] border"
                  style={{
                    background: `color-mix(in oklab, ${SEV_COLOR[popupComp.severity] ?? "#ca8a04"} 12%, transparent)`,
                    color: SEV_COLOR[popupComp.severity] ?? "#ca8a04",
                    borderColor: `color-mix(in oklab, ${SEV_COLOR[popupComp.severity] ?? "#ca8a04"} 25%, transparent)`,
                  }}
                >
                  {popupComp.status.replace(/-/g, " ")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline notice */}
      {!isApiConnected && mapReady && (
        <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 z-20">
          <div className="glass-panel rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] text-muted-foreground border border-border/50">
            <WifiOff className="size-3" /> API offline — map visible, live data unavailable
          </div>
        </div>
      )}
    </div>
  );
}
