/**
 * City Hero Image Configuration — Phase 2A
 *
 * Single centralized source of truth for all hero background images.
 *
 * ─── HOW IT WORKS ───────────────────────────────────────────────────────────
 *
 * 1. Each city has an entry keyed by its exact `city.id` from mock-data.ts.
 * 2. Each entry declares the image paths it supports.
 * 3. `resolveHeroImage()` picks the best available image given the current
 *    time slot and weather proxy, falling back gracefully.
 * 4. React components NEVER contain image paths — they call resolveHeroImage().
 *
 * ─── ADDING / REPLACING IMAGES ──────────────────────────────────────────────
 *
 * To add images for a city:
 *   1. Drop the file into  public/images/cities/<city-id>/
 *   2. Add (or update) the filename in the city's entry below.
 *   3. No React component changes needed — ever.
 *
 * To add a brand-new city:
 *   1. Create  public/images/cities/<new-city-id>/
 *   2. Add a CityImageConfig entry below.
 *   3. Done.
 *
 * ─── FALLBACK CHAIN ─────────────────────────────────────────────────────────
 *
 *   Requested variant → hero (default) → GLOBAL_FALLBACK
 *
 * ─── IMAGE SPECIFICATIONS ───────────────────────────────────────────────────
 *
 * Format:    WebP preferred (JPEG acceptable)
 * Min size:  1600 × 900 px
 * Subject:   Real environmental / cityscape photographs only.
 *            Never: people in offices, gadgets, abstract art, random objects.
 * Framing:   Dark tones preferred at the bottom (hero overlays content there).
 *
 * ─── TIME SLOT MAPPING ──────────────────────────────────────────────────────
 *
 *  night     →  22:00 – 04:59
 *  morning   →  05:00 – 11:59  (covers "dawn" + "morning" slots)
 *  afternoon →  12:00 – 15:59
 *  evening   →  16:00 – 21:59  (covers "golden" + "evening" slots)
 *  rainy     →  weather proxy === "rainy"  (overrides time slot)
 *
 * ─── PATH CONVENTION ────────────────────────────────────────────────────────
 *
 *   /images/cities/<city-id>/<variant>.webp
 *
 * All paths are relative to the project `public/` directory so Vite
 * serves them as static assets with no import needed.
 */

import type { TimeSlot, WeatherProxy } from "@/lib/hero-scene";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Image set for a single city.
 * Only `hero` is required; all time-of-day / weather variants are optional.
 * Missing variants automatically fall back to `hero`.
 */
export interface CityImageConfig {
  /**
   * Human-readable label (for documentation / future admin UI).
   * Not used at runtime.
   */
  label: string;

  /**
   * Default hero image — used when no variant matches.
   * REQUIRED. Must exist before the city is activated in production.
   * Until the real image is ready, set to `undefined` — the component
   * will use GLOBAL_FALLBACK automatically.
   */
  hero: string | undefined;

  /**
   * Optional time-of-day and weather variants.
   * Any omitted key falls back to `hero`.
   */
  morning?:   string;
  afternoon?: string;
  evening?:   string;
  night?:     string;
  rainy?:     string;
}

// ─── Global fallback ──────────────────────────────────────────────────────────
//
// Used when a city has no images configured at all.
// This is a generic outdoor environmental photograph (green hills, open sky)
// that works neutrally for every city.
//
// Replace this with a production image at any time — no code changes needed.
// Recommended: wide aerial of a green landscape, neutral palette.

export const GLOBAL_FALLBACK: string | undefined = undefined;
// Once you have the file, change the line above to:
// export const GLOBAL_FALLBACK = "/images/cities/fallback/hero.webp";

// ─── City configurations ──────────────────────────────────────────────────────
//
// Keys match city.id values in src/lib/mock-data.ts exactly.
// Image paths are relative to public/ — Vite serves them as /images/cities/…

