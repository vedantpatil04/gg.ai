import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowRight, MapPin } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useTheme } from "@/lib/theme";
import { environmentalApi, type MapLocation } from "@/lib/api/environmental.api";
import { OSM_DARK_STYLE } from "@/lib/map/base-map-config";
import { aqiColor, aqiLabel, categoryColor, CATEGORY_LABEL } from "@/lib/map/map-visuals";
import { EnvExploreSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * EnvironmentalExplore — Environmental Overview, Phase 4: Environmental
 * Exploration.
 *
 * "Where are environmental conditions occurring?" — a compact, mostly
 * read-only spatial view of the current city's monitored locations.
 *
 * Architecture rule (hard requirement): this is NOT a second Smart Map.
 *  — No second MapLibre engine, no second basemap provider: this reuses
 *    `OSM_DARK_STYLE` from lib/map/base-map-config.ts, the exact style
 *    SmartMapCanvas is built on.
 *  — No second GIS/location data source: this reuses
 *    `environmentalApi.getCityMapData`, the same endpoint SmartMapCanvas
 *    and the Digital Twin page use for `MapLocation[]`.
 *  — No second AQI/category color system: this reuses `aqiColor()` /
 *    `categoryColor()` from lib/map/map-visuals.ts.
 *  — `SmartMapCanvas` itself is intentionally NOT embedded here — its
 *    props surface (layer manager, live search, measure tool, fullscreen,
 *    geolocation tracking) is the full Smart Map experience, and wiring
 *    all of that in would just recreate a second Smart Map on this page.
 *    Instead this mounts its own minimal MapLibre instance — pan/zoom
 *    only, no controls beyond that — following the same lightweight
 *    pattern already used by components/citizen/complaint-location-map.tsx.
 *  — Anyone wanting the full spatial toolset is sent to /map via the
 *    "Open Smart Map" link, not given a second copy of it here.
 */

// ─── Light basemap style (mirrors complaint-location-map.tsx's local copy —
// no shared light-style export exists in base-map-config.ts yet, so this
// follows the same established per-component pattern rather than editing
// that shared config file). ────────────────────────────────────────────────
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

const MAX_LOCATIONS_SHOWN = 12;

function buildDotHTML(level: number, active: boolean): string {
  const color = aqiColor(level);
  const size = active ? 22 : 16;
  return `
    <div aria-hidden="true"
      style="
        width:${size}px; height:${size}px; border-radius:9999px;
        background:${color}; border:2px solid rgba(255,255,255,0.9);
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        cursor:pointer; transition:width 0.15s ease, height 0.15s ease;
      ">
    </div>
  `;
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
      <span
        id="env-explore-title"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
      >
        Explore the Environment
      </span>
    </div>
  );
}

