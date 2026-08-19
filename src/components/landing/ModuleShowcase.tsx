import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileBarChart, Leaf, GitBranch, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { LandingRoute } from "@/components/landing/nav/nav-data";
import { cn } from "@/lib/utils";

interface ModuleItem {
  to: LandingRoute;
  icon: LucideIcon;
  name: string;
  tag: string;
  desc: string;
  detail: string;
}

const MODULES: readonly ModuleItem[] = [
  {
    to: "/reports",
    icon: FileBarChart,
    name: "Reports",
    tag: "Compliance",
    desc: "Generate auditable, branded environmental reports for stakeholders in seconds.",
    detail:
      "Every report pulls from the same live data fabric every other module reads from — so the numbers a stakeholder sees are exactly what your operations team is already acting on, with a full audit trail behind each figure.",
  },
  {
    to: "/sustainability",
    icon: Leaf,
    name: "Sustainability",
    tag: "ESG",
    desc: "Track carbon, ESG and SDG metrics across your city's operations and initiatives.",
    detail:
      "Carbon, ESG and SDG progress tracked against your city's real operational data, not a static annual disclosure — so sustainability reporting stays current between formal review cycles instead of lagging behind them.",
  },
  {
    to: "/simulator",
    icon: GitBranch,
    name: "Policy Simulator",
    tag: "Decision",
    desc: "Model the environmental impact of policy decisions before you commit to them.",
    detail:
      "Run a proposed policy against the platform's environmental model before it's announced, so trade-offs are visible while a decision is still reversible — not discovered after rollout.",
  },
] as const;

/**
 * ModuleShowcase — Phase 4 replacement for the three identical rounded
 * cards that used to sit in one rectangular container (brief §12, §18).
 * A tab-style selector on the left drives a single detail panel on the
 * right — visual emphasis, description and route all change together, and
 * the "Open module" action itself moves with the selection, so there's
 * still exactly one CTA rather than three competing ones (§13).
 *
 * Every module here still routes to its real, existing page; nothing about
 * the underlying routes or modules changes, only how they're browsed.
 */
export function ModuleShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const active = MODULES[activeIndex];

  return (
    <div className="mt-12 grid gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-0 lg:p-0 lg:overflow-hidden">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Platform modules"
        className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible lg:border-r lg:border-border/60"
      >
        {MODULES.map((m, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={m.to}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-full lg:shrink lg:whitespace-normal lg:rounded-none",
                isActive
                  ? "bg-card text-foreground lg:bg-[color:var(--color-primary)]/[0.06]"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              {/* Active indicator — left rail on desktop, underline on mobile */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute rounded-full bg-[color:var(--color-primary)] transition-opacity",
                  "inset-x-3 -bottom-px h-0.5 lg:inset-x-auto lg:inset-y-3 lg:left-0 lg:h-auto lg:w-0.5",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <div
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                  isActive
                    ? "bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <m.icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">{m.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-mono">
                  {m.tag}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <div className="relative min-h-[280px] p-6 lg:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.to}
            initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                <active.icon className="size-6" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                {active.tag}
              </span>
            </div>

            <h3 className="font-display mt-5 text-2xl font-semibold tracking-tight">
              {active.name}
            </h3>
            <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">{active.desc}</p>
            <p className="mt-3 text-sm text-muted-foreground/80 leading-relaxed">{active.detail}</p>

            <Link
              to={active.to}
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-medium transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Open {active.name}
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
