/**
 * locationEnvironment.service.ts — Phase 2 (GIS & Data Realism)
 *
 * Replaces the old single-scalar model:
 *   level = min(100, round(cityAqi × location.pollutionMultiplier))
 *
 * with independent, category-realistic values across AQI, PM2.5, PM10, NO2,
 * CO, temperature, humidity, and ambient noise — grounded in established
 * urban air-quality relationships, not arbitrary numbers:
 *
 *   Industrial  → higher PM2.5/PM10/NO2/CO (combustion + particulate sources),
 *                 slightly warmer (heat-island effect from machinery/paving)
 *   Park        → lower AQI/PM/NO2 (vegetation filtering), cooler and more
 *                 humid ("park cool island" — shade + evapotranspiration)
 *   Water       → much higher humidity (evaporation), cooler, low PM10
 *   Traffic     → NO2/CO spike sharply (vehicle exhaust is the dominant urban
 *                 source of both), elevated noise — applied on top of the
 *                 underlying land-use category, since a traffic junction can
 *                 sit inside any category
 *   Commercial  → moderately elevated across the board
 *   Residential → closest to city-wide ambient baseline
 *
 * Every location also gets a small, per-pollutant DETERMINISTIC variance
 * (a stable hash of the location's id — never Math.random()) so two
 * locations in the same category are realistically different from each
 * other rather than identical, while remaining fully reproducible: the same
 * location + the same city baseline always yields the same profile. That
 * reproducibility is what makes "the map, drawer, header, and popups all
 * agree" (Phase 2 item 7) possible in the first place — a nondeterministic
 * value can't be consistent with itself across two different components
 * reading it a second apart.
 *
 * This is the SINGLE place these formulas are defined. Both getHotspots and
 * getCityMapData in environmental.controller.ts call into this module rather
 * than each computing their own version.
 */

import type { IMapLocation, LocationCategory } from "../models/MapLocation";
import type { IEnvironmentalData } from "../models/EnvironmentalData";

export interface LocationEnvironmentProfile {
  /** AQI-equivalent pollution level. Previously capped at 100 — now realistic
   *  up to the same 0–500 ceiling EnvironmentalData.aqi itself uses. */
  level: number;
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  temp: number;
  humidity: number;
  /** Approximate ambient noise, dB — new in Phase 2, mainly meaningful near traffic. */
  noise: number;
  /** Echoed verbatim from the city-wide baseline (wind isn't meaningfully
   *  hyper-local at city-block scale, so this intentionally is NOT varied
   *  per location — that would be fabricating precision the data doesn't have). */
  windSpeed: number | null;
  windDirection: number | null;
  /** null when no physical sensor is deployed at this location. */
  battery: number | null;
  health: "optimal" | "nominal" | "degraded" | "offline";
}

interface CategoryProfile {
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  /** Additive °C delta vs. city baseline (not a ratio — temperature deltas
   *  from urban micro-climate effects are additive in reality, not proportional). */
  temp: number;
  humidity: number;
  /** Additive dB vs. a ~52dB ambient urban baseline. */
  noise: number;
}

const CATEGORY_PROFILES: Record<LocationCategory, CategoryProfile> = {
  industrial: { pm25: 1.55, pm10: 1.65, no2: 1.75, co: 1.45, temp: 1.8, humidity: 0.85, noise: 18 },
  commercial: { pm25: 0.95, pm10: 1.0, no2: 1.15, co: 1.1, temp: 0.8, humidity: 0.95, noise: 10 },
  residential: { pm25: 0.7, pm10: 0.75, no2: 0.6, co: 0.65, temp: 0.2, humidity: 1.0, noise: 0 },
  park: { pm25: 0.45, pm10: 0.5, no2: 0.35, co: 0.4, temp: -1.8, humidity: 1.15, noise: -10 },
  water: { pm25: 0.4, pm10: 0.28, no2: 0.4, co: 0.35, temp: -1.2, humidity: 1.3, noise: -6 },
  landmark: { pm25: 0.6, pm10: 0.62, no2: 0.5, co: 0.55, temp: -0.3, humidity: 1.05, noise: -3 },
};

// Typical center of each category's already-documented pollutionMultiplier
// range (see MapLocation.ts's doc comment: industrial 1.2–1.5, commercial/
// traffic 0.9–1.1, residential 0.6–0.9, park 0.3–0.5, water 0.2–0.4,
// landmark 0.5–0.9). Used to turn each location's own hand-authored
// multiplier into a *relative* fine-tuning factor on top of its category
// baseline, so already-researched differentiation between specific named
// locations (e.g. Naroda GIDC 1.45 vs Vatva GIDC 1.38 vs Odhav 1.30 — all
// "industrial", but meaningfully different) is preserved, not discarded.
const CATEGORY_TYPICAL_MULTIPLIER: Record<LocationCategory, number> = {
  industrial: 1.35,
  commercial: 1.0,
  residential: 0.75,
  park: 0.4,
  water: 0.3,
  landmark: 0.7,
};

