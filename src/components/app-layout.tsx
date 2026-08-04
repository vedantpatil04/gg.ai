import { Link, useRouterState } from "@tanstack/react-router";
import {
  type ReactNode,
  type ComponentType,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  LogIn,
  LayoutGrid,
  Globe,
  HelpCircle,
  Pin,
  PinOff,
  Search,
  Maximize2,
  Minimize2,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-center";
import { LocationIntelligenceButton, ensureDefaultCity } from "@/components/location/location-intelligence";
import { CommandPaletteProvider, useCommandPalette } from "@/components/command-palette/command-palette";
import { PlatformStatusBar } from "@/components/status-bar/platform-status-bar";
import { useTheme } from "@/lib/theme";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { AUTHORITY_ROLES } from "@/components/protected-route";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Constants ───────────────────────────────────────────────────────────────

const SIDEBAR_PIN_KEY = "gg-sidebar-pinned";
const SIDEBAR_EXPANDED_W = 284; // px — expanded width (Phase 8: +15% for better spacing)
const SIDEBAR_COLLAPSED_W = 64; // px — icon-only width
const HOVER_DELAY_MS = 0;       // expand immediately on enter
const COLLAPSE_DELAY_MS = 180;  // small grace period before collapse

// ─── Navigation data ─────────────────────────────────────────────────────────
//
// Organised into groups per Phase 2 spec:
//   Workspace | AI Intelligence | Community | Account
//
// Each group is rendered as a labelled section when expanded,
// or as an icon block when collapsed (group dividers become thin separators).

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  public?: boolean;
  roles?: UserRole[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// Primary nav groups — always shown (filtered by permission below)
const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/environment", label: "Environmental Overview", icon: Globe, public: true },
      { to: "/map", label: "Smart Map", icon: Map, public: true },
    ],
  },
  {
    id: "ai",
    label: "AI Intelligence",
    items: [
      { to: "/copilot", label: "AI Copilot", icon: Sparkles, public: true },
      { to: "/forecast", label: "Forecast", icon: CloudSun, public: true },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      { to: "/citizen", label: "Citizen Hub", icon: Megaphone, public: true },
      { to: "/sustainability", label: "Sustainability", icon: Leaf, public: true },
      { to: "/simulator", label: "Policy Sim", icon: SlidersHorizontal, public: true },
    ],
  },
];

// Authority/admin groups — only shown when role permits
const AUTHORITY_GROUP: NavGroup = {
  id: "authority",
  label: "Operations",
  items: [
    { to: "/reports", label: "Reports", icon: FileText, roles: AUTHORITY_ROLES },
    { to: "/command-center", label: "Command Center", icon: Shield, roles: AUTHORITY_ROLES },
  ],
};

const ADMIN_GROUP: NavGroup = {
  id: "admin",
  label: "Administration",
  items: [
    { to: "/admin", label: "Administrator Portal", icon: LayoutGrid, roles: ["administrator"] },
  ],
};

