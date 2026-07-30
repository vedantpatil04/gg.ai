/**
 * digital-twin.tsx — Phase 4 Digital Twin & Environmental Intelligence
 *
 * Wraps the existing SmartMapCanvas (maplibre-gl, Supercluster, all existing
 * layers) inside a premium glass container with its own layer controls panel
 * and a slide-in hotspot information side panel. No map logic is duplicated —
 * SmartMapCanvas owns all rendering, marker clustering, and layer toggling.
 *
 * Data is fetched with the exact same queries and fallback pattern used in
 * src/routes/map.tsx so React Query serves both pages from a shared cache.
 *
 * Props:
 *   city          — current City from useCity()
 *   isApiConnected — from useCity()
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Layers, X, Info, MapPin, Wind, Droplets, Thermometer,
  Leaf, Gauge, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartMapCanvas } from "@/components/map/SmartMapCanvas";
import { StatusChip } from "@/components/map/intelligence-ui";
import {
  environmentalApi,
  type MapLocation,
  type WaterBody,
  type CityMapData,
} from "@/lib/api/environmental.api";
import {
  LAYERS,
  type LayerId,
  aqiColor,
} from "@/lib/map/map-visuals";
import { CITY_MAP_DATA } from "@/lib/map/city-map-data";
import { aqiBand, type City } from "@/lib/mock-data";

// ─── layer toggle chip ────────────────────────────────────────────────────────

function LayerChip({
  layer, active, onToggle,
}: {
  layer: typeof LAYERS[number] & { comingSoon?: boolean };
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={!!layer.comingSoon}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active && !layer.comingSoon
          ? "border-transparent text-white shadow-sm"
          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border/80",
        layer.comingSoon && "opacity-40 cursor-not-allowed",
      )}
      style={active && !layer.comingSoon ? { background: layer.color } : undefined}
      aria-pressed={active}
      aria-label={`${layer.label} layer${layer.comingSoon ? " (coming soon)" : ""}`}
    >
      <layer.icon className="size-3 shrink-0" aria-hidden="true" />
      {layer.label}
      {layer.comingSoon && (
        <span className="text-[9px] opacity-70 ml-0.5">soon</span>
      )}
    </button>
  );
}

// ─── hotspot detail side panel ────────────────────────────────────────────────

function HotspotPanel({
  hotspot, onClose,
}: {
  hotspot: MapLocation;
  onClose: () => void;
}) {
  const band   = aqiBand(hotspot.level);
  const aqiClr = aqiColor(hotspot.level);

  const metrics = [
    { icon: Gauge,       label: "AQI / Level", value: `${hotspot.level}`, color: aqiClr },
    { icon: Thermometer, label: "Temperature",  value: hotspot.temp != null ? `${hotspot.temp}°C` : "–" },
    { icon: Droplets,    label: "Humidity",     value: hotspot.humidity != null ? `${hotspot.humidity}%` : "–" },
    { icon: Wind,        label: "PM2.5",        value: hotspot.pm25 != null ? `${hotspot.pm25} µg/m³` : "–" },
    { icon: Leaf,        label: "Category",     value: hotspot.category },
    { icon: MapPin,      label: "Sensor",       value: hotspot.sensor ? "Active" : "None" },
  ];

  return (
    <motion.div
      key={hotspot.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-0 top-0 bottom-0 w-72 glass rounded-r-2xl border-l border-border p-4 overflow-y-auto z-10 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{hotspot.category}</div>
          <div className="text-sm font-semibold mt-0.5 leading-snug">{hotspot.name}</div>
        </div>
        <button
          onClick={onClose}
          className="size-6 rounded-md grid place-items-center hover:bg-muted/60 text-muted-foreground transition-colors shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close panel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusChip
          tone={hotspot.level < 80 ? "good" : hotspot.level < 150 ? "warning" : "critical"}
          pulse={hotspot.level >= 150}
        >
          {band.label}
        </StatusChip>
        {hotspot.sensor && (
          <StatusChip tone="good">Sensor online</StatusChip>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <m.icon className="size-3" aria-hidden="true" />
              <span className="text-[9px] uppercase tracking-wide">{m.label}</span>
            </div>
            <div
              className="text-xs font-semibold tabular-nums capitalize"
              style={m.color ? { color: m.color } : undefined}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {hotspot.description && (
        <div className="text-xs text-muted-foreground leading-relaxed rounded-lg bg-muted/30 p-3 border border-border">
          <div className="flex items-center gap-1 mb-1.5 text-foreground font-medium">
            <Info className="size-3" aria-hidden="true" />Environmental summary
          </div>
          {hotspot.description}
        </div>
      )}
    </motion.div>
  );
}

// ─── main Digital Twin component ──────────────────────────────────────────────

export function DigitalTwin({ city, isApiConnected }: { city: City; isApiConnected: boolean }) {
  // Active layers — default to aqi + green (same defaults as Smart Map)
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(["aqi", "sensors", "green"]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const toggleLayer = (id: LayerId) =>
    setActiveLayers(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);

  // Same query key as map.tsx — React Query serves both from shared cache
  const { data: mapDataResp, isSuccess: mapLoaded } = useQuery({
    queryKey: ["cityMapData", city.id],
    queryFn:  () => environmentalApi.getCityMapData(city.id),
    staleTime: 2 * 60_000,
    enabled:   isApiConnected,
    throwOnError: false,
  });

  const fallback    = CITY_MAP_DATA[city.id] ?? CITY_MAP_DATA["belagavi"];
  const apiData     = mapDataResp?.data as CityMapData | undefined;
  const hotspots    = useMemo<MapLocation[]>(
    () => apiData?.locations ?? (fallback.hotspots as unknown as MapLocation[]),
    [apiData, fallback],
  );
  const waterBodies = useMemo<WaterBody[]>(
    () => apiData?.waterBodies ?? fallback.waterBodies,
    [apiData, fallback],
  );

  const band          = aqiBand(city.aqi);
  const sensorsOnline = hotspots.filter(h => h.sensor).length;
  const highRisk      = hotspots.filter(h => h.level > 150).length;
  const selectedHotspot = selectedId ? hotspots.find(h => h.id === selectedId) ?? null : null;

  // Group layers by group for the floating panel
  const layerGroups = useMemo(() => {
    const groups: Record<string, typeof LAYERS[number][]> = {};
    LAYERS.forEach(l => {
      if (!groups[l.group]) groups[l.group] = [];
      groups[l.group].push(l);
    });
    return groups;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl overflow-hidden relative"
      style={{ minHeight: "600px" }}
    >
      {/* Ambient border glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl z-10"
        style={{ boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--color-primary) 18%, transparent)" }}
        aria-hidden="true"
      />

      {/* Top control bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-4 py-3 bg-background/60 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="size-2 rounded-full bg-primary animate-pulse inline-block" aria-hidden="true" />
          Digital Twin — {city.name}
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Active layer chips (compact) */}
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            {LAYERS.filter(l => !l.comingSoon).map(l => (
              <LayerChip
                key={l.id}
                layer={l}
                active={activeLayers.includes(l.id)}
                onToggle={() => toggleLayer(l.id)}
              />
            ))}
          </div>
          {/* Mobile: toggle layer panel button */}
          <button
            onClick={() => setShowLayerPanel(s => !s)}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border bg-muted/40 hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle layer controls"
            aria-expanded={showLayerPanel}
          >
            <Layers className="size-3.5" aria-hidden="true" />
            Layers
          </button>
          {/* Coming-soon chips */}
          {LAYERS.filter(l => l.comingSoon).map(l => (
            <LayerChip key={l.id} layer={l} active={false} onToggle={() => {}} />
          ))}
          <button
            onClick={() => { setSelectedId(null); setSearch(""); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Reset map view"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Mobile floating layer panel */}
      <AnimatePresence>
        {showLayerPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 left-4 right-4 z-30 glass rounded-xl p-3 border border-border md:hidden"
          >
            {Object.entries(layerGroups).map(([group, layers]) => (
              <div key={group} className="mb-3 last:mb-0">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">{group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {layers.map(l => (
                    <LayerChip
                      key={l.id}
                      layer={l}
                      active={activeLayers.includes(l.id)}
                      onToggle={() => { toggleLayer(l.id); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map canvas + hotspot side panel wrapper */}
      <div className="relative" style={{ paddingTop: "52px", height: "600px" }}>
        <div className="absolute inset-0 top-[52px]">
          <SmartMapCanvas
            city={city}
            hotspots={hotspots}
            mapData={apiData ?? null}
            waterBodies={waterBodies}
            activeLayers={activeLayers}
            selectedId={selectedId}
            onSelectLocation={setSelectedId}
            onToggleLayer={toggleLayer}
            sensorsOnline={sensorsOnline}
            highRisk={highRisk}
            band={band}
            isApiConnected={isApiConnected}
            mapLoaded={mapLoaded}
            lastUpdated="–"
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Hotspot side panel */}
        <AnimatePresence>
          {selectedHotspot && (
            <HotspotPanel
              hotspot={selectedHotspot}
              onClose={() => setSelectedId(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-background/50 backdrop-blur-sm border-t border-border/60 text-[10px] text-muted-foreground flex-wrap">
        <span>{hotspots.length} zones</span>
        <span className="w-px h-3 bg-border" aria-hidden="true" />
        <span>{sensorsOnline} sensors online</span>
        {highRisk > 0 && (
          <>
            <span className="w-px h-3 bg-border" aria-hidden="true" />
            <span className="text-destructive font-medium">{highRisk} high-risk zones</span>
          </>
        )}
        <span className="w-px h-3 bg-border" aria-hidden="true" />
        <span>{activeLayers.length} active layer{activeLayers.length !== 1 ? "s" : ""}</span>
        <span className="ml-auto">{isApiConnected ? "Live" : "Offline mode"}</span>
      </div>
    </motion.div>
  );
}
