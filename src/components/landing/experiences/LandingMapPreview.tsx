import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "@tanstack/react-router";
import { RotateCw } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useTheme } from "@/lib/theme";
import { aqiColor } from "@/lib/map/map-visuals";
import { OSM_DARK_STYLE, OSM_LIGHT_STYLE } from "@/lib/map/base-map-config";
import type { City } from "@/lib/mock-data";

type MapState = "loading" | "ready" | "error";

const LOAD_TIMEOUT_MS = 12_000;

/**
 * A real, live MapLibre GL instance — not a static image standing in for
 * one. It reuses the production map's exact tile styles (`OSM_DARK_STYLE` /
 * `OSM_LIGHT_STYLE` from the same `base-map-config` the production `/map`
 * page reads), the same live-first city data (`useCity()` — the real API
 * when connected, the app's own offline fallback otherwise, never a
 * separate landing-only dataset), and the real `aqiColor` scale, scoped
 * down to what a landing preview actually needs: markers, pan, zoom, hover
 * popups. No layer toolbar, clustering, or search — that's the full
 * `/map` page.
 *
 * Scroll-zoom is intentionally disabled so hovering the map doesn't hijack
 * page scrolling; the on-screen zoom control and drag-to-pan still work.
 *
 * State machine (`loading` / `ready` / `error`) so a tile-load failure or
 * a slow network never leaves a blank rectangle — it resolves to a labeled
 * fallback with a retry action instead.
 */
export function LandingMapPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const hasFitBoundsRef = useRef(false);
  const [state, setState] = useState<MapState>("loading");
  const [attempt, setAttempt] = useState(0);

  const { cities } = useCity();
  const { resolvedTheme } = useTheme();
  // Tracks which theme the map's current style actually reflects, so the
  // theme-swap effect below can skip a redundant `setStyle` call right
  // after mount (the map is still loading its *initial* style at that
  // point — reissuing the same style then can race with that first load).
  const appliedThemeRef = useRef(resolvedTheme);

  // Read through a ref so a marker click always calls the latest
  // `navigate` without making it a dependency of the mount-once effect
  // below (an earlier version depended on `navigate` directly, which tore
  // the map down and rebuilt it in a loop right as it finished loading).
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  /** (Re)place city markers on the given map instance, clearing any prior set first. Safe to call repeatedly as live data refreshes. */
  const placeMarkers = (map: maplibregl.Map, list: City[]) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    const validCities = list.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

    validCities.forEach((city) => {
      const color = aqiColor(city.aqi);

      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${city.name} — AQI ${city.aqi}, open Smart Map`);
      Object.assign(el.style, {
        width: "13px",
        height: "13px",
        borderRadius: "9999px",
        border: "2px solid rgba(255,255,255,0.9)",
        background: color,
        boxShadow: `0 0 0 6px ${color}33`,
        cursor: "pointer",
        padding: "0",
      });

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false, closeOnClick: false }).setHTML(
        `<div style="font:600 12px/1.3 system-ui;color:#0f172a">${city.name}</div>` +
          `<div style="font:11px/1.3 system-ui;color:#475569;margin-top:2px">AQI ${city.aqi} · PM2.5 ${city.pm25} µg/m³</div>`,
      );

      el.addEventListener("mouseenter", () => popup.setLngLat([city.lng, city.lat]).addTo(map));
      el.addEventListener("mouseleave", () => popup.remove());
      el.addEventListener("click", () => navigateRef.current({ to: "/map" }));

      const marker = new maplibregl.Marker({ element: el }).setLngLat([city.lng, city.lat]).addTo(map);
      markersRef.current.push(marker);
      bounds.extend([city.lng, city.lat]);
    });

    // Only fit the camera to the data once — a live refresh shouldn't
    // reset pan/zoom the visitor may already have adjusted.
    if (!hasFitBoundsRef.current && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 3, duration: 0 });
      hasFitBoundsRef.current = true;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    setState("loading");
    hasFitBoundsRef.current = false;
    appliedThemeRef.current = resolvedTheme;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE,
      center: [20, 20],
      zoom: 1.3,
      attributionControl: false,
    });
    mapRef.current = map;

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setState("error");
      }
    }, LOAD_TIMEOUT_MS);

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.scrollZoom.disable();

    map.on("error", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setState("error");
    });

    map.on("load", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);

      try {
        placeMarkers(map, cities);
        setState("ready");
      } catch {
        // Marker setup failing shouldn't leave the loading spinner stuck
        // forever — the map style still loaded, so fall back to "ready"
        // (a bare but genuinely rendered map) rather than "error".
        setState("ready");
      }
    });

    return () => {
      window.clearTimeout(timeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-once per `attempt`; live city updates and theme changes are handled by the effects below instead of a full remount.
  }, [attempt]);

  // Theme switch: swap the base-map style in place — same `setStyle`
  // pattern the production Smart Map uses — rather than tearing down and
  // rebuilding the whole map. DOM-based markers survive a style swap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedThemeRef.current === resolvedTheme) return;
    appliedThemeRef.current = resolvedTheme;
    map.setStyle(resolvedTheme === "light" ? OSM_LIGHT_STYLE : OSM_DARK_STYLE);
  }, [resolvedTheme]);

  // Live data refresh: re-place markers in-place (no remount, no map
  // flicker, camera position preserved) whenever the underlying city list
  // changes — e.g. the 60s polling refresh in `useCity()`.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || state !== "ready") return;
    placeMarkers(map, cities);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `placeMarkers` reads only from its args + refs, so it's stable in intent; re-declaring it every render shouldn't re-run this effect on its own.
  }, [cities, state]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl sm:h-[480px] lg:h-[72vh] lg:min-h-[560px] lg:max-h-[820px]">
      <div ref={containerRef} className="absolute inset-0" />

      {state === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <span className="size-8 animate-spin rounded-full border-2 border-[color:var(--color-info)]/30 border-t-[color:var(--color-info)]" />
            <span className="text-xs text-muted-foreground">Loading live map…</span>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-background/95 px-6">
          <div className="flex max-w-xs flex-col items-center gap-3 text-center">
            <span className="text-sm font-medium text-foreground">Map preview unavailable</span>
            <p className="text-xs text-muted-foreground">
              The live map couldn't load right now — this is usually a network hiccup, not a
              missing feature.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-card"
            >
              <RotateCw className="size-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/85 to-transparent" />
    </div>
  );
}
