/**
 * gis-layer-registry.ts — Phase 4: Smart GIS Framework
 *
 * Central layer registry for the GreenGuard Smart Map.
 *
 * Design goals (Phase 4 spec, Sections 1/2/6):
 *  - Plugin-ready: future layers register here, not in SmartMapCanvas.
 *  - Reusable overlay rendering pipeline for markers, heatmaps, polygons,
 *    polylines, boundaries, and (future) raster overlays.
 *  - Layer lifecycle: init, show, hide, destroy — managed centrally.
 *  - Layer ordering: z-index contract between all registered layers.
 *  - Filter framework: each layer can expose layer-specific filter config
 *    that the Layer Manager UI reads dynamically (Section 8).
 *  - Legend framework: each layer declares its own legend entries;
 *    the dynamic legend renders only active layers' entries (Section 5).
 *  - Base-map abstraction: the registry holds the active base-map config
 *    so future phases can add Streets / Satellite / Terrain via one call
 *    without touching SmartMapCanvas (Section 9).
 *
 * Nothing in this file talks to the network or React. It is pure TypeScript
 * so it can be tested in isolation.
 */

import type maplibregl from "maplibre-gl";
import type { LayerId } from "./map-visuals";

// ─── Overlay types the rendering pipeline supports ────────────────────────────
export type OverlayKind =
  | "marker-cluster" // DOM-based markers managed via Supercluster
  | "geojson-heatmap" // MapLibre heatmap paint layer over a GeoJSON source
  | "geojson-fill" // Filled polygon layer (future: flood, wildfire)
  | "geojson-line" // Line / polyline layer (measure tool, corridor)
  | "geojson-symbol" // Symbol / label layer
  | "raster" // Raster tile layer (future: satellite, weather radar)
  | "dom-overlay"; // Plain DOM overlay (popups, tooltips)

// ─── Legend entry ─────────────────────────────────────────────────────────────
export interface LegendEntry {
  label: string;
  color: string;
  /** Optional shape hint for the legend swatch: circle (default), line, fill */
  shape?: "circle" | "line" | "fill" | "gradient";
  /** For gradient swatches — [stop0color, stop100color] */
  gradient?: [string, string];
  /** Additional descriptive text shown in expanded legend */
  description?: string;
}

// ─── Filter config that a layer exposes to the Layer Manager UI ───────────────
export interface LayerFilterConfig {
  /** Unique key used as the filter's key in the active-filters map */
  key: string;
  label: string;
  type: "boolean" | "range" | "select";
  /** Default value; the Layer Manager seeds its state from this */
  defaultValue: boolean | number | string;
  options?: Array<{ value: string; label: string }>; // for "select"
  min?: number; // for "range"
  max?: number; // for "range"
  step?: number; // for "range"
}

// ─── Layer descriptor — the unit of registration ──────────────────────────────
export interface GisLayerDescriptor {
  /** Must match the LayerId union in map-visuals.ts */
  id: LayerId;
  label: string;
  group: "environment" | "network" | "overlay";
  /** Primary accent color (CSS value, CSS var, or oklab) */
  color: string;
  /** MapLibre source + layer IDs this descriptor owns */
  mapSourceIds?: string[];
  mapLayerIds?: string[];
  /** DOM marker array ref name for marker-cluster overlays */
  markerRefKey?: string;
  /** Preferred render position in the layer stack (lower = below) */
  zOrder: number;
  /** Overlay rendering kind — determines which pipeline handles this layer */
  overlayKind: OverlayKind;
  /** Legend entries to show when this layer is active */
  legendEntries: LegendEntry[];
  /** Optional filter config the Layer Manager UI renders for this layer */
  filters?: LayerFilterConfig[];
  /** true = not yet implemented — shown in UI but non-interactive */
  comingSoon?: boolean;
}

// ─── Layer registry ───────────────────────────────────────────────────────────
class GisLayerRegistry {
  private layers: Map<LayerId, GisLayerDescriptor> = new Map();
  private order: LayerId[] = [];

  /**
   * Register a layer descriptor.  Idempotent — re-registering the same id
   * replaces the old descriptor (useful for hot-module reload in dev).
   */
  register(descriptor: GisLayerDescriptor): void {
    this.layers.set(descriptor.id, descriptor);
    if (!this.order.includes(descriptor.id)) {
      this.order.push(descriptor.id);
      this.order.sort(
        (a, b) => (this.layers.get(a)?.zOrder ?? 0) - (this.layers.get(b)?.zOrder ?? 0),
      );
    }
  }

  get(id: LayerId): GisLayerDescriptor | undefined {
    return this.layers.get(id);
  }

  /** All registered layers in z-order (lowest first) */
  getAll(): GisLayerDescriptor[] {
    return this.order.map((id) => this.layers.get(id)!).filter(Boolean);
  }

  /** Layers in a specific group, still in z-order */
  getByGroup(group: GisLayerDescriptor["group"]): GisLayerDescriptor[] {
    return this.getAll().filter((l) => l.group === group);
  }

