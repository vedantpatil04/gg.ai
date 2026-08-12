import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "@tanstack/react-router";
import { RotateCw } from "lucide-react";
import { CITIES } from "@/lib/mock-data";
import { aqiColor } from "@/lib/map/map-visuals";
import { OSM_DARK_STYLE } from "@/lib/map/base-map-config";

type MapState = "loading" | "ready" | "error";

const LOAD_TIMEOUT_MS = 12_000;

/**
 * A real, live MapLibre GL instance — not a static image standing in for
 * one. It reuses the production map's exact tile style (`OSM_DARK_STYLE`),
 * the real `CITIES` dataset, and the real `aqiColor` scale, scoped down to
 * what a landing preview actually needs: markers, pan, zoom, hover popups.
 * No layer toolbar, clustering, or search — that's the full `/map` page.
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
  const [state, setState] = useState<MapState>("loading");
  const [attempt, setAttempt] = useState(0);

  // The map-init effect below intentionally runs once per `attempt`, not on
  // every render. `navigate` is read through a ref so a marker click always
  // calls the latest version without making it an effect dependency — an
  // earlier version depended on `navigate` directly, which (since `load`
  // triggers a state update, which triggers a re-render, which can hand
  // back a new `navigate` reference) tore the map down and rebuilt it in a
  // loop right as it finished loading, so it never got to paint. This is
  // the actual fix for that.
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!containerRef.current) return;
    setState("loading");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_DARK_STYLE,
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
        const bounds = new maplibregl.LngLatBounds();

        CITIES.forEach((city) => {
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

          new maplibregl.Marker({ element: el }).setLngLat([city.lng, city.lat]).addTo(map);
          bounds.extend([city.lng, city.lat]);
        });

        map.fitBounds(bounds, { padding: 64, maxZoom: 3, duration: 0 });
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
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-once per `attempt`; see comment above.
  }, [attempt]);

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-3xl lg:h-[72vh] lg:min-h-[560px] lg:max-h-[820px]">
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
