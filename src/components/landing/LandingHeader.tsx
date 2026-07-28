import { Link } from "@tanstack/react-router";
import { Shield, Menu, X, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const more = [
  { to: "/citizen", label: "Citizen Hub", desc: "Complaints & community" },
  { to: "/sustainability", label: "Sustainability", desc: "Carbon & ESG metrics" },
  { to: "/simulator", label: "Policy Simulator", desc: "Model interventions" },
  { to: "/map", label: "Smart Map", desc: "Geospatial intelligence" },
] as const;

const primary = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/copilot", label: "AI Copilot" },
  { to: "/forecast", label: "Forecast" },
  { to: "/reports", label: "Reports" },
] as const;

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground shadow-lg shadow-[color:var(--color-primary)]/25">
            <Shield className="size-4" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            GreenGuard <span className="text-muted-foreground font-normal">AI</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {primary.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {p.label}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
              More <ChevronDown className="size-3.5" />
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full pt-2 w-72">
                <div className="rounded-xl border border-border/70 bg-popover/95 backdrop-blur-xl p-2 shadow-2xl">
                  {more.map((m) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      className="block rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground">{m.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            className="lg:hidden grid size-9 place-items-center rounded-md border border-border/60"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1440px] px-6 py-3 flex flex-col gap-1">
            {[...primary, ...more].map((m) => (
              <Link
                key={m.to}
                to={m.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted/60"
              >
                {m.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex-1 text-center h-10 grid place-items-center rounded-md border border-border text-sm"
              >
                Sign in
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="flex-1 text-center h-10 grid place-items-center rounded-md bg-foreground text-background text-sm font-medium"
              >
                Launch
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
