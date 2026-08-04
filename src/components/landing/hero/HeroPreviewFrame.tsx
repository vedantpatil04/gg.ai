import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MiniDashboard } from "@/components/landing/MiniDashboard";
import { useMouseGlow } from "@/hooks/use-mouse-glow";
import { cn } from "@/lib/utils";

/**
 * Wraps the existing `MiniDashboard` — the platform's real preview widget —
 * in a premium floating frame: ambient aurora glow, layered shadow, a
 * continuous float, and a cursor-follow sheen on desktop. `MiniDashboard`
 * already renders its own window chrome, so this frame doesn't add a
 * second one — it only adds depth and motion around it.
 */
export function HeroPreviewFrame() {
  const reducedMotion = useReducedMotion();
  const sheenRef = useMouseGlow<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full"
    >
      {/* Ambient glow behind the frame */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-[2.5rem] opacity-60 blur-3xl"
        style={{ backgroundImage: "var(--grad-aurora)" }}
      />

      <div
        ref={sheenRef}
        className={cn("group relative rounded-2xl", !reducedMotion && "floaty")}
        style={{ "--mx": "50%", "--my": "35%" } as CSSProperties}
      >
        <div className="glass-panel overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/[0.06]">
          <MiniDashboard />
        </div>

        {/* Cursor-follow sheen — desktop only, purely decorative */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx) var(--my), color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 65%)",
          }}
        />
      </div>
    </motion.div>
  );
}