// Account nav — secondary, rendered below a divider
const ACCOUNT_GROUP: NavGroup = {
  id: "account",
  label: "Account",
  items: [
    { to: "/profile", label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/security", label: "Security", icon: Shield },
    { to: "/help", label: "Help Center", icon: HelpCircle, public: true },
  ],
};

// ALL_NAV_GROUPS — exported for the Command Palette (Phase 6).
// Single source of truth: sidebar and palette consume the same data.
export const ALL_NAV_GROUPS: NavGroup[] = [
  ...NAV_GROUPS,
  AUTHORITY_GROUP,
  ADMIN_GROUP,
  ACCOUNT_GROUP,
];

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

function filterGroup(
  group: NavGroup,
  isAuthenticated: boolean,
  role: UserRole | undefined,
): NavGroup {
  return {
    ...group,
    items: group.items.filter((item) => isNavItemVisible(item, isAuthenticated, role)),
  };
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

function NavItemLink({
  to,
  label,
  icon: Icon,
  active,
  expanded,
  onClick,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  const prefersReduced = useReducedMotion();

  const inner = (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
        active
          ? "text-sidebar-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Active pill background with left accent */}
      {active && (
        <motion.div
          layoutId={prefersReduced ? undefined : "sidebar-active-pill"}
          className={cn(
            "absolute inset-0 rounded-xl",
            "bg-sidebar-accent",
            // Left accent bar
            "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
            "before:h-5 before:w-0.5 before:rounded-full",
            "before:bg-sidebar-primary",
          )}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Hover background for inactive items */}
      {!active && (
        <div className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-sidebar-accent/70 transition-colors duration-150" />
      )}

      {/* Icon */}
      <Icon
        className={cn(
          "relative z-10 size-4 shrink-0 transition-all duration-150",
          active
            ? "text-sidebar-primary"
            : "text-muted-foreground/70 group-hover:text-foreground",
          !prefersReduced && "group-hover:scale-110",
        )}
      />

      {/* Label — only visible when expanded */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{
              duration: prefersReduced ? 0 : 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative z-10 whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  // Show tooltip only when collapsed
  if (expanded) return inner;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── NavGroup section ─────────────────────────────────────────────────────────

function NavGroupSection({
  group,
  pathname,
  expanded,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  expanded: boolean;
  onNavigate: () => void;
}) {
  const prefersReduced = useReducedMotion();

  if (group.items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {/* Group label — only visible when expanded */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="group-label"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 select-none">
              {group.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {group.items.map((item) => (
        <NavItemLink
          key={item.to}
          to={item.to}
          label={item.label}
          icon={item.icon}
          active={
            item.to === "/admin"
              ? pathname === item.to || pathname.startsWith("/admin")
              : item.to === "/command-center"
                ? pathname === item.to || pathname.startsWith("/command-center")
                : pathname === item.to
          }
          expanded={expanded}
          onClick={onNavigate}
        />
      ))}
    </div>
  );
}


// ─── FloatingSidebar ─────────────────────────────────────────────────────────
//
// Phase 2 — Floating Sidebar
//
// Behaviour summary:
//   • Desktop: icon-only by default; hover → expand with smooth width animation.
//     A pin button locks the sidebar open. Pin preference persists via localStorage.
//   • Tablet (md–lg): same hover behaviour, slightly narrower spacing.
//   • Mobile (<md): off-canvas drawer triggered by hamburger in TopBar.
//
// Layout:
//   The sidebar is `fixed` and offset from the viewport edge (m-3) so it
//   truly "floats". It does NOT push content — the main area has a left
//   padding that matches the collapsed sidebar width + gap, keeping content
//   stable as the sidebar expands over it (overlay style, like Linear).
// ─────────────────────────────────────────────────────────────────────────────

interface FloatingSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function FloatingSidebar({ mobileOpen, onMobileClose }: FloatingSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAuthenticated } = useAuth();
  const prefersReduced = useReducedMotion();

  // ── Pin state — persisted to localStorage ──────────────────────────────────
  const [pinned, setPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_PIN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const togglePin = useCallback(() => {
    setPinned((p) => {
      const next = !p;
      try { localStorage.setItem(SIDEBAR_PIN_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Hover expansion state ──────────────────────────────────────────────────
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expanded = pinned || hovered;

  const handleMouseEnter = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHovered(true), HOVER_DELAY_MS);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    collapseTimerRef.current = setTimeout(() => setHovered(false), COLLAPSE_DELAY_MS);
  }, []);

  // Auto-collapse after navigation in unpinned mode
  const handleNavigate = useCallback(() => {
    onMobileClose();
    if (!pinned) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      collapseTimerRef.current = setTimeout(() => setHovered(false), COLLAPSE_DELAY_MS);
    }
  }, [pinned, onMobileClose]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // ── Permission-filtered nav groups ────────────────────────────────────────
  const role = user?.role;
  const primaryGroups = NAV_GROUPS.map((g) => filterGroup(g, isAuthenticated, role)).filter(
    (g) => g.items.length > 0,
  );
  const authorityGroup = filterGroup(AUTHORITY_GROUP, isAuthenticated, role);
  const adminGroup = filterGroup(ADMIN_GROUP, isAuthenticated, role);
  const accountGroup = filterGroup(ACCOUNT_GROUP, isAuthenticated, role);

  // ── Shared inner content ───────────────────────────────────────────────────
  const sidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full">
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-3 px-3 border-b border-sidebar-border/60",
          !expanded && !isMobile && "justify-center px-0",
        )}
      >
        {/* Logo mark */}
        <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
          <Shield className="size-4" />
        </div>

        {/* Brand name — animated */}
        <AnimatePresence initial={false}>
          {(expanded || isMobile) && (
            <motion.div
              key="brand-text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 min-w-0 overflow-hidden"
            >
              <div className="text-sm font-semibold tracking-tight whitespace-nowrap leading-tight">
                GreenGuard AI
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap leading-tight">
                Env. Intelligence
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pin button — desktop expanded only */}
        <AnimatePresence initial={false}>
          {(expanded && !isMobile) && (
            <motion.button
              key="pin-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: prefersReduced ? 0 : 0.15 }}
              onClick={togglePin}
              className={cn(
                "shrink-0 size-7 rounded-lg grid place-items-center transition-colors",
                "text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              )}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            >
              {pinned
                ? <PinOff className="size-3.5" />
                : <Pin className="size-3.5" />
              }
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="size-7 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── Scrollable nav body ──────────────────────────────────────── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1",
          // Hide scrollbar until needed, keep floating look
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border/60",
          expanded || isMobile ? "px-2" : "px-1.5",
        )}
        aria-label="Primary navigation"
      >
        {/* Primary groups */}
        {primaryGroups.map((group, i) => (
          <div key={group.id}>
            {i > 0 && (
              <div className={cn(
                "my-2",
                expanded || isMobile
                  ? "border-t border-sidebar-border/40"
                  : "border-t border-sidebar-border/30 mx-1",
              )} />
            )}
            <NavGroupSection
              group={group}
              pathname={pathname}
              expanded={expanded || isMobile}
              onNavigate={handleNavigate}
            />
          </div>
        ))}

        {/* Authority / operations group */}
        {authorityGroup.items.length > 0 && (
          <>
            <div className={cn(
              "my-2 border-t border-sidebar-border/40",
              !expanded && !isMobile && "mx-1",
            )} />
            <NavGroupSection
              group={authorityGroup}
              pathname={pathname}
              expanded={expanded || isMobile}
              onNavigate={handleNavigate}
            />
          </>
        )}

        {/* Admin group */}
        {adminGroup.items.length > 0 && (
          <>
            <div className={cn(
              "my-2 border-t border-sidebar-border/40",
              !expanded && !isMobile && "mx-1",
            )} />
            <NavGroupSection
              group={adminGroup}
              pathname={pathname}
              expanded={expanded || isMobile}
              onNavigate={handleNavigate}
            />
          </>
        )}
      </nav>

      {/* ── Account section ──────────────────────────────────────────── */}
      {accountGroup.items.length > 0 && (
        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border/60 py-2 space-y-0.5",
            expanded || isMobile ? "px-2" : "px-1.5",
          )}
        >
          {/* "Account" label */}
          <AnimatePresence initial={false}>
            {(expanded || isMobile) && (
              <motion.div
                key="account-label"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.15, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 select-none">
                  Account
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {accountGroup.items.map((item) => (
            <NavItemLink
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              active={pathname === item.to}
              expanded={expanded || isMobile}
              onClick={handleNavigate}
            />
          ))}
        </div>
      )}

      {/* ── System status footer ─────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {(expanded || isMobile) && (
          <motion.div
            key="status-footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.18, ease: "easeInOut" }}
            className="overflow-hidden shrink-0"
          >
            <div className="m-2 mt-0">
              <div className="glass rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--color-success)] pulse-dot shrink-0" />
                  <span className="text-muted-foreground">All systems nominal</span>
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground/70">
                  Live · v2.4.1 · Environmental APIs connected
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {/* ── Desktop floating sidebar ────────────────────────────────────────── */}
      <TooltipProvider delayDuration={300}>
        <motion.aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          animate={{ width: expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 340, damping: 34, mass: 0.8 }
          }
          className={cn(
            // Positioning — fixed, floating with margin from edges
            "hidden lg:flex flex-col",
            "fixed left-3 top-3 bottom-3 z-40",
            // Floating visual treatment
            "rounded-2xl overflow-hidden",
            "bg-sidebar border border-sidebar-border/70",
            "shadow-[0_8px_32px_-4px_oklch(0_0_0/0.18),0_2px_8px_oklch(0_0_0/0.1),0_0_0_1px_oklch(1_0_0/0.06)_inset]",
            // Dark mode shadow
            "dark:shadow-[0_8px_32px_-4px_oklch(0_0_0/0.55),0_2px_8px_oklch(0_0_0/0.35),0_0_0_1px_oklch(1_0_0/0.05)_inset]",
          )}
          style={{ minWidth: SIDEBAR_COLLAPSED_W }}
          aria-label="Main navigation"
        >
          {sidebarContent(false)}
        </motion.aside>
      </TooltipProvider>

      {/* ── Mobile off-canvas drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer */}
            <motion.aside
              key="mobile-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 320, damping: 34, mass: 0.9 }
              }
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden",
                "bg-sidebar border-r border-sidebar-border",
                "shadow-[4px_0_24px_oklch(0_0_0/0.18)]",
                "dark:shadow-[4px_0_24px_oklch(0_0_0/0.55)]",
              )}
              aria-label="Mobile navigation"
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────
//
// Phase 2 key changes vs Phase 1:
//
//   1. Sidebar is now `fixed` and floats (m-3 inset from viewport edges).
//      Main content gets a stable left offset = collapsed sidebar width + gap
//      so layout never shifts as the sidebar overlays on hover.
//
//   2. FloatingSidebar replaces the inline <aside> — all sidebar logic lives
//      in the component above.
//
//   3. TopBar no longer receives the sidebar collapse state — it only handles
//      the mobile hamburger trigger.
//
//   4. Page-enter animation from Phase 1 is preserved unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Page-enter animation key
  const enterKeyRef = useRef(0);
  const prevPathRef = useRef(pathname);
  if (pathname !== prevPathRef.current) {
    enterKeyRef.current += 1;
    prevPathRef.current = pathname;
    // Close mobile drawer on navigation
    setMobileOpen(false);
  }

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen flex w-full shell-bg text-foreground">
      {/* Floating sidebar */}
      <FloatingSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/*
        Main content column.
        Left padding = collapsed width (64px) + gap from edge (12px) + sidebar-to-content gap (24px) = 100px.
        This keeps the content stable — the sidebar floats over it when expanded.
      */}
      <div
        className="flex-1 flex flex-col min-w-0 lg:pl-[100px]"
        style={{ minHeight: "100dvh" }}
      >
        <TopBar
          onMenu={() => setMobileOpen((o) => !o)}
          mobileOpen={mobileOpen}
        />

        <main
          key={enterKeyRef.current}
          className="flex-1 min-w-0 page-enter"
        >
          {children}
        </main>

        {/* Phase 7 — Enterprise Platform Status Bar */}
        <PlatformStatusBar />
      </div>
    </div>
    </CommandPaletteProvider>
  );
}

// ─── Route → Breadcrumb map ───────────────────────────────────────────────────
//
// Maps pathname segments to human-readable labels and parent segments.
// Covers every route in the app; unknown segments fall back to title-cased slug.
//
// Structure:
//   key   = the full pathname  (e.g. "/admin/users")
//   label = display label
//   parent = parent pathname for hierarchical breadcrumbs (omit for top-level)
//
// Phase 3A will extend this with a location segment for the city selector.
// ─────────────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  label: string;
  parent?: string;
}

const BREADCRUMB_MAP: Record<string, BreadcrumbEntry> = {
  // ── Top-level workspace ───────────────────────────────────────────────────
  "/dashboard":      { label: "Dashboard" },
  "/environment":    { label: "Environmental Overview" },
  "/map":            { label: "Smart Map" },
  "/copilot":        { label: "AI Copilot" },
  "/forecast":       { label: "Forecast" },
  "/citizen":        { label: "Citizen Hub" },
  "/reports":        { label: "Reports" },
  "/sustainability": { label: "Sustainability" },
  "/simulator":      { label: "Policy Sim" },
  "/intelligence":   { label: "Intelligence" },
  "/command-center": { label: "Command Center" },
  // ── Account ───────────────────────────────────────────────────────────────
  "/profile":        { label: "Profile" },
  "/settings":       { label: "Settings" },
  "/security":       { label: "Security" },
  // ── Admin portal ──────────────────────────────────────────────────────────
  "/admin":                          { label: "Admin Portal" },
  "/admin/":                         { label: "Admin Portal" },
  "/admin/analytics":                { label: "Analytics",               parent: "/admin" },
  "/admin/authorities":              { label: "Authorities",             parent: "/admin" },
  "/admin/authority-management":     { label: "Authority Management",    parent: "/admin" },
  "/admin/authority-requests":       { label: "Authority Requests",      parent: "/admin" },
  "/admin/cities":                   { label: "Cities",                  parent: "/admin" },
  "/admin/city-management":          { label: "City Management",         parent: "/admin" },
  "/admin/complaint-management":     { label: "Complaint Management",    parent: "/admin" },
  "/admin/complaints":               { label: "Complaints",              parent: "/admin" },
  "/admin/environmental-monitoring": { label: "Env. Monitoring",         parent: "/admin" },
  "/admin/platform":                 { label: "Platform",                parent: "/admin" },
  "/admin/platform-administration":  { label: "Platform Administration", parent: "/admin" },
  "/admin/platform-health":          { label: "Platform Health",         parent: "/admin" },
  "/admin/platform-settings":        { label: "Platform Settings",       parent: "/admin" },
  "/admin/profile":                  { label: "Admin Profile",           parent: "/admin" },
  "/admin/reports":                  { label: "Reports",                 parent: "/admin" },
  "/admin/security-center":          { label: "Security Center",         parent: "/admin" },
  "/admin/user-management":          { label: "User Management",         parent: "/admin" },
  "/admin/users":                    { label: "Users",                   parent: "/admin" },
  // ── Help center ───────────────────────────────────────────────────────────
  "/help":                  { label: "Help Center" },
  "/help/":                 { label: "Help Center" },
  "/help/knowledge-base":   { label: "Knowledge Base",  parent: "/help" },
  "/help/tutorials":        { label: "Tutorials",       parent: "/help" },
  "/help/support":          { label: "Support",         parent: "/help" },
  "/help/community":        { label: "Community",       parent: "/help" },
  "/help/feedback":         { label: "Feedback",        parent: "/help" },
  "/help/status":           { label: "System Status",   parent: "/help" },
  "/help/about":            { label: "About",           parent: "/help" },
  "/help/whats-new":        { label: "What's New",      parent: "/help" },
};

/** Build an ordered [parent?, current] pair for a given pathname */
function resolveBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const entry = BREADCRUMB_MAP[pathname];
  if (!entry) {
    // Unknown route — show a single title-cased segment
    const slug = pathname.split("/").filter(Boolean).pop() ?? "";
    const label = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return [{ label, href: pathname }];
  }
  if (entry.parent) {
    const parentEntry = BREADCRUMB_MAP[entry.parent];
    return [
      { label: parentEntry?.label ?? entry.parent, href: entry.parent },
      { label: entry.label, href: pathname },
    ];
  }
  return [{ label: entry.label, href: pathname }];
}

// ─── ROLE DISPLAY MAP ────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  citizen:       "Citizen",
  authority:     "Authority",
  administrator: "Administrator",
};

// ─── TopBar / Enterprise Navbar ───────────────────────────────────────────────
//
// Phase 3 — Enterprise Navbar
//
// Three-section layout:
//   LEFT   Breadcrumb navigation (auto-resolved from active route)
//   CENTER Global search bar (UI only — Phase 4 wires Ctrl+K to command palette)
//   RIGHT  Platform status · City selector (preserved) · Quick actions · Profile menu
//
// Scroll behaviour:
//   A passive scroll listener elevates the shadow when the page is scrolled
//   past 8px — giving the navbar a "lifted" feel without a layout shift.
//
// Preserved from Phase 2:
//   - City selector (full dropdown, all logic identical)
//   - Notifications icon + inline dropdown (Phase 5 replaces this)
//   - Theme toggle
//   - Mobile hamburger
//   - Avatar / sign-in link
//
// Reserved for future phases:
//   - Phase 3A: city selector becomes Global Location Intelligence drawer
//   - Phase 4:  search bar triggers command palette
//   - Phase 5:  notifications icon opens notification center drawer
// ─────────────────────────────────────────────────────────────────────────────

function TopBar({ onMenu, mobileOpen }: { onMenu: () => void; mobileOpen: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();

  const { user, isAuthenticated } = useAuth();
  const prefersReduced = useReducedMotion();

  // Ensure Belagavi is the default fallback city on first launch
  useEffect(() => { ensureDefaultCity(); }, []);

  // Command Palette — opened by search pill click or Ctrl+K (global listener)
  const { openPalette } = useCommandPalette();

  const [profileOpen, setProfileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const breadcrumbs = resolveBreadcrumbs(pathname);

  // ── Scroll elevation ──────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Fullscreen toggle ─────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Profile menu close on outside click ───────────────────────────────────
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // ── Derived values ────────────────────────────────────────────────────────
  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const roleLabel = user?.role ? (ROLE_LABEL[user.role] ?? user.role) : null;

  // Search placeholder varies by active section
  const searchPlaceholder = (() => {
    if (pathname.startsWith("/admin")) return "Search portal...";
    if (pathname.startsWith("/help"))  return "Search help...";
    if (pathname === "/map")           return "Search locations...";
    if (pathname === "/copilot")       return "Ask AI Copilot...";
    return "Search GreenGuard...";
  })();

  // ── Keyboard shortcut hint ────────────────────────────────────────────────
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const kbdHint = isMac ? "⌘K" : "Ctrl K";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 transition-shadow duration-200",
        "float-topbar",
        scrolled && "shadow-[0_4px_24px_-2px_oklch(0.15_0.03_230/0.18)] dark:shadow-[0_4px_24px_-2px_oklch(0_0_0/0.5)]",
      )}
    >
      <div className="h-full flex items-center justify-between gap-2 px-3 md:px-4">

        {/* ── Mobile hamburger ──────────────────────────────────────────── */}
        <button
          onClick={onMenu}
          className="lg:hidden shrink-0 size-9 grid place-items-center rounded-xl hover:bg-muted transition-colors"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* ══ LEFT GROUP — Breadcrumbs · Search · Platform Status ══════════ */}
        <div className="hidden lg:flex items-center gap-2 min-w-0 flex-1">

          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 min-w-0 shrink-0 max-w-[220px] xl:max-w-[280px]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.ol
                key={pathname}
                initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-1 min-w-0"
              >
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <li key={crumb.href} className="flex items-center gap-1 min-w-0">
                      {i > 0 && (
                        <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                      )}
                      {isLast ? (
                        <span className="text-sm font-semibold text-foreground truncate">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          to={crumb.href}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </motion.ol>
            </AnimatePresence>
          </nav>

          {/* Vertical divider */}
          <div className="h-4 w-px bg-border/50 shrink-0 mx-1" />

          {/* Global Search */}
          <div className="flex flex-1 max-w-xs xl:max-w-sm">
            <div
              className={cn(
                "relative w-full flex items-center gap-2 rounded-xl border px-3 h-9",
                "bg-muted/50 border-border/60 cursor-pointer",
                "transition-all duration-200",
                "hover:bg-muted hover:border-border",
              )}
              data-command-palette-trigger
              onClick={openPalette}
              role="button"
              tabIndex={0}
              aria-label={`Search — press ${kbdHint} to open command palette`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPalette();
                }
              }}
            >
              <Search className="size-3.5 text-muted-foreground/60 shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground/50 select-none truncate">
                {searchPlaceholder}
              </span>
              <kbd className="hidden xl:flex items-center gap-0.5 shrink-0 rounded-md border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60">
                {kbdHint}
              </kbd>
            </div>
          </div>

          {/* Platform status chip */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1 shrink-0 ml-2">
            <span className="size-1.5 rounded-full bg-[var(--color-success)] pulse-dot shrink-0" />
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
              Platform Online
            </span>
          </div>
        </div>

        {/* Mobile: current page label */}
        <div className="lg:hidden flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate block">
            {breadcrumbs[breadcrumbs.length - 1]?.label ?? "GreenGuard AI"}
          </span>
        </div>

        {/* ══ RIGHT GROUP — Location · Theme · Fullscreen · Notifications · Profile ══ */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Location selector */}
          <LocationIntelligenceButton />

          {/* Separator */}
          <div className="hidden sm:block w-px h-5 bg-border/60 mx-1" />

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="size-9 grid place-items-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark"
                  ? <Sun className="size-4" />
                  : <Moon className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </TooltipContent>
          </Tooltip>

          {/* Fullscreen toggle — desktop only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleFullscreen}
                className="hidden lg:grid size-9 place-items-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen
                  ? <Minimize2 className="size-4" />
                  : <Maximize2 className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <NotificationBell
            className="rounded-xl text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-105"
          />

          {/* Separator */}
          <div className="w-px h-5 bg-border/60 mx-1" />

          {/* User profile menu / sign-in */}
          {isAuthenticated ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2 rounded-xl pl-1.5 pr-2.5 h-9",
                  "hover:bg-muted transition-colors duration-150",
                  profileOpen && "bg-muted",
                )}
                aria-label="Open user menu"
                aria-expanded={profileOpen}
              >
                {/* Avatar */}
                <div className="size-7 rounded-lg aurora grid place-items-center text-primary-foreground text-[11px] font-bold shrink-0">
                  {initials}
                </div>
                {/* Name + role — desktop */}
                <div className="hidden xl:block text-left leading-none min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                    {user?.name ?? "User"}
                  </div>
                  {roleLabel && (
                    <div className="text-[10px] text-muted-foreground capitalize">{roleLabel}</div>
                  )}
                </div>
                <ChevronDown className={cn(
                  "hidden xl:block size-3 text-muted-foreground transition-transform duration-200",
                  profileOpen && "rotate-180",
                )} />
              </button>

              {/* Profile dropdown */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    key="profile-menu"
                    initial={prefersReduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden"
                  >
                    {/* User info header */}
                    <div className="p-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl aurora grid place-items-center text-primary-foreground text-sm font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{user?.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{roleLabel}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5 space-y-0.5">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        <User className="size-4 text-muted-foreground" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        <Settings className="size-4 text-muted-foreground" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        to="/security"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        <Shield className="size-4 text-muted-foreground" />
                        <span>Security</span>
                      </Link>
                    </div>

                    {/* Divider + sign out */}
                    <div className="p-1.5 border-t border-border/60">
                      <Link
                        to="/login"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <LogOut className="size-4" />
                        <span>Sign out</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Not authenticated — sign in button */
            <Link
              to="/login"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 h-9 text-sm font-medium",
                "border border-border/60 bg-muted/40 hover:bg-muted",
                "text-muted-foreground hover:text-foreground transition-colors duration-150",
              )}
            >
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

        </div>{/* end RIGHT group */}
      </div>
    </header>
  );
}
