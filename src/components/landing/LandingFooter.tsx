import { Link } from "@tanstack/react-router";
import { Shield, Github, Twitter, Linkedin } from "lucide-react";

const cols = [
  {
    title: "Platform",
    links: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/copilot", label: "AI Copilot" },
      { to: "/forecast", label: "Forecast" },
      { to: "/reports", label: "Reports" },
      { to: "/map", label: "Smart Map" },
    ],
  },
  {
    title: "Modules",
    links: [
      { to: "/citizen", label: "Citizen Hub" },
      { to: "/sustainability", label: "Sustainability" },
      { to: "/simulator", label: "Policy Simulator" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/docs", label: "Documentation" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground">
                <Shield className="size-4" />
              </div>
              <span className="font-display text-[15px] font-semibold tracking-tight">
                GreenGuard <span className="text-muted-foreground font-normal">AI</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
              The environmental intelligence platform for cities, authorities, and the citizens they
              serve.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid size-9 place-items-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                {c.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} GreenGuard AI. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[color:var(--color-success)]" />
              All systems operational
            </span>
            <span className="font-mono">v6.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
