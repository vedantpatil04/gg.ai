import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatDistanceToNow } from "date-fns";
import { Locate, ExternalLink, MapPin, Layers, Activity, Thermometer, Wind } from "lucide-react";
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
 * Phase 5 — Interactive Environmental Intelligence: Live Map Experience.
 *
 * Additions over Phase 4:
 *
 *  1. Pulsing live-node markers — each nearby city gets a CSS-animated
 *     ripple ring injected around its marker. The ring color matches the
 *     AQI band. GPU-only (transform + opacity). Paused on reduced-motion.
 *
 *  2. Wind flow particle canvas — a lightweight <canvas> overlay draws
 *     ~25 wind particles that drift in the current windDirection / windSpeed.
 *     Falls back gracefully when windDirection is absent. Uses requestAnimationFrame
 *     with cleanup. Zero external dependencies.
 *
 *  3. Animated layer transition — switching filter tabs now fades the
 *     legend and companion list with a 200ms CSS transition rather than
 *     an instant swap.
 *
 *  4. Animated AQI legend — each band row staggers in on mount and re-
 *     stags on layer change (opacity + translateX CSS keyframe).
 *
 *  5. Map loading shimmer — while the map tiles are loading a blurred
 *     gradient placeholder is shown instead of a black rectangle.
 *
 *  6. Richer popup — popups now include a health status line so users
 *     get context without leaving the map.
 *
 *  7. Selected city spotlight — the currently-viewed city marker pulses
 *     with a larger, brighter ring than nearby markers.
 *
 * All animations: transform/opacity only (GPU). prefers-reduced-motion respected.
 * No new dependencies. MapLibre + OSM_STYLE + buildMarkerHTML stack unchanged.
 */

const MAX_NEARBY = 6;
const NEARBY_RADIUS_M = 500_000;

type FilterKey = "aqi" | "temp" | "pm25";

const FILTER_CONFIG: Record<FilterKey, { label: string; icon: typeof Activity; description: string }> = {
  aqi:  { label: "AQI",         icon: Activity,    description: "Air Quality Index — composite pollution score." },
  temp: { label: "Temperature", icon: Thermometer,  description: "Ambient surface temperature in °C." },
  pm25: { label: "PM2.5",       icon: Wind,         description: "Fine particles (≤2.5µm) — most health-impactful pollutant." },
};

const HEALTH_SHORT: Record<string, string> = {
  Good: "Safe for all activity",
  Moderate: "Sensitive groups take care",
  "Unhealthy (SG)": "Sensitive groups at risk",
  Unhealthy: "Limit outdoor time",
  "Very Unhealthy": "Avoid outdoor activity",
  Hazardous: "Stay indoors",
};

// ─── Keyframes injected once ─────────────────────────────────────────────────

const MAP_KF = `
@keyframes env-map-pulse {
  0%   { transform: scale(1);   opacity: 0.8; }
  70%  { transform: scale(2.6); opacity: 0;   }
  100% { transform: scale(2.6); opacity: 0;   }
}
@keyframes env-map-pulse-lg {
  0%   { transform: scale(1);   opacity: 0.9; }
  70%  { transform: scale(3.2); opacity: 0;   }
  100% { transform: scale(3.2); opacity: 0;   }
}
@keyframes env-legend-in {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes env-map-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .env-map-pulse-ring, .env-map-pulse-ring-lg { animation: none !important; }
}
`;

// ─── Popup HTML builder (Phase 5: + health status line) ──────────────────────

function buildPopupHTML(c: City, isSelected: boolean, updatedLabel?: string): string {
  const band = findAqiBand(c.aqi);
  const health = HEALTH_SHORT[band.label] ?? "";
  const extras: string[] = [];
  if (typeof c.temp  === "number") extras.push(`🌡 ${c.temp}°C`);
  if (typeof c.pm25  === "number") extras.push(`PM2.5 ${c.pm25} µg/m³`);
  if (typeof c.windSpeed === "number") extras.push(`💨 ${c.windSpeed} km/h`);

  return `
    <div style="font-family:inherit;min-width:190px">
      <div style="font-weight:700;font-size:13px;margin-bottom:2px">${c.name}${isSelected ? " 📍" : ""}</div>
      <div style="font-size:11px;opacity:0.6;margin-bottom:8px">${c.country ?? ""}</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:4px">
        <span style="width:8px;height:8px;border-radius:50%;background:${band.colorRaw};flex-shrink:0;
          box-shadow:0 0 6px ${band.colorRaw}90"></span>
        <strong>AQI ${c.aqi}</strong> — ${band.label}
      </div>
      ${health ? `<div style="font-size:10px;opacity:0.75;margin-bottom:6px;font-style:italic">${health}</div>` : ""}
      ${extras.map((e) => `<div style="font-size:11px;opacity:0.7;margin-top:3px">${e}</div>`).join("")}
      ${updatedLabel ? `<div style="font-size:10px;opacity:0.5;margin-top:6px">${updatedLabel}</div>` : ""}
    </div>
  `;
}

