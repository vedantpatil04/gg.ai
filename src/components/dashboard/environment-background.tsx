/**
 * EnvironmentBackground — Cinematic Hero Phase 1
 *
 * Renders a real high-quality environmental photo as the base layer.
 * Images are sourced from Unsplash (free for use, no attribution required
 * for product UI). The image rotates based on AQI tier + time of day so
 * the scene always feels relevant.
 *
 * Layers rendered here (bottom two):
 *   Layer 1 — Animated gradient background (CSS, GPU-only)
 *   Layer 2 — Real environmental photo (cover, subtle zoom animation)
 *   Layer 3 — Dark overlay for readability
 *
 * prefers-reduced-motion: suppresses the zoom animation, keeps static image.
 */

import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";

/** AQI-driven image themes mapped to curated Unsplash photo IDs */
const ENV_IMAGES: Record<string, string[]> = {
  // Good AQI — lush, clean environments
  good: [
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80&auto=format&fit=crop", // forest
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80&auto=format&fit=crop", // mountain lake
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1600&q=80&auto=format&fit=crop", // rolling hills
  ],
  // Moderate AQI — urban parks, city nature
  moderate: [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80&auto=format&fit=crop", // city skyline
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop", // river valley
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80&auto=format&fit=crop", // wind turbines
  ],
  // Poor AQI — hazy landscapes, urban
  poor: [
    "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=1600&q=80&auto=format&fit=crop", // foggy city
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=80&auto=format&fit=crop", // urban haze
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80&auto=format&fit=crop", // industrial
  ],
  // Hazardous AQI — dark, moody
  hazardous: [
    "https://images.unsplash.com/photo-1527525443983-6e60c75fff46?w=1600&q=80&auto=format&fit=crop", // storm
    "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1600&q=80&auto=format&fit=crop", // smog
    "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1600&q=80&auto=format&fit=crop", // dark clouds
  ],
};

/** Gradient backgrounds per AQI tier (fallback + tint behind image) */
const TIER_GRADIENTS: Record<string, string> = {
  good: "linear-gradient(145deg, oklch(0.22 0.08 165) 0%, oklch(0.12 0.04 200) 100%)",
  moderate: "linear-gradient(145deg, oklch(0.22 0.06 85) 0%, oklch(0.12 0.04 200) 100%)",
  poor: "linear-gradient(145deg, oklch(0.22 0.08 55) 0%, oklch(0.12 0.03 30) 100%)",
  hazardous: "linear-gradient(145deg, oklch(0.18 0.06 20) 0%, oklch(0.10 0.08 300) 100%)",
};

function getAqiTier(aqi: number): string {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 200) return "poor";
  return "hazardous";
}

/** Deterministic image selection per city+day so it doesn't flicker on re-render */
function pickImage(tier: string, seed: string): string {
  const images = ENV_IMAGES[tier] ?? ENV_IMAGES.good;
  // Use date + seed for stable but daily-rotating choice
  const day = new Date().getDate();
  const charSum = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return images[(day + charSum) % images.length];
}

export interface EnvironmentBackgroundProps {
  aqi: number;
  cityName: string;
}

export function EnvironmentBackground({ aqi, cityName }: EnvironmentBackgroundProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const tier = getAqiTier(aqi);
  const imageUrl = useMemo(() => pickImage(tier, cityName), [tier, cityName]);
  const gradient = TIER_GRADIENTS[tier];

  return (
    <>
      {/* Layer 1 — Animated gradient background */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: gradient }}
      />

      {/* Layer 2 — Real environmental photo */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${imageUrl})`,
            transform: prefersReduced ? "none" : undefined,
            // Subtle zoom-out on load: implemented via keyframe animation below
            animation: prefersReduced
              ? "none"
              : "env-bg-zoom 18s ease-out forwards",
            filter: "blur(0px)",
          }}
        />
      </div>

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
