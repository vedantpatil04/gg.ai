/**
 * GreenGuard AI — Landing Hero Background Media
 * Phase 1: Enterprise Foundation & Hero Experience
 *
 * Config-driven image system for the marketing hero background, mirroring
 * the pattern already used in `env-hero-media-config.ts`. Swap any URL below
 * to change the hero's imagery — no component changes required.
 *
 * These are temporary placeholder photographs (smart-city / environmental
 * monitoring subject matter) and are intentionally easy to replace with
 * licensed or brand photography later.
 *
 * Image guidance:
 *   - Wide / landscape aspect (16:9 or wider)
 *   - Dark-leaning or gradient-able so foreground text stays legible
 *   - Avoid faces; prefer skylines, aerial cities, monitoring infrastructure
 */

export interface LandingHeroLayer {
  /** Unique key, also used as the alt-text fallback id */
  key: string;
  /** Background image URL */
  imageUrl: string;
  /** Alt text for accessibility (decorative — hero copy carries the meaning) */
  imageAlt: string;
}

/**
 * Layered background scenes, cross-faded very subtly behind the hero copy.
 * Order = visual stacking order (first is the base layer).
 */
export const LANDING_HERO_LAYERS: LandingHeroLayer[] = [
  {
    key: "smart-city-skyline",
    imageUrl:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=2400&q=80&fit=crop",
    imageAlt: "Modern smart city skyline with clean skies and green parks",
  },
  {
    key: "aerial-city",
    imageUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=2400&q=80&fit=crop",
    imageAlt: "Aerial view of a dense city grid at dusk",
  },
  {
    key: "monitoring-station",
    imageUrl:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=2400&q=80&fit=crop",
    imageAlt: "Environmental monitoring station against a clear sky",
  },
  {
    key: "urban-green-infrastructure",
    imageUrl:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=2400&q=80&fit=crop",
    imageAlt: "Urban green infrastructure and tree-lined city rooftop",
  },
];

/** Primary hero background (first layer) — used as the base image. */
export const LANDING_HERO_PRIMARY = LANDING_HERO_LAYERS[0];
