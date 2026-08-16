import { CircleCheck, CircleX, Lightbulb } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ENV_CATEGORIES, type EnvCategoryId } from "./green-actions-data";

function ActionList({
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
 * Greenery) with concise DO / DON'T / BETTER CHOICE guidance per category.
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
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <TabsList className="w-max min-w-full sm:w-auto">
          {ENV_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
              <span aria-hidden="true">{cat.emoji}</span>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {ENV_CATEGORIES.map((cat) => (
        <TabsContent key={cat.id} value={cat.id} className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)] mb-3">
                Do
              </div>
              <ActionList
                items={cat.doItems}
                icon={<CircleCheck className="size-4" />}
                iconClassName="text-[var(--color-success)] shrink-0 mt-0.5"
              />
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-destructive)] mb-3">
                Don't
              </div>
              <ActionList
                items={cat.dontItems}
                icon={<CircleX className="size-4" />}
                iconClassName="text-[var(--color-destructive)] shrink-0 mt-0.5"
              />
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-info)] mb-3">
                Better Choice
              </div>
              <ActionList
                items={cat.betterChoice}
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
