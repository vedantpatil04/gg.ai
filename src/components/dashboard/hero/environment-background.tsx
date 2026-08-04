/**
 * EnvironmentBackground — Cinematic Hero Phase 1 + Phase 2A image system
 *
 * Renders the base background layers of the hero:
 *   Layer 1 — Animated gradient background (CSS, GPU-only)
 *   Layer 2 — Real city photograph (resolved from city-images.ts)
 *   Layer 3 — Dark overlay for readability
 *
 * Phase 2A change (the ONLY change from Phase 1):
 *   The background image is now resolved through `resolveHeroImage()`
 *   from `src/lib/city-images.ts` instead of being picked from a
 *   hardcoded Unsplash URL map.
 *
 *   - `cityId` is the new optional prop that drives the lookup.
 *   - When `cityId` is provided: resolves city-specific image + time-of-day variant.
 *   - When `cityId` is absent or city has no image configured: the gradient
 *     background fills the space exactly as before — zero visual regression.
 *
 * Everything else — zoom animation, gradient tiers, dark overlay,
 * prefers-reduced-motion support — is identical to the Phase 1 original.
 */

import { useReducedMotion } from "framer-motion";
import { resolveHeroImage } from "@/lib/city-images";
import { getTimeSlot } from "@/lib/hero-scene";

/** Gradient backgrounds per AQI tier (fallback + tint behind image) */
const TIER_GRADIENTS: Record<string, string> = {
  good:      "linear-gradient(145deg, oklch(0.22 0.08 165) 0%, oklch(0.12 0.04 200) 100%)",
  moderate:  "linear-gradient(145deg, oklch(0.22 0.06 85) 0%, oklch(0.12 0.04 200) 100%)",
  poor:      "linear-gradient(145deg, oklch(0.22 0.08 55) 0%, oklch(0.12 0.03 30) 100%)",
  hazardous: "linear-gradient(145deg, oklch(0.18 0.06 20) 0%, oklch(0.10 0.08 300) 100%)",
};

function getAqiTier(aqi: number): string {
  if (aqi <= 50)  return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 200) return "poor";
  return "hazardous";
}

/** Derive a simple weather proxy for image selection from the AQI tier */
function getWeatherProxyFromAqi(
  aqi: number,
): "clear" | "cloudy" | "rainy" | "windy" | "foggy" {
  // When AQI is hazardous, treat it as foggy for image selection purposes
  if (aqi > 200) return "foggy";
  return "clear";
}

export interface EnvironmentBackgroundProps {
  aqi: number;
  /** city.id from CityContext — drives the image lookup in city-images.ts */
  cityId?: string;
  /**
   * cityName is kept for backward compatibility with any existing call sites
   * that pass it. It is no longer used for image selection.
   */
  cityName?: string;
}

export function EnvironmentBackground({
  aqi,
  cityId,
}: EnvironmentBackgroundProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const tier     = getAqiTier(aqi);
  const gradient = TIER_GRADIENTS[tier];

  // Resolve the image from the centralized city-images.ts config.
  // Returns undefined when no image is configured → gradient renders alone.
  const hour    = new Date().getHours();
  const slot    = getTimeSlot(hour);
  const weather = getWeatherProxyFromAqi(aqi);
  const imageUrl = cityId
    ? resolveHeroImage(cityId, slot, weather)
    : undefined;

  return (
    <>
      {/* Layer 1 — Animated gradient background */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: gradient }}
      />

      {/* Layer 2 — Real city photograph */}
      {imageUrl && (
        <div
          aria-hidden
          className="absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${imageUrl})`,
              animation: prefersReduced
                ? "none"
                : "env-bg-zoom 18s ease-out forwards",
            }}
          />
        </div>
      )}

      {/* Layer 3 — Darkening overlay */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 40%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      {/* CSS keyframe for zoom — lightweight, GPU-only transform */}
      <style>{`
        @keyframes env-bg-zoom {
          from { transform: scale(1.06); }
          to   { transform: scale(1.00); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes env-bg-zoom { from {} to {} }
        }
      `}</style>
    </>
  );
}
