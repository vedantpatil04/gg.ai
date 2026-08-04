/**
 * GreenGuard AI — Hero Media Configuration
 * Phase 2: Environmental Identity & Executive Experience
 *
 * Design Decision:
 *   The Citizen Dashboard uses CITY IDENTITY (landmarks, skylines, iconic places).
 *   The Environmental Overview uses ENVIRONMENTAL IDENTITY (forests, rivers,
 *   mountains, lakes, renewable energy, ecosystems, atmospheric landscapes).
 *   These identities are intentionally different and must not be merged.
 *
 * Config-driven image system. Replace imagery here without touching any
 * React component. The resolver picks the most specific matching scene.
 *
 * Resolution order (most specific → least specific):
 *   1. City-specific environmental override
 *   2. AQI-band condition override
 *   3. Time-of-day environmental scene
 *
 * All URLs use Unsplash for reliable imagery.
 * Swap to your own CDN at any time — zero component changes needed.
 *
 * Image guidelines:
 *   - Wide-aspect (16:9 or wider), landscape orientation
 *   - Dark or gradient-able lower half for text legibility
 *   - NO city skylines, landmarks, or urban architecture
 *   - PREFER forests, rivers, mountains, lakes, wetlands, clean atmosphere
 */

export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night";
export type AqiBand  = "good" | "moderate" | "unhealthy" | "hazardous";

export interface HeroMediaScene {
  key: string;
  imageUrl: string;
  imageUrlAlt?: string;
  imageAlt: string;
  /** Gradient overlay blending image into the UI */
  gradient: string;
  /** Ambient tint colour for lighting orbs */
  ambientColor: string;
  sourceTone: "dark" | "medium" | "light";
}