export function EnvironmentalExplore({
  className,
  onSelectionChange,
}: {
  className?: string;
  /** Optional — fired whenever the selected monitored location changes (or
   *  clears). Purely additive: Phase 4 behaves identically whether or not a
   *  listener is attached. Lets Phase 5's AI entry point ground a question
   *  in whichever location the citizen has selected here, without this
   *  component needing to know anything about AI. */
  onSelectionChange?: (
    location: { id: string; name: string; category: string; level: number } | null,
  ) => void;
}) {
  const { city } = useCity();
  const cityId = city?.id;
  const { resolvedTheme } = useTheme();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapMounted, setMapMounted] = useState(false);

  const {
    data: mapResp,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["env-explore-map-data", cityId],
    queryFn: () => environmentalApi.getCityMapData(cityId as string),
    enabled: !!cityId,
    staleTime: 5 * 60_000,
    retry: 1,
    throwOnError: false,
  });

  const mapData = mapResp?.data;
  const locations: MapLocation[] = useMemo(
    () =>
      (mapData?.locations ?? [])
        .slice()
        .sort((a, b) => b.level - a.level)
        .slice(0, MAX_LOCATIONS_SHOWN),
    [mapData],
  );
  const hasLocations = locations.length > 0;
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  // Notify listener on selection change — additive, no effect on Phase 4's
  // own rendering.
  useEffect(() => {
    onSelectionChange?.(
      selected
        ? {
            id: selected.id,
            name: selected.name,
            category: selected.category,
            level: selected.level,
          }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ── Map init — (re)mounts whenever the loaded city's data changes, so a
  // city switch always tears down the previous city's map/markers rather
  // than repositioning them. ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !mapData || !hasLocations) return;

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
    mapRef.current = map;
    setSelectedId(null);

    map.on("load", () => setMapMounted(true));

    const markers = markersRef.current;
    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
      setMapMounted(false);
    };
    // Re-init only when the city's data actually changes (new cityId) — not
    // on every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData?.cityId]);

  // ── Theme change → swap basemap style (markers are DOM overlays, not
  // style layers, so they survive setStyle untouched). ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE);
  }, [resolvedTheme]);

  // ── Render markers for the current location set ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapMounted) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const loc of locations) {
      const el = document.createElement("div");
      el.innerHTML = buildDotHTML(loc.level, loc.id === selectedId);
      const child = el.firstElementChild as HTMLElement;
      // The map region is declared decorative (role="img" on its container,
      // below) — the accessible list is the real keyboard/screen-reader
      // path, so these dots are pointer/touch-only and don't join the tab
      // order (a tabindex here would be a broken, unlabelled duplicate stop).
      child.addEventListener("click", () => setSelectedId(loc.id));

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map);
      markersRef.current.set(loc.id, marker);
    }
  }, [locations, mapMounted, selectedId]);

  if (!cityId || isLoading) {
    return <EnvExploreSkeleton className={className} />;
  }

  if (isError) {
    return (
      <section aria-labelledby="env-explore-title" className={cn("space-y-4", className)}>
        <SectionHeader />
        <EnvErrorState
          onRetry={() => refetch()}
          retryDisabled={false}
          message="Unable to load location data."
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="env-explore-title" className={cn("space-y-4", className)}>
      <SectionHeader />

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-5">
        {!hasLocations ? (
          <EnvEmptyState
            title="No location data available"
            description={`There aren't any monitored locations on record for ${city?.name ?? "this city"} yet.`}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Monitored Locations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locations.length} location{locations.length === 1 ? "" : "s"} in {city?.name}
                </p>
              </div>
              <Link
                to="/map"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary py-1.5 px-3 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/12 hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Open Smart Map <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* Map — decorative/pointer path. Every location it plots is
                also reachable, with the same info, via the button list
                below, so nothing here depends on precise-pointer or hover
                interaction alone (touch + keyboard both work via the list). */}
            <div
              ref={mapContainerRef}
              role="img"
              aria-label={`Map of monitored locations in ${city?.name ?? "the current city"}`}
              className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-border/60"
            />

            {/* Accessible, keyboard/touch-friendly list — the primary way
                to reach location detail without relying on the map. */}
            <ul className="space-y-1.5" aria-label="Monitored locations">
              {locations.map((loc) => {
                const active = loc.id === selectedId;
                return (
                  <li key={loc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(active ? null : loc.id)}
                      aria-expanded={active}
                      className={cn(
                        "w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        active
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:border-border hover:bg-muted/30",
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ background: aqiColor(loc.level) }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{loc.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {CATEGORY_LABEL[loc.category] ?? loc.category}
                        </span>
                      </span>
                      <span
                        className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          color: categoryColor(loc.category),
                          background: `color-mix(in oklab, ${categoryColor(loc.category)} 14%, transparent)`,
                        }}
                      >
                        AQI {loc.level} · {aqiLabel(loc.level)}
                      </span>
                    </button>
                    {active && (
                      <div className="px-3 py-2.5 text-xs text-muted-foreground border border-t-0 border-primary/40 rounded-b-xl -mt-1 bg-primary/[0.03]">
                        {loc.description}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {selected && (
              <p className="sr-only" role="status">
                Selected {selected.name}, {CATEGORY_LABEL[selected.category] ?? selected.category},
                AQI {selected.level}, {aqiLabel(selected.level)}.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
