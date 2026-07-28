import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatDistanceToNow } from "date-fns";
import { Locate, ExternalLink, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCity } from "@/lib/city-context";
import { findAqiBand, AQI_BANDS, type City } from "@/lib/mock-data";
import { OSM_STYLE } from "@/components/map/SmartMapCanvas";
import { buildMarkerHTML, measureDistanceMeters } from "@/lib/map/map-visuals";
import { Button } from "@/components/ui/button";
import { EnvMapPreviewSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — Smart Environmental Map & Spatial Intelligence
 * (Phase 7 upgrade of the Phase 1 map preview).
 *
 * Retains the exact same MapLibre + OSM_STYLE + buildMarkerHTML stack.
 * No second map library, no second map instance.
 *
 * Phase 7 additions (all data from `useCity()` — no new API calls):
 *   • Nearby city markers (up to MAX_NEARBY closest cities with coords + AQI).
 *   • Filter tabs — AQI / Temperature / PM2.5 — change which metric is
 *     emphasized in the accessible companion list (marker colour always stays
 *     AQI-based since that's what `buildMarkerHTML` encodes; the tabs let the
 *     user read a different column in the list below).
 *   • AQI legend (reuses `AQI_BANDS` — no second threshold system).
 *   • Spatial intelligence panel — derived from real nearby-city readings.
 *   • Accessible companion list — all locations visible as text for
 *     screen-readers and for users when map tiles fail to load.
 *
 * Data granularity: city-level only. No heatmap, no street-level claims,
 * no fake sensor readings.
 */

const MAX_NEARBY = 6;
const NEARBY_RADIUS_M = 500_000; // 500 km — show cities within this radius

type FilterKey = "aqi" | "temp" | "pm25";

const FILTER_LABELS: Record<FilterKey, string> = {
  aqi: "AQI",
  temp: "Temperature",
  pm25: "PM2.5",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPopupHTML(c: City, isSelected: boolean, updatedLabel?: string): string {
  const band = findAqiBand(c.aqi);
  const rows: string[] = [];
  if (isSelected && updatedLabel) {
    rows.push(`<div style="font-size:10px;opacity:0.6;margin-top:6px">${updatedLabel}</div>`);
  }
  if (typeof c.temp === "number") {
    rows.push(`<div style="font-size:11px;opacity:0.75;margin-top:4px">🌡 ${c.temp}°C</div>`);
  }
  if (typeof c.pm25 === "number") {
    rows.push(`<div style="font-size:11px;opacity:0.75">PM2.5 ${c.pm25} µg/m³</div>`);
  }
  return `
    <div style="font-family:inherit;min-width:180px">
      <div style="font-weight:600;font-size:13px">${c.name}${isSelected ? " 📍" : ""}</div>
      <div style="font-size:11px;opacity:0.7;margin-bottom:6px">${c.country ?? ""}</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px">
        <span style="width:8px;height:8px;border-radius:50%;background:${band.colorRaw};flex-shrink:0"></span>
        AQI ${c.aqi} — ${band.label}
      </div>
      ${rows.join("")}
    </div>
  `;
}

function buildMarkerEl(c: City, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = buildMarkerHTML({
    level: c.aqi,
    sensorType: "environmental",
    sensor: false,
    selected,
  });
  return el;
}

// ─── Spatial Intelligence ─────────────────────────────────────────────────────

function SpatialInsights({
  current,
  nearby,
}: {
  current: City;
  nearby: { city: City; distanceMeters: number }[];
}) {
  if (nearby.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        More nearby environmental data is needed for spatial comparison.
      </p>
    );
  }

  const currentBetter = nearby.filter((n) => n.city.aqi > current.aqi).length;
  const currentWorse = nearby.filter((n) => n.city.aqi < current.aqi).length;
  const highest = [...nearby].sort((a, b) => b.city.aqi - a.city.aqi)[0];
  const lowest = [...nearby].sort((a, b) => a.city.aqi - b.city.aqi)[0];

  const summary =
    currentBetter > nearby.length / 2
      ? `${current.name} currently has better air quality than most nearby monitored locations.`
      : currentWorse > nearby.length / 2
        ? `${current.name}'s air quality is lower than most nearby monitored locations.`
        : `Air quality across nearby monitored locations is broadly similar to ${current.name}.`;

  const highBand = findAqiBand(highest.city.aqi);
  const lowBand = findAqiBand(lowest.city.aqi);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/30 p-3 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Highest measured AQI nearby
          </span>
          <div className="text-sm font-semibold truncate">{highest.city.name}</div>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              color: highBand.color,
              borderColor: `color-mix(in oklab, ${highBand.color} 35%, transparent)`,
              background: `color-mix(in oklab, ${highBand.color} 12%, transparent)`,
            }}
          >
            AQI {highest.city.aqi} · {highBand.label}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card/30 p-3 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Lowest measured AQI nearby
          </span>
          <div className="text-sm font-semibold truncate">{lowest.city.name}</div>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              color: lowBand.color,
              borderColor: `color-mix(in oklab, ${lowBand.color} 35%, transparent)`,
              background: `color-mix(in oklab, ${lowBand.color} 12%, transparent)`,
            }}
          >
            AQI {lowest.city.aqi} · {lowBand.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── AQI Legend ───────────────────────────────────────────────────────────────

function AqiLegend({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-xl border border-border p-3 space-y-1.5", className)}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2">
        AQI Legend
      </span>
      {AQI_BANDS.slice(0, 5).map((band) => (
        <div key={band.label} className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ background: band.colorRaw }}
            aria-hidden="true"
          />
          <span className="text-[11px] text-muted-foreground">{band.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Accessible companion list ────────────────────────────────────────────────

function AccessibleLocationList({
  current,
  nearby,
  filter,
}: {
  current: City;
  nearby: { city: City; distanceMeters: number }[];
  filter: FilterKey;
}) {
  const all = [{ city: current, distanceMeters: 0 }, ...nearby];

  function metricLabel(c: City): string {
    if (filter === "temp" && typeof c.temp === "number") return `${c.temp}°C`;
    if (filter === "pm25" && typeof c.pm25 === "number") return `PM2.5 ${c.pm25} µg/m³`;
    return `AQI ${c.aqi}`;
  }

  return (
    <ul className="space-y-2" aria-label="Environmental locations">
      {all.map(({ city: c, distanceMeters }) => {
        const band = findAqiBand(c.aqi);
        const isSelected = c.id === current.id;
        return (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isSelected && (
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className={cn("truncate", isSelected && "font-medium")}>{c.name}</span>
              {isSelected && (
                <span className="text-[10px] text-muted-foreground shrink-0">(selected)</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground tabular-nums">{metricLabel(c)}</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{
                  color: band.color,
                  borderColor: `color-mix(in oklab, ${band.color} 35%, transparent)`,
                  background: `color-mix(in oklab, ${band.color} 12%, transparent)`,
                }}
              >
                {band.shortLabel}
              </span>
              {distanceMeters > 0 && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {distanceMeters < 1000
                    ? `${Math.round(distanceMeters)} m`
                    : `${Math.round(distanceMeters / 1000)} km`}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EnvMap({ className }: { className?: string }) {
  const {
    city,
    cities,
    isCityListLoading,
    isCityError,
    cityDataUpdatedAt,
    isApiConnected,
    refreshCity,
  } = useCity();

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const nearbyMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [initError, setInitError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("aqi");

  const hasCoords = typeof city?.lat === "number" && typeof city?.lng === "number";

  // Nearby cities: real coordinates + AQI, within radius, sorted by distance
  const nearby = useMemo(() => {
    if (!hasCoords || !cities) return [];
    return (cities as City[])
      .filter(
        (c) =>
          c.id !== city.id &&
          typeof c.aqi === "number" &&
          typeof c.lat === "number" &&
          typeof c.lng === "number",
      )
      .map((c) => ({ city: c, distanceMeters: measureDistanceMeters(city, c) }))
      .filter((n) => n.distanceMeters <= NEARBY_RADIUS_M)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, MAX_NEARBY);
  }, [city.id, city.lat, city.lng, cities, hasCoords]);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasCoords || !container || mapRef.current) return;
    try {
      const map = new maplibregl.Map({
        container,
        style: OSM_STYLE,
        center: [city.lng, city.lat],
        zoom: 9,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => setMapReady(true));
      map.on("error", () => setInitError(true));
      mapRef.current = map;
    } catch {
      setInitError(true);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, container]);

  // ── Selected city marker + recenter ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !hasCoords) return;

    const updatedLabel =
      isApiConnected && cityDataUpdatedAt
        ? `Updated ${formatDistanceToNow(cityDataUpdatedAt, { addSuffix: true })}`
        : undefined;

    const el = buildMarkerEl(city, true);
    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([city.lng, city.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
          buildPopupHTML(city, true, updatedLabel),
        ),
      )
      .addTo(map);

    map.flyTo({ center: [city.lng, city.lat], zoom: 9, duration: 1200 });
  }, [
    city.id,
    city.lat,
    city.lng,
    city.aqi,
    city.name,
    city.country,
    mapReady,
    hasCoords,
    isApiConnected,
    cityDataUpdatedAt,
  ]);

  // ── Nearby markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous nearby markers
    nearbyMarkersRef.current.forEach((m) => m.remove());
    nearbyMarkersRef.current = [];

    nearby.forEach(({ city: c }) => {
      if (typeof c.lat !== "number" || typeof c.lng !== "number") return;
      const el = buildMarkerEl(c, false);
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.lng, c.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
            buildPopupHTML(c, false),
          ),
        )
        .addTo(map);
      nearbyMarkersRef.current.push(marker);
    });

    return () => {
      nearbyMarkersRef.current.forEach((m) => m.remove());
      nearbyMarkersRef.current = [];
    };
  }, [nearby, mapReady]);

  const recenter = () => {
    if (!mapRef.current || !hasCoords) return;
    mapRef.current.flyTo({ center: [city.lng, city.lat], zoom: 9, duration: 800 });
  };

  if (isCityListLoading) return <EnvMapPreviewSkeleton className={className} />;

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="We couldn't load the map right now."
      />
    );
  }

  if (!hasCoords) {
    return (
      <EnvEmptyState className={className} title="Location data is unavailable for this city." />
    );
  }

  if (initError) {
    return <EnvErrorState className={className} message="We couldn't load the map right now." />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Map card */}
      <div className="glass rounded-2xl p-5 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Smart Environmental Map
            </span>
            <h3 className="text-sm font-medium mt-0.5">
              {city.name}, {city.country}
              {isApiConnected && cityDataUpdatedAt && (
                <span className="text-[10px] text-muted-foreground font-normal ml-2">
                  · Updated {formatDistanceToNow(cityDataUpdatedAt, { addSuffix: true })}
                </span>
              )}
            </h3>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/map">
              Open Smart Map
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Filter tabs */}
        <div
          className="flex items-center gap-2 flex-wrap"
          role="group"
          aria-label="Map display filter"
        >
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              aria-pressed={activeFilter === key}
              className={cn(
                "text-[11px] font-medium px-3 py-1 rounded-full border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                activeFilter === key
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
              )}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Map canvas + overlays */}
        <div className="relative h-80 md:h-96 w-full rounded-xl overflow-hidden border border-border">
          <div ref={setContainer} className="absolute inset-0" />

          {/* AQI Legend overlay */}
          <div className="absolute bottom-10 left-3 z-10">
            <AqiLegend />
          </div>

          {/* Re-center control */}
          <Button
            variant="outline"
            size="icon"
            onClick={recenter}
            aria-label="Re-centre map on selected city"
            className="absolute bottom-3 right-3 z-10 bg-background/90 backdrop-blur-sm"
          >
            <Locate className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Data precision note */}
        <p className="text-xs text-muted-foreground">
          City-level AQI data only. Open Smart Map for sensor-level readings and spatial analysis.
          {nearby.length > 0 &&
            ` Showing ${nearby.length} nearby monitored location${nearby.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Spatial Intelligence panel */}
      {nearby.length > 0 && (
        <div
          className={cn(
            "glass rounded-2xl p-6 md:p-8 space-y-4",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
          )}
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Spatial Intelligence
            </span>
            <h3 className="text-sm font-semibold mt-1">Environmental conditions around you</h3>
          </div>
          <SpatialInsights current={city} nearby={nearby} />
        </div>
      )}

      {/* Accessible companion list */}
      <div
        className={cn(
          "glass rounded-2xl p-6 md:p-8 space-y-4",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Environmental Locations
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              All monitored locations shown on the map above.
            </p>
          </div>
        </div>
        <AccessibleLocationList current={city} nearby={nearby} filter={activeFilter} />
      </div>
    </div>
  );
}
