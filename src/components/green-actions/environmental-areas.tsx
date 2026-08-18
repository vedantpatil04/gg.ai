import { CircleCheck, CircleX, Lightbulb } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ENV_CATEGORIES, COMMON_SITUATIONS, type EnvCategoryId } from "./green-actions-data";

function PlainList({
  items,
  icon,
  iconClassName,
}: {
  items: string[];
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm">
          <span className={iconClassName}>{icon}</span>
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * EnvironmentalAreas — Green Actions, Section 3.
 *
 * A category selector (Air / Waste / Water / Energy / Transport /
 * Greenery) styled as a plain topic-navigation bar rather than a boxed tab
 * strip, with concise DO / DON'T / BETTER CHOICE guidance per category —
 * the selected category reads as a guidance sheet, with Better Choice
 * called out visually rather than matching the other two columns.
 * Controlled from the parent page so Section 4 (Why This Matters) can stay
 * in sync with whichever category is selected here.
 *
 * Phase 3 adds two small, real-life-phrased entry points into this same
 * state rather than any new guidance content: an "I am..." situation row
 * (see COMMON_SITUATIONS) that just calls `onSelect` with the matching
 * category, and an optional dot on `highlightedCategory`'s tab noting it's
 * recommended based on today's conditions (from Phase 2's
 * defaultCategoryForTopic) — shown whether or not it's currently selected,
 * so switching tabs doesn't lose the "why this was pre-selected" context.
 */
export function EnvironmentalAreas({
  selected,
  onSelect,
  highlightedCategory,
}: {
  selected: EnvCategoryId;
  onSelect: (id: EnvCategoryId) => void;
  highlightedCategory?: EnvCategoryId;
}) {
  return (
    <Tabs value={selected} onValueChange={(v) => onSelect(v as EnvCategoryId)}>
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">I am...</div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Jump to guidance for a common situation"
        >
          {COMMON_SITUATIONS.map((s) => {
            const active = selected === s.category;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.category)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-[var(--color-primary)] text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
                )}
                style={
                  active
                    ? { background: "color-mix(in oklab, var(--color-primary) 10%, transparent)" }
                    : undefined
                }
              >
                <span aria-hidden="true">{s.emoji}</span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1 border-b border-border/60">
        <TabsList className="w-max min-w-full sm:w-auto h-auto bg-transparent p-0 gap-1 rounded-none">
          {ENV_CATEGORIES.map((c) => (
            <TabsTrigger
              key={c.id}
              value={c.id}
              className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-[var(--color-primary)]"
            >
              <span aria-hidden="true">{c.emoji}</span>
              {c.label}
              {highlightedCategory === c.id && (
                <>
                  <span
                    className="size-1.5 rounded-full ml-0.5"
                    style={{ background: "var(--color-primary)" }}
                    aria-hidden="true"
                  />
                  <span className="sr-only">— recommended based on today's conditions</span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {ENV_CATEGORIES.map((c) => (
        <TabsContent key={c.id} value={c.id} className="mt-5 sm:mt-6 focus-visible:ring-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span aria-hidden="true">{c.emoji}</span>
            <h3 className="text-base sm:text-lg font-semibold tracking-tight">{c.label}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl">{c.summary}</p>

          <div className="grid md:grid-cols-3 gap-5 md:gap-0">
            <div className="md:pr-6">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)] mb-3">
                Do
              </div>
              <PlainList
                items={c.doItems}
                icon={<CircleCheck className="size-4" />}
                iconClassName="text-[var(--color-success)] shrink-0 mt-0.5"
              />
            </div>

            <div className="md:px-6 md:border-l md:border-border/60">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-destructive)] mb-3">
                Don't
              </div>
              <PlainList
                items={c.dontItems}
                icon={<CircleX className="size-4" />}
                iconClassName="text-[var(--color-destructive)] shrink-0 mt-0.5"
              />
            </div>

            <div
              className="md:ml-6 rounded-xl p-4"
              style={{
                background: "color-mix(in oklab, var(--color-info) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-info) 22%, transparent)",
              }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-info)] mb-3">
                Better Choice
              </div>
              <PlainList
                items={c.betterChoice}
                icon={<Lightbulb className="size-4" />}
                iconClassName="text-[var(--color-info)] shrink-0 mt-0.5"
              />
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
