/**
 * QuickActions — Phase 7
 *
 * Premium navigation tiles. Phase 5 added Framer Motion but kept the
 * icon badge as a simple gradient div. Phase 7 upgrades to:
 *  - Hover: gradient reveal that sweeps across the tile, icon lifts + glows
 *  - Press: coordinated spring sink (icon + tile together via shared variants)
 *  - Uses shared HOVER_LIFT / TAP_PRESS from motion.ts so it stays in sync
 *    with the rest of the design system
 *  - Proper focus-visible ring for keyboard navigation
 */

import { Link } from "@tanstack/react-router";
import { Activity, Map, CloudSun, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { STAGGER, HOVER_LIFT, TAP_PRESS } from "@/lib/motion";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  anchor?: boolean;
  accent: string;
  description: string;
}

// Phase 1 correction pass: reduced to the canonical set of Explore
// destinations. "Intelligence Center" and "Reports" were removed from this
// Dashboard promotion — neither is one of the spec's named destinations,
// and both remain reachable from their own areas of the app.
const ACTIONS: QuickAction[] = [
  { label: "Environmental Overview", icon: Activity, href: "/environment", accent: "var(--color-success)",     description: "Health score & metrics" },
  { label: "Smart Map",     icon: Map,      href: "/map",                  accent: "var(--color-info)",        description: "Interactive AQI map" },
  { label: "Forecast",      icon: CloudSun, href: "/forecast",             accent: "var(--color-warning)",     description: "7-day outlook" },
  { label: "Report Issue",  icon: Megaphone,href: "/citizen",              accent: "var(--color-destructive)", description: "Flag a problem" },
];

const tileVariant = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0 },
};

function ActionTile({ action }: { action: QuickAction }) {
  const prefersReduced = useReducedMotion();

  const tile = (
    <motion.div
      variants={tileVariant}
      whileHover={prefersReduced ? undefined : HOVER_LIFT}
      whileTap={prefersReduced ? undefined : TAP_PRESS}
      className={cn(
        "glass rounded-2xl p-4 flex flex-col items-center justify-center gap-3 text-center",
        "min-w-[110px] shrink-0 sm:min-w-0 sm:shrink cursor-pointer group",
        "border border-border/70 relative overflow-hidden",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      {/* Hover gradient sweep — GPU opacity only */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklab, ${action.accent} 12%, transparent), transparent)`,
        }}
      />

      {/* Icon badge */}
      <div
        className={cn(
          "relative size-11 rounded-xl grid place-items-center text-white",
          "transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg",
        )}
        style={{
          background: `linear-gradient(140deg, ${action.accent}, color-mix(in oklab, ${action.accent} 60%, var(--color-primary)))`,
          boxShadow: `0 4px 16px color-mix(in oklab, ${action.accent} 28%, transparent)`,
        }}
      >
        <action.icon className="size-[18px] transition-transform duration-200 group-hover:scale-110" />

        {/* Glow ring on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ boxShadow: `0 0 16px color-mix(in oklab, ${action.accent} 55%, transparent)` }}
        />
      </div>

      <div className="relative">
        <div className="text-xs font-semibold leading-tight">{action.label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug hidden sm:block">{action.description}</div>
      </div>
    </motion.div>
  );

  return action.anchor ? (
    <a key={action.label} href={action.href} tabIndex={0}>{tile}</a>
  ) : (
    <Link key={action.label} to={action.href}>{tile}</Link>
  );
}

export function QuickActions({ showReports: _showReports }: { showReports: boolean }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 sm:overflow-visible"
      variants={STAGGER(0.06)}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
    >
      {ACTIONS.map((a) => <ActionTile key={a.label} action={a} />)}
    </motion.div>
  );
}
