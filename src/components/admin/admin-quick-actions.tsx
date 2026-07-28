import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "./admin-nav";

/**
 * Pulled from ADMIN_NAV_GROUPS (the same config the sidebar uses) rather
 * than redefined here, so this list and the sidebar can never drift out of
 * sync. Originally pointed at the full-management placeholders (User
 * Management, Complaint Management, Authority Management, Platform
 * Administration) — updated in Phase 2.8's Portal Finalization pass to
 * point at their now-real, narrower siblings instead (User Directory,
 * Complaint Queue, Authority Requests, Platform Health), since leaving
 * these shortcuts inert once a working equivalent exists elsewhere in the
 * sidebar would itself be an inconsistency. City Directory is added for
 * the same reason — it didn't exist when this list was first written.
 * Reports and Analytics stay pointed at their still-unbuilt placeholders.
 */
const QUICK_ACTION_LABELS = [
  "User Directory",
  "Complaint Queue",
  "Authority Requests",
  "City Directory",
  "Platform Health",
  "Reports",
  "Analytics",
];

function findNavItem(label: string): AdminNavItem | undefined {
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((i) => i.label === label);
    if (item) return item;
  }
  return undefined;
}

export function AdminQuickActions() {
  const items = QUICK_ACTION_LABELS.map(findNavItem).filter((i): i is AdminNavItem => !!i);
  const hasComingSoon = items.some((i) => i.comingSoon);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const cardClasses = cn(
            "flex flex-col items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors",
            item.comingSoon
              ? "opacity-50 cursor-not-allowed border-dashed"
              : "hover:bg-muted cursor-pointer",
          );

          if (item.comingSoon) {
            return (
              <div key={item.label} className={cardClasses}>
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            );
          }

          return (
            <Link key={item.label} to={item.to} className={cardClasses}>
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {hasComingSoon && (
        <div className="mt-3 flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
          >
            Soon
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            Remaining shortcuts activate as each module ships
          </span>
        </div>
      )}
    </div>
  );
}
