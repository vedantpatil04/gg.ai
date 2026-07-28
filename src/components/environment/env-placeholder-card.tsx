import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — reusable placeholder card.
 *
 * Renders an icon, a title, a short description of what the section will
 * eventually show, and a "Coming in Phase N" badge. Used for every section
 * of the Environmental Overview page until its real data/UI is built out
 * in a later phase.
 */
export function EnvPlaceholderCard({
  icon: Icon,
  title,
  description,
  phase,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  phase: number;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-5 flex flex-col gap-4 h-full", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="size-10 rounded-xl grid place-items-center bg-primary/10 text-primary shrink-0">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-2 py-1 rounded-full border border-border whitespace-nowrap">
          Coming in Phase {phase}
        </span>
      </div>
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/**
 * Larger hero-style variant of the placeholder card, reserved for the
 * AQI Hero section at the top of the page.
 */
export function EnvHeroPlaceholder({
  icon: Icon,
  title,
  description,
  phase,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  phase: number;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-8 md:p-10 relative overflow-hidden", className)}>
      <div
        className="absolute -top-16 -right-16 size-64 rounded-full opacity-20 blur-3xl aurora pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center text-center gap-4 max-w-md mx-auto">
        <div className="size-16 rounded-2xl grid place-items-center bg-primary/10 text-primary">
          <Icon className="size-8" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-1 rounded-full border border-border">
          Coming in Phase {phase}
        </span>
      </div>
    </div>
  );
}
