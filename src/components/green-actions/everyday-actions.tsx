import { EVERYDAY_ACTIONS } from "./green-actions-data";

/**
 * EverydayActions — Green Actions, Section 5.
 *
 * Real-life situations (At Home / On the Road / With Waste / With Water)
 * rather than an environmental-blog-style category list. Presented as one
 * panel divided by hairlines instead of four repeated cards, to cut down
 * on the card → card → card → card feeling elsewhere on the page.
 */
export function EverydayActions() {
  return (
    <div
      className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}
    >
      {EVERYDAY_ACTIONS.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.id} className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="size-4 text-[var(--color-primary)]" />
              <h4 className="text-sm font-semibold tracking-tight">{group.title}</h4>
            </div>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span
                    className="size-1 rounded-full bg-muted-foreground/50 shrink-0 mt-2"
                    aria-hidden="true"
                  />
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
