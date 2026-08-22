/**
 * GreenGuard AI — Environmental Overview Landing Imagery Configuration
 *
 * Dedicated image configuration and resolver for the Environmental Overview
 * section on the public landing page.
 *
 * Architectural Separation:
 * - Uses dedicated assets in `/environmental/` (served from `public/environmental/`).
 * - Completely decoupled from Dashboard hero image configuration (`src/lib/city-images.ts`).
 * - Resolves independently based on landing-page city selection without mutating
 *   platform or dashboard state.
 */

export interface EnvironmentalOverviewImageConfig {
  cityId: string;
  city: string;
  image: string;
  position?: string;
  label: string;
  headline: string;
  description: string;
}

export const DEFAULT_ENVIRONMENTAL_IMAGE: EnvironmentalOverviewImageConfig = {
  cityId: "default",
  city: "Environmental Observatory",
  image: "/environmental/environmental-default.webp",
  position: "50% 68%",
  label: "ENVIRONMENTAL OBSERVATORY",
  headline: "Continuous planetary and municipal sensor intelligence.",
  description:
    "Unified air quality, water telemetry, urban green cover, and emissions indicators.",
};

export const ENVIRONMENTAL_OVERVIEW_IMAGES: Record<string, EnvironmentalOverviewImageConfig> = {
  belagavi: {
    cityId: "belagavi",
    city: "Belagavi",
    image: "/environmental/environmental-belagavi.webp",
    position: "50% 60%",
    label: "REGIONAL ECOSYSTEM",
    headline: "Western Ghats foothills with dense forested valleys and river basins.",
    description:
      "Continuous air, water, and green canopy monitoring across Belagavi's natural corridor and urban limits.",
  },
  bengaluru: {
    cityId: "bengaluru",
    city: "Bengaluru",
    image: "/environmental/environmental-bengaluru.webp",
    position: "50% 45%",
    label: "URBAN CANOPY & AIR",
    headline: "Plateau ecosystem balancing tech infrastructure with garden city greenery.",
    description:
      "Real-time sensor telemetry tracking particulate concentrations, lake water quality, and urban heat distribution.",
  },
  mumbai: {
    cityId: "mumbai",
    city: "Mumbai",
    image: "/environmental/environmental-mumbai.webp",
    position: "50% 50%",
    label: "COASTAL & MARINE ECOSYSTEM",
    headline: "Arabian Sea coastal wetlands, mangrove forests, and high-density marine air.",
    description:
      "Integrated humidity, coastal aerosol dispersion, and tidal creek water telemetry.",
  },
  delhi: {
    cityId: "delhi",
    city: "Delhi",
    image: "/environmental/environmental-delhi.webp",
    position: "50% 50%",
    label: "NORTHERN BASIN AIRSHED",
    headline: "Gangetic plains airshed with seasonal thermal inversion and heavy particulate load.",
    description:
      "Sub-second particulate tracking (PM2.5 / PM10) with multi-point atmospheric sensor triangulation.",
  },
  hyderabad: {
    cityId: "hyderabad",
    city: "Hyderabad",
    image: "/environmental/environmental-hyderabad.webp",
    position: "50% 42%",
    label: "DECCAN WATER & AIR NETWORK",
    headline: "Deccan plateau lake network and expanding industrial corridors.",
    description:
      "Continuous lake water index sensing and ambient air quality analysis across the metro region.",
  },
  chennai: {
    cityId: "chennai",
    city: "Chennai",
    image: "/environmental/environmental-chennai.webp",
    position: "50% 50%",
    label: "BAY OF BENGAL BIOSPHERE",
    headline: "Coastal wetland systems, coastal aquifers, and tropical maritime air.",
    description:
      "Water table monitoring, coastal salinity analysis, and real-time urban heat tracking.",
  },
  pune: {
    cityId: "pune",
    city: "Pune",
    image: "/environmental/environmental-pune.webp",
    position: "50% 50%",
    label: "SAHYADRI VALLEY SYSTEM",
    headline: "Hilly river basin with seasonal microclimate variations and dense tree cover.",
    description:
      "Mula-Mutha river basin water telemetry and hillside particulate dispersion analysis.",
  },
  kolkata: {
    cityId: "kolkata",
    city: "Kolkata",
    image: "/environmental/environmental-kolkata.webp",
    position: "50% 50%",
    label: "DELTAIC WETLAND & ESTUARY",
    headline: "Hooghly river delta and East Kolkata Wetlands filtering municipal hydrology.",
    description:
      "Wetland absorption telemetry, atmospheric moisture mapping, and river water quality monitoring.",
  },
  ahmedabad: {
    cityId: "ahmedabad",
    city: "Ahmedabad",
    image: "/environmental/environmental-ahmedabad.webp",
    position: "50% 50%",
    label: "SEMI-ARID RIVERFRONT",
    headline: "Sabarmati river corridor within a dry semi-arid climate zone.",
    description:
      "Riverfront water quality indices, dust particulate alerts, and solar radiance tracking.",
  },
  london: {
    cityId: "london",
    city: "London",
    image: "/environmental/environmental-london.webp",
    position: "50% 42%",
    label: "TEMPERATE ESTUARY & URBAN BASIN",
    headline: "Thames river valley with dense urban emissions and extensive parkland.",
    description:
      "Ultra-low emission zone tracking, nitrogen dioxide sensing, and river temperature telemetry.",
  },
  newyork: {
    cityId: "newyork",
    city: "New York",
    image: "/environmental/environmental-newyork.webp",
    position: "50% 50%",
    label: "COASTAL ARCHIPELAGO",
    headline: "Hudson-Raritan estuary and Atlantic coastal wind corridors.",
    description:
      "Harbor water purity analysis, microclimate sensors across urban canyons, and carbon intensity metrics.",
  },
  singapore: {
    cityId: "singapore",
    city: "Singapore",
    image: "/environmental/environmental-singapore.webp",
    position: "50% 55%",
    label: "EQUATORIAL ISLAND ECOSYSTEM",
    headline: "Dense tropical biophilic urban infrastructure and maritime air currents.",
    description:
      "Canopy density metrics, urban heat island mitigation indices, and transboundary haze monitoring.",
  },
  tokyo: {
    cityId: "tokyo",
    city: "Tokyo",
    image: "/environmental/environmental-tokyo.webp",
    position: "62% 45%",
    label: "PACIFIC RIM METROPOLIS",
    headline: "Tokyo Bay watershed surrounded by Kanto plain greenery and mountainous periphery.",
    description:
      "Seismic environmental correlation, Tokyo Bay water monitoring, and municipal carbon accounting.",
  },
  dubai: {
    cityId: "dubai",
    city: "Dubai",
    image: "/environmental/environmental-dubai.webp",
    position: "50% 55%",
    label: "ARID COASTAL DESERT",
    headline: "Gulf coastal plain with hyper-arid desert atmosphere and solar generation fields.",
    description:
      "Dust storm forecasting, seawater desalination impact telemetry, and ambient heat stress sensing.",
  },
};

