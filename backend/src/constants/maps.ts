// Enterprise Settings Phase 6 — Map Preferences.
//
// This module only stores preferences — it does not touch the map engine
// or rendering logic (src/components/environment/env-map.tsx and friends
// are untouched). A future phase that makes map pages preference-aware
// reads from here.

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

export function defaultMapPreferences(): MapPreferences {
  return {
    mapType: "street",
    zoom: 10,
    trafficLayer: false,
    pollutionLayer: true,
    weatherLayer: true,
    measurementUnit: "metric",
    animationSpeed: "normal",
    rememberLastLocation: true,
  };
}

export function isValidZoom(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_ZOOM && value <= MAX_ZOOM;
}
