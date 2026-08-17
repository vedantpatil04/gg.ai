/**
 * GreenGuard AI — Landing Page Imagery Configuration
 * Phase 3: Real Imagery & Interactive Product Storytelling
 *
 * Single source of truth for every real photograph used on the landing
 * page. Mirrors the pattern already established by `src/lib/city-images.ts`
 * (production city heroes) and `src/assets/landing/hero/landing-hero-media.ts`
 * (Phase 1 hero layers) — components never hardcode image paths, they import
 * the named export they need from here.
 *
 * ─── SOURCE ──────────────────────────────────────────────────────────────
 *
 * Every image below is a resized, recompressed copy of a real photograph
 * that already ships with this project in `public/images/cities/**`
 * (the same set the production Environment pages use for city heroes).
 * Nothing here is stock photography, hotlinked, or AI-generated — it's the
 * project's own real-world city photography, re-encoded for the landing
 * page's performance budget:
 *
 *   public/images/cities/<city>/hero.webp   (2–12 MB, full resolution)
 *        → public/images/landing/**\/<city>.webp  (6–270 KB, resized + recompressed)
 *
 * ─── REPLACING AN IMAGE ──────────────────────────────────────────────────
 *
 * Drop a new file into the matching `public/images/landing/**` folder and
 * update the `src` below. No component changes are ever required — every
 * landing section reads from this file only.
 *
 * ─── ALT TEXT ────────────────────────────────────────────────────────────
 *
 * Images that carry real information (the Real World carousel, the Citizen
 * Impact photo) have descriptive alt text. Images used purely as decorative
 * backdrops (Environmental Overview, Forecast, Hero ambient layer) have
 * empty alt text and are always rendered inside an `aria-hidden` wrapper —
 * they add tone, not information.
 */

export interface LandingImage {
  /** Path under `public/`, served by Vite as a static asset. */
  src: string;
  /** Descriptive alt text, or "" for purely decorative use (must be paired with aria-hidden on the wrapper). */
  alt: string;
  /** CSS `object-position`, tuned per photo so the real subject stays framed at every crop ratio this image is used at. */
  position: string;
  /** Real place name, shown as an on-image caption where the image is meaningful content (Real World carousel). */
  caption?: string;
}

/**
 * REAL WORLD — the carousel in `RealWorldSection`.
 * Five real cities spanning five distinct regions (South Asia, Europe, the
 * Middle East, Southeast Asia, East Asia), chosen deliberately so the
 * carousel reads as global environmental context — not a single country's
 * product demo. This is separate from the platform's current live product
 * data (see `useCity()` / `CITIES[0]`, which is Belagavi, India, and is
 * shown elsewhere as exactly that: a live data example, not the brand
 * story). Order = slide order.
 */
export const REAL_WORLD_IMAGES: LandingImage[] = [
  {
    src: "/images/landing/real-world/bengaluru.webp",
    alt: "Vidhana Soudha and its lawns under a clear sky in Bengaluru, India",
    position: "50% 45%",
    caption: "Bengaluru, India",
  },
  {
    src: "/images/landing/real-world/london.webp",
    alt: "Tower Bridge over the River Thames in London, United Kingdom",
    position: "50% 42%",
    caption: "London, United Kingdom",
  },
  {
    src: "/images/landing/real-world/dubai.webp",
    alt: "Aerial view of the Burj Al Arab and Dubai's coastline, United Arab Emirates",
    position: "50% 55%",
    caption: "Dubai, UAE",
  },
  {
    src: "/images/landing/real-world/singapore.webp",
    alt: "Marina Bay skyline reflected in the water at dusk, Singapore",
    position: "50% 55%",
    caption: "Singapore",
  },
  {
    src: "/images/landing/real-world/tokyo.webp",
    alt: "Mount Fuji rising over a pagoda and city rooftops near Tokyo, Japan",
    position: "62% 45%",
    caption: "Tokyo, Japan",
  },
];

/** Decorative backdrop behind `EnvironmentalOverviewExperience` — real greenery, kept low-opacity and masked. */
export const ENVIRONMENTAL_OVERVIEW_BACKDROP: LandingImage = {
  src: "/images/landing/backdrops/environmental-overview.webp",
  alt: "",
  position: "50% 68%",
};

/** Decorative backdrop behind `ForecastIntelligenceExperience` — real sky, kept low-opacity and masked. */
export const FORECAST_BACKDROP: LandingImage = {
  src: "/images/landing/backdrops/forecast.webp",
  alt: "",
  position: "50% 35%",
};

/** The photo in `CitizenImpactSection` — real, meaningful content, so it carries full alt text. */
export const CITIZEN_IMPACT_IMAGE: LandingImage = {
  src: "/images/landing/citizen/hyderabad.webp",
  alt: "A busy street market beneath the Charminar monument in Hyderabad, India",
  position: "50% 42%",
};

/**
 * Hero ambient layer — a heavily pre-blurred, small crop used purely as a
 * soft color/texture wash behind the existing aurora gradient system in
 * `HeroBackground`. Decorative only; kept tiny (a few KB) since it loads
 * above the fold.
 */
export const HERO_AMBIENT_IMAGE: LandingImage = {
  src: "/images/landing/hero/ambient-bengaluru.webp",
  alt: "",
  position: "center",
};
