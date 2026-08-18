import { EVERYDAY_ACTIONS, getHabitOfTheDay } from "./green-actions-data";

/**
 * EverydayActions — Green Actions, Section 5.
 *
 * Real-life situations (At Home / On the Road / With Waste / With Water)
 * rather than an environmental-blog-style category list. Presented as one
 * panel divided by hairlines instead of four repeated cards, to cut down
 * on the card → card → card → card feeling elsewhere on the page. Kept
 * deliberately stable — this is the baseline everyday-habit layer, not a
 * reactive one, so it doesn't depend on today's AQI/water conditions.
 *
 * Phase 3 adds one small "Habit to build" line above the grid — a single,
 * deterministic, date-rotated habit (see getHabitOfTheDay), not a feed and
 * not gamified: no streak, no counter, no saved progress.
 */
export function EverydayActions() {
  const habit = getHabitOfTheDay();

  return (
    <div>
      <div className="flex items-start gap-2.5 mb-4">
        <span className="text-lg leading-none shrink-0 mt-0.5" aria-hidden="true">
          {habit.emoji}
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            Habit to build
          </div>
          <h4 className="text-sm font-semibold tracking-tight">{habit.title}</h4>
          <p className="text-sm text-muted-foreground leading-snug mt-0.5">{habit.detail}</p>
        </div>
      </div>

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
    </div>
  );
}
