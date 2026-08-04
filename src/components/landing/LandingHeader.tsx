import { Link, useRouterState } from "@tanstack/react-router";
import {
  Shield,
  Menu,
  X,
  ChevronDown,
  Activity,
  Map as MapIcon,
  CloudRain,
  Brain,
  MessageSquare,
  Leaf,
  FileBarChart,
  GitBranch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Platform mega menu — real routes only, each with an icon + short description. */
const platformItems = [
  {
    to: "/environment",
    label: "Environmental Overview",
    desc: "Live air, water and climate conditions",
    icon: Activity,
  },
  {
    to: "/map",
    label: "Smart Map",
    desc: "Geospatial hotspots and asset drilldown",
    icon: MapIcon,
  },
  {
    to: "/forecast",
    label: "Forecast Intelligence",
    desc: "72-hour predictive risk modelling",
    icon: CloudRain,
  },
  {
    to: "/copilot",
    label: "AI Copilot",
    desc: "Ask questions, get cited answers",
    icon: Brain,
  },
  {
    to: "/citizen",
    label: "Citizen Portal",
    desc: "Crowdsourced reports and community",
    icon: MessageSquare,
  },
  {
    to: "/sustainability",
    label: "Sustainability",
    desc: "Carbon, ESG and SDG tracking",
    icon: Leaf,
  },
  {
    to: "/reports",
    label: "Reports",
    desc: "Auditable, stakeholder-ready reporting",
    icon: FileBarChart,
  },
  {
    to: "/simulator",
    label: "Policy Simulator",
    desc: "Model policy impact before you commit",
    icon: GitBranch,
  },
] as const;

/** Top-level links — mapped to real, existing routes. */
const topLevel = [
  { to: "/dashboard", label: "Solutions" },
  { to: "/docs", label: "Technology" },
  { to: "/help", label: "Resources" },
  { to: "/about", label: "About" },
] as const;

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [mobilePlatformOpen, setMobilePlatformOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the fullscreen mobile menu is open.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  // Close everything on route change.
  useEffect(() => {
    setMobileOpen(false);
    setPlatformOpen(false);
    setMobilePlatformOpen(false);
  }, [pathname]);

  // Close the mega menu on Escape or outside click.
  useEffect(() => {
    if (!platformOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlatformOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setPlatformOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [platformOpen]);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPlatformOpen(true);
  };
  const scheduleCloseMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPlatformOpen(false), 120);
  };

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "mx-auto max-w-[1440px] transition-all duration-300 px-4 sm:px-6 lg:px-10",
          scrolled ? "pt-3" : "pt-0",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-6 lg:gap-8 rounded-2xl transition-all duration-300",
            scrolled
              ? "border border-border/60 bg-background/75 backdrop-blur-xl shadow-lg shadow-black/[0.06] px-4 lg:px-5"
              : "border border-transparent bg-transparent px-0 lg:px-1",
          )}
        >
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground shadow-lg shadow-[color:var(--color-primary)]/25">
              <Shield className="size-4" />
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              GreenGuard <span className="text-muted-foreground font-normal">AI</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm" aria-label="Primary">
            <div
              ref={megaMenuRef}
              className="relative"
              onMouseEnter={openMega}
              onMouseLeave={scheduleCloseMega}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={platformOpen}
                aria-haspopup="true"
                onClick={() => setPlatformOpen((v) => !v)}
              >
                Platform
                <ChevronDown
                  className={cn("size-3.5 transition-transform", platformOpen && "rotate-180")}
                />
              </button>

              {platformOpen && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3 w-[640px]">
                  <div className="rounded-2xl border border-border/70 bg-popover/95 backdrop-blur-xl p-3 shadow-2xl grid grid-cols-2 gap-1">
                    {platformItems.map((m) => (
                      <Link
                        key={m.to}
                        to={m.to}
                        className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] transition-colors group-hover:bg-[color:var(--color-primary)]/15">
                          <m.icon className="size-4.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {m.label}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                            {m.desc}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {topLevel.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-9 items-center rounded-md px-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Launch Platform
            </Link>
            <button
              className="lg:hidden grid size-9 place-items-center rounded-md border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile fullscreen menu ─────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden transition-opacity duration-300",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-full max-w-sm bg-background border-l border-border/60 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col",
            mobileOpen ? "translate-x-0" : "translate-x-full",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          )}
        >
          <div className="flex items-center justify-between h-16 px-5 border-b border-border/60 shrink-0">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5"
            >
              <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground">
                <Shield className="size-4" />
              </div>
              <span className="font-display text-[15px] font-semibold tracking-tight">
                GreenGuard <span className="text-muted-foreground font-normal">AI</span>
              </span>
            </Link>
            <button
              className="grid size-9 place-items-center rounded-md border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-4"
            aria-label="Mobile primary"
          >
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted/60 transition-colors"
              aria-expanded={mobilePlatformOpen}
              onClick={() => setMobilePlatformOpen((v) => !v)}
            >
              Platform
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  mobilePlatformOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                mobilePlatformOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-1 pb-2 pl-2">
                  {platformItems.map((m) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 transition-colors min-h-11"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                        <m.icon className="size-4.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {m.label}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {m.desc}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              {topLevel.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-muted/60 transition-colors min-h-11 flex items-center"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="shrink-0 border-t border-border/60 p-4 flex gap-2">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex-1 text-center h-11 grid place-items-center rounded-md border border-border text-sm font-medium"
            >
              Sign in
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex-1 text-center h-11 grid place-items-center rounded-md bg-foreground text-background text-sm font-medium"
            >
              Launch Platform
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