const CITY_IMAGES: Record<string, CityImageConfig> = {

  // ── Belagavi ──────────────────────────────────────────────────────────────
  // Green hills, forests, monsoon sky, rivers, evening sunlight
  belagavi: {
    label:     "Belagavi, India",
    hero:      "/images/cities/belagavi/hero.webp",
    // morning:   "/images/cities/belagavi/morning.webp",
    // afternoon: "/images/cities/belagavi/afternoon.webp",
    // evening:   "/images/cities/belagavi/evening.webp",
    // night:     "/images/cities/belagavi/night.webp",
    // rainy:     "/images/cities/belagavi/rainy.webp",
  },

  // ── Bengaluru ─────────────────────────────────────────────────────────────
  // City skyline, Cubbon Park greenery, tech corridor, garden city canopy
  bengaluru: {
    label:     "Bengaluru, India",
    hero:      "/images/cities/bengaluru/hero.webp",
    morning:   "/images/cities/bengaluru/morning.webp",
    afternoon: "/images/cities/bengaluru/afternoon.webp",
    evening:   "/images/cities/bengaluru/evening.webp",
    night:     "/images/cities/bengaluru/night.webp",
    rainy:     "/images/cities/bengaluru/rainy.webp",
  },

  // ── Mumbai ────────────────────────────────────────────────────────────────
  // Marine Drive, Arabian Sea coastline, monsoon clouds, city lights
  mumbai: {
    label:     "Mumbai, India",
    hero:      "/images/cities/mumbai/hero.webp",
    morning:   "/images/cities/mumbai/morning.webp",
    afternoon: "/images/cities/mumbai/afternoon.webp",
    evening:   "/images/cities/mumbai/evening.webp",
    night:     "/images/cities/mumbai/night.webp",
    rainy:     "/images/cities/mumbai/rainy.webp",
  },

  // ── Delhi ─────────────────────────────────────────────────────────────────
  // India Gate, Lotus Temple, hazy horizon, monsoon skyline
  delhi: {
    label:     "Delhi, India",
    hero:      "/images/cities/delhi/hero.webp",
    morning:   "/images/cities/delhi/morning.webp",
    afternoon: "/images/cities/delhi/afternoon.webp",
    evening:   "/images/cities/delhi/evening.webp",
    night:     "/images/cities/delhi/night.webp",
    rainy:     "/images/cities/delhi/rainy.webp",
  },

  // ── Hyderabad ─────────────────────────────────────────────────────────────
  // Hussain Sagar lake, Charminar, tech park corridor, monsoon sky
  hyderabad: {
    label:     "Hyderabad, India",
    hero:      "/images/cities/hyderabad/hero.webp",
    morning:   "/images/cities/hyderabad/morning.webp",
    afternoon: "/images/cities/hyderabad/afternoon.webp",
    evening:   "/images/cities/hyderabad/evening.webp",
    night:     "/images/cities/hyderabad/night.webp",
    rainy:     "/images/cities/hyderabad/rainy.webp",
  },

  // ── Chennai ───────────────────────────────────────────────────────────────
  // Marina Beach, Bay of Bengal, temple gopuram silhouette, coastal haze
  chennai: {
    label:     "Chennai, India",
    hero:      "/images/cities/chennai/hero.webp",
    morning:   "/images/cities/chennai/morning.webp",
    afternoon: "/images/cities/chennai/afternoon.webp",
    evening:   "/images/cities/chennai/evening.webp",
    night:     "/images/cities/chennai/night.webp",
    rainy:     "/images/cities/chennai/rainy.webp",
  },

  // ── Pune ──────────────────────────────────────────────────────────────────
  // Sahyadri hills, monsoon greenery, river valley, overcast sky
  pune: {
    label:     "Pune, India",
    hero:      "/images/cities/pune/hero.webp",
    morning:   "/images/cities/pune/morning.webp",
    afternoon: "/images/cities/pune/afternoon.webp",
    evening:   "/images/cities/pune/evening.webp",
    night:     "/images/cities/pune/night.webp",
    rainy:     "/images/cities/pune/rainy.webp",
  },

  // ── Kolkata ───────────────────────────────────────────────────────────────
  // Howrah Bridge, Hooghly river, monsoon sky, colonial skyline
  kolkata: {
    label:     "Kolkata, India",
    hero:      "/images/cities/kolkata/hero.webp",
    morning:   "/images/cities/kolkata/morning.webp",
    afternoon: "/images/cities/kolkata/afternoon.webp",
    evening:   "/images/cities/kolkata/evening.webp",
    night:     "/images/cities/kolkata/night.webp",
    rainy:     "/images/cities/kolkata/rainy.webp",
  },

  // ── Ahmedabad ─────────────────────────────────────────────────────────────
  // Sabarmati riverfront, sunset sky, old city skyline, dry landscape
  ahmedabad: {
    label:     "Ahmedabad, India",
    hero:      "/images/cities/ahmedabad/hero.webp",
    morning:   "/images/cities/ahmedabad/morning.webp",
    afternoon: "/images/cities/ahmedabad/afternoon.webp",
    evening:   "/images/cities/ahmedabad/evening.webp",
    night:     "/images/cities/ahmedabad/night.webp",
    rainy:     "/images/cities/ahmedabad/rainy.webp",
  },

  // ── London ────────────────────────────────────────────────────────────────
  // Thames riverside, cloudy English sky, city skyline, Hyde Park greenery
  london: {
    label:     "London, United Kingdom",
    hero:      "/images/cities/london/hero.webp",
    morning:   "/images/cities/london/morning.webp",
    afternoon: "/images/cities/london/afternoon.webp",
    evening:   "/images/cities/london/evening.webp",
    night:     "/images/cities/london/night.webp",
    rainy:     "/images/cities/london/rainy.webp",
  },

  // ── New York ──────────────────────────────────────────────────────────────
  // Manhattan skyline, Central Park aerial, Brooklyn Bridge, Hudson river
  newyork: {
    label:     "New York, United States",
    hero:      "/images/cities/new-york/hero.webp",
    morning:   "/images/cities/new-york/morning.webp",
    afternoon: "/images/cities/new-york/afternoon.webp",
    evening:   "/images/cities/new-york/evening.webp",
    night:     "/images/cities/new-york/night.webp",
    rainy:     "/images/cities/new-york/rainy.webp",
  },

  // ── Singapore ─────────────────────────────────────────────────────────────
  // Marina Bay, Gardens by the Bay, harbour skyline, tropical greenery
  singapore: {
    label:     "Singapore",
    hero:      "/images/cities/singapore/hero.webp",
    morning:   "/images/cities/singapore/morning.webp",
    afternoon: "/images/cities/singapore/afternoon.webp",
    evening:   "/images/cities/singapore/evening.webp",
    night:     "/images/cities/singapore/night.webp",
    rainy:     "/images/cities/singapore/rainy.webp",
  },

  // ── Tokyo ─────────────────────────────────────────────────────────────────
  // Tokyo skyline, Tokyo Tower, Shibuya crossing, neon city at dusk
  tokyo: {
    label:     "Tokyo, Japan",
    hero:      "/images/cities/tokyo/hero.webp",
    morning:   "/images/cities/tokyo/morning.webp",
    afternoon: "/images/cities/tokyo/afternoon.webp",
    evening:   "/images/cities/tokyo/evening.webp",
    night:     "/images/cities/tokyo/night.webp",
    rainy:     "/images/cities/tokyo/rainy.webp",
  },

  // ── Dubai ─────────────────────────────────────────────────────────────────
  // Burj Khalifa skyline, desert landscape, orange sunset, dust atmosphere
  dubai: {
    label:     "Dubai, United Arab Emirates",
    hero:      "/images/cities/dubai/hero.webp",
    morning:   "/images/cities/dubai/morning.webp",
    afternoon: "/images/cities/dubai/afternoon.webp",
    evening:   "/images/cities/dubai/evening.webp",
    night:     "/images/cities/dubai/night.webp",
    rainy:     "/images/cities/dubai/rainy.webp",
  },

};

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Maps a TimeSlot to the image variant key.
 * dawn/morning  → "morning"
 * afternoon     → "afternoon"
 * golden/evening→ "evening"
 * night         → "night"
 */
