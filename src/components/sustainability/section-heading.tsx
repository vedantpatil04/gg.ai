/**
 * section-heading.tsx — Phase 1 enterprise section header
 *
 * A larger, page-level section header (icon + title + short description +
 * accent divider) for the Sustainability page's own sections. This is
 * intentionally separate from `@/components/map/intelligence-ui`'s
 * `SectionHeader`, which is a compact 9px drawer/subsection label used
 * inside popups and side panels — a different visual tier for a different
 * context. Reusing that one here would under-style a top-level page
 * section, so a distinct primitive was added instead of overloading it.
 */
import type { LucideIcon } from "lucide-react";

export function SustainabilitySectionHeading({
  icon: Icon, title, description, accent = "var(--color-primary)",
}: { icon: LucideIcon; title: string; description?: string; accent?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <div
          className="size-8 rounded-lg grid place-items-center shrink-0"
          style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)`, color: accent }}
        >
          <Icon className="size-4" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 ml-[42px] leading-relaxed">{description}</p>
      )}
      <div
        className="h-px mt-3"
        style={{ background: `linear-gradient(to right, color-mix(in oklab, ${accent} 45%, transparent), var(--color-border) 55%, transparent)` }}
      />
    </div>
  );
}
