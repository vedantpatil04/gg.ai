import { cn } from "@/lib/utils";

/**
 * EnvSectionDivider — Phase 1 visual transition between content zones.
 *
 * Replaces the jarring stack of unrelated cards with a breath of space
 * that marks zone boundaries without being heavy or line-heavy.
 *
 * Design: a 1px horizontal gradient that fades in from the left,
 * holds in the centre, fades out right — invisible at edges, present
 * in the middle. Feels like the page breathing, not a divider.
 */
export function EnvSectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("env-section-divider", className)}
      aria-hidden="true"
      role="separator"
    />
  );
}
