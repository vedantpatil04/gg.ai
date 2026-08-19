import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Menu, ChevronDown, X, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "./admin-nav";

// ─── One nav row — real link or inert "coming soon" placeholder ─────────────
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
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/50 cursor-not-allowed select-none min-h-[40px]",
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
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 min-h-[40px]",
        collapsed && "lg:justify-center lg:px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_3px_0_0_var(--color-sidebar-primary)]"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 active:bg-sidebar-accent",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={cn("whitespace-nowrap transition-all duration-200", collapsed && "lg:hidden")}
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
    <div className="px-3 pt-3 mt-1 border-t border-sidebar-border/60">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 hover:text-foreground transition-colors min-h-[32px] rounded-md",
          collapsed && "lg:hidden",
        )}
        aria-expanded={expanded}
        aria-controls={`admin-nav-group-${id}`}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform duration-200", !expanded && "-rotate-90")}
        />
      </button>

      <div
        id={`admin-nav-group-${id}`}
        className={cn("space-y-0.5 mt-1", !expanded && !collapsed && "hidden")}
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const isExpanded = (id: string) => expandedGroups[id] ?? true;
  const toggleGroup = (id: string) => setExpandedGroups((g) => ({ ...g, [id]: !isExpanded(id) }));

  const [overviewGroup, ...restGroups] = ADMIN_NAV_GROUPS;

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "A";

  const handleMobileLogout = async () => {
    onCloseMobile();
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 shrink-0 w-72 lg:w-64 max-w-[85vw] flex flex-col",
          collapsed && "lg:w-20",
          "border-r border-sidebar-border bg-sidebar shadow-2xl lg:shadow-none",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div
          className={cn(
            "flex h-16 items-center gap-2 px-4 md:px-5 border-b border-sidebar-border shrink-0 bg-sidebar z-10",
            collapsed && "lg:px-2 lg:gap-0 lg:justify-between",
          )}
        >
          <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0 shadow-sm">
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

          {/* Desktop sidebar collapse toggle */}
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:grid size-8 place-items-center rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="size-4" />
          </button>

          {/* Mobile drawer close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden size-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent shrink-0 transition-colors"
            aria-label="Close navigation drawer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation scroll area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Overview */}
          <nav className="px-3 py-3 space-y-0.5">
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

          {/* Nav groups */}
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

          <div className="h-4" />
        </div>

        {/* Mobile profile / logout footer inside drawer */}
        <div
          className={cn(
            "p-3 border-t border-sidebar-border bg-sidebar/80 shrink-0 lg:hidden",
          )}
        >
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-sidebar-accent/50">
            <Link
              to="/admin/profile"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="aurora text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{user?.name ?? "Administrator"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
              </div>
            </Link>
            <button
              onClick={handleMobileLogout}
              className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
