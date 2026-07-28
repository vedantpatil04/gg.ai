import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Environmental Overview — reusable section wrapper.
 *
 * Phase 11: added `aria-labelledby`, `scroll-mt-6`, `items-start`, and
 * `motion-safe:animate-in` entrance animation.
 * Phase 13: removed mutable module-level `_sectionCount` singleton (unsafe
 * across HMR and concurrent renders). The `aria-labelledby` id is now
 * derived purely from the title string. All sections in this app have
 * string titles, so the fallback branch is dead code; the id is stable.
 */
export function EnvSection({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id =
    typeof title === "string"
      ? `env-section-${title.replace(/\s+/g, "-").toLowerCase()}`
      : "env-section";

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "space-y-4 scroll-mt-6",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-500",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <h2 id={id} className="text-lg font-semibold tracking-tight mt-1">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-xl">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
