/**
 * complaint-location-map.tsx — Phase 12
 *
 * Interactive MapLibre map for complaint location selection.
 * Features: GPS location, drop/drag pin, address search, reverse geocoding,
 * dark/light mode support matching the existing SmartMapCanvas style.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MapPin,
  Locate,
  Search,
  X,
  Loader2,
  Navigation2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useGeolocation } from "@/hooks/use-geolocation";
import { OSM_DARK_STYLE } from "@/lib/map/base-map-config";

// ─── Light map style (public OSM raster, brightness-boosted) ─────────────────

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
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#f4f4f4" },
    },
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationSelection {
  lat: number;
  lng: number;
  address: string;
  ward?: string;
}

interface ComplaintLocationMapProps {
  value?: LocationSelection | null;
  onChange: (loc: LocationSelection | null) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  className?: string;
}

// ─── Reverse geocoding via Nominatim (OpenStreetMap, free, no key) ─────────

async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; ward?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) throw new Error("Nominatim error");
    const data = await res.json() as {
      display_name?: string;
      address?: {
        suburb?: string;
        neighbourhood?: string;
        city_district?: string;
        ward?: string;
        road?: string;
        county?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};
    const line1 = [a.road, a.suburb ?? a.neighbourhood].filter(Boolean).join(", ");
    const line2 = [a.city ?? a.town ?? a.village, a.county, a.state].filter(Boolean).join(", ");
    const address = line1 ? `${line1}, ${line2}` : (data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    const ward = a.city_district ?? a.ward ?? a.suburb;
    return { address, ward };
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

async function geocodeSearch(query: string): Promise<Array<{ lat: number; lng: number; label: string }>> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return [];
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    return data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }));
  } catch {
    return [];
  }
}

// ─── Custom pin marker HTML ───────────────────────────────────────────────────

function buildPinHTML(dragging: boolean): string {
  return `
    <div style="
      width: 32px; height: 40px; cursor: ${dragging ? "grabbing" : "grab"};
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
      transform-origin: bottom center;
      transition: transform 0.15s ease;
    ">
      <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16C0 24 8 34 14 38.5C15.1 39.3 16.9 39.3 18 38.5C24 34 32 24 32 16C32 7.163 24.837 0 16 0Z"
          fill="var(--color-primary)" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white" opacity="0.95"/>
      </svg>
    </div>
  `;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComplaintLocationMap({
  value,
  onChange,
  defaultCenter = [0, 20],
  defaultZoom = 2,
  className,
}: ComplaintLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);

  const { resolvedTheme } = useTheme();
  const geo = useGeolocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; label: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const style = resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style,
      center: value ? [value.lng, value.lat] : defaultCenter,
      zoom: value ? 14 : defaultZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    // Place initial pin if value provided
    if (value) {
      placePin(value.lng, value.lat);
    }

    // Click to drop pin
    map.on("click", async (e) => {
      await placePinAndGeocode(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Theme change → update map style ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE;
    map.setStyle(style);
  }, [resolvedTheme]);

  // ── Place pin without geocoding ───────────────────────────────────────────
  const placePin = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    const el = document.createElement("div");
    el.innerHTML = buildPinHTML(false);
    markerElRef.current = el;

    const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on("dragstart", () => {
      if (markerElRef.current) {
        markerElRef.current.innerHTML = buildPinHTML(true);
      }
    });

    marker.on("dragend", async () => {
      if (markerElRef.current) {
        markerElRef.current.innerHTML = buildPinHTML(false);
      }
      const lngLat = marker.getLngLat();
      await placePinAndGeocode(lngLat.lng, lngLat.lat, false);
    });

    markerRef.current = marker;
  }, []);

  // ── Place pin + reverse geocode ───────────────────────────────────────────
  const placePinAndGeocode = useCallback(
    async (lng: number, lat: number, flyTo = true) => {
      const map = mapRef.current;
      if (!map) return;

      placePin(lng, lat);

      if (flyTo) {
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 500 });
      }

      setIsGeocoding(true);
      const { address, ward } = await reverseGeocode(lat, lng);
      setIsGeocoding(false);
      onChange({ lat, lng, address, ward });
    },
    [placePin, onChange],
  );

  // ── GPS locate ────────────────────────────────────────────────────────────
  const handleLocate = useCallback(() => {
    geo.locate();
  }, [geo]);

  useEffect(() => {
    if (geo.status === "granted" && geo.position) {
      placePinAndGeocode(geo.position.lng, geo.position.lat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.position?.lat, geo.position?.lng]);

  // ── Address search ────────────────────────────────────────────────────────
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await geocodeSearch(q);
      setSearchResults(results);
      setShowResults(results.length > 0);
      setIsSearching(false);
    }, 500);
  };

  const handleSearchSelect = async (result: { lat: number; lng: number; label: string }) => {
    setSearchQuery(result.label.split(",")[0]);
    setShowResults(false);
    setSearchResults([]);
    await placePinAndGeocode(result.lng, result.lat);
  };

  const handleClearLocation = () => {
    onChange(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setSearchQuery("");
  };

  return (
    <div className={cn("glass rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="size-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in oklab, var(--color-info) 15%, transparent)" }}
          >
            <MapPin className="size-3.5" style={{ color: "var(--color-info)" }} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight">Location</div>
            <div className="text-[10px] text-muted-foreground">
              {isGeocoding
                ? "Getting address…"
                : value
                  ? value.address.slice(0, 45) + (value.address.length > 45 ? "…" : "")
                  : "Click map or use GPS to select location"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClearLocation(); }}
              className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
          {isCollapsed ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50">
              {/* Search bar */}
              <div className="px-3 py-2 relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search address or landmark…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-border bg-background/80 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  {isSearching ? (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
                  ) : searchQuery ? (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setShowResults(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Search results dropdown */}
                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-3 right-3 top-full mt-1 glass rounded-xl border border-border shadow-lg z-50 overflow-hidden"
                    >
                      {searchResults.slice(0, 5).map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSearchSelect(r)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors flex items-start gap-2 border-b border-border/40 last:border-0"
                        >
                          <MapPin className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                          <span className="line-clamp-2 text-foreground/80">{r.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Map container */}
              <div className="relative" style={{ height: "240px" }}>
                <div ref={mapContainerRef} className="absolute inset-0" />

                {/* GPS button */}
                <button
                  type="button"
                  onClick={handleLocate}
                  disabled={geo.status === "requesting"}
                  className={cn(
                    "absolute top-2 right-2 size-8 rounded-xl glass border border-border/60 flex items-center justify-center transition-all z-10",
                    "hover:border-primary/40 hover:bg-primary/10",
                    geo.status === "requesting" && "opacity-60 cursor-wait",
                  )}
                  title="Use current location"
                >
                  {geo.status === "requesting" ? (
                    <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Navigation2 className="size-3.5 text-muted-foreground" />
                  )}
                </button>

                {/* Hint overlay when no pin */}
                {!value && (
                  <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none z-10">
                    <div className="glass rounded-full px-3 py-1.5 text-[10px] text-muted-foreground border border-border/40">
                      Click map to drop a pin
                    </div>
                  </div>
                )}
              </div>

              {/* Location details */}
              {value && (
                <div className="px-3 pb-3 pt-2 space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/30 px-2.5 py-1.5">
                      <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Latitude</div>
                      <div className="text-xs font-mono font-medium">{value.lat.toFixed(5)}</div>
                    </div>
                    <div className="rounded-xl bg-muted/30 px-2.5 py-1.5">
                      <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Longitude</div>
                      <div className="text-xs font-mono font-medium">{value.lng.toFixed(5)}</div>
                    </div>
                  </div>
                  {value.ward && (
                    <div className="rounded-xl bg-muted/30 px-2.5 py-1.5">
                      <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Ward / Area</div>
                      <div className="text-xs font-medium">{value.ward}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
