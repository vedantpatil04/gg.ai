import { CircleCheck, CircleX, Lightbulb } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ENV_CATEGORIES, type EnvCategoryId } from "./green-actions-data";

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
 */
export function EnvironmentalAreas({
  selected,
  onSelect,
}: {
  selected: EnvCategoryId;
  onSelect: (id: EnvCategoryId) => void;
}) {
  return (
    <Tabs value={selected} onValueChange={(v) => onSelect(v as EnvCategoryId)}>
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