  /** Groups in the order they should appear in the Layer Manager */
  getGroups(): GisLayerDescriptor["group"][] {
    const seen = new Set<GisLayerDescriptor["group"]>();
    const result: GisLayerDescriptor["group"][] = [];
    for (const l of this.getAll()) {
      if (!seen.has(l.group)) {
        seen.add(l.group);
        result.push(l.group);
      }
    }
    return result;
  }

  /**
   * Returns legend entries for layers that are currently active and visible.
   * Used by the dynamic legend component (Section 5).
   */
  getLegendEntries(activeIds: LayerId[]): Array<LegendEntry & { layerId: LayerId }> {
    return this.getAll()
      .filter((l) => activeIds.includes(l.id) && !l.comingSoon)
      .flatMap((l) => l.legendEntries.map((e) => ({ ...e, layerId: l.id })));
  }

  /**
   * Returns all filter configs for active layers.
   * Used by the Filter Framework (Section 8).
   */
  getActiveFilters(activeIds: LayerId[]): Array<LayerFilterConfig & { layerId: LayerId }> {
    return this.getAll()
      .filter((l) => activeIds.includes(l.id) && !l.comingSoon)
      .flatMap((l) => (l.filters ?? []).map((f) => ({ ...f, layerId: l.id })));
  }

  /** True if MapLibre sources/layers for this descriptor need to be managed */
  needsMapLayer(id: LayerId): boolean {
    const l = this.layers.get(id);
    return !!(l && (l.mapLayerIds?.length || l.mapSourceIds?.length));
  }

  /**
   * Notify the registry that a layer's MapLibre visibility should change.
   * Returns the list of (mapLayerId, visibility) pairs the caller should apply.
   * The caller (SmartMapCanvas) retains ownership of the maplibregl.Map instance.
   */
  getVisibilityCommands(
    id: LayerId,
    visible: boolean,
  ): Array<{ layerId: string; visibility: "visible" | "none" }> {
    const l = this.layers.get(id);
    if (!l?.mapLayerIds) return [];
    return l.mapLayerIds.map((lid) => ({
      layerId: lid,
      visibility: visible ? "visible" : "none",
    }));
  }
}

// ─── Singleton registry — import this anywhere in the frontend ────────────────
export const layerRegistry = new GisLayerRegistry();

// ─── Overlay rendering pipeline ───────────────────────────────────────────────
/**
 * Describes a command for the rendering pipeline. SmartMapCanvas's effects
 * receive these instead of hard-coded imperative calls, making each overlay
 * kind swappable and testable.
 */
export interface RenderCommand {
  kind: OverlayKind;
  layerId: LayerId;
  visible: boolean;
  /**
   * Arbitrary payload the specific renderer needs (GeoJSON FeatureCollection,
   * marker array, opacity value, etc.). Typed as unknown here so the registry
   * stays independent of maplibregl and DOM types.
   */
  payload?: unknown;
}

/**
 * Build the set of render commands the canvas needs to execute for a given
 * set of active layer ids + any per-layer data (opacity, GeoJSON, etc.).
 *
 * This is the "Layer Rendering Pipeline" called by SmartMapCanvas on every
 * activeLayers change — it separates the "what layers are active?" concern
 * from the "how do I actually draw them?" imperative code.
 */
export function buildRenderPipeline(
  activeLayers: LayerId[],
  allKnownLayers: LayerId[],
  overrides?: Partial<Record<LayerId, unknown>>,
): RenderCommand[] {
  const commands: RenderCommand[] = [];
  for (const id of allKnownLayers) {
    const descriptor = layerRegistry.get(id);
    if (!descriptor || descriptor.comingSoon) continue;
    const visible = activeLayers.includes(id);
    commands.push({
      kind: descriptor.overlayKind,
      layerId: id,
      visible,
      payload: overrides?.[id],
    });
  }
  return commands;
}

// ─── Base-map configuration framework (Section 9) ─────────────────────────────
/**
 * Describes one base-map option. Only one is active at a time.
 * Future phases add new entries here; SmartMapCanvas reads the active one.
 */
export interface BaseMapConfig {
  id: string;
  label: string;
  /** Full MapLibre StyleSpecification or a URL to one */
  style: maplibregl.StyleSpecification | string;
  /** Optional tint adjustments applied on top of the style */
  rasterOpacity?: number;
  rasterBrightness?: number;
  rasterSaturation?: number;
}

class BaseMapRegistry {
  private configs: Map<string, BaseMapConfig> = new Map();
  private _activeId = "osm-dark";

  register(config: BaseMapConfig): void {
    this.configs.set(config.id, config);
  }

  get active(): BaseMapConfig | undefined {
    return this.configs.get(this._activeId);
  }

  setActive(id: string): void {
    if (this.configs.has(id)) this._activeId = id;
  }

  /**
   * Phase 11: look up a registered base-map config by id without mutating
   * the shared `_activeId`. SmartMapCanvas uses this to resolve the
   * theme-appropriate style ("osm-dark" / "osm-light") directly, since the
   * active theme is per-render React state, not a singleton concern.
   */
  get(id: string): BaseMapConfig | undefined {
    return this.configs.get(id);
  }

  getAll(): BaseMapConfig[] {
    return Array.from(this.configs.values());
  }
}

export const baseMapRegistry = new BaseMapRegistry();
