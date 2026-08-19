import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { environmentalApi, type MapLocation, type WaterBody } from "@/lib/api/environmental.api";
import { CITY_MAP_DATA } from "@/lib/map/city-map-data";
import { aqiBand } from "@/lib/mock-data";
import { type LayerId } from "@/lib/map/map-visuals";
import { SmartMapCanvas } from "@/components/map/SmartMapCanvas";

const DEFAULT_ACTIVE_LAYERS: LayerId[] = ["aqi", "water"];

/**
 * LandingMapPreview — Hero/Landing preview of the Smart Map.
 *
 * Architectural Rule:
 * Reuses the working production SmartMapCanvas directly instead of maintaining
 * a separate MapLibre lifecycle, style, fitBounds, or marker pipeline.
 */
export function LandingMapPreview() {
  const { city, isApiConnected } = useCity();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(DEFAULT_ACTIVE_LAYERS);

  const toggleLayer = useCallback((id: LayerId) => {
    setActiveLayers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  // Query live map data if connected
  const {
    data: mapDataResponse,
    isSuccess: mapLoaded,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["cityMapData", city.id],
    queryFn: () => environmentalApi.getCityMapData(city.id),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    enabled: isApiConnected,
    throwOnError: false,
  });

  const fallback = CITY_MAP_DATA[city.id] ?? CITY_MAP_DATA["belagavi"];
  const apiData = mapDataResponse?.data;

  const hotspots: MapLocation[] = useMemo(
    () => apiData?.locations ?? (fallback.hotspots as unknown as MapLocation[]),
    [apiData, city.id, fallback.hotspots],
  );

  const waterBodies: WaterBody[] = useMemo(
    () => apiData?.waterBodies ?? fallback.waterBodies,
    [apiData, city.id, fallback.waterBodies],
  );

  const band = aqiBand(city.aqi);
  const sensorsOnline = hotspots.filter((h) => h.sensor).length;
  const highRisk = hotspots.filter((h) => h.level > 150).length;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "–";

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-3xl border border-border/40 bg-card/60 shadow-2xl backdrop-blur-xl flex flex-col">
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
        lastUpdated={lastUpdated}
        search=""
        onSearchChange={() => {}}
        embedded={true}
      />
    </div>
  );
}
