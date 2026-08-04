/**
 * GreenGuard AI — Landing Design Foundation
 *
 * Phase 1: Enterprise Foundation & Hero Experience
 *
 * Shared layout and CTA primitives so every future landing phase inherits
 * the same container width, spacing and button treatment instead of each
 * section reinventing its own. Import from here rather than hardcoding.
 */

/**
 * Outer content container for the nav and hero. Wider than the rest of the
 * page's `max-w-[1440px]` sections and with padding that keeps scaling on
 * very large displays, so the first screen never reads as a narrow island
 * on a 4K or ultrawide monitor. Later sections can keep their existing
 * width — this is scoped to Phase 1 only.
 */
export const LANDING_CONTAINER =
  "mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-20";

/** Primary CTA — solid, high-contrast. Used once per view (nav + hero share the same action). */
export const CTA_PRIMARY_CLASS =
  "group inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Secondary CTA — quiet text link with a moving arrow, never a second filled button. */
export const CTA_SECONDARY_CLASS =
  "group inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";
