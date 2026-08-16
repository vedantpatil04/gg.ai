/**
 * GreenGuard AI — Authentication Background Media
 *
 * Single source of truth for the full-screen environmental photograph shown
 * behind the sign-in and two-factor verification screens. This mirrors the
 * pattern already used for the marketing hero (see
 * `src/assets/landing/hero/landing-hero-media.ts`) and the city hub hero
 * (`src/lib/city-images.ts`): one reference, easy to replace later without
 * touching any authentication, role, or layout logic.
 *
 * This is intentionally the same "smart city skyline" scene used as the
 * marketing hero's primary layer, so the sign-in experience reads as a
 * continuation of the brand rather than a disconnected screen.
 *
 * To replace the image later: change `url` (and `alt`) below. Nothing in
 * `AuthBackground`, `login.tsx`, or `verify-2fa.tsx` needs to change.
 *
 * Image guidance for any replacement:
 *   - Real photograph only — no illustration or AI-generated imagery.
 *   - Landscape orientation, high resolution (the layout crops to fill the
 *     viewport via `object-cover`, so detail matters more than exact ratio).
 *   - Subject: a real city skyline / urban environment with visible
 *     greenery or open sky — "environment + scale", not a single landmark,
 *     so it reads as GreenGuard's whole platform rather than one city.
 */

export interface AuthBackgroundImage {
  /** Full-bleed background photograph URL — the one place this is defined. */
  url: string;
  /** Decorative image; only used as a fallback description, never shown. */
  alt: string;
}

export const AUTH_BACKGROUND_IMAGE: AuthBackgroundImage = {
  url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=2400&q=80&fit=crop",
  alt: "Modern city skyline with green parks under a clear sky",
};
