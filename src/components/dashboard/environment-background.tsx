/**
 * EnvironmentBackground — Cinematic Responsive Background System
 *
 * Renders the base background layers of the hero:
 *   Layer 1 — Animated gradient background (CSS, GPU-only fallback + tint)
 *   Layer 2 — Real city photograph (resolved from city-images.ts)
 *             with responsive focal positioning across mobile, tablet, and desktop
 *   Layer 3 — Multi-stage responsive darkening & contrast overlay
 *
 * Responsiveness:
 *   - Desktop (1280px–1920px+): Wide cinematic crop with landmark centered in the visual field
 *   - Tablet (768px–1024px): Balanced framing keeping landmark clear of floating cards
 *   - Mobile (320px–430px): Intelligently repositioned (focal point preserved, not awkwardly cut)
 *   - Overlays: Dedicated left-to-right & bottom-up gradient masks ensuring text is always sharp
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

function getWeatherProxyFromAqi(
  aqi: number,
): "clear" | "cloudy" | "rainy" | "windy" | "foggy" {
  if (aqi > 200) return "foggy";
  return "clear";
}

export interface EnvironmentBackgroundProps {
  aqi: number;
  cityId?: string;
  cityName?: string;
}

export function EnvironmentBackground({
  aqi,
  cityId,
}: EnvironmentBackgroundProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const tier = getAqiTier(aqi);
  const gradient = TIER_GRADIENTS[tier];

  const hour = new Date().getHours();
  const slot = getTimeSlot(hour);
  const weather = getWeatherProxyFromAqi(aqi);
  const imageUrl = cityId
    ? resolveHeroImage(cityId, slot, weather)
    : undefined;

  return (
    <>
      {/* Layer 1 — Base tier gradient */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: gradient }}
      />

      {/* Layer 2 — Responsive city photograph */}
      {imageUrl && (
        <div
          aria-hidden
          className="absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700 bg-[position:50%_30%] sm:bg-[position:50%_28%] md:bg-[position:50%_35%] lg:bg-[position:50%_32%] xl:bg-[position:50%_28%]"
            style={{
              backgroundImage: `url(${imageUrl})`,
              animation: prefersReduced
                ? "none"
                : "env-bg-zoom 20s ease-out forwards",
            }}
          />
        </div>
      )}

      {/* Layer 3A — Global vertical contrast gradient */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.12)_35%,rgba(0,0,0,0.38)_70%,rgba(0,0,0,0.65)_100%)] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.40)_0%,rgba(0,0,0,0.18)_35%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.85)_100%)]"
      />

      {/* Layer 3B — Directional horizontal vignette (protects text contrast on the left side) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.32)_45%,rgba(0,0,0,0.08)_80%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.45)_45%,rgba(0,0,0,0.12)_80%,transparent_100%)]"
      />

      {/* Layer 3C — Mobile-specific bottom-left radial contrast boost */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none md:hidden bg-[radial-gradient(ellipse_90%_70%_at_10%_90%,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.15)_60%,transparent_100%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_10%_90%,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.25)_60%,transparent_100%)]"
      />

      {/* CSS keyframe for subtle zoom */}
      <style>{`
        @keyframes env-bg-zoom {
          from { transform: scale(1.05); }
          to   { transform: scale(1.00); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes env-bg-zoom { from {} to {} }
        }
      `}</style>
    </>
  );
}
