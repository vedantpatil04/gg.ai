import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Search, ChevronRight, Sun, Moon, ExternalLink } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { HELP_LABEL_MAP } from "./help-center-nav";

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function HelpBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label =
      HELP_LABEL_MAP[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href: accumulated });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-muted-foreground/50" />}
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

// ─── Header component ─────────────────────────────────────────────────────────

interface HelpCenterHeaderProps {
  onMenuClick: () => void;
  mobileOpen: boolean;
  onSearchClick?: () => void;
}

export function HelpCenterHeader({
  onMenuClick,
  mobileOpen,
  onSearchClick,
}: HelpCenterHeaderProps) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "help";
  const pageTitle = HELP_LABEL_MAP[lastSegment] ?? "Help Center";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 size-9 grid place-items-center rounded-md hover:bg-muted shrink-0"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Title area */}
        <div className="min-w-0 flex-1">
          <HelpBreadcrumb />
          <h1
            className={cn(
              "font-bold tracking-tight leading-tight truncate",
              segments.length <= 1 ? "text-lg mt-0" : "text-lg mt-0.5",
            )}
          >
            {pageTitle}
          </h1>
        </div>

        {/* Search trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground/70 w-56 shrink-0 hover:border-primary/30 hover:bg-muted/60 transition-all duration-200 group"
          aria-label="Search help center"
        >
          <Search className="size-3.5 group-hover:text-primary transition-colors duration-200" />
          <span className="flex-1 text-left">Search help...</span>
          <span className="text-[10px] border border-border rounded px-1 py-0.5 font-mono hidden lg:block">
            ⌘K
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="size-9 grid place-items-center rounded-md hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Back to app */}
        <Link
          to="/dashboard"
          className="hidden sm:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0 group"
          aria-label="Back to main app"
        >
          <ExternalLink className="size-3.5 group-hover:scale-110 transition-transform duration-150" />
          <span>App</span>
        </Link>
      </div>
    </header>
  );
}
