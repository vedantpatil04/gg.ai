import { useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Search, Sun, Moon, ExternalLink, ChevronRight } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { HELP_NAV_ITEMS, HELP_LABEL_MAP } from "./help-center-nav";

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function HelpBreadcrumb() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label =
      HELP_LABEL_MAP[seg] ??
      seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    crumbs.push({ label, href: accumulated });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-muted-foreground/40" />}
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.href as any} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── Top nav component ────────────────────────────────────────────────────────

interface HelpCenterTopNavProps {
  onSearchClick?: () => void;
}

export function HelpCenterTopNav({ onSearchClick }: HelpCenterTopNavProps) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const tabsRef  = useRef<HTMLDivElement>(null);

  const segments    = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "help";
  const pageTitle   = HELP_LABEL_MAP[lastSegment] ?? "Help Center";

  // Active detection helper
  const isActive = (to: string) =>
    to === "/help"
      ? pathname === "/help" || pathname === "/help/"
      : pathname === to || pathname.startsWith(to + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      {/* ── Top bar: brand + title + actions ── */}
      <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border/50">
        {/* Brand */}
        <Link
          to="/help"
          className="flex items-center gap-2 shrink-0 group"
          aria-label="Help Center home"
        >
          <div className="size-7 rounded-lg aurora grid place-items-center text-primary-foreground shrink-0">
            <Shield className="size-3.5" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-xs font-bold tracking-tight">GreenGuard AI</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Help Center
            </span>
          </div>
        </Link>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-border shrink-0" />

        {/* Breadcrumb / page title */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <HelpBreadcrumb />
          {segments.length <= 1 && (
            <span className="text-sm font-semibold text-foreground">{pageTitle}</span>
          )}
        </div>

        {/* Page title on mobile */}
        <div className="flex-1 sm:hidden min-w-0">
          <span className="text-sm font-bold truncate">{pageTitle}</span>
        </div>

        {/* Search trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground/70 w-48 lg:w-56 shrink-0 hover:border-primary/30 hover:bg-muted/60 transition-all duration-200 group"
          aria-label="Search help center"
        >
          <Search className="size-3.5 group-hover:text-primary transition-colors duration-200" />
          <span className="flex-1 text-left text-xs">Search help…</span>
          <span className="text-[10px] border border-border rounded px-1 py-0.5 font-mono hidden lg:block">
            ⌘K
          </span>
        </button>

        {/* Mobile search */}
        <button
          onClick={onSearchClick}
          className="md:hidden size-9 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Search"
        >
          <Search className="size-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="size-9 grid place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Back to app */}
        <Link
          to="/dashboard"
          className="hidden sm:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0 group"
        >
          <ExternalLink className="size-3.5 group-hover:scale-110 transition-transform duration-150" />
          <span>App</span>
        </Link>
      </div>

      {/* ── Tab bar: horizontal scrollable nav ── */}
      <div
        ref={tabsRef}
        className="flex overflow-x-auto scrollbar-hide px-2 md:px-4"
        role="tablist"
        aria-label="Help Center navigation"
      >
        {HELP_NAV_ITEMS.map(item => {
          const Icon   = item.icon;
          const active = isActive(item.to);

          if (item.comingSoon) {
            return (
              <div
                key={item.id}
                role="tab"
                aria-disabled="true"
                className="flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap text-muted-foreground/40 cursor-not-allowed select-none shrink-0 relative border-b-2 border-transparent"
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="text-[8px] font-semibold px-1 py-0.5 rounded-full border border-border text-muted-foreground/50 ml-0.5">
                    {item.badge}
                  </span>
                ) : (
                  <span className="text-[8px] font-medium px-1 py-0.5 rounded-full border border-border/50 text-muted-foreground/40 ml-0.5">
                    Soon
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.to as any}
              role="tab"
              aria-selected={active}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap shrink-0 relative",
                "border-b-2 transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-t-md",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full aurora text-primary-foreground ml-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
