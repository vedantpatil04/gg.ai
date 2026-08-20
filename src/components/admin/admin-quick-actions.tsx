import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "./admin-nav";

const QUICK_ACTION_CONFIG: Array<{ label: string; description: string }> = [
  { label: "User Directory", description: "Citizen & staff directory" },
  { label: "Complaint Queue", description: "Review & assign cases" },
  { label: "Authority Requests", description: "Review agency onboarding" },
  { label: "City Directory", description: "Sensor networks & metadata" },
  { label: "Platform Health", description: "System diagnostics & uptime" },
  { label: "Reports", description: "Export environmental reports" },
  { label: "Analytics", description: "Platform telemetry metrics" },
];

function findNavItem(label: string): AdminNavItem | undefined {
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((i) => i.label === label);
    if (item) return item;
  }
  return undefined;
}

/**
 * Quick Actions Panel for the Administrator Dashboard.
 * Provides 1-click operational access to key administrator modules.
 */
export function AdminQuickActions() {
  const actions = QUICK_ACTION_CONFIG.map((cfg) => ({
    ...cfg,
    navItem: findNavItem(cfg.label),
  })).filter((a): a is typeof a & { navItem: AdminNavItem } => !!a.navItem);

  const hasComingSoon = actions.some((a) => a.navItem.comingSoon);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map(({ label, description, navItem }) => {
          const Icon = navItem.icon;
          const isSoon = navItem.comingSoon;

          if (isSoon) {
            return (
              <div
                key={label}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/40 bg-muted/10 opacity-50 cursor-not-allowed select-none text-left"
              >
                <div className="size-7 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0 mt-0.5">
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-muted-foreground truncate">{label}</span>
                    <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 font-mono text-muted-foreground/60">
                      Soon
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{description}</p>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={label}
              to={navItem.to}
              className={cn(
                "group flex items-start gap-2.5 p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/40",
                "transition-all duration-150 text-left outline-none select-none",
                "focus-visible:ring-1 focus-visible:ring-primary shadow-2xs hover:shadow-xs",
              )}
            >
              <div className="size-7 rounded-lg bg-muted/80 group-hover:bg-primary/10 border border-border/50 group-hover:border-primary/30 grid place-items-center text-muted-foreground group-hover:text-primary shrink-0 transition-colors mt-0.5">
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {label}
                  </span>
                  <ArrowUpRight className="size-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </div>
                <p className="text-[10px] text-muted-foreground/75 truncate mt-0.5">{description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {hasComingSoon && (
        <div className="pt-1.5 border-t border-border/40 flex items-center gap-2 text-[10.5px] text-muted-foreground/70 select-none">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono font-normal">
            Upcoming
          </Badge>
          <span className="truncate">Additional shortcuts unlock as modules deploy</span>
        </div>
      )}
    </div>
  );
}

