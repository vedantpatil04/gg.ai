import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowRight, ChevronDown, MapPin, ShieldAlert, Sparkles, Activity } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useTheme } from "@/lib/theme";
import { environmentalApi, type MapLocation } from "@/lib/api/environmental.api";
import { OSM_DARK_STYLE } from "@/lib/map/base-map-config";
import { aqiColor, aqiLabel, categoryColor, CATEGORY_LABEL } from "@/lib/map/map-visuals";
import { EnvExploreSkeleton } from "@/components/environment/env-loading-skeletons";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

/**
 * SECTION 07 — ENVIRONMENTAL MONITORING NETWORK
 *
 * "Where are conditions occurring across the city?"
 *
 * Features:
 *  - Title: "Environmental Monitoring Network"
 *  - Dynamic subtitle: "${count} monitored locations across ${city.name}"
 *  - Minimal, responsive MapLibre canvas with location pins
 *  - Concise Area Comparison summary (Highest AQI, Lowest AQI, Most Improved / Stable when data exists)
 *  - "View all monitored locations →" interaction
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

function buildDotHTML(level: number, active: boolean): string {
  const color = aqiColor(level);
  const size = active ? 20 : 14;
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

export function EnvironmentalExplore({ className }: { className?: string }) {
  const { city } = useCity();
  const cityId = city?.id;
  const { resolvedTheme } = useTheme();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapMounted, setMapMounted] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);

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
  });

  const mapData = mapResp?.data;
  const locations: MapLocation[] = useMemo(
    () => (mapData?.locations ?? []).slice().sort((a, b) => b.level - a.level),
    [mapData],
  );

  const hasLocations = locations.length > 0;
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  // Derived Area Comparison items (strictly data-dependent)
  const highestLocation = useMemo(() => (hasLocations ? locations[0] : null), [locations, hasLocations]);
  const lowestLocation = useMemo(
    () => (hasLocations ? locations[locations.length - 1] : null),
    [locations, hasLocations],
  );

  // MapLibre initialization
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
  }, [mapData?.cityId]);

  // Handle theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE);
  }, [resolvedTheme]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapMounted) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const loc of locations) {
      const el = document.createElement("div");
      el.innerHTML = buildDotHTML(loc.level, loc.id === selectedId);
      const child = el.firstElementChild as HTMLElement;
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
      <section aria-labelledby="env-explore-title" className={cn("space-y-3.5", className)}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
          <span
            id="env-explore-title"
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Environmental Monitoring Network
          </span>
        </div>
        <EnvErrorState
          onRetry={() => refetch()}
          retryDisabled={false}
          message="Unable to load location monitoring network."
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="env-explore-title" className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-explore-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Environmental Monitoring Network
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        {!hasLocations ? (
          <EnvEmptyState
            title="No location data available"
            description={`There are no monitored locations on record for ${city?.name ?? "this city"} yet.`}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border/50">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  Monitored Environmental Network
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {locations.length} monitored location{locations.length === 1 ? "" : "s"} across {city?.name}
                </p>
              </div>

              <Link
                to="/map"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary py-1 px-3 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                Open Smart Map <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* Area Comparison Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {highestLocation && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/60">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                      Highest AQI
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-foreground truncate block mt-0.5">
                      {highestLocation.name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full shrink-0"
                    style={{
                      color: aqiColor(highestLocation.level),
                      background: `color-mix(in oklab, ${aqiColor(highestLocation.level)} 14%, transparent)`,
                    }}
                  >
                    AQI {highestLocation.level}
                  </span>
                </div>
              )}

              {lowestLocation && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/60">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                      Lowest AQI
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-foreground truncate block mt-0.5">
                      {lowestLocation.name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full shrink-0"
                    style={{
                      color: aqiColor(lowestLocation.level),
                      background: `color-mix(in oklab, ${aqiColor(lowestLocation.level)} 14%, transparent)`,
                    }}
                  >
                    AQI {lowestLocation.level}
                  </span>
                </div>
              )}
            </div>

            {/* Compact Map Canvas */}
            <div
              ref={mapContainerRef}
              role="img"
              aria-label={`Map of monitored locations in ${city?.name ?? "the current city"}`}
              className="relative h-56 sm:h-64 w-full rounded-xl overflow-hidden border border-border/70"
            />

            {/* Expandable Location List */}
            <div>
              <button
                type="button"
                onClick={() => setShowAllLocations((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <span>{showAllLocations ? "Hide location details" : "View all monitored locations →"}</span>
                <ChevronDown
                  className={cn("size-3.5 transition-transform duration-200", showAllLocations && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {showAllLocations && (
                <ul className="mt-3 space-y-1.5" aria-label="Monitored locations list">
                  {locations.map((loc) => {
                    const active = loc.id === selectedId;
                    return (
                      <li key={loc.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(active ? null : loc.id)}
                          aria-expanded={active}
                          className={cn(
                            "w-full flex items-center gap-3 text-left px-3 py-2 rounded-xl border transition-colors",
                            active
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/60 hover:border-border hover:bg-muted/30",
                          )}
                        >
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ background: aqiColor(loc.level) }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs sm:text-sm font-medium truncate text-foreground">
                              {loc.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
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
                          <div className="px-3 py-2 text-xs text-muted-foreground border border-t-0 border-primary/40 rounded-b-xl -mt-1 bg-primary/[0.03]">
                            {loc.description}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