// Traffic junctions (sensorType === "traffic") sit inside some underlying
// land-use category but are dominated by vehicle exhaust — applied as an
// additional boost on top of whatever the category profile already gives.
const TRAFFIC_BOOST = { no2: 1.55, co: 1.85, pm10: 1.15, noise: 16 };

/** Deterministic hash (NOT Math.random) → stable value in [-1, 1). */
function seededSignal(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return ((h >>> 0) % 2000) / 1000 - 1;
}

/** Deterministic hash (NOT Math.random) → stable value in [0, 1). */
function seededUnit(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return ((h >>> 0) % 10000) / 10000;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

type LocationInput = Pick<
  IMapLocation,
  "locationId" | "category" | "pollutionMultiplier" | "sensorAvailable" | "sensorType"
>;
type CityBaseline = Pick<
  IEnvironmentalData,
  "aqi" | "pm25" | "pm10" | "no2" | "co" | "temp" | "humidity" | "windSpeed" | "windDirection"
>;

export function computeLocationProfile(
  loc: LocationInput,
  cityBaseline: CityBaseline,
): LocationEnvironmentProfile {
  const profile = CATEGORY_PROFILES[loc.category] ?? CATEGORY_PROFILES.residential;
  const typical = CATEGORY_TYPICAL_MULTIPLIER[loc.category] ?? 1;
  const isTraffic = loc.sensorType === "traffic";
  const seed = loc.locationId;

  // ±spread deterministic multiplicative variance, distinct per pollutant so
  // a location isn't uniformly "X% worse" across every metric at once.
  const v = (metric: string, spread: number) => 1 + seededSignal(`${seed}:${metric}`) * spread;

  // pollutionMultiplier keeps its original, documented role — a relative,
  // hand-tuned intensity factor — expressed here against its category's
  // typical center rather than applied as a flat multiplier to everything.
  const relativeIntensity = loc.pollutionMultiplier / typical;

  const level = clamp(
    Math.round(cityBaseline.aqi * loc.pollutionMultiplier * v("aqi", 0.08)),
    0,
    500,
  );

  const pm25 = clamp(
    Math.round(cityBaseline.pm25 * profile.pm25 * relativeIntensity * v("pm25", 0.12) * 10) / 10,
    0,
    500,
  );
  const pm10 = clamp(
    Math.round(
      cityBaseline.pm10 *
        profile.pm10 *
        relativeIntensity *
        (isTraffic ? TRAFFIC_BOOST.pm10 : 1) *
        v("pm10", 0.12) *
        10,
    ) / 10,
    0,
    600,
  );
  const no2 = clamp(
    Math.round(
      cityBaseline.no2 * profile.no2 * (isTraffic ? TRAFFIC_BOOST.no2 : 1) * v("no2", 0.12) * 10,
    ) / 10,
    0,
    400,
  );
  const co = clamp(
    Math.round(
      (cityBaseline.co ?? 0.6) *
        profile.co *
        (isTraffic ? TRAFFIC_BOOST.co : 1) *
        v("co", 0.12) *
        100,
    ) / 100,
    0,
    50,
  );
  const temp =
    Math.round((cityBaseline.temp + profile.temp + seededSignal(`${seed}:temp`) * 1.2) * 10) / 10;
  const humidity = clamp(
    Math.round(cityBaseline.humidity * profile.humidity * v("hum", 0.06)),
    0,
    100,
  );
  const noise = clamp(
    Math.round(
      52 +
        profile.noise +
        (isTraffic ? TRAFFIC_BOOST.noise : 0) +
        seededSignal(`${seed}:noise`) * 5,
    ),
    28,
    105,
  );

  // Battery/health: deterministic per-location, only meaningful when a
  // physical sensor is actually deployed (sensorAvailable). Low battery is
  // modeled as correlating with degraded reporting reliability — a real,
  // sensible relationship for field IoT hardware, not an arbitrary pairing.
  const battery = loc.sensorAvailable ? Math.round(40 + seededUnit(`${seed}:battery`) * 60) : null;
  const health: LocationEnvironmentProfile["health"] = !loc.sensorAvailable
    ? "offline"
    : (battery ?? 0) > 75
      ? "optimal"
      : (battery ?? 0) > 50
        ? "nominal"
        : "degraded";

  return {
    level,
    pm25,
    pm10,
    no2,
    co,
    temp,
    humidity,
    noise,
    windSpeed: cityBaseline.windSpeed ?? null,
    windDirection: cityBaseline.windDirection ?? null,
    battery,
    health,
  };
}
