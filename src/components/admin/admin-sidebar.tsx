import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  ShieldCheck,
  ChevronDown,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "./admin-nav";

/**
 * Checks if the navigation item is active given the current pathname.
 * Handles the root `/admin` dashboard specifically so sub-routes don't highlight it.
 */
function isItemActive(pathname: string, to?: string): boolean {
  if (!to) return false;
  if (to === "/admin") {
    return pathname === "/admin" || pathname === "/admin/";
  }
  return pathname === to || pathname.startsWith(to + "/");
}

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
        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-muted-foreground/45 cursor-not-allowed select-none min-h-[38px]",
        collapsed && "lg:justify-center lg:px-0 lg:w-full",
      )}
    >
      <Icon className="size-[17px] shrink-0 opacity-60" />
      <span className={cn("flex-1 truncate tracking-normal", collapsed && "lg:hidden")}>
        {item.label}
      </span>
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] px-1.5 py-0 h-4 font-mono font-normal tracking-wide text-muted-foreground/60 border-border/40 shrink-0",
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 min-h-[38px] select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
        collapsed && "lg:justify-center lg:px-0 lg:w-full",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-primary before:shadow-[0_0_8px_var(--color-primary)]"
          : "text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent/55 active:bg-sidebar-accent/80",
      )}
    >
      <Icon
        className={cn(
          "size-[17px] shrink-0 transition-colors duration-150",
          active
            ? "text-primary"
            : "text-muted-foreground/70 group-hover:text-foreground",
        )}
      />
      <span
        className={cn(
          "flex-1 truncate tracking-tight transition-opacity duration-150",
          collapsed && "lg:hidden",
        )}
      >
        {item.label}
      </span>
    </Link>
  );

  if (!collapsed) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="font-medium text-xs py-1 px-2.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <span>{item.label}</span>
          {item.comingSoon && (
            <span className="text-[10px] text-muted-foreground font-mono">· Coming soon</span>
          )}
          {active && !item.comingSoon && (
            <span className="size-1.5 rounded-full bg-primary" />
          )}
        </div>
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
    <div className="pt-2">
      {/* Group section header — only visible in expanded mode */}
      <div className={cn("px-1 mb-1", collapsed && "lg:hidden")}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/65 hover:text-foreground/90 transition-colors rounded-md select-none group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring"
          aria-expanded={expanded}
          aria-controls={`admin-nav-group-${id}`}
        >
          <span className="group-hover:translate-x-0.5 transition-transform duration-150">
            {label}
          </span>
          <ChevronDown
            className={cn(
              "size-3 text-muted-foreground/50 group-hover:text-foreground/80 transition-transform duration-200",
              !expanded && "-rotate-90",
            )}
          />
        </button>
      </div>

      {/* Group separator line for collapsed desktop mode */}
      {collapsed && (
        <div className="hidden lg:block my-2 mx-2.5 border-t border-sidebar-border/50" />
      )}

      {/* Nav rows list */}
      <div
        id={`admin-nav-group-${id}`}
        className={cn(
          "space-y-0.5",
          !expanded && !collapsed && "hidden",
        )}
      >
        {items.map((item) => (
          <AdminNavRow
            key={item.label}
            item={item}
            active={!item.comingSoon && isItemActive(pathname, item.to)}
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
  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((g) => ({ ...g, [id]: !isExpanded(id) }));
  }, [expandedGroups]);

  const [overviewGroup, ...restGroups] = ADMIN_NAV_GROUPS;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AD";

  const handleLogout = async () => {
    onCloseMobile();
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          // Layout: pinned full height on desktop, drawer on mobile
          "fixed lg:static inset-y-0 left-0 z-50 shrink-0 h-full max-h-[100dvh] flex flex-col",
          // Width management
          collapsed ? "w-72 lg:w-[70px]" : "w-72 lg:w-[268px]",
          "max-w-[85vw] lg:max-w-none",
          // Visuals & surface
          "border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          "shadow-2xl lg:shadow-none select-none",
          // Smooth transitions for mobile drawer & desktop collapse
          "transition-all duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* ── 1. SIDEBAR BRAND HEADER ─────────────────────────────────────── */}
        <div
          className={cn(
            "flex h-16 items-center px-4 md:px-4.5 border-b border-sidebar-border/70 shrink-0 bg-sidebar/95 backdrop-blur-xs z-10",
            collapsed ? "lg:px-2.5 lg:justify-center" : "gap-3 justify-between",
          )}
        >
          {/* Logo badge */}
          <Link
            to="/admin"
            onClick={onCloseMobile}
            className={cn(
              "flex items-center gap-3 min-w-0 flex-1 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring rounded-lg",
              collapsed && "lg:flex-initial lg:justify-center",
            )}
            title="GreenGuard AI Administrator Portal"
          >
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-teal-500/5 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)] grid place-items-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
              <ShieldCheck className="size-5 text-emerald-400" />
            </div>

            <div
              className={cn(
                "leading-tight flex-1 min-w-0 overflow-hidden transition-opacity duration-150",
                collapsed && "lg:hidden",
              )}
            >
              <div className="text-[14px] font-bold tracking-tight text-foreground truncate font-display">
                GreenGuard AI
              </div>
              <div className="text-[10px] uppercase font-bold tracking-[0.14em] text-muted-foreground/75 truncate flex items-center gap-1.5 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Admin Console
              </div>
            </div>
          </Link>

          {/* Desktop collapse toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  "hidden lg:grid size-8 place-items-center rounded-lg border border-sidebar-border/60 hover:border-sidebar-border hover:bg-sidebar-accent/80 text-muted-foreground/80 hover:text-foreground shrink-0 transition-all cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring",
                  collapsed && "hidden", // when collapsed, show toggle button or allow expand via icon
                )}
                aria-label={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            </TooltipContent>
          </Tooltip>

          {/* Mobile drawer close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden size-8.5 grid place-items-center rounded-lg border border-sidebar-border/60 hover:border-sidebar-border hover:bg-sidebar-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* ── 2. INDEPENDENT NAVIGATION SCROLL AREA ───────────────────────── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain admin-sidebar-scroll px-3 py-3 space-y-1.5"
          tabIndex={-1}
        >
          {/* Overview Section (Dashboard) */}
          <nav className="space-y-0.5" aria-label="Overview Navigation">
            {overviewGroup.items.map((item) => (
              <AdminNavRow
                key={item.label}
                item={item}
                active={!item.comingSoon && isItemActive(pathname, item.to)}
                collapsed={collapsed}
                onClick={onCloseMobile}
              />
            ))}
          </nav>

          {/* Navigation Groups (Governance, Intelligence, Platform, Engagement) */}
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

          {/* Bottom buffer spacing to guarantee no bottom items are clipped */}
          <div className="h-6" />
        </div>

        {/* ── 3. PINNED SIDEBAR FOOTER ─────────────────────────────────────── */}
        <div className="p-2.5 border-t border-sidebar-border/70 bg-sidebar/95 shrink-0 z-10">
          {collapsed ? (
            /* Collapsed desktop footer */
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/admin/profile"
                    onClick={onCloseMobile}
                    className="size-8.5 rounded-lg grid place-items-center hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    <ProfileAvatar
                      profile={user}
                      className="size-8 rounded-lg"
                      fallbackClassName="text-[11px] font-bold"
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <div className="text-xs font-semibold">{user?.name ?? "Administrator"}</div>
                  <div className="text-[10px] text-muted-foreground">{user?.email}</div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleCollapsed}
                    className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                    aria-label="Expand sidebar"
                  >
                    <PanelLeftOpen className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Expand sidebar (Ctrl+B)
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            /* Expanded footer (Desktop & Mobile) */
            <div className="space-y-2">
              {/* User profile capsule */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/35 hover:bg-sidebar-accent/60 transition-colors">
                <Link
                  to="/admin/profile"
                  onClick={onCloseMobile}
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring rounded-lg px-1 py-0.5"
                >
                  <ProfileAvatar
                    profile={user}
                    className="size-8 shrink-0 rounded-lg"
                    fallbackClassName="text-[11px] font-bold"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[12.5px] font-semibold text-foreground truncate leading-tight">
                      {user?.name ?? "Administrator"}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">
                      {user?.email ?? "admin@greenguard.ai"}
                    </div>
                  </div>
                </Link>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                      aria-label="Sign out"
                    >
                      <LogOut className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Sign out
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* System status indicator */}
              <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-muted-foreground/60 font-mono tracking-tight select-none">
                <span className="flex items-center gap-1.5">
                  <Radio className="size-3 text-emerald-500 animate-pulse" />
                  <span>Platform Online</span>
                </span>
                <span>v2.4-ent</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

