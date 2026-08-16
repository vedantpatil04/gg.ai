import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, AlertTriangle, Locate, Maximize2, RotateCcw, MapPin, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import {
  environmentalApi,
  type MapLocation,
  type MapComplaint,
} from "@/lib/api/environmental.api";
import { alertApi } from "@/lib/api/services.api";
import { OSM_DARK_STYLE } from "@/lib/map/base-map-config";
import { aqiColor, aqiLabel, categoryColor, CATEGORY_LABEL } from "@/lib/map/map-visuals";
import { Panel, Pill } from "@/components/ui-bits";
import { ISSUE_LABELS, SEVERITY_TONE, STATUS_LABEL } from "./investigation-workspace";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/**
 * Authority Smart Map (Phase 7).
 *
 * Architecture rule (same one env-explore.tsx documents, followed exactly
 * here): this is NOT a second Smart Map.
 *  - No second MapLibre engine/basemap provider — reuses OSM_DARK_STYLE
 *    from lib/map/base-map-config.ts, the same style SmartMapCanvas and
 *    env-explore.tsx are built on. The light-style copy below mirrors
 *    env-explore.tsx's own local copy (no shared light-style export exists
 *    yet in base-map-config.ts, so this follows that established
 *    per-component pattern rather than editing shared config).
 *  - No second GIS data source — reuses environmentalApi.getCityMapData
 *    (env locations) and environmentalApi.getMapComplaints (the same
 *    public endpoint the citizen-facing /map route uses for complaint
 *    markers).
 *  - No second AQI/severity color system — reuses aqiColor()/categoryColor()
 *    from map-visuals.ts and SEVERITY_TONE/STATUS_LABEL from the
 *    Investigation Workspace (Phase 4), so a complaint marker's color means
 *    exactly the same thing here as it does in the Work Queue.
 *  - SmartMapCanvas itself is intentionally not embedded — its full layer
 *    manager/measure-tool/search surface is built for the dedicated /map
 *    route's own orchestration; this mounts its own minimal instance,
 *    following the same lightweight pattern as env-explore.tsx and
 *    citizen/complaint-location-map.tsx.
 *
 * Alerts are deliberately NOT plotted as map pins — Alert documents have
 * no lat/lng (only a cityId/area string), and inventing coordinates for
 * them is explicitly out of bounds. Active-alert count for the selected
 * city is shown as a real, honest banner instead.
 */

const OSM_LIGHT_STYLE: maplibregl.StyleSpecification = {
  version: 8 as const,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "osm-raster": {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": "#f4f4f4" } },
    {
      id: "osm-raster-layer",
      type: "raster" as const,
      source: "osm-raster",
      paint: {
        "raster-opacity": 1,
        "raster-brightness-min": 0.5,
        "raster-brightness-max": 1,
        "raster-saturation": -0.05,
        "raster-contrast": 0.1,
      },
    },
  ],
};

function complaintMarkerColor(severity: string): string {
  const tone = SEVERITY_TONE[severity] ?? "muted";
  switch (tone) {
    case "destructive":
      return "var(--color-destructive)";
    case "warning":
      return "#d97706";
    case "success":
      return "var(--color-success, #16a34a)";
    default:
      return "var(--color-muted-foreground)";
  }
}

function buildEnvDotHTML(level: number, active: boolean): string {
  const color = aqiColor(level);
  const size = active ? 22 : 15;
  return `<div aria-hidden="true" style="
    width:${size}px;height:${size}px;border-radius:9999px;background:${color};
    border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.35);
    cursor:pointer;transition:width 0.15s ease,height 0.15s ease;"></div>`;
}

function buildComplaintPinHTML(severity: string, active: boolean): string {
  const color = complaintMarkerColor(severity);
  const size = active ? 20 : 14;
  return `<div aria-hidden="true" style="
    width:${size}px;height:${size}px;border-radius:4px;transform:rotate(45deg);
    background:${color};border:2px solid rgba(255,255,255,0.9);
    box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer;
    transition:width 0.15s ease,height 0.15s ease;"></div>`;
}

type SelectedMarker =
  | { kind: "location"; data: MapLocation }
  | { kind: "complaint"; data: MapComplaint };

