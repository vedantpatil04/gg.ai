import type { CSSProperties } from "react";
import { motion, useReducedMotion, type MotionValue } from "framer-motion";
import { MiniDashboard } from "@/components/landing/MiniDashboard";
import { useMouseGlow } from "@/hooks/use-mouse-glow";
import { cn } from "@/lib/utils";

/**
 * Wraps the existing `MiniDashboard` — the platform's real preview widget —
 * in a premium floating frame. Phase 4 dials the ambient aurora glow back
 * from a large halo to a tight, low-opacity backdrop, and leans on layered
 * shadow + a thin highlight ring for depth instead — closer to "a real
 * application window resting on the page" than "a screenshot floating over
 * a gradient." `MiniDashboard` already renders its own window chrome, so
 * this frame doesn't add a second one; it only adds depth and motion
 * around it.
 *
 * `scrollScale`, when provided, is a Framer `MotionValue` (0 → 1 across the
 * hero's own scroll range) driving a very small, controlled scale-up as the
 * page scrolls — reinforcing that this is a live surface, not a static
 * image, without fabricating any data to animate.
 */
export function HeroPreviewFrame({ scrollScale }: { scrollScale?: MotionValue<number> }) {
  const reducedMotion = useReducedMotion();
  const sheenRef = useMouseGlow<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={reducedMotion ? undefined : { scale: scrollScale }}
      className="relative w-full"
    >
      {/* Ambient glow behind the frame — tight and quiet, not a halo */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2rem] opacity-[0.28] blur-2xl"
        style={{ backgroundImage: "var(--grad-aurora)" }}
      />

      <div
        ref={sheenRef}
        className={cn("group relative rounded-2xl", !reducedMotion && "floaty")}
        style={{ "--mx": "50%", "--my": "35%" } as CSSProperties}
      >
        {/* Grounding shadow — a soft contact shadow beneath the frame, doing
            the depth work the big blurred halo used to do, but reading as
            a real object resting on the page rather than glowing. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-6 -bottom-6 -z-10 h-10 rounded-[50%] bg-black/25 blur-2xl dark:bg-black/50"
        />

        <div className="glass-panel overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/[0.06]">
          {/* Top highlight — a hairline of light along the upper edge, the
              kind of detail that reads as a physical surface catching
              light rather than a flat screenshot. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
          <MiniDashboard />
        </div>

        {/* Cursor-follow sheen — desktop only, purely decorative */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx) var(--my), color-mix(in oklab, var(--color-primary) 11%, transparent), transparent 65%)",
          }}
        />
      </div>
    </motion.div>
  );
}