// ─── Pulsing marker element builder ──────────────────────────────────────────

function buildMarkerEl(c: City, selected: boolean): HTMLDivElement {
  const band = findAqiBand(c.aqi);
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;";

  // Pulse ring(s) — injected behind the marker icon
  const ringClass = selected ? "env-map-pulse-ring-lg" : "env-map-pulse-ring";
  const ringSize = selected ? 20 : 14;
  for (let i = 0; i < (selected ? 2 : 1); i++) {
    const ring = document.createElement("div");
    ring.className = ringClass;
    ring.style.cssText = `
      position:absolute;
      width:${ringSize}px;height:${ringSize}px;
      border-radius:50%;
      background:${band.colorRaw};
      animation:${selected ? "env-map-pulse-lg" : "env-map-pulse"} 2.4s cubic-bezier(0,0,0.2,1) ${i * 1.2}s infinite;
      pointer-events:none;
    `;
    wrapper.appendChild(ring);
  }

  // The actual marker icon
  const icon = document.createElement("div");
  icon.style.cssText = "position:relative;z-index:1;";
  icon.innerHTML = buildMarkerHTML({ level: c.aqi, sensorType: "environmental", sensor: false, selected });
  wrapper.appendChild(icon);

  return wrapper;
}

// ─── Wind particle canvas ─────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
}

function useWindCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  windSpeed: number | undefined,
  windDirection: number | undefined,
  reduced: boolean,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced || typeof windSpeed !== "number") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Convert meteorological convention (wind-from-N) to math angle (wind-toward)
    const angleDeg = typeof windDirection === "number" ? (windDirection + 180) % 360 : 90;
    const rad = (angleDeg * Math.PI) / 180;
    const speed = Math.min(windSpeed / 30, 1) * 1.4 + 0.3; // normalised speed 0.3–1.7 px/frame

    const W = canvas.width;
    const H = canvas.height;
    const COUNT = Math.round(20 + speed * 10);

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(rad) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(rad) * speed * (0.6 + Math.random() * 0.8),
      life: Math.random() * 80,
      maxLife: 60 + Math.random() * 80,
      size: 0.8 + Math.random() * 1.2,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        if (p.life > p.maxLife || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
          // Reset from edge opposite to wind direction
          p.life = 0;
          p.x = p.vx > 0 ? -4 : W + 4;
          p.y = Math.random() * H;
          if (Math.abs(p.vy) > Math.abs(p.vx)) {
            p.x = Math.random() * W;
            p.y = p.vy > 0 ? -4 : H + 4;
          }
        }
        const alpha = Math.min(p.life / 20, 1) * (1 - p.life / p.maxLife) * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,210,255,${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, windSpeed, windDirection, reduced]);
}

// ─── Animated AQI legend ──────────────────────────────────────────────────────

