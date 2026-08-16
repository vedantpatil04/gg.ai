import type { LucideIcon } from "lucide-react";

/**
 * GreenActionsSectionHeading — a deliberately lighter-weight heading than
 * the shared `SustainabilitySectionHeading` (boxed icon tile + full-width
 * gradient rule). That component stays untouched since the Sustainability
 * page also depends on it; this one is scoped to Green Actions only, so the
 * page can read as an editorial guidance center rather than another
 * analytics dashboard without changing how any other page looks.
 */
export function GreenActionsSectionHeading({
  icon: Icon,
  title,
  description,
  accent = "var(--color-primary)",
  headingId,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: string;
  headingId?: string;
}) {
  return (
    <div className="mb-5 sm:mb-6 pt-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4" style={{ color: accent }} aria-hidden="true" />
        <h2 id={headingId} className="text-base sm:text-lg font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">{description}</p>
      )}
      <div
        className="h-px mt-3.5 max-w-24"
        style={{ background: `color-mix(in oklab, ${accent} 45%, transparent)` }}
        aria-hidden="true"
      />
    </div>
  );
}
