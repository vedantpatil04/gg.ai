import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMouseGlow } from "@/hooks/use-mouse-glow";

/**
 * The hero's layered backdrop: soft aurora-colored glow, a masked data grid,
 * a cursor-follow light on desktop, and a faint noise texture on top for
 * depth. No stock photography — this sandbox has no network access to
 * source real environmental imagery, so the system is built entirely from
 * the app's existing color tokens and gradients instead. It's a single
 * drop-in layer, so a real photo can be added later as one extra element
 * here without touching the Hero component itself.
 */
export function HeroBackground() {
  const reducedMotion = useReducedMotion();
  const glowRef = useMouseGlow<HTMLDivElement>();

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      // Intentionally NOT pointer-events-none: the mouse-glow effect below
      // needs this element to actually receive pointermove. It sits behind
      // all hero content (-z-10), so it never intercepts real clicks —
      // anything painted on top of it still gets the pointer first.
      className="absolute inset-0 -z-10 overflow-hidden bg-background"
      style={{ "--mx": "62%", "--my": "18%" } as CSSProperties}
    >
      {/* Aurora glow blobs */}
      <div
        className={cn(
          "absolute -top-40 left-[-12%] size-[560px] rounded-full opacity-40 blur-[110px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 55%, transparent), transparent 70%)",
        }}
      />
      <div
        className={cn(
          "absolute -top-24 right-[-10%] size-[520px] rounded-full opacity-30 blur-[110px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-info) 50%, transparent), transparent 70%)",
          animationDelay: "-8s",
        }}
      />
      <div
        className={cn(
          "absolute top-16 left-1/3 size-[420px] rounded-full opacity-20 blur-[100px]",
          !reducedMotion && "drift-blob",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-chart-5) 45%, transparent), transparent 70%)",
          animationDelay: "-16s",
        }}
      />

      {/* Masked data grid */}
      <div
        className="grid-bg absolute inset-0 opacity-[0.55]"
        style={{
          maskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 55% at 50% 0%, black 30%, transparent 78%)",
        }}
      />

      {/* Cursor-follow light — desktop only */}
      <div
        className="absolute inset-0 hidden opacity-60 lg:block"
        style={{
          background:
            "radial-gradient(560px circle at var(--mx) var(--my), color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 65%)",
        }}
      />

      {/* Noise texture */}
      <div className="noise-overlay absolute inset-0" />

      {/* Fade into the page background at the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
