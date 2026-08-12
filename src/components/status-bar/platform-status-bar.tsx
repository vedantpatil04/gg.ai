/**
 * Phase 7 — Enterprise Platform Status Bar
 *
 * A slim 32–40 px strip anchored to the bottom of the authenticated
 * application shell. Replaces any traditional marketing footer with
 * a professional, informative status experience.
 *
 * Data sources — all real, no fabrication:
 *   • isApiConnected   — from CityContext (citiesLoaded query)
 *   • cityDataUpdatedAt — from CityContext (React Query dataUpdatedAt)
 *   • isCityFetching   — from CityContext (live refresh indicator)
 *   • isAuthenticated  — from AuthContext
 *   • city.name        — from CityContext (active monitoring city)
 *
 * Footer links — all real routes that exist in the router:
 *   /help, /help/about, /privacy, /terms, /docs
 *
 * Platform version — from the sidebar card ("v2.4.1"), kept in one
 * constant (APP_VERSION) so there is a single source of truth.
 *
 * Future-compatibility slots (not yet wired):
 *   • WebSocket connection status  (replace isApiConnected with ws state)
 *   • AI model health              (add a useAiHealth() hook call here)
 *   • Background job indicator     (add a usePendingJobs() hook call)
 *   • Deployment environment tag   (add ENV constant from vite env)
 */

import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  Leaf,
  Brain,
  ExternalLink,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Constants ────────────────────────────────────────────────────────────────
// Single source of truth for app version — matches the sidebar status card.

const APP_VERSION = "v2.4.1";

// ─── Quick links — only real routes ──────────────────────────────────────────
// `label` holds an i18n key resolved against the "navigation" namespace.

const FOOTER_LINKS = [
  { label: "help",    to: "/help"          },
  { label: "about",   to: "/help/about"    },
  { label: "privacy", to: "/privacy"       },
  { label: "terms",   to: "/terms"         },
  { label: "docs",    to: "/docs"          },
] as const;

// ─── Service indicators ───────────────────────────────────────────────────────
// We derive connection state from what CityContext already knows:
//   isApiConnected  → whether the cities query resolved at least once
//   isCityFetching  → whether a refresh is in flight
//
// We don't fabricate a database or AI health check — we show what we know.

interface ServiceStatus {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  fetching?: boolean;
}

// ─── Relative timestamp ───────────────────────────────────────────────────────

function useRelativeTime(ts: number | undefined): string {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    if (!ts) { setLabel("—"); return; }
    const update = () =>
      setLabel(formatDistanceToNow(new Date(ts), { addSuffix: true }));
    update();
    const id = setInterval(update, 30_000); // refresh every 30 s
    return () => clearInterval(id);
  }, [ts]);

  return label;
}

// ─── Platform status dot ──────────────────────────────────────────────────────

function StatusDot({ connected, fetching }: { connected: boolean; fetching?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full shrink-0",
        fetching  ? "bg-amber-400 pulse-dot" :
        connected ? "bg-[var(--color-success)] pulse-dot" :
                    "bg-destructive",
      )}
    />
  );
}

// ─── PlatformStatusBar ────────────────────────────────────────────────────────

