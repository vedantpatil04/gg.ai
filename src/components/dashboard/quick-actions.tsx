/**
 * QuickActions — Section 11: Explore GreenGuard
 *
 * Fast navigation shortcuts to key platform modules:
 *   - Environmental Overview — Deep environmental intelligence (/environment)
 *   - Smart Map — Explore environmental conditions spatially (/map)
 *   - Forecast — Detailed weather and environmental outlook (/forecast)
 *   - Report Issue — Report an environmental problem (/citizen)
 *   - AI Copilot — Ask GreenGuard about your environment (/copilot)
 */

import { Link } from "@tanstack/react-router";
import { Activity, Map, CloudSun, Megaphone, Bot, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { STAGGER, HOVER_LIFT, TAP_PRESS } from "@/lib/motion";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent: string;
  description: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Environmental Overview",
    icon: Activity,
    href: "/environment",
    accent: "var(--color-success)",
    description: "Deep environmental intelligence",
  },
  {
    label: "Smart Map",
    icon: Map,
    href: "/map",
    accent: "var(--color-info)",
    description: "Explore conditions spatially",
  },
  {
    label: "Forecast",
    icon: CloudSun,
    href: "/forecast",
    accent: "var(--color-warning)",
    description: "Weather & environmental outlook",
  },
  {
    label: "Report Issue",
    icon: Megaphone,
    href: "/citizen",
    accent: "var(--color-destructive)",
    description: "Report an environmental problem",
  },
  {
    label: "GreenGuard Intelligence",
    icon: Bot,
    href: "/copilot",
    accent: "var(--color-primary)",
    description: "Ask GreenGuard about your environment",
  },
];

const tileVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function ActionTile({ action, spanClass }: { action: QuickAction; spanClass?: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <Link
      to={action.href}
      className={cn("block h-full group focus-visible:outline-none", spanClass)}
    >
      <motion.div
        variants={tileVariant}
        whileHover={prefersReduced ? undefined : HOVER_LIFT}
        whileTap={prefersReduced ? undefined : TAP_PRESS}
        className={cn(
          "glass-card rounded-2xl p-4 flex flex-col justify-between h-full",
          "border border-border/70 relative overflow-hidden transition-all duration-200",
          "hover:border-primary/40 hover:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
      >
        {/* Subtle background glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(ellipse 75% 60% at 50% 0%, color-mix(in oklab, ${action.accent} 9%, transparent), transparent)`,
          }}
        />

        <div className="flex items-start justify-between gap-2">
          {/* Icon badge */}
          <div
            className="size-10 rounded-xl grid place-items-center text-white transition-transform duration-200 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${action.accent}, color-mix(in oklab, ${action.accent} 60%, var(--color-primary)))`,
              boxShadow: `0 4px 14px color-mix(in oklab, ${action.accent} 25%, transparent)`,
            }}
          >
            <action.icon className="size-5" />
          </div>

          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors opacity-60 group-hover:opacity-100" />
        </div>

        <div className="mt-4 relative">
          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {action.label}
          </div>
          <div className="text-xs text-muted-foreground mt-1 leading-snug">
            {action.description}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function QuickActions({ showReports: _showReports }: { showReports?: boolean }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5"
      variants={STAGGER(0.06)}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
    >
      {ACTIONS.map((a, index) => (
        <ActionTile
          key={a.label}
          action={a}
          // 5 tiles on a 2-column tablet grid leaves the last tile alone in
          // its row with empty space beside it; let it fill the row instead.
          spanClass={index === ACTIONS.length - 1 ? "sm:col-span-2 lg:col-span-1" : undefined}
        />
      ))}
    </motion.div>
  );
}
