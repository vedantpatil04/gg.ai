import { X, Check, ArrowRight } from "lucide-react";
import { DO_THIS_INSTEAD } from "./green-actions-data";

/**
 * DoThisInstead — Green Actions, Section 2.
 *
 * The primary visual focus of the page: a set of concrete Avoid → Better
 * Choice pairs. Deliberately plain — no fabricated impact numbers, no
 * scoring — just the realistic alternative for each behaviour.
 */
export function DoThisInstead() {
  return (
    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
      {DO_THIS_INSTEAD.map((pair) => (
        <div
          key={pair.id}
          className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="flex-1 flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-[color-mix(in_oklab,var(--color-destructive)_10%,transparent)]">
            <span className="size-5 rounded-full grid place-items-center shrink-0 bg-[color-mix(in_oklab,var(--color-destructive)_20%,transparent)] text-[var(--color-destructive)]">
              <X className="size-3" strokeWidth={2.5} />
            </span>
            <span className="text-sm leading-snug">{pair.avoid}</span>
          </div>

          <ArrowRight
            className="size-4 text-muted-foreground shrink-0 self-center rotate-90 sm:rotate-0"
            aria-hidden="true"
          />

          <div className="flex-1 flex items-start gap-2.5 rounded-xl px-3 py-2.5 bg-[color-mix(in_oklab,var(--color-success)_10%,transparent)]">
            <span className="size-5 rounded-full grid place-items-center shrink-0 bg-[color-mix(in_oklab,var(--color-success)_20%,transparent)] text-[var(--color-success)]">
              <Check className="size-3" strokeWidth={2.5} />
            </span>
            <span className="text-sm leading-snug font-medium">{pair.better}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