function slotToVariant(
  slot: TimeSlot,
): "morning" | "afternoon" | "evening" | "night" {
  switch (slot) {
    case "dawn":
    case "morning":
      return "morning";
    case "afternoon":
      return "afternoon";
    case "golden":
    case "evening":
      return "evening";
    case "night":
      return "night";
  }
}

/**
 * resolveHeroImage
 *
 * Returns the best available image URL for a given city + conditions.
 *
 * Fallback chain:
 *   weather variant (if rainy) → time-of-day variant → hero → GLOBAL_FALLBACK
 *
 * Returns `undefined` when no image is available yet (component renders
 * the sky gradient fallback instead — existing behavior preserved).
 *
 * @param cityId      - city.id from mock-data / city-context (e.g. "belagavi")
 * @param slot        - current TimeSlot from getTimeSlot()
 * @param weather     - current WeatherProxy from getWeatherProxy()
 */
export function resolveHeroImage(
  cityId: string,
  slot: TimeSlot,
  weather: WeatherProxy,
): string | undefined {
  const config = CITY_IMAGES[cityId];

  // Unknown city — use global fallback
  if (!config) return GLOBAL_FALLBACK;

  // 1. Rainy variant (weather takes priority over time of day)
  if (weather === "rainy" && config.rainy) return config.rainy;

  // 2. Time-of-day variant
  const variant = slotToVariant(slot);
  const variantPath = config[variant];
  if (variantPath) return variantPath;

  // 3. Default hero for this city
  if (config.hero) return config.hero;

  // 4. Global fallback
  return GLOBAL_FALLBACK;
}

/**
 * getCityImageConfig
 *
 * Returns the full config for a city — useful for admin UIs or
 * future image management dashboards.
 */
export function getCityImageConfig(cityId: string): CityImageConfig | undefined {
  return CITY_IMAGES[cityId];
}

/**
 * getSupportedCityIds
 *
 * Returns all city IDs that have image configurations registered.
 */
export function getSupportedCityIds(): string[] {
  return Object.keys(CITY_IMAGES);
}
