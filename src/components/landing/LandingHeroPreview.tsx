import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight } from "lucide-react";
import { LiveAqiHero } from "@/components/environment/env-live-aqi-hero";
import { EnvironmentalMetrics } from "@/components/environment";
import { useCity } from "@/lib/city-context";

/**
 * Hero right-side "live preview" — Phase 1.
 *
 * Deliberately reuses the real Environmental Overview module components
 * (`LiveAqiHero`, `EnvironmentalMetrics`) instead of a fabricated dashboard
 * mock. Both components own their own loading / error / empty states and
 * read from the app-wide `CityProvider`, so this panel always reflects
 * genuine platform data — read-only, no new business logic.
 */
export function LandingHeroPreview() {
  const { city } = useCity();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="relative w-full"
    >
      {/* Ambient glow */}
      <div
        className="absolute -inset-8 -z-10 rounded-[2rem] opacity-60 blur-3xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, color-mix(in oklab, var(--color-primary) 30%, transparent), transparent 70%)",
        }}
      />

      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background/40">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <div className="size-2.5 rounded-full bg-[color:var(--color-destructive)]/70" />
              <div className="size-2.5 rounded-full bg-[color:var(--color-warning)]/70" />
              <div className="size-2.5 rounded-full bg-[color:var(--color-success)]/70" />
            </div>
            <div className="ml-3 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
              <MapPin className="size-3" aria-hidden="true" /> greenguard.ai / environment
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-success)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[color:var(--color-success)]" />
            </span>
            Live · {city?.name ?? "Loading"}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[560px] overflow-hidden">
          <LiveAqiHero />
          <EnvironmentalMetrics />
        </div>

        <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between text-xs bg-background/40">
          <span className="text-muted-foreground">Live preview · Environmental Overview module</span>
          <Link
            to="/environment"
            className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--color-primary)] transition-colors font-medium"
          >
            Open full view <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
