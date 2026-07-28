import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface CommandCenterNavItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
}

interface CommandCenterNavigationProps {
  topTabs: CommandCenterNavItem[];
  activeTop: string;
  onTopChange: (id: string) => void;
  subTabs: CommandCenterNavItem[];
  activeSub: string;
  onSubChange: (id: string) => void;
}

export function CommandCenterNavigation({
  topTabs,
  activeTop,
  onTopChange,
  subTabs,
  activeSub,
  onSubChange,
}: CommandCenterNavigationProps) {
  const hasSubNav = subTabs.length > 1;

  return (
    <div className="w-full space-y-2">
      {/* Top tabs row (visible on medium & small screens, or as backup overflow bar) */}
      <nav className="flex lg:hidden items-center gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 mt-1">
        {topTabs.map((tab) => {
          const isActive = activeTop === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTopChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0",
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  isActive ? "text-emerald-500" : "text-muted-foreground",
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sub-tabs bar (when top tab has multiple sub-views, e.g. Environmental Monitoring) */}
      {hasSubNav && (
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-1 border-t border-border/50">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1 shrink-0">
            View:
          </span>
          {subTabs.map((sub) => {
            const isActive = activeSub === sub.id;
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                onClick={() => onSubChange(sub.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all shrink-0 border",
                  isActive
                    ? "bg-muted text-foreground border-border shadow-2xs font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Icon className={cn("size-3", isActive && "text-emerald-500")} />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
