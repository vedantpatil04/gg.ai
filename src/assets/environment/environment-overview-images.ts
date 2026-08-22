/**
 * GreenGuard AI — Platform Environmental Overview Imagery Configuration
 *
 * Dedicated image configuration and resolver for the authenticated Platform
 * Environmental Overview page (`/environment`).
 *
 * Architectural Separation:
 * - Dedicated asset directory: `/environmental-overview/` (served from `public/environmental-overview/`).
 * - Completely decoupled from Dashboard hero image configuration (`src/lib/city-images.ts`).
 * - Completely decoupled from Public landing page imagery (`src/assets/landing/*`).
 * - Resolves based on active platform city state (`useCity()`), updating dynamically when the user switches cities.
 */

export interface EnvironmentalOverviewImageConfig {
  cityId: string;
  city: string;
  image: string;
  position?: string;
  alt?: string;
}

export const DEFAULT_ENVIRONMENTAL_IMAGE: EnvironmentalOverviewImageConfig = {
  cityId: "default",
  city: "Environmental Observatory",
  image: "/environmental-overview/environmental-default.webp",
  position: "50% 50%",
  alt: "Environmental Observatory overview photograph",
};

export const ENVIRONMENTAL_OVERVIEW_IMAGES: Record<string, EnvironmentalOverviewImageConfig> = {
  belagavi: {
    cityId: "belagavi",
    city: "Belagavi",
    image: "/environmental-overview/belgavi.webp",
    position: "50% 60%",
    alt: "Belagavi Western Ghats foothills and regional ecosystem photograph",
  },
  bengaluru: {
    cityId: "bengaluru",
    city: "Bengaluru",
    image: "/environmental-overview/bengaluru.webp",
    position: "50% 45%",
    alt: "Bengaluru urban canopy and plateau ecosystem photograph",
  },
  mumbai: {
    cityId: "mumbai",
    city: "Mumbai",
    image: "/environmental-overview/mumbai.webp",
    position: "50% 50%",
    alt: "Mumbai Arabian Sea coastline and wetland ecosystem photograph",
  },
  hyderabad: {
    cityId: "hyderabad",
    city: "Hyderabad",
    image: "/environmental-overview/hyderabad.webp",
    position: "50% 42%",
    alt: "Hyderabad Deccan plateau water network and urban landscape photograph",
  },
  chennai: {
    cityId: "chennai",
    city: "Chennai",
    image: "/environmental-overview/chennai.webp",
    position: "50% 50%",
    alt: "Chennai Bay of Bengal coastal biosphere photograph",
  },
  pune: {
    cityId: "pune",
    city: "Pune",
    image: "/environmental-overview/pune.webp",
    position: "50% 50%",
    alt: "Pune Sahyadri valley and river basin photograph",
  },
  kolkata: {
    cityId: "kolkata",
    city: "Kolkata",
    image: "/environmental-overview/kolkata.webp",
    position: "50% 50%",
    alt: "Kolkata Hooghly delta and wetland ecosystem photograph",
  },
  ahmedabad: {
    cityId: "ahmedabad",
    city: "Ahmedabad",
    image: "/environmental-overview/ahmedabad.webp",
    position: "50% 50%",
    alt: "Ahmedabad Sabarmati riverfront corridor photograph",
  },
  london: {
    cityId: "london",
    city: "London",
    image: "/environmental-overview/london.webp",
    position: "50% 42%",
    alt: "London Thames river valley and urban basin photograph",
  },
  singapore: {
    cityId: "singapore",
    city: "Singapore",
    image: "/environmental-overview/singapore.webp",
    position: "50% 55%",
    alt: "Singapore equatorial island canopy and biophilic environment photograph",
  },
  tokyo: {
    cityId: "tokyo",
    city: "Tokyo",
    image: "/environmental-overview/tokyo.webp",
    position: "62% 45%",
    alt: "Tokyo Pacific Rim watershed and surrounding greenery photograph",
  },
  dubai: {
    cityId: "dubai",
    city: "Dubai",
    image: "/environmental-overview/dubai.webp",
    position: "50% 55%",
    alt: "Dubai arid coastal desert landscape photograph",
  },
};

/**
 * getEnvironmentalOverviewImage
 *
 * Dedicated image resolver for the authenticated Platform Environmental Overview page.
 * Resolves direct city mapping with graceful fallback to the dedicated default asset.
 * Completely independent from Dashboard (`resolveHeroImage`) and Landing resolvers.
 *
 * @param cityId - Identifier for the monitored city (e.g. "belagavi", "mumbai")
 * @param cityName - Optional display name for semantic alt text generation on fallback
 * @returns EnvironmentalOverviewImageConfig
 */
export function getEnvironmentalOverviewImage(
  cityId?: string,
  cityName?: string,
): EnvironmentalOverviewImageConfig {
  if (!cityId) return DEFAULT_ENVIRONMENTAL_IMAGE;

  const normalized = cityId.toLowerCase().trim().replace(/[\s-_]+/g, "");

  // Check normalized mapping
  if (ENVIRONMENTAL_OVERVIEW_IMAGES[normalized]) {
    return ENVIRONMENTAL_OVERVIEW_IMAGES[normalized];
  }

  // Check raw lowercase
  const lower = cityId.toLowerCase().trim();
  if (ENVIRONMENTAL_OVERVIEW_IMAGES[lower]) {
    return ENVIRONMENTAL_OVERVIEW_IMAGES[lower];
  }

  // Handle aliases like "belgavi" / "belgaum" -> "belagavi"
  if (normalized === "belgavi" || normalized === "belgaum") {
    return ENVIRONMENTAL_OVERVIEW_IMAGES["belagavi"];
  }

  // Graceful fallback to dedicated default environmental asset
  return {
    ...DEFAULT_ENVIRONMENTAL_IMAGE,
    city: cityName || cityId || DEFAULT_ENVIRONMENTAL_IMAGE.city,
    alt: `${cityName || cityId || "City"} environmental photograph`,
  };
}
