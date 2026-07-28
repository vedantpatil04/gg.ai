import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, type ComponentType, useState } from "react";
import {
  LayoutDashboard,
  Map,
  Sparkles,
  CloudSun,
  Megaphone,
  FileText,
  Leaf,
  SlidersHorizontal,
  User,
  Settings,
  Shield,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  LogIn,
  LayoutGrid,
  Globe,
  HelpCircle,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useCity } from "@/lib/city-context";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { AUTHORITY_ROLES } from "@/components/protected-route";
import { aqiBand } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Navigation permission configuration ─────────────────────────────────────
//
// Single source of truth for sidebar visibility. Each item declares:
//   - `public`  → visible to everyone, including signed-out visitors
//                 (matches routes with no ProtectedRoute guard)
//   - `roles`   → visible only to authenticated users with one of these
//                 roles (matches a ProtectedRoute `roles` prop)
//   - neither   → visible to any authenticated user, any role
//                 (matches a bare ProtectedRoute with no `roles` prop)
//
// This mirrors ProtectedRoute's own convention 1:1 so nav visibility can
// never drift out of sync with what a route actually allows.
interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  public?: boolean;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/environment", label: "Environmental Overview", icon: Globe, public: true },
  { to: "/map", label: "Smart Map", icon: Map, public: true },
  { to: "/copilot", label: "AI Copilot", icon: Sparkles, public: true },
  { to: "/forecast", label: "Forecast", icon: CloudSun, public: true },
  { to: "/citizen", label: "Citizen Hub", icon: Megaphone, public: true },
  { to: "/reports", label: "Reports", icon: FileText, roles: AUTHORITY_ROLES },
  { to: "/sustainability", label: "Sustainability", icon: Leaf, public: true },
  { to: "/simulator", label: "Policy Sim", icon: SlidersHorizontal, public: true },
];

const SECONDARY: NavItem[] = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/security", label: "Security", icon: Shield },
  { to: "/help", label: "Help Center", icon: HelpCircle, public: true },
];

// Command Center — authority / administrator only. Administrator inherits
// authority access via AUTHORITY_ROLES; no separate admin nav is added.
const COMMAND_NAV: NavItem[] = [
  { to: "/command-center", label: "Command Center", icon: Shield, roles: AUTHORITY_ROLES },
];

// Administrator Portal (Phase 2.1) — administrator only. Kept as its own
// list (rather than folded into COMMAND_NAV) since it's a distinct
// workspace with its own role gate, not an Authority-tier item.
const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Administrator Portal", icon: LayoutGrid, roles: ["administrator"] },
];

// The one and only nav-permission check — reused for every nav group below
// so visibility logic is never duplicated per-section.
function isNavItemVisible(
  item: NavItem,
  isAuthenticated: boolean,
  role: UserRole | undefined,
): boolean {
  if (item.public) return true;
  if (!isAuthenticated) return false;
  if (!item.roles) return true;
  return !!role && item.roles.includes(role);
}