interface CityOption {
  id: string;
  name: string;
}

function normalizeCities(resp: unknown): CityOption[] {
  if (!resp) return [];
  let rawList: unknown[] = [];
  if (Array.isArray(resp)) {
    rawList = resp;
  } else if (typeof resp === "object" && resp !== null) {
    const obj = resp as Record<string, unknown>;
    if (Array.isArray(obj.cities)) {
      rawList = obj.cities;
    } else if (Array.isArray(obj.data)) {
      rawList = obj.data;
    } else if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.cities)) {
        rawList = nested.cities;
      }
    }
  }

  return rawList
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const id = String(item.id ?? item.cityId ?? item._id ?? "").trim();
      const name = String(item.name ?? item.cityName ?? id).trim();
      return { id, name };
    })
    .filter((c) => Boolean(c.id));
}

export function AuthoritySmartMap({
  onOpenComplaint = () => {},
}: {
  /** Optional — defaults to a no-op so this component is safely renderable
   *  with zero props from the generic command-center tab table. The real
   *  handler (jumping to the Work Queue with the complaint pre-selected)
   *  is supplied via a render-time override in routes/command-center.tsx,
   *  the same pattern already used for ExecutiveOverview's onNavigate. */
  onOpenComplaint?: (complaintId: string) => void;
} = {}) {
  const { user: currentUser } = useAuth();
  const { resolvedTheme } = useTheme();

  const { data: citiesResp } = useQuery({
    queryKey: ["monitoring-cities"],
    queryFn: () => environmentalApi.getCities(),
    staleTime: 5 * 60_000,
  });
  const cities = useMemo(() => normalizeCities(citiesResp), [citiesResp]);

  const jurisdictionCities = currentUser?.assignedCities ?? [];
  const [cityId, setCityId] = useState<string>(jurisdictionCities[0] ?? "");

  // Default to the first jurisdiction city once the city list resolves, if
  // no explicit selection has been made yet.
  useEffect(() => {
    if (cityId) return;
    if (jurisdictionCities[0]) {
      setCityId(jurisdictionCities[0]);
    } else if (cities[0]) {
      setCityId(cities[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities.length, jurisdictionCities.join(",")]);

  const [showLocations, setShowLocations] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);
  const [selected, setSelected] = useState<SelectedMarker | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const locationMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const complaintMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapMounted, setMapMounted] = useState(false);

  const {
    data: mapDataResp,
    isLoading: locationsLoading,
    isError: locationsError,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: ["monitoring-map-data", cityId],
    queryFn: () => environmentalApi.getCityMapData(cityId),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
    throwOnError: false,
  });
  const mapData = mapDataResp?.data;
  const locations: MapLocation[] = useMemo(
    () => (Array.isArray(mapData?.locations) ? mapData.locations : []),
    [mapData],
  );

  const {
    data: complaintsResp,
    isLoading: complaintsLoading,
    isError: complaintsError,
  } = useQuery({
    queryKey: ["monitoring-map-complaints", cityId],
    queryFn: () => environmentalApi.getMapComplaints(cityId),
    enabled: !!cityId,
    staleTime: 60_000,
    retry: 1,
    throwOnError: false,
  });
  const complaints: MapComplaint[] = useMemo(
    () => (Array.isArray(complaintsResp?.data) ? complaintsResp.data : []),
    [complaintsResp],
  );

  // Real active-alert count for the selected city — not plotted on the
  // map (no coordinates exist on Alert documents), shown as an honest
  // banner instead.
  const { data: alertsResp } = useQuery({
    queryKey: ["monitoring-city-alerts", cityId],
    queryFn: () => alertApi.getActive(cityId),
    enabled: !!cityId,
    staleTime: 60_000,
    retry: 1,
    throwOnError: false,
  });
  const activeAlertCount: number = useMemo(() => {
    if (!alertsResp) return 0;
    const obj = alertsResp as { data?: { alerts?: unknown[] } | unknown[]; alerts?: unknown[] };
    if (Array.isArray(obj.data)) return obj.data.length;
    if (Array.isArray(obj.data?.alerts)) return obj.data.alerts.length;
    if (Array.isArray(obj.alerts)) return obj.alerts.length;
    return 0;
  }, [alertsResp]);

  // ── Map init — remounts on city change, same pattern as env-explore.tsx ──
  useEffect(() => {
    if (!mapContainerRef.current || !mapData) return;

    const style = resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style,
      center: [mapData.center.lng, mapData.center.lat],
      zoom: Math.max(mapData.zoom - 1, 9),
      attributionControl: false,
      interactive: true,
      dragRotate: false,
      touchPitch: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      "top-right",
    );
    mapRef.current = map;
    setSelected(null);
    map.on("load", () => setMapMounted(true));

    const locMarkers = locationMarkersRef.current;
    const cMarkers = complaintMarkersRef.current;
    return () => {
      locMarkers.forEach((m) => m.remove());
      locMarkers.clear();
      cMarkers.forEach((m) => m.remove());
      cMarkers.clear();
      map.remove();
      mapRef.current = null;
      setMapMounted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData?.cityId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE);
  }, [resolvedTheme]);

  // ── Env location markers ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapMounted) return;
    locationMarkersRef.current.forEach((m) => m.remove());
    locationMarkersRef.current.clear();
    if (!showLocations) return;

    for (const loc of locations) {
      const el = document.createElement("div");
      const active = selected?.kind === "location" && selected.data.id === loc.id;
      el.innerHTML = buildEnvDotHTML(loc.level, active);
      const child = el.firstElementChild as HTMLElement;
      child.addEventListener("click", () => setSelected({ kind: "location", data: loc }));
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map);
      locationMarkersRef.current.set(loc.id, marker);
    }
  }, [locations, mapMounted, showLocations, selected]);

  // ── Complaint markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapMounted) return;
    complaintMarkersRef.current.forEach((m) => m.remove());
    complaintMarkersRef.current.clear();
    if (!showComplaints) return;

    for (const c of complaints) {
      const el = document.createElement("div");
      const active = selected?.kind === "complaint" && selected.data.id === c.id;
      el.innerHTML = buildComplaintPinHTML(c.severity, active);
      const child = el.firstElementChild as HTMLElement;
      child.addEventListener("click", () => setSelected({ kind: "complaint", data: c }));
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.lng, c.lat])
        .addTo(map);
      complaintMarkersRef.current.set(c.id, marker);
    }
  }, [complaints, mapMounted, showComplaints, selected]);

  const resetView = () => {
    const map = mapRef.current;
    if (!map || !mapData) return;
    map.flyTo({ center: [mapData.center.lng, mapData.center.lat], zoom: Math.max(mapData.zoom - 1, 9) });
  };

  const toggleFullscreen = () => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  const isLoading = locationsLoading || complaintsLoading;
  const hasError = locationsError || complaintsError;

  return (
    <div className="space-y-4">
      {/* City selector — jurisdiction cities pinned first (spec §3) */}
      <div className="flex flex-wrap items-center gap-2">
        {jurisdictionCities.length > 0 && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
            Your Jurisdiction
          </span>
        )}
        {jurisdictionCities.map((id) => {
          const city = cities.find((c) => c.id === id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCityId(id)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                cityId === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30",
              )}
            >
              {city?.name ?? id}
            </button>
          );
        })}
        <select
          value={jurisdictionCities.includes(cityId) ? "" : cityId}
          onChange={(e) => e.target.value && setCityId(e.target.value)}
          className="text-xs rounded-full border border-border/60 bg-background/50 px-3 py-1.5 outline-none focus:border-primary ml-auto"
        >
          <option value="" disabled>
            {jurisdictionCities.length > 0 ? "Other cities…" : "Select a city…"}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {activeAlertCount > 0 && (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2">
          <AlertTriangle className="size-3.5 shrink-0" />
          {activeAlertCount} active alert{activeAlertCount !== 1 ? "s" : ""} in{" "}
          {cities.find((c) => c.id === cityId)?.name ?? cityId}
        </div>
      )}

      <Panel eyebrow="Smart Map" title="Environmental & Complaint Locations">
        {!cityId ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Select a city to view the map.
          </div>
        ) : hasError ? (
          <div className="flex items-center gap-2 text-sm text-destructive py-6">
            <AlertTriangle className="size-4 shrink-0" />
            We couldn't load map data for this city.
          </div>
        ) : isLoading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            Loading map…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocations((v) => !v)}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    showLocations
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  Monitoring Locations ({locations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowComplaints((v) => !v)}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    showComplaints
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  Complaints ({complaints.length})
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={resetView}
                    title="Reset view"
                    aria-label="Reset map view"
                    className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/40"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title="Fullscreen"
                    aria-label="Toggle fullscreen map"
                    className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/40"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={mapContainerRef}
                role="img"
                aria-label={`Map of ${cities.find((c) => c.id === cityId)?.name ?? cityId}`}
                className="relative h-[420px] sm:h-[480px] w-full rounded-xl overflow-hidden border border-border/60"
              />

              {mapData?.updatedAt && (
                <p className="text-[10px] text-muted-foreground px-1">
                  Environmental data last updated{" "}
                  {new Date(mapData.updatedAt).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              )}

              {/* AQI legend — reuses the exact same scale as everywhere else */}
              <div className="flex flex-wrap items-center gap-3 px-1 pt-1">
                {[0, 51, 101, 151, 201, 301].map((lvl) => (
                  <span key={lvl} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: aqiColor(lvl) }}
                      aria-hidden="true"
                    />
                    {aqiLabel(lvl)}
                  </span>
                ))}
              </div>
            </div>

            {/* Detail panel — location or complaint, whichever is selected */}
            <div className="lg:col-span-1">
              {!selected ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl p-6">
                  <MapPin className="size-5 mb-2 opacity-50" />
                  Select a marker to see details.
                </div>
              ) : selected.kind === "location" ? (
                <div className="border border-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">{selected.data.name}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {CATEGORY_LABEL[selected.data.category] ?? selected.data.category}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      aria-label="Close location details"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <span
                    className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: categoryColor(selected.data.category),
                      background: `color-mix(in oklab, ${categoryColor(selected.data.category)} 14%, transparent)`,
                    }}
                  >
                    AQI {selected.data.level} · {aqiLabel(selected.data.level)}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selected.data.pm25 != null && (
                      <div>
                        <div className="text-muted-foreground">PM2.5</div>
                        <div className="font-medium">{selected.data.pm25} µg/m³</div>
                      </div>
                    )}
                    {selected.data.pm10 != null && (
                      <div>
                        <div className="text-muted-foreground">PM10</div>
                        <div className="font-medium">{selected.data.pm10} µg/m³</div>
                      </div>
                    )}
                    {selected.data.no2 != null && (
                      <div>
                        <div className="text-muted-foreground">NO2</div>
                        <div className="font-medium">{selected.data.no2} ppb</div>
                      </div>
                    )}
                    {selected.data.temp != null && (
                      <div>
                        <div className="text-muted-foreground">Temp</div>
                        <div className="font-medium">{selected.data.temp}°C</div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    {selected.data.description}
                  </p>
                </div>
              ) : (
                <div className="border border-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold line-clamp-2">{selected.data.title}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {ISSUE_LABELS[selected.data.issueType] ?? selected.data.issueType}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      aria-label="Close complaint details"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Pill tone={SEVERITY_TONE[selected.data.severity] ?? "muted"}>
                      {selected.data.severity}
                    </Pill>
                    <Pill tone="muted">{STATUS_LABEL[selected.data.status] ?? selected.data.status}</Pill>
                  </div>
                  {selected.data.address && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <MapPin className="size-3.5 shrink-0 mt-0.5" />
                      {selected.data.address}
                    </p>
                  )}
                  {currentUser?.role === "administrator" ||
                  (currentUser?.role === "authority" &&
                    Boolean(
                      selected.data.assignedTo &&
                        String(selected.data.assignedTo) === String(currentUser._id),
                    )) ? (
                    <button
                      type="button"
                      onClick={() => onOpenComplaint(selected.data.id)}
                      className="w-full text-xs font-medium text-center py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Open Complaint
                    </button>
                  ) : (
                    <div
                      className="w-full text-xs font-medium text-center py-2 rounded-lg bg-muted text-muted-foreground border border-border/50 select-none"
                      title="You can only open complaints assigned to your authority account."
                    >
                      Not assigned to you
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