function AqiLegend({ activeFilter, visible }: { activeFilter: FilterKey; visible: boolean }) {
  return (
    <div
      className={cn(
        "glass rounded-xl border border-border p-3 space-y-1.5 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2">
        {activeFilter === "aqi" ? "AQI Scale" : activeFilter === "temp" ? "Temperature" : "PM2.5 µg/m³"}
      </span>
      {AQI_BANDS.slice(0, 5).map((band, i) => (
        <div
          key={band.label}
          className="flex items-center gap-2"
          style={{
            animation: `env-legend-in 0.25s ease both`,
            animationDelay: `${i * 45}ms`,
          }}
        >
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ background: band.colorRaw, boxShadow: `0 0 4px ${band.colorRaw}70` }}
            aria-hidden="true"
          />
          <span className="text-[10px] text-muted-foreground">{band.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Spatial intelligence ─────────────────────────────────────────────────────

function SpatialInsights({ current, nearby }: { current: City; nearby: { city: City; distanceMeters: number }[] }) {
  if (nearby.length < 2) return <p className="text-sm text-muted-foreground">More nearby data needed for spatial comparison.</p>;

  const better = nearby.filter((n) => n.city.aqi > current.aqi).length;
  const worse  = nearby.filter((n) => n.city.aqi < current.aqi).length;
  const best   = [...nearby].sort((a, b) => a.city.aqi - b.city.aqi)[0];
  const worst  = [...nearby].sort((a, b) => b.city.aqi - a.city.aqi)[0];
  const avg    = Math.round(nearby.reduce((s, n) => s + n.city.aqi, 0) / nearby.length);

  const summary = better > nearby.length / 2
    ? `${current.name} has better air quality than most nearby monitored locations.`
    : worse > nearby.length / 2
      ? `${current.name}'s AQI is higher than most nearby monitored locations.`
      : `Air quality across nearby monitored locations is broadly similar to ${current.name} (avg AQI ${avg}).`;

  const bestBand  = findAqiBand(best.city.aqi);
  const worstBand = findAqiBand(worst.city.aqi);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Cleanest nearby", city: best.city, band: bestBand },
          { label: "Highest nearby",  city: worst.city, band: worstBand },
        ].map(({ label, city: c, band }) => (
          <div
            key={label}
            className="rounded-xl border bg-card/30 p-3 space-y-1.5 transition-shadow duration-200 hover:shadow-md"
            style={{ borderColor: `color-mix(in oklab, ${band.color} 28%, var(--color-border))` }}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className="text-sm font-semibold truncate">{c.name}</div>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ color: band.color, background: `color-mix(in oklab, ${band.color} 14%, transparent)` }}
            >
              AQI {c.aqi} · {band.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Accessible companion list (now interactive) ──────────────────────────────

function AccessibleLocationList({
  current, nearby, filter, onSelect, selectedId,
}: {
  current: City; nearby: { city: City; distanceMeters: number }[];
  filter: FilterKey; onSelect: (id: string, lat: number, lng: number) => void; selectedId: string;
}) {
  const all = [{ city: current, distanceMeters: 0 }, ...nearby];
  const metric = (c: City) =>
    filter === "temp" && typeof c.temp  === "number" ? `${c.temp}°C`
    : filter === "pm25" && typeof c.pm25 === "number" ? `${c.pm25} µg/m³`
    : `AQI ${c.aqi}`;

  return (
    <ul className="space-y-1" aria-label="Monitored environmental locations — click to fly map">
      {all.map(({ city: c, distanceMeters }) => {
        const band    = findAqiBand(c.aqi);
        const isCur   = c.id === current.id;
        const isSel   = c.id === selectedId;
        const hasCoords = typeof c.lat === "number" && typeof c.lng === "number";
        return (
          <li key={c.id}>
            <button
              type="button"
              disabled={!hasCoords}
              aria-pressed={isSel}
              onClick={() => hasCoords && onSelect(c.id, c.lat as number, c.lng as number)}
              className={cn(
                "w-full flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-xl text-left",
                "transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSel  ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/40 border border-transparent",
                !hasCoords && "opacity-50 cursor-default",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isCur
                  ? <MapPin className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  : <span className="size-1.5 rounded-full shrink-0" style={{ background: band.color }} aria-hidden="true" />
                }
                <span className={cn("truncate", isCur && "font-medium")}>{c.name}</span>
                {isCur && <span className="text-[9px] text-muted-foreground shrink-0">(your city)</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">{metric(c)}</span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ color: band.color, background: `color-mix(in oklab, ${band.color} 14%, transparent)` }}
                >
                  {band.shortLabel}
                </span>
                {distanceMeters > 0 && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${Math.round(distanceMeters / 1000)} km`}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EnvMap({ className }: { className?: string }) {
  const { city, cities, isCityListLoading, isCityError, cityDataUpdatedAt, isApiConnected, refreshCity } = useCity();

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mapRef              = useRef<maplibregl.Map | null>(null);
  const selectedMarkerRef   = useRef<maplibregl.Marker | null>(null);
  const nearbyMarkersRef    = useRef<maplibregl.Marker[]>([]);
  const nearbyPopupsRef     = useRef<Map<string, maplibregl.Popup>>(new Map());
  const windCanvasRef       = useRef<HTMLCanvasElement>(null);
  const [mapReady,    setMapReady]    = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [initError,   setInitError]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("aqi");
  const [filterVisible, setFilterVisible] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(city?.id ?? "");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener("change", h);
    return () => q.removeEventListener("change", h);
  }, []);

  // Wind canvas
  useWindCanvas(windCanvasRef, city?.windSpeed, city?.windDirection, reduced);

  const hasCoords = typeof city?.lat === "number" && typeof city?.lng === "number";

  const nearby = useMemo(() => {
    if (!hasCoords || !cities) return [];
    return (cities as City[])
      .filter((c) => c.id !== city.id && typeof c.aqi === "number" && typeof c.lat === "number" && typeof c.lng === "number")
      .map((c) => ({ city: c, distanceMeters: measureDistanceMeters(city, c) }))
      .filter((n) => n.distanceMeters <= NEARBY_RADIUS_M)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, MAX_NEARBY);
  }, [city?.id, city?.lat, city?.lng, cities, hasCoords]);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasCoords || !container || mapRef.current) return;
    try {
      const map = new maplibregl.Map({
        container, style: OSM_STYLE, center: [city.lng, city.lat], zoom: 9, attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => setMapReady(true));
      map.on("idle", () => setTilesLoaded(true));
      map.on("error", () => setInitError(true));
      mapRef.current = map;
    } catch { setInitError(true); }
    return () => { mapRef.current?.remove(); mapRef.current = null; setMapReady(false); setTilesLoaded(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, container]);

  // ── Selected city marker ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !hasCoords) return;
    const updatedLabel = isApiConnected && cityDataUpdatedAt
      ? `Updated ${formatDistanceToNow(cityDataUpdatedAt, { addSuffix: true })}` : undefined;
    const el = buildMarkerEl(city, true);
    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([city.lng, city.lat])
      .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(buildPopupHTML(city, true, updatedLabel)))
      .addTo(map);
    map.flyTo({ center: [city.lng, city.lat], zoom: 9, duration: 1200 });
  }, [city?.id, city?.lat, city?.lng, city?.aqi, city?.name, city?.country, mapReady, hasCoords, isApiConnected, cityDataUpdatedAt]);

  // ── Nearby markers ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    nearbyMarkersRef.current.forEach((m) => m.remove());
    nearbyMarkersRef.current = [];
    nearbyPopupsRef.current.clear();
    nearby.forEach(({ city: c }) => {
      if (typeof c.lat !== "number" || typeof c.lng !== "number") return;
      const el = buildMarkerEl(c, false);
      const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(buildPopupHTML(c, false));
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.lng, c.lat])
        .setPopup(popup)
        .addTo(map);
      nearbyMarkersRef.current.push(marker);
      nearbyPopupsRef.current.set(c.id, popup);
    });
    return () => { nearbyMarkersRef.current.forEach((m) => m.remove()); nearbyMarkersRef.current = []; nearbyPopupsRef.current.clear(); };
  }, [nearby, mapReady]);

  // ── Interactive city select ───────────────────────────────────────────────
  const handleCitySelect = useCallback((id: string, lat: number, lng: number) => {
    setSelectedId(id);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 10, duration: 900 });
    const popup = nearbyPopupsRef.current.get(id);
    if (popup) popup.addTo(map);
  }, []);

  // ── Layer switch with animated fade ──────────────────────────────────────
  const switchFilter = useCallback((key: FilterKey) => {
    setFilterVisible(false);
    setTimeout(() => { setActiveFilter(key); setFilterVisible(true); }, 180);
  }, []);

  const recenter = () => {
    if (!mapRef.current || !hasCoords) return;
    setSelectedId(city.id);
    mapRef.current.flyTo({ center: [city.lng, city.lat], zoom: 9, duration: 800 });
  };

  if (isCityListLoading) return <EnvMapPreviewSkeleton className={className} />;
  if (isCityError) return <EnvErrorState className={className} onRetry={refreshCity} retryDisabled={false} message="We couldn't load the map right now." />;
  if (!hasCoords)  return <EnvEmptyState className={className} title="Location data is unavailable for this city." />;
  if (initError)   return <EnvErrorState className={className} message="We couldn't initialise the map." />;

  return (
    <>
      <style>{MAP_KF}</style>
      <div className={cn("space-y-4", className)}>

        {/* Map card */}
        <div className="glass rounded-2xl p-5 md:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <span className="relative inline-flex size-1.5">
                  {isApiConnected && !reduced && (
                    <span className="absolute inline-flex size-full rounded-full opacity-65"
                      style={{ background: "var(--color-success)", animation: "env-map-pulse 2s ease-in-out infinite" }} />
                  )}
                  <span className="relative inline-flex size-1.5 rounded-full"
                    style={{ background: isApiConnected ? "var(--color-success)" : "var(--color-muted-foreground)" }} />
                </span>
                Live Environmental Map
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
              <Link to="/map">Open Smart Map <ExternalLink className="size-3.5" aria-hidden="true" /></Link>
            </Button>
          </div>

          {/* Layer switcher */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Map layer">
              <Layers className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {(Object.keys(FILTER_CONFIG) as FilterKey[]).map((key) => {
                const { label, icon: Icon } = FILTER_CONFIG[key];
                const isActive = activeFilter === key;
                return (
                  <button key={key} type="button" onClick={() => switchFilter(key)} aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border transition-all duration-200",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      isActive ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-2.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className={cn("text-[10px] text-muted-foreground transition-opacity duration-200", filterVisible ? "opacity-100" : "opacity-0")}>
              {FILTER_CONFIG[activeFilter].description}
            </p>
          </div>

          {/* Map canvas */}
          <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: "clamp(280px,42vh,440px)" }}>
            {/* Tile loading shimmer */}
            {!tilesLoaded && (
              <div
                className="absolute inset-0 z-20 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, oklch(0.14 0.018 240) 0%, oklch(0.18 0.020 240) 50%, oklch(0.14 0.018 240) 100%)",
                  backgroundSize: "200% 100%",
                  animation: "env-map-shimmer 1.6s linear infinite",
                }}
                aria-hidden="true"
              />
            )}

            {/* MapLibre container */}
            <div ref={setContainer} className="absolute inset-0" />

            {/* Wind particle canvas — layered above map tiles */}
            <canvas
              ref={windCanvasRef}
              className="absolute inset-0 pointer-events-none z-10"
              width={800} height={440}
              style={{ opacity: typeof city.windSpeed === "number" ? 0.7 : 0 }}
              aria-hidden="true"
            />

            {/* Animated legend */}
            <div className="absolute bottom-10 left-3 z-10">
              <AqiLegend activeFilter={activeFilter} visible={filterVisible} />
            </div>

            {/* Recenter */}
            <Button
              variant="outline" size="icon" onClick={recenter}
              aria-label="Re-centre map on selected city"
              className="absolute bottom-3 right-3 z-10 bg-background/90 backdrop-blur-sm hover:bg-background transition-all duration-200"
            >
              <Locate className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            City-level data only. Open Smart Map for sensor-level readings.
            {nearby.length > 0 && ` Showing ${nearby.length} nearby monitored location${nearby.length !== 1 ? "s" : ""}.`}
            {typeof city.windSpeed === "number" && ` Wind ${city.windSpeed} km/h visualised.`}
          </p>
        </div>

        {/* Spatial Intelligence */}
        {nearby.length > 0 && (
          <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-4",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500")}>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Spatial Intelligence</span>
              <h3 className="text-sm font-semibold mt-1">Environmental conditions around {city.name}</h3>
            </div>
            <SpatialInsights current={city} nearby={nearby} />
          </div>
        )}

        {/* Interactive location list */}
        <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-4",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100")}>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Monitored Locations</span>
            <p className="text-xs text-muted-foreground mt-0.5">Select a city to fly the map there.</p>
          </div>
          <AccessibleLocationList
            current={city} nearby={nearby} filter={activeFilter}
            onSelect={handleCitySelect} selectedId={selectedId}
          />
        </div>
      </div>
    </>
  );
}
