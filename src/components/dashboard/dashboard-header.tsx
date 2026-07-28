/**
 * DashboardHeader — Phase 7
 *
 * Migrated to shared motion.ts constants (FADE_UP, TAP_PRESS).
 * Button hover states upgraded: glass buttons now have a subtle primary-tinted
 * background on hover rather than just a border-color change.
 * Live indicator pulse uses the pulse-dot CSS utility.
 */

import { RefreshCw, Download, Megaphone, WifiOff } from "lucide-react";
import { Pill } from "@/components/ui-bits";
import type { EnvHealthBand } from "@/lib/environmental-health";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { FADE_UP, TAP_PRESS, DUR_MD, EASE_OUT } from "@/lib/motion";

export function DashboardHeader({
  cityName,
  country,
  band,
  envBand,
  isApiConnected,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onExport,
  onAdvisory,
}: {
  cityName: string;
  country: string;
  band: { label: string; color: string };
  envBand: EnvHealthBand;
  isApiConnected: boolean;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onExport: () => void;
  onAdvisory: () => void;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.header
      variants={FADE_UP}
      initial={prefersReduced ? false : "hidden"}
      animate="show"
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
          Citizen dashboard
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          {cityName}, {country}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-sm">
          <Pill
            tone={
              envBand.label === "Excellent" || envBand.label === "Healthy"
                ? "success"
                : envBand.label === "Moderate"
                  ? "warning"
                  : "destructive"
            }
          >
            <span className="size-1.5 rounded-full" style={{ background: envBand.color }} />{" "}
            {envBand.label}
          </Pill>
          <Pill
            tone={
              band.label === "Good"
                ? "success"
                : band.label === "Moderate"
                  ? "warning"
                  : "destructive"
            }
          >
            <span className="size-1.5 rounded-full" style={{ background: band.color }} /> AQI{" "}
            {band.label}
          </Pill>
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span
              className={cn("size-2 rounded-full", isApiConnected ? "pulse-dot" : "")}
              style={{
                background: isApiConnected ? "var(--color-success)" : "var(--color-warning)",
              }}
            />
            {isApiConnected ? "Live" : "Mock"} · Updated {lastUpdated}
          </span>
          {!isApiConnected && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              style={{ color: "var(--color-warning)" }}
              aria-label="Live connection unavailable, retry"
            >
              <WifiOff className="size-3.5" />
              {"Live connection unavailable \u2014 Retry"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh */}
        <motion.button
          whileTap={prefersReduced ? undefined : TAP_PRESS}
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "glass rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5",
            "hover:bg-primary/8 hover:border-primary/35",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing\u2026" : "Refresh"}
        </motion.button>

        {/* Export */}
        <motion.button
          whileTap={prefersReduced ? undefined : TAP_PRESS}
          onClick={onExport}
          className={cn(
            "glass rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5",
            "hover:bg-primary/8 hover:border-primary/35",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <Download className="size-3.5" />
          Export
        </motion.button>

        {/* Issue Advisory — aurora gradient CTA */}
        <motion.button
          whileTap={prefersReduced ? undefined : TAP_PRESS}
          onClick={onAdvisory}
          className={cn(
            "aurora text-primary-foreground rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5 font-medium",
            "hover:opacity-88 transition-opacity duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          )}
        >
          <Megaphone className="size-3.5" />
          Issue advisory
        </motion.button>
      </div>
    </motion.header>
  );
}
