import { X, Check, ArrowRight } from "lucide-react";
import { DO_THIS_INSTEAD } from "./green-actions-data";

/**
 * DoThisInstead — Green Actions, Section 2.
 *
 * The primary visual focus of the page: a set of concrete Avoid → Better
 * Choice pairs. Presented as one cohesive panel with divided rows rather
 * than a grid of repeated cards, so the behaviour-transformation pattern
 * reads clearly across all six pairs at once. Deliberately plain — no
 * fabricated impact numbers, no scoring — just the realistic alternative
 * for each behaviour.
 */
export function DoThisInstead() {
  return (
    <div
      className="rounded-2xl divide-y divide-border/60 overflow-hidden"
      style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}
    >
      {DO_THIS_INSTEAD.map((pair) => (
        <div
          key={pair.id}
          className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4"
        >
          <div className="flex-1 min-w-0 flex items-start gap-2.5">
            <span
              className="size-5 rounded-full grid place-items-center shrink-0 mt-0.5"
              style={{
                background: "color-mix(in oklab, var(--color-destructive) 16%, transparent)",
                color: "var(--color-destructive)",
              }}
            >
              <X className="size-3" strokeWidth={2.5} />
            </span>
            <span className="text-sm leading-snug text-muted-foreground">{pair.avoid}</span>
          </div>

          <ArrowRight
            className="size-4 text-muted-foreground/50 shrink-0 self-center rotate-90 sm:rotate-0"
            aria-hidden="true"
          />

          <div className="flex-1 min-w-0 flex items-start gap-2.5">
            <span
              className="size-5 rounded-full grid place-items-center shrink-0 mt-0.5"
              style={{
                background: "color-mix(in oklab, var(--color-success) 16%, transparent)",
                color: "var(--color-success)",
              }}
            >
              <Check className="size-3" strokeWidth={2.5} />
            </span>
            <span className="text-sm leading-snug font-medium">{pair.better}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