/* ─────────────────────────────────────────────────────────────────────────────
   TIME-OF-DAY ENVIRONMENTAL SCENES
   Each scene uses natural landscape imagery to communicate environmental
   intelligence rather than city identity.
───────────────────────────────────────────────────────────────────────────── */
export const TIME_SCENES: Record<TimeOfDay, HeroMediaScene> = {
  dawn: {
    key: "dawn",
    // Golden dawn mist rising over a primeval forest river
    imageUrl:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=85&fit=crop",
    imageAlt: "Golden dawn mist rising over a primeval forest river valley with silhouetted trees",
    gradient:
      "linear-gradient(180deg, oklch(0.09 0.020 30/0.50) 0%, oklch(0.08 0.015 260/0.72) 50%, oklch(0.07 0.012 250/0.96) 100%)",
    ambientColor: "oklch(0.68 0.18 52)",
    sourceTone: "medium",
  },
  morning: {
    key: "morning",
    // Crystal-clear mountain lake surrounded by pine forest at sunrise
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85&fit=crop",
    imageAlt: "Crystal-clear alpine lake surrounded by pine forest mountains at sunrise",
    gradient:
      "linear-gradient(180deg, oklch(0.09 0.016 220/0.40) 0%, oklch(0.08 0.014 235/0.68) 52%, oklch(0.07 0.012 248/0.95) 100%)",
    ambientColor: "oklch(0.72 0.14 210)",
    sourceTone: "light",
  },
  afternoon: {
    key: "afternoon",
    // Aerial view of vast old-growth forest canopy
    imageUrl:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=85&fit=crop",
    imageAlt: "Aerial view of vast old-growth forest canopy stretching to the horizon",
    gradient:
      "linear-gradient(180deg, oklch(0.09 0.018 155/0.45) 0%, oklch(0.08 0.015 240/0.70) 52%, oklch(0.07 0.012 252/0.96) 100%)",
    ambientColor: "oklch(0.66 0.16 148)",
    sourceTone: "medium",
  },
  evening: {
    key: "evening",
    // Wind turbines on a green hillside at golden sunset
    imageUrl:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1920&q=85&fit=crop",
    imageAlt: "Wind turbines on a rolling green hillside bathed in warm golden sunset light",
    gradient:
      "linear-gradient(180deg, oklch(0.09 0.022 42/0.48) 0%, oklch(0.08 0.016 260/0.72) 52%, oklch(0.07 0.012 248/0.96) 100%)",
    ambientColor: "oklch(0.68 0.19 46)",
    sourceTone: "medium",
  },
  night: {
    key: "night",
    // Milky Way over a pristine mountain wilderness with a still lake
    imageUrl:
      "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=85&fit=crop",
    imageAlt: "Milky Way galaxy arching over a pristine mountain wilderness with a mirror-still lake",
    gradient:
      "linear-gradient(180deg, oklch(0.07 0.016 260/0.38) 0%, oklch(0.07 0.012 250/0.72) 52%, oklch(0.06 0.010 252/0.97) 100%)",
    ambientColor: "oklch(0.52 0.14 258)",
    sourceTone: "dark",
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   AQI-BAND CONDITION OVERRIDES
   For poor or hazardous air quality the scene shifts to communicate
   environmental concern — atmospheric and muted, not alarming.
───────────────────────────────────────────────────────────────────────────── */
export const AQI_SCENES: Partial<Record<AqiBand, Partial<HeroMediaScene>>> = {
  unhealthy: {
    // Hazy atmosphere over a mountain range — communicates pollution
    imageUrl:
      "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80&fit=crop",
    imageAlt: "Atmospheric haze over a mountain range obscuring the peaks — elevated pollution conditions",
    gradient:
      "linear-gradient(180deg, oklch(0.10 0.014 55/0.55) 0%, oklch(0.09 0.012 260/0.78) 52%, oklch(0.07 0.010 250/0.96) 100%)",
    ambientColor: "oklch(0.60 0.14 58)",
  },
  hazardous: {
    // Dense wildfire smoke haze over a forest landscape
    imageUrl:
      "https://images.unsplash.com/photo-1602992708529-c9fdb12905c9?w=1920&q=80&fit=crop",
    imageAlt: "Dense wildfire smoke haze blanketing a forest landscape — hazardous air quality conditions",
    gradient:
      "linear-gradient(180deg, oklch(0.10 0.018 28/0.65) 0%, oklch(0.09 0.014 260/0.82) 52%, oklch(0.07 0.010 250/0.97) 100%)",
    ambientColor: "oklch(0.54 0.20 30)",
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   CITY-SPECIFIC ENVIRONMENTAL OVERRIDES
   Keyed by city.id — takes highest priority.
   Each uses a landscape or natural scene that connects to the region's
   environmental character — NOT a landmark or skyline.
───────────────────────────────────────────────────────────────────────────── */
export const CITY_SCENES: Record<string, Partial<HeroMediaScene>> = {
  mumbai: {
    // Mangrove ecosystem on the western coast of India
    imageUrl:
      "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1920&q=85&fit=crop",
    imageAlt: "Dense mangrove ecosystem at the coastal wetlands near Mumbai",
    ambientColor: "oklch(0.64 0.16 155)",
  },
  delhi: {
    // Northern Indian river plain and wetlands
    imageUrl:
      "https://images.unsplash.com/photo-1540202404-a2f29b0c7258?w=1920&q=85&fit=crop",
    imageAlt: "Yamuna river wetlands and floodplain in northern India at dawn",
    ambientColor: "oklch(0.66 0.15 65)",
  },
  london: {
    // English countryside — rolling hills, hedgerows, green valleys
    imageUrl:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=85&fit=crop",
    imageAlt: "Rolling English countryside with green valley, hedgerows and morning mist",
    ambientColor: "oklch(0.62 0.12 148)",
  },
  "new-york": {
    // Catskills or Adirondacks — forests of the northeast
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=85&fit=crop",
    imageAlt: "Autumn foliage over Appalachian mountain forests of the northeastern United States",
    ambientColor: "oklch(0.66 0.18 46)",
  },
  singapore: {
    // Singapore's extraordinary rainforest-in-the-city
    imageUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85&fit=crop",
    imageAlt: "Tropical rainforest canopy representing Singapore's extraordinary urban biodiversity",
    ambientColor: "oklch(0.66 0.16 150)",
  },
  tokyo: {
    // Japanese mountain forests and sacred cedar groves
    imageUrl:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=85&fit=crop",
    imageAlt: "Sacred Japanese cedar forest corridor with dappled morning light",
    ambientColor: "oklch(0.60 0.14 148)",
  },
  dubai: {
    // Arabian Desert landscape — sand dunes at dawn
    imageUrl:
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=85&fit=crop",
    imageAlt: "Pristine Arabian desert dunes at dawn with a vast empty sky",
    ambientColor: "oklch(0.70 0.16 64)",
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   RESOLVER
───────────────────────────────────────────────────────────────────────────── */

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5  && hour < 8)  return "dawn";
  if (hour >= 8  && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

export function getAqiBand(aqi: number): AqiBand {
  if (aqi <= 100) return "good";
  if (aqi <= 150) return "moderate";
  if (aqi <= 200) return "unhealthy";
  return "hazardous";
}

export function resolveHeroMedia(
  cityId: string,
  aqi: number,
  localHour: number = new Date().getHours(),
): HeroMediaScene {
  const tod  = getTimeOfDay(localHour);
  const band = getAqiBand(aqi);

  // Base: time-of-day environmental scene
  let scene: HeroMediaScene = { ...TIME_SCENES[tod] };

  // Layer: AQI condition override for poor air
  if (band === "unhealthy" || band === "hazardous") {
    const aqiOverride = AQI_SCENES[band];
    if (aqiOverride) scene = { ...scene, ...aqiOverride };
  }

  // Layer: city-specific environmental override (highest priority)
  const cityOverride = CITY_SCENES[cityId];
  if (cityOverride) scene = { ...scene, ...cityOverride, key: `${cityId}-${tod}` };

  return scene;
}
