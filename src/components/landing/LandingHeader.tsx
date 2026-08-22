import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrolled } from "@/hooks/use-scrolled";
import { MegaMenu } from "@/components/landing/nav/MegaMenu";
import { MobileNav } from "@/components/landing/nav/MobileNav";
import { PRIMARY_LINKS, SIGN_IN_LINK, LAUNCH_LINK } from "@/components/landing/nav/nav-data";
import { LANDING_CONTAINER, CTA_PRIMARY_CLASS } from "@/components/landing/shared";
import { LandingCitySelector } from "@/components/landing/LandingCitySelector";
import { LandingThemeToggle } from "@/components/landing/LandingThemeToggle";

/**
 * Floating enterprise navigation. Detached from the viewport edge with a
 * soft glass surface at rest, then solidifies (stronger fill, blur and
 * shadow) once the page scrolls — the same "premium before scroll, slightly
 * more solid after" behaviour called for in the Phase 1 brief.
 */
export function LandingHeader() {
  const scrolled = useScrolled(12);

  return (
    <header className="sticky top-0 z-50">
      <div className={LANDING_CONTAINER}>
        <div
          className={`flex h-14 items-center gap-1 rounded-2xl border px-3 transition-all duration-300 sm:mt-4 sm:h-16 sm:px-4 ${scrolled
              ? "mt-2 border-border/60 bg-background/85 backdrop-blur-xl"
              : "mt-3 border-white/[0.06] bg-background/35 backdrop-blur-md"
            }`}
          style={scrolled ? { boxShadow: "var(--navbar-dropdown-shadow)" } : undefined}
        >
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
          >
            <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground shadow-lg shadow-[color:var(--color-primary)]/25">
              <Shield className="size-4" />
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              GreenGuard <span className="font-normal text-muted-foreground">AI</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-2 hidden items-center gap-0.5 lg:flex">
            <MegaMenu />
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full px-3.5 py-2 text-sm text-foreground/75 transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LandingCitySelector className="sm:inline-block" />
            <LandingThemeToggle />

            <Link
              to={SIGN_IN_LINK.to}
              className="hidden h-9 items-center rounded-full px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] lg:inline-flex"
            >
              {SIGN_IN_LINK.label}
            </Link>
            <Link to={LAUNCH_LINK.to} className={cn(CTA_PRIMARY_CLASS, "hidden lg:inline-flex")}>
              {LAUNCH_LINK.label}
            </Link>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
