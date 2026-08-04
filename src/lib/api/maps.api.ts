import client from "./client";

export const MAP_TYPES = ["street", "satellite", "hybrid", "terrain"] as const;
export type MapType = (typeof MAP_TYPES)[number];

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 20;

export const MEASUREMENT_UNITS = ["metric", "imperial"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const ANIMATION_SPEEDS = ["slow", "normal", "fast"] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number];

export interface MapPreferences {
  mapType: MapType;
  zoom: number;
  trafficLayer: boolean;
  pollutionLayer: boolean;
  weatherLayer: boolean;
  measurementUnit: MeasurementUnit;
  animationSpeed: AnimationSpeed;
  rememberLastLocation: boolean;
}

export const mapPreferencesApi = {
  get: () =>
    client
      .get<{ success: boolean; data: { maps: MapPreferences } }>("/settings/maps")
      .then((r) => r.data),

  update: (patch: Partial<MapPreferences>) =>
    client
      .patch<{ success: boolean; data: { maps: MapPreferences } }>("/settings/maps", patch)
      .then((r) => r.data),
};
