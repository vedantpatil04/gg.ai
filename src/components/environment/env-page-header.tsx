import { RefreshCw, Satellite, Clock, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Phase 1 Architecture Rebuild — Immersive Masthead (EnvMasthead).
 *
 * This is NOT a page header. It IS the first visual zone of the OS.
 *
 * Design identity:
 *  - Full-bleed edge-to-edge, no container constraint
 *  - Display-scale heading with gradient text treatment
 *  - Horizontal rule + context bar below title
 *  - Scroll cue at bottom
 *  - Bottom-anchored metadata / controls row
 *  - Large vertical breathing room
 *
 * No changes to props API — same as before.
 */

const titleVariants = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0,  transition: { type: "spring", stiffness: 160, damping: 24, delay: 0.1 } },
};
const subVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0,  transition: { type: "spring", stiffness: 200, damping: 26, delay: 0.22 } },
};
const metaVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { delay: 0.44, duration: 0.5 } },
};

export function EnvMasthead({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: {
  lastUpdated?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
} = {}) {
  const updatedLabel = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : null;

  return (
    <header
      className="relative w-full overflow-hidden"
      style={{
        /* Generous vertical space — the masthead breathes */
        paddingTop: "clamp(3.5rem, 8vw, 7rem)",
        paddingBottom: "clamp(2.5rem, 5vw, 5rem)",
        paddingLeft:  "clamp(1.25rem, 5vw, 5.5rem)",
        paddingRight: "clamp(1.25rem, 5vw, 5.5rem)",
      }}
    >
      {/* Horizontal rule — top border of the editorial zone */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.15) 30%, oklch(1 0 0 / 0.10) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Top metadata row */}
      <motion.div
        className="flex items-center justify-between gap-4 mb-8 md:mb-12"
        variants={metaVariants}
        initial="hidden"
        animate="show"
      >
        {/* Platform eyebrow */}
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] px-3 py-1.5 rounded-full border"
            style={{
              color: "oklch(0.72 0.14 210)",
              borderColor: "oklch(0.72 0.14 210 / 0.25)",
              background: "oklch(0.72 0.14 210 / 0.08)",
            }}
          >
            <Satellite className="size-2.5" aria-hidden="true" />
            GreenGuard AI
          </span>

          {/* Live indicator */}
          {lastUpdated && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold"
              style={{ color: "oklch(0.72 0.18 150)" }}
            >
              <span className="relative flex size-1.5">
                <span
                  className="absolute inline-flex size-full rounded-full opacity-70"
                  style={{ background: "oklch(0.72 0.18 150)", animation: "ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }}
                />
                <span className="relative inline-flex size-1.5 rounded-full" style={{ background: "oklch(0.72 0.18 150)" }} />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {updatedLabel && (
            <span
              className="hidden md:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border"
              style={{
                color: "oklch(0.55 0.015 230)",
                borderColor: "oklch(1 0 0 / 0.08)",
                background: "oklch(1 0 0 / 0.04)",
              }}
            >
              <Clock className="size-2.5" aria-hidden="true" />
              {updatedLabel}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onRefresh}
            disabled={!onRefresh || isRefreshing}
            className={cn(
              "h-8 gap-1.5 text-[11px] font-semibold border rounded-lg",
              "border-white/10 bg-white/5 text-white/60",
              "hover:bg-white/10 hover:text-white/90 hover:border-white/20",
              "transition-all duration-200",
            )}
            aria-label="Refresh environmental data"
          >
            <RefreshCw
              className={cn("size-3", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </motion.div>

      {/* Display title — the centrepiece */}
      <motion.div
        className="space-y-4 max-w-5xl"
        variants={titleVariants}
        initial="hidden"
        animate="show"
      >
        <h1
          className="font-bold leading-[0.92] tracking-[-0.04em]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 9vw, 7.5rem)",
            background: "linear-gradient(140deg, oklch(0.96 0.008 220) 0%, oklch(0.78 0.04 225) 55%, oklch(0.62 0.08 215) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Environmental<br />Overview
        </h1>
      </motion.div>

      {/* Subtitle + horizontal rule */}
      <motion.div
        className="mt-6 md:mt-8 space-y-5"
        variants={subVariants}
        initial="hidden"
        animate="show"
      >
        <p
          className="text-sm md:text-base leading-relaxed max-w-lg"
          style={{ color: "oklch(0.55 0.015 230)" }}
        >
          Real-time air quality, atmospheric intelligence, and environmental health
          monitoring for your city.
        </p>

        {/* Horizontal rule — closes the editorial zone */}
        <div
          className="h-px"
          style={{
            background: "linear-gradient(90deg, oklch(1 0 0 / 0.12) 0%, oklch(1 0 0 / 0.04) 70%, transparent 100%)",
            maxWidth: "80%",
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Scroll cue — anchored to bottom of masthead */}
      <motion.div
        className="absolute bottom-6 left-0 right-0 flex justify-center"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        aria-hidden="true"
      >
        <div
          className="flex flex-col items-center gap-1.5"
          style={{ color: "oklch(0.40 0.010 230)" }}
        >
          <span className="text-[9px] uppercase tracking-[0.20em] font-semibold">Scroll</span>
          <ChevronDown
            className="size-3.5"
            style={{ animation: "bounce 1.8s ease-in-out infinite" }}
          />
        </div>
      </motion.div>
    </header>
  );
}
