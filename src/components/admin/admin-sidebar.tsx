import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Menu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "./admin-nav";

// ─── One nav row — real link or inert "coming soon" placeholder ─────────────
//
// Mirrors AppLayout's NavLink (same classes, same collapsed/tooltip
// behaviour) so the Administrator Portal reads as the same product, not a
// bolted-on theme. Placeholder items intentionally render as a <div>, not a
// <Link> — they have no route yet, and TanStack Router's typed <Link>
// would refuse to compile a `to` that doesn't exist.
function AdminNavRow({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: AdminNavItem;
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
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground/70",
          collapsed && "lg:hidden",
        )}
      >
        Soon
      </Badge>
    </div>
  ) : (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-300",
        collapsed && "lg:justify-center lg:px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--color-sidebar-primary)]"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={cn("whitespace-nowrap transition-all duration-300", collapsed && "lg:hidden")}
      >
        {item.label}
      </span>
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

// ─── A collapsible group of nav rows ─────────────────────────────────────────
function AdminNavGroupSection({
  id,
  label,
  items,
  collapsed,
  pathname,
  onNavigate,
  expanded,
  onToggle,
}: {
  id: string;
  label: string;
  items: AdminNavItem[];
  collapsed: boolean;
  pathname: string;
  onNavigate: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="px-3 pt-4 mt-2 border-t border-sidebar-border">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-muted-foreground transition-colors",
          collapsed && "lg:hidden",
        )}
        aria-expanded={expanded}
        aria-controls={`admin-nav-group-${id}`}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn("size-3 transition-transform duration-200", !expanded && "-rotate-90")}
        />
      </button>

      <div
        id={`admin-nav-group-${id}`}
        className={cn("space-y-1 mt-1", !expanded && !collapsed && "hidden")}
      >
        {items.map((item) => (
          <AdminNavRow
            key={item.label}
            item={item}
            active={
              !item.comingSoon && (pathname === item.to || pathname.startsWith(item.to + "/"))
            }
            collapsed={collapsed}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const isExpanded = (id: string) => expandedGroups[id] ?? true;
  const toggleGroup = (id: string) => setExpandedGroups((g) => ({ ...g, [id]: !isExpanded(id) }));

  const [overviewGroup, ...restGroups] = ADMIN_NAV_GROUPS;

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 shrink-0 w-64 overflow-y-auto",
          collapsed && "lg:w-20",
          "border-r border-sidebar-border bg-sidebar",
          "transition-all duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div
          className={cn(
            "flex h-16 items-center gap-2 px-5 border-b border-sidebar-border transition-all duration-300 sticky top-0 bg-sidebar z-10",
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
              Administrator Portal
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

        {/* Overview (single item, no collapsible chrome needed) */}
        <nav className="px-3 py-4 space-y-1">
          {overviewGroup.items.map((item) => (
            <AdminNavRow
              key={item.label}
              item={item}
              active={
                !item.comingSoon && (pathname === item.to || pathname.startsWith(item.to + "/"))
              }
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          ))}
        </nav>

        {/* Future-module groups — expandable, placeholders only */}
        {restGroups.map((group) => (
          <AdminNavGroupSection
            key={group.id}
            id={group.id}
            label={group.label}
            items={group.items}
            collapsed={collapsed}
            pathname={pathname}
            onNavigate={onCloseMobile}
            expanded={isExpanded(group.id)}
            onToggle={() => toggleGroup(group.id)}
          />
        ))}

        <div className="h-6" />
      </aside>
    </TooltipProvider>
  );
}
