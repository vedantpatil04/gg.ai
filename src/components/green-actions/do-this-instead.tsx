import { X, Check, ArrowRight } from "lucide-react";
import { DO_THIS_INSTEAD, type AvoidBetterPair, type FocusTopic } from "./green-actions-data";

/** Reorders pairs so ones tagged for today's relevant topic appear first —
 *  same six curated pairs either way, never hidden, never rewritten. Falls
 *  back to the original curated order when no topic is elevated ("general"),
 *  or if nothing happens to match a topic that is. */
function prioritize(pairs: AvoidBetterPair[], topic: FocusTopic): AvoidBetterPair[] {
  if (topic === "general") return pairs;
  const matched = pairs.filter((p) => p.topic === topic);
  if (matched.length === 0) return pairs;
  const rest = pairs.filter((p) => p.topic !== topic);
  return [...matched, ...rest];
}

/**
 * DoThisInstead — Green Actions, Section 2.
 *
 * A set of concrete Avoid → Better Choice pairs, presented as one cohesive
 * panel with divided rows rather than a grid of repeated cards. Phase 2:
 * the pairs most relevant to today's conditions (see `topic`, resolved
 * once in green-actions-page.tsx) surface first — the interaction and
 * content are otherwise unchanged from Phase 1.1.
 */
export function DoThisInstead({ topic }: { topic: FocusTopic }) {
  const pairs = prioritize(DO_THIS_INSTEAD, topic);

  return (
    <div
      className="rounded-2xl divide-y divide-border/60 overflow-hidden"
      style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}
    >
      {pairs.map((pair) => (
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
