/**
 * complaint-location-map.tsx
 *
 * Citizen-first Location Selection Experience for GreenGuard AI.
 *
 * Requirements:
 * 1. Map/drop-pin is OPTIONAL and non-intrusive.
 * 2. Priority order:
 *    - PRIMARY: Search for a place or address
 *    - SECONDARY: Use my current location (GPS)
 *    - SECONDARY: Paste a location link (Google Maps, OpenStreetMap, Apple Maps, geo:, coordinates)
 *    - OPTIONAL: Select on map (expandable)
 * 3. Concise, non-duplicate copy.
 * 4. Selected location card with clear human-readable address & "Change" action.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MapPin,
  Search,
  Navigation2,
  Link as LinkIcon,
  Map as MapIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useGeolocation } from "@/hooks/use-geolocation";
import { OSM_DARK_STYLE } from "@/lib/map/base-map-config";
import { parseLocationLinkOrCoords, reverseGeocodeCoords } from "@/lib/location-link-parser";

// ─── Light map style ─────────────────────────────────────────────────────────

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

// ─── Forward geocoding via Nominatim ──────────────────────────────────────────

async function geocodeSearch(query: string): Promise<Array<{ lat: number; lng: number; label: string }>> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    return data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }));
  } catch {
    return [];
  }
}

// ─── Custom Pin Marker HTML ───────────────────────────────────────────────────

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
  defaultCenter = [77.5946, 12.9716],
  defaultZoom = 12,
  className,
}: ComplaintLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { resolvedTheme } = useTheme();
  const geo = useGeolocation();

  // Mode toggles
  const [activeMode, setActiveMode] = useState<"search" | "link" | "map">("search");
  const [showOptionalMap, setShowOptionalMap] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; label: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Link parsing state
  const [linkInput, setLinkInput] = useState("");
  const [isParsingLink, setIsParsingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Geocoding status
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ── Place pin on map ───────────────────────────────────────────────────────
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

  const placePinAndGeocode = useCallback(
    async (lng: number, lat: number, flyTo = true) => {
      const map = mapRef.current;
      if (map) {
        placePin(lng, lat);
        if (flyTo) {
          map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 500 });
        }
      }

      setIsGeocoding(true);
      const { address, ward } = await reverseGeocodeCoords(lat, lng);
      setIsGeocoding(false);
      onChange({ lat, lng, address, ward });
    },
    [placePin, onChange],
  );

  // ── Init map when optional map is expanded ─────────────────────────────────
  useEffect(() => {
    if (!showOptionalMap || !mapContainerRef.current || mapRef.current) return;
    const style = resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE;

    const center: [number, number] = value ? [value.lng, value.lat] : defaultCenter;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style,
      center,
      zoom: value ? 14 : defaultZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    if (value) {
      placePin(value.lng, value.lat);
    }

    map.on("click", async (e) => {
      await placePinAndGeocode(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOptionalMap]);

  // ── Theme change → update map style ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE;
    map.setStyle(style);
  }, [resolvedTheme]);

  // ── GPS Geolocation Handler ───────────────────────────────────────────────
  const handleUseCurrentLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    geo.locate();
  };

  useEffect(() => {
    if (geo.status === "granted" && geo.position) {
      placePinAndGeocode(geo.position.lng, geo.position.lat);
    } else if (geo.status === "denied") {
      setGpsError("Location permission was denied. Please enable location or search by address.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.position?.lat, geo.position?.lng]);

  // ── Address search handler ────────────────────────────────────────────────
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
    }, 450);
  };

  const handleSelectSearchResult = async (result: { lat: number; lng: number; label: string }) => {
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
    await placePinAndGeocode(result.lng, result.lat);
  };

  // ── Location link parser handler ───────────────────────────────────────────
  const handleParseLink = async () => {
    if (!linkInput.trim()) return;
    setLinkError(null);
    setIsParsingLink(true);

    try {
      const parsed = await parseLocationLinkOrCoords(linkInput);
      if (parsed.isValid && parsed.lat != null && parsed.lng != null) {
        await placePinAndGeocode(parsed.lng, parsed.lat);
        setLinkInput("");
      } else if (parsed.isValid && parsed.address) {
        // Named place without raw coordinates
        const matches = await geocodeSearch(parsed.address);
        if (matches.length > 0) {
          await placePinAndGeocode(matches[0].lng, matches[0].lat);
        } else {
          onChange({
            lat: defaultCenter[1],
            lng: defaultCenter[0],
            address: parsed.address,
          });
        }
        setLinkInput("");
      } else {
        setLinkError(parsed.error || "Could not parse this location link.");
      }
    } catch {
      setLinkError("An error occurred while parsing the link.");
    } finally {
      setIsParsingLink(false);
    }
  };

  // ── Clear location ────────────────────────────────────────────────────────
  const handleClear = () => {
    onChange(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setSearchQuery("");
    setLinkInput("");
    setLinkError(null);
    setGpsError(null);
  };

  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-4 space-y-3.5", className)}>
      {/* Selected Location Banner (When location is chosen) */}
      {value ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Selected Location
                </div>
                <p className="text-sm font-medium text-foreground mt-0.5 leading-snug">
                  {value.address}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground font-mono">
                  <span>
                    {value.lat.toFixed(5)}° N, {value.lng.toFixed(5)}° E
                  </span>
                  {value.ward && <span>· Ward: {value.ward}</span>}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs h-7 px-2.5 shrink-0"
            >
              Change
            </Button>
          </div>
        </div>
      ) : (
        /* Location Selection Interface when no location is chosen */
        <div className="space-y-3">
          {/* PRIMARY: Search for a place or address */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-medium text-foreground/80">
              Search for a place or address
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search area, landmark, or street..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9 h-10 text-sm rounded-xl"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground hover:text-foreground flex items-center justify-center"
                  aria-label="Clear search query"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full mt-1 bg-popover rounded-xl border border-border shadow-xl z-50 overflow-hidden"
                >
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSearchResult(r)}
                      className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-muted/70 transition-colors flex items-start gap-2.5 border-b border-border/40 last:border-0"
                    >
                      <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                      <span className="line-clamp-2 text-foreground">{r.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECONDARY ACTIONS: Current Location & Paste Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            {/* GPS Current Location */}
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={geo.status === "requesting" || isGeocoding}
              className="h-9.5 rounded-xl gap-2 text-xs font-medium border-border/80 hover:border-primary/50 hover:bg-primary/5"
            >
              {geo.status === "requesting" || isGeocoding ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <Navigation2 className="size-3.5 text-primary" />
              )}
              <span>Use my current location</span>
            </Button>

            {/* Paste a location link toggle */}
            <Button
              type="button"
              variant={activeMode === "link" ? "default" : "outline"}
              onClick={() => setActiveMode((prev) => (prev === "link" ? "search" : "link"))}
              className="h-9.5 rounded-xl gap-2 text-xs font-medium"
            >
              <LinkIcon className="size-3.5" />
              <span>Paste a location link</span>
            </Button>
          </div>

          {/* GPS Error alert */}
          {gpsError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-warning/30 bg-warning/5 text-warning text-xs">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Link Parser Input */}
          <AnimatePresence>
            {activeMode === "link" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 pt-1"
              >
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Paste Map URL or Coordinates</span>
                    <span className="text-[10px] text-muted-foreground">Google Maps, OSM, Apple Maps, GPS</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="https://maps.google.com/?q=... or 15.8497, 74.4977"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleParseLink()}
                      className="text-xs h-9 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleParseLink}
                      disabled={!linkInput.trim() || isParsingLink}
                      className="h-9 px-3 text-xs shrink-0"
                    >
                      {isParsingLink ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {linkError && (
                    <p className="text-[11px] text-destructive flex items-center gap-1.5">
                      <AlertCircle className="size-3 shrink-0" />
                      {linkError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider with 'or' */}
          <div className="relative flex items-center justify-center my-1.5">
            <div className="border-t border-border/60 w-full" />
            <span className="bg-card px-3 text-[10px] text-muted-foreground uppercase tracking-wider absolute">
              or
            </span>
          </div>

          {/* OPTIONAL: Select on map */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptionalMap((v) => !v)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <MapIcon className="size-3.5 text-primary" />
                <span>Select on map (optional)</span>
              </div>
              {showOptionalMap ? (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showOptionalMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-2"
                >
                  <div className="rounded-xl border border-border overflow-hidden relative" style={{ height: "220px" }}>
                    <div ref={mapContainerRef} className="absolute inset-0" />
                    <div className="absolute top-2 left-2 pointer-events-none z-10">
                      <div className="bg-background/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-medium border shadow-sm">
                        Tap anywhere or drag pin to adjust
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
