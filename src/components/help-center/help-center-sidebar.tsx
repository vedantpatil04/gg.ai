import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Menu, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HELP_NAV_ITEMS, type HelpNavItem } from "./help-center-nav";

// ─── One nav row ─────────────────────────────────────────────────────────────

function HelpNavRow({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: HelpNavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const inner = item.comingSoon ? (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground/50 cursor-not-allowed select-none",
        collapsed && "lg:justify-center lg:px-2",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className={cn("flex-1 whitespace-nowrap", collapsed && "lg:hidden")}>{item.label}</span>
      {item.badge && !collapsed && (
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground/60 shrink-0"
        >
          {item.badge}
        </Badge>
      )}
      {!item.badge && (
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground/70",
            collapsed && "lg:hidden",
          )}
        >
          Soon
        </Badge>
      )}
    </div>
  ) : (
    <Link
      to={item.to as any}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
        collapsed && "lg:justify-center lg:px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--color-sidebar-primary)]"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={cn(
          "whitespace-nowrap flex-1 transition-all duration-300",
          collapsed && "lg:hidden",
        )}
      >
        {item.label}
      </span>
      {item.badge && !collapsed && (
        <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium aurora text-primary-foreground shrink-0">
          {item.badge}
        </Badge>
      )}
    </Link>
  );

  if (!collapsed) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
        {item.comingSoon && <span className="text-muted-foreground"> · Coming soon</span>}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Sidebar component ────────────────────────────────────────────────────────

interface HelpCenterSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function HelpCenterSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: HelpCenterSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 shrink-0 w-64 overflow-y-auto flex flex-col",
          collapsed && "lg:w-20",
          "border-r border-sidebar-border bg-sidebar",
          "transition-all duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div
          className={cn(
            "flex h-16 items-center gap-2 px-5 border-b border-sidebar-border transition-all duration-300 sticky top-0 bg-sidebar z-10 shrink-0",
            collapsed && "lg:px-1 lg:gap-0 lg:justify-between",
          )}
        >
          <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
            <Shield className="size-4" />
          </div>

          <div
            className={cn("leading-tight flex-1 min-w-0 overflow-hidden", collapsed && "lg:hidden")}
          >
            <div className="text-sm font-semibold tracking-tight whitespace-nowrap">
              GreenGuard AI
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
              Help Center
            </div>
          </div>

          <button
            onClick={onToggleCollapsed}
            className="hidden lg:grid size-8 place-items-center rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1 flex-1">
          {HELP_NAV_ITEMS.map((item) => (
            <HelpNavRow
              key={item.id}
              item={item}
              active={
                item.to === "/help"
                  ? pathname === "/help"
                  : pathname === item.to || pathname.startsWith(item.to + "/")
              }
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          ))}
        </nav>

        {/* Bottom card — back to main app */}
        <div className={cn("px-3 pb-4 transition-all duration-300", collapsed && "lg:hidden")}>
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-all duration-200 group"
          >
            <ExternalLink className="size-3.5 shrink-0 group-hover:scale-110 transition-transform duration-150" />
            <span>Back to GreenGuard</span>
          </Link>
        </div>
      </aside>
    </TooltipProvider>
  );
}