export function PlatformStatusBar() {
  const { isApiConnected, cityDataUpdatedAt, isCityFetching, city } = useCity();
  const { isAuthenticated } = useAuth();
  const prefersReduced = useReducedMotion();
  const lastUpdated = useRelativeTime(cityDataUpdatedAt);
  const { t } = useTranslation(["common", "navigation"]);

  // Only render for authenticated users — the landing page has its own footer
  if (!isAuthenticated) return null;

  const services: ServiceStatus[] = [
    {
      id:        "env",
      label:     t("environmentalApis"),
      icon:      Leaf,
      connected: isApiConnected,
      fetching:  isCityFetching,
    },
    {
      id:        "ai",
      label:     t("aiServices"),
      icon:      Brain,
      connected: true,   // AI Copilot is always available client-side
    },
    {
      id:        "platform",
      label:     t("platform"),
      icon:      Cpu,
      connected: true,   // If we're rendering, the platform is up
    },
  ];

  const allConnected = services.every((s) => s.connected);
  const anyFetching  = services.some((s) => s.fetching);

  const platformStatus = anyFetching
    ? t("refreshing")
    : allConnected
    ? t("platformOnline")
    : t("platformDegraded");

  return (
    <motion.footer
      initial={prefersReduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        // Layout
        "shrink-0 w-full",
        // Height — slightly taller for better readability (Phase 8: h-9 → h-11)
        "h-11",
        // Visual treatment — glass, elevated above content
        "border-t border-border/50",
        "bg-background/80 backdrop-blur-md",
        // Accessibility
        "select-none",
      )}
      role="contentinfo"
      aria-label={t("platformStatus")}
    >
      <TooltipProvider delayDuration={400}>
        <div className="h-full flex items-center gap-0 px-5 lg:px-7">

          {/* ── LEFT: Brand + version ──────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 pr-4 border-r border-border/40">
            <span className="text-[11px] font-semibold text-foreground/70 whitespace-nowrap">
              GreenGuard AI
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {APP_VERSION}
            </span>
            <span className="text-[10px] text-muted-foreground/40">·</span>
            <span className="text-[10px] text-muted-foreground/60">{t("production")}</span>
          </div>

          {/* ── CENTER: Platform status + services ─────────────────────────── */}
          <div className="flex items-center gap-3 flex-1 min-w-0 px-4">

            {/* Overall platform status chip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusDot connected={allConnected} fetching={anyFetching} />
                  <span className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    allConnected ? "text-[var(--color-success)]" :
                    anyFetching  ? "text-amber-500" :
                                   "text-destructive",
                  )}>
                    {platformStatus}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t("monitoring", { city: city.name })}
              </TooltipContent>
            </Tooltip>

            {/* Vertical separator */}
            <div className="hidden sm:block h-3.5 w-px bg-border/50 shrink-0" />

            {/* Individual service indicators — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-4">
              {services.map((svc) => {
                const Icon = svc.icon;
                return (
                  <Tooltip key={svc.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-muted-foreground/70 hover:text-foreground/70 transition-colors cursor-default">
                        <Icon className="size-3 shrink-0" />
                        <span className="hidden xl:inline text-[10px] whitespace-nowrap">
                          {svc.label}
                        </span>
                        <StatusDot connected={svc.connected} fetching={svc.fetching} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {svc.label}: {svc.fetching ? t("refreshingLabel") : svc.connected ? t("connectedLabel") : t("unavailableLabel")}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Last updated — hidden on small screens */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0 ml-auto text-muted-foreground/50">
              <AnimatePresence mode="wait" initial={false}>
                {isCityFetching ? (
                  <motion.div
                    key="fetching"
                    initial={prefersReduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="size-2.5 animate-spin" />
                    <span className="text-[10px]">{t("refreshing")}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="updated"
                    initial={prefersReduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1"
                  >
                    <span className="text-[10px] whitespace-nowrap">
                      {t("updatedTime", { time: lastUpdated })}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT: Quick links ──────────────────────────────────────────── */}

          {/* Desktop: inline links */}
          <div className="hidden lg:flex items-center gap-0 shrink-0 pl-4 border-l border-border/40">
            {FOOTER_LINKS.map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "text-[10px] text-muted-foreground/60 hover:text-foreground/80",
                  "transition-colors duration-150 px-2.5 py-1",
                  "whitespace-nowrap",
                  i < FOOTER_LINKS.length - 1 && "border-r border-border/30",
                )}
              >
                {t(link.label, { ns: "navigation" })}
              </Link>
            ))}
          </div>

          {/* Tablet: collapsed to dropdown */}
          <div className="hidden sm:flex lg:hidden items-center shrink-0 pl-3 border-l border-border/40 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-1.5 py-1"
                  aria-label={t("platformLinks")}
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-36">
                {FOOTER_LINKS.map((link, i) => (
                  <div key={link.to}>
                    {i > 0 && i === FOOTER_LINKS.length - 2 && <DropdownMenuSeparator />}
                    <DropdownMenuItem asChild>
                      <Link to={link.to} className="flex items-center gap-2 text-xs">
                        <ChevronRight className="size-3 text-muted-foreground" />
                        {t(link.label, { ns: "navigation" })}
                      </Link>
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: just the status dot + help link + overflow */}
          <div className="flex sm:hidden items-center gap-2 shrink-0 ml-auto">
            <Link
              to="/help"
              className="text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              {t("help", { ns: "navigation" })}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                  aria-label={t("morePlatformLinks")}
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-36">
                <DropdownMenuItem disabled className="text-[10px] text-muted-foreground">
                  GreenGuard AI {APP_VERSION}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {FOOTER_LINKS.filter((l) => l.label !== "help").map((link) => (
                  <DropdownMenuItem key={link.to} asChild>
                    <Link to={link.to} className="text-xs">
                      {t(link.label, { ns: "navigation" })}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </TooltipProvider>
    </motion.footer>
  );
}
