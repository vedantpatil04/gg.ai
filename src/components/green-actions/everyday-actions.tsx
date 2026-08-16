import { CircleCheck } from "lucide-react";
import { EVERYDAY_ACTIONS } from "./green-actions-data";

/**
 * EverydayActions — Green Actions, Section 5.
 *
 * Real-life situations (At Home / On the Road / With Waste / With Water)
 * rather than an environmental-blog-style category list.
 */
export function EverydayActions() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {EVERYDAY_ACTIONS.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.id} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-8 rounded-lg grid place-items-center shrink-0 bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
                <Icon className="size-4" />
              </span>
              <h4 className="text-sm font-semibold tracking-tight">{group.title}</h4>
            </div>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CircleCheck className="size-3.5 text-[var(--color-success)] shrink-0 mt-1" />
                  <span className="text-muted-foreground leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
