import type { LucideIcon } from "lucide-react";

export function SustainabilitySectionHeading({
  icon: Icon,
  title,
  description,
  accent = "var(--color-primary)",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: string;
}) {
  return (
    <div className="mb-6 pt-4 sm:pt-6">
      <div className="flex items-center gap-3">
        <div
          className="size-9 sm:size-10 rounded-xl grid place-items-center shrink-0 shadow-sm"
          style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}
        >
          <Icon className="size-4.5 sm:size-5" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div
        className="h-0.5 mt-4 rounded-full"
        style={{
          background: `linear-gradient(to right, ${accent}, color-mix(in oklab, ${accent} 40%, transparent) 40%, var(--color-border) 80%, transparent)`,
        }}
      />
    </div>
  );
}
