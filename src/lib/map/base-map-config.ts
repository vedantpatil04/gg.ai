/**
 * base-map-config.ts — Phase 4: Base Map Framework (Section 9)
 *
 * Registers base-map options into the baseMapRegistry. The current
 * implementation registers only the existing OSM dark-tinted style,
 * exactly as it existed in SmartMapCanvas before Phase 4 — no visual
 * change, only architectural migration.
 *
 * Future phases add new entries here (Streets, Satellite, Terrain) and
 * SmartMapCanvas.tsx reads `baseMapRegistry.active.style` without needing
 * any structural changes.
 */

import { baseMapRegistry, type BaseMapConfig } from "./gis-layer-registry";

// ─── OSM dark-tinted raster style (free, no API key) ─────────────────────────
// Migrated verbatim from the OSM_STYLE constant in SmartMapCanvas.tsx.
// That constant is kept there as a re-export alias for backward compatibility.
export const OSM_DARK_STYLE: BaseMapConfig["style"] = {
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
      attribution:
        "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": "#0c1118" } },
    {
      id: "osm-raster-layer",
      type: "raster" as const,
      source: "osm-raster",
      paint: {
        "raster-opacity": 0.8,
        "raster-brightness-min": 0,
        "raster-brightness-max": 0.44,
        "raster-saturation": -0.1,
        "raster-hue-rotate": 12,
        "raster-contrast": 0.28,
      },
    },
  ],
};

// Register the current base map.  Add future entries here:
//   baseMapRegistry.register({ id: "streets", label: "Streets", style: STREETS_URL });
//   baseMapRegistry.register({ id: "satellite", label: "Satellite", style: SATELLITE_URL });
baseMapRegistry.register({
  id: "osm-dark",
  label: "Standard",
  style: OSM_DARK_STYLE,
  rasterOpacity: 0.8,
  rasterBrightness: 0.44,
  rasterSaturation: -0.1,
});
