/**
 * CommunityActivityCard — Phase 7
 *
 * Premium empty state with a proper SVG illustration (inline, no external
 * assets) so it looks intentional rather than "coming soon".
 */

import { Panel } from "@/components/ui-bits";
import { Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FADE_UP } from "@/lib/motion";

function CommunityIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Person 1 */}
      <circle cx="28" cy="20" r="8" fill="currentColor" fillOpacity="0.18" />
      <ellipse cx="28" cy="42" rx="11" ry="9" fill="currentColor" fillOpacity="0.12" />
      {/* Person 2 */}
      <circle cx="52" cy="18" r="7" fill="currentColor" fillOpacity="0.22" />
      <ellipse cx="52" cy="40" rx="10" ry="8" fill="currentColor" fillOpacity="0.16" />
      {/* Person 3 — small, background */}
      <circle cx="14" cy="26" r="5" fill="currentColor" fillOpacity="0.10" />
      <ellipse cx="14" cy="44" rx="7" ry="6" fill="currentColor" fillOpacity="0.08" />
      {/* Chat bubbles */}
      <rect x="34" y="4" width="28" height="16" rx="5" fill="currentColor" fillOpacity="0.15" />
      <polygon points="40,20 36,26 44,20" fill="currentColor" fillOpacity="0.15" />
      <rect x="18" y="52" width="44" height="10" rx="4" fill="currentColor" fillOpacity="0.10" />
    </svg>
  );
}

export function CommunityActivityCard({ cityName }: { cityName?: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <Panel
      eyebrow="Community"
      title={
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          Community Activity
        </div>
      }
    >
      <motion.div
        variants={FADE_UP}
        initial={prefersReduced ? false : "hidden"}
        animate="show"
        className="flex flex-col items-center justify-center gap-4 py-8 text-center"
      >
        <div className="relative">
          {/* Background glow */}
          <div className="absolute inset-0 aurora rounded-2xl opacity-15 blur-xl pointer-events-none" />
          <div className="relative text-primary">
            <CommunityIllustration />
          </div>
        </div>

        <div className="max-w-[200px]">
          <div className="text-sm font-semibold">No community activity yet.</div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Reports, resolutions, and citizen advisories for {cityName ?? "your city"} will appear here as they come in.
          </p>
        </div>
      </motion.div>
    </Panel>
  );
}
