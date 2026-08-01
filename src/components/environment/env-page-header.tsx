import { RefreshCw, MapPinned, Satellite, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * V3 Environmental Overview — Page header.
 *
 * Redesigned as a premium command-center masthead:
 *   - Eyebrow label with animated accent mark
 *   - Large display heading with gradient text
 *   - Subtitle
 *   - Right side: live status + last updated + refresh + change city
 *
 * API surface unchanged — same props as before.
 */
export function EnvPageHeader({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: {
  lastUpdated?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
} = {}) {
  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : "--";

  return (
    <motion.header
      className="flex flex-wrap items-end justify-between gap-6"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
    >
      {/* Left — title block */}
      <div>
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border"
            style={{
              color: "var(--color-primary)",
              borderColor: "color-mix(in oklab, var(--color-primary) 30%, transparent)",
              background: "color-mix(in oklab, var(--color-primary) 10%, transparent)",
            }}
          >
            <Satellite className="size-2.5" aria-hidden="true" />
            Environmental Intelligence
          </span>
        </div>

        {/* Main title */}
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight leading-none"
          style={{
            background: "linear-gradient(135deg, var(--color-foreground) 0%, color-mix(in oklab, var(--color-foreground) 55%, var(--color-primary)) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Environmental Overview
        </h1>

        <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
          Monitor your city&apos;s environmental conditions, air quality and weather intelligence — updated in real time.
        </p>
      </div>

      {/* Right — controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {lastUpdated && (
          <div
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-lg border border-border/60"
            style={{ background: "var(--color-muted)" }}
          >
            <Clock className="size-3" aria-hidden="true" />
            <span>Updated {lastUpdatedLabel}</span>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={!onRefresh || isRefreshing}
          className="gap-1.5"
          aria-label={
            onRefresh
              ? "Refresh environmental data"
              : "Refresh environmental data (not available)"
          }
        >
          <RefreshCw
            className={cn("size-3.5", isRefreshing && "animate-spin")}
            aria-hidden="true"
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="gap-1.5"
          aria-label="Change city (available in a later phase)"
        >
          <MapPinned className="size-3.5" aria-hidden="true" />
          Change City
        </Button>
      </div>
    </motion.header>
  );
}