/**
 * getEnvironmentalOverviewImage
 *
 * Dedicated image resolver for the landing-page Environmental Overview section.
 * Independent from Dashboard hero image logic (`resolveHeroImage`).
 *
 * @param cityId - Identifier for the monitored city (e.g. "belagavi", "ahmedabad")
 * @returns EnvironmentalOverviewImageConfig for the matched city or fallback
 */
export function getEnvironmentalOverviewImage(cityId: string): EnvironmentalOverviewImageConfig {
  if (!cityId) return DEFAULT_ENVIRONMENTAL_IMAGE;

  const normalized = cityId.toLowerCase().replace(/[\s-_]+/g, "");

  // Check normalized keys first
  if (ENVIRONMENTAL_OVERVIEW_IMAGES[normalized]) {
    return ENVIRONMENTAL_OVERVIEW_IMAGES[normalized];
  }

  // Check exact key
  if (ENVIRONMENTAL_OVERVIEW_IMAGES[cityId.toLowerCase()]) {
    return ENVIRONMENTAL_OVERVIEW_IMAGES[cityId.toLowerCase()];
  }

  // Handle aliases like "new-york" -> "newyork"
  if (normalized === "newyork" || normalized === "ny") {
    return ENVIRONMENTAL_OVERVIEW_IMAGES["newyork"];
  }

  // Fallback to first available city or default backdrop
  return ENVIRONMENTAL_OVERVIEW_IMAGES["belagavi"] ?? DEFAULT_ENVIRONMENTAL_IMAGE;
}