// ─── Collapsible nav link with right-side tooltip when collapsed ──────────────
//
// When the sidebar is expanded   → renders a standard label+icon link.
// When the sidebar is collapsed  → wraps the icon-only link in a Tooltip so
//   the label is still accessible on desktop hover (no tooltip on mobile since
//   there's no hover there and the sidebar always renders full-width on mobile).
//
function NavLink({
  to,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const prefersReduced = useReducedMotion();

  const link = (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200",
        collapsed && "lg:justify-center lg:px-2",
        active ? "text-sidebar-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Floating active background — shared layout animation */}
      {active && (
        <motion.div
          layoutId={prefersReduced ? undefined : "nav-active"}
          className="absolute inset-0 rounded-md bg-sidebar-accent shadow-[inset_2px_0_0_var(--color-sidebar-primary)]"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      {/* Hover background (non-active) */}
      {!active && (
        <div className="absolute inset-0 rounded-md bg-sidebar-accent/0 hover:bg-sidebar-accent/60 transition-colors duration-150" />
      )}
      <Icon
        className={cn(
          "relative size-4 shrink-0 transition-transform duration-150",
          !prefersReduced && "group-hover:scale-110",
        )}
      />
      <span
        className={cn(
          "relative whitespace-nowrap transition-all duration-300",
          collapsed && "lg:hidden",
        )}
      >
        {label}
      </span>
    </Link>
  );

  if (!collapsed) return <div className="group">{link}</div>;
  return (
    <div className="group">
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // `open`      — mobile drawer (existing behaviour, untouched)
  // `collapsed` — desktop sidebar collapse (new)
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const visibleNav = NAV.filter((item) => isNavItemVisible(item, isAuthenticated, user?.role));
  const visibleSecondary = SECONDARY.filter((item) =>
    isNavItemVisible(item, isAuthenticated, user?.role),
  );
  const visibleCommandNav = COMMAND_NAV.filter((item) =>
    isNavItemVisible(item, isAuthenticated, user?.role),
  );
  const visibleAdminNav = ADMIN_NAV.filter((item) =>
    isNavItemVisible(item, isAuthenticated, user?.role),
  );

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/*
        TooltipProvider must wrap the sidebar so every NavLink tooltip shares
        one provider. delayDuration keeps the feel snappy.
      */}
      <TooltipProvider delayDuration={120}>
        <aside
          className={cn(
            // ── positioning & sizing ───────────────────────────────────
            "fixed lg:static inset-y-0 left-0 z-40 shrink-0",
            // Mobile: always 256 px wide (drawer slides in/out via translate)
            "w-64",
            // Desktop collapsed: shrink to 80 px (w-20)
            collapsed && "lg:w-20",
            // ── styling ───────────────────────────────────────────────
            "border-r border-sidebar-border bg-sidebar",
            // ── animation ─────────────────────────────────────────────
            // transition-all covers both width and transform changes smoothly
            "transition-all duration-300",
            // Mobile slide behaviour (unchanged)
            open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* ── Header ─────────────────────────────────────────────────
              Expanded  : [shield] [brand text — flex-1] [☰ toggle]
              Collapsed : [shield] — — — — — — — — — — — [☰ toggle]
                          justify-between with tight px so both 32px items fit
                          inside the 80px collapsed sidebar.
          */}
          <div
            className={cn(
              "flex h-16 items-center gap-2 px-5 border-b border-sidebar-border transition-all duration-300",
              // Desktop collapsed overrides — tighter padding, spread items
              collapsed && "lg:px-1 lg:gap-0 lg:justify-between",
            )}
          >
            {/* Brand logo (always visible) */}
            <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
              <Shield className="size-4" />
            </div>

            {/* Brand text — hidden on desktop when collapsed */}
            <div
              className={cn(
                "leading-tight flex-1 min-w-0 overflow-hidden",
                collapsed && "lg:hidden",
              )}
            >
              <div className="text-sm font-semibold tracking-tight whitespace-nowrap">
                GreenGuard AI
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                Env. Intelligence
              </div>
            </div>

            {/*
              Desktop-only ☰ toggle — clicking collapses / expands the sidebar.
              Always hidden on mobile (mobile uses the TopBar hamburger instead).
            */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:grid size-8 place-items-center rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="size-4" />
            </button>
          </div>

          {/* ── Main navigation ────────────────────────────────────────── */}
          <nav className="px-3 py-4 space-y-1">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={pathname === item.to}
                collapsed={collapsed}
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>

          {/* ── Command Center — authority / administrator only ─────────── */}
          {visibleCommandNav.length > 0 && (
            <div className="px-3 pt-4 mt-2 border-t border-sidebar-border space-y-1">
              {/*
                Section heading — hidden on desktop when collapsed so the icon
                sits flush with the other nav icons without an orphaned label.
              */}
              <div
                className={cn(
                  "px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 transition-all duration-300",
                  collapsed && "lg:hidden",
                )}
              >
                Command Center
              </div>

              {visibleCommandNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.to || pathname.startsWith(item.to)}
                  collapsed={collapsed}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          )}

          {/* ── Administrator Portal — administrator only ────────────────── */}
          {visibleAdminNav.length > 0 && (
            <div className="px-3 pt-4 mt-2 border-t border-sidebar-border space-y-1">
              <div
                className={cn(
                  "px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 transition-all duration-300",
                  collapsed && "lg:hidden",
                )}
              >
                Administration
              </div>

              {visibleAdminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.to || pathname.startsWith(item.to)}
                  collapsed={collapsed}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          )}

          {/* ── Secondary nav (Profile / Settings) ──────────────────────── */}
          {visibleSecondary.length > 0 && (
            <div className="px-3 pt-4 mt-2 border-t border-sidebar-border space-y-1">
              {visibleSecondary.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={pathname === item.to}
                  collapsed={collapsed}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          )}

          {/* ── Bottom status card — completely hidden when collapsed ────── */}
          <div
            className={cn(
              "absolute bottom-4 left-3 right-3 transition-all duration-300",
              collapsed && "lg:hidden",
            )}
          >
            <div className="glass rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--color-success)] pulse-dot" />
                <span className="text-muted-foreground">All systems nominal</span>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/80">
                Live · v2.4.1 · 14 sensors online
              </div>
            </div>
          </div>
        </aside>
      </TooltipProvider>

      {/* Mobile backdrop — closes drawer on outside tap (unchanged) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/*
        Main content area.
        Uses flex-1 + min-w-0 so it naturally fills whatever space the sidebar
        doesn't occupy.  When the sidebar collapses (lg:w-20 → 80 px), this
        div expands to fill the freed 176 px — no layout shifts, no scrollbars.
      */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenu={() => setOpen((o) => !o)} mobileOpen={open} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

// ─── TopBar (completely unchanged from original) ──────────────────────────────

function TopBar({ onMenu, mobileOpen }: { onMenu: () => void; mobileOpen: boolean }) {
  const { theme, toggle } = useTheme();
  const { city, setCityId, cities } = useCity();
  const { user, isAuthenticated } = useAuth();
  const [cityOpen, setCityOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const band = aqiBand(city.aqi);

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="h-full flex items-center gap-3 px-4 md:px-6">
        <button
          onClick={onMenu}
          className="lg:hidden -ml-1 size-9 grid place-items-center rounded-md hover:bg-muted"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[var(--color-success)] pulse-dot" />
          <span>LIVE TELEMETRY</span>
          <span className="opacity-50">·</span>
          <span>{new Date().toUTCString().slice(17, 25)} UTC</span>
        </div>

        <div className="flex-1" />

        {/* City selector */}
        <div className="relative">
          <button
            onClick={() => setCityOpen((o) => !o)}
            className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm hover:border-primary/40"
          >
            <span className="size-2 rounded-full" style={{ background: band.color }} />
            <span className="font-medium">{city.name}</span>
            <span className="text-muted-foreground hidden sm:inline">· {city.country}</span>
            <span className="hidden sm:inline text-xs text-muted-foreground">AQI {city.aqi}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>

          {cityOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCityOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 z-50 rounded-xl border border-border bg-background shadow-xl p-2">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Select region
                </div>
                {cities.map((c) => {
                  const b = aqiBand(c.aqi);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCityId(c.id);
                        setCityOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-2 py-2 rounded-md text-sm hover:bg-muted",
                        c.id === city.id && "bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: b.color }} />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.country}</span>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        AQI {c.aqi}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative size-9 grid place-items-center rounded-md hover:bg-muted"
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[var(--color-destructive)]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-background shadow-xl z-50">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="p-3 space-y-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="font-medium">PM2.5 Spike Detected</p>
                  <p className="text-sm text-muted-foreground">
                    Industrial Zone B exceeded safe limits.
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="font-medium">Heatwave Warning</p>
                  <p className="text-sm text-muted-foreground">Temperature forecast above 41°C.</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="font-medium">Water Quality Alert</p>
                  <p className="text-sm text-muted-foreground">Turbidity levels increasing.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="size-9 grid place-items-center rounded-md hover:bg-muted"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Avatar / sign-in */}
        {isAuthenticated ? (
          <Link
            to="/profile"
            className="size-9 rounded-full aurora grid place-items-center text-primary-foreground text-xs font-semibold"
            title={user?.name}
          >
            {initials}
          </Link>
        ) : (
          <Link
            to="/login"
            className="size-9 rounded-full glass grid place-items-center text-muted-foreground hover:text-foreground"
            title="Sign in"
          >
            <LogIn className="size-4" />
          </Link>
        )}
      </div>
    </header>
  );
}
