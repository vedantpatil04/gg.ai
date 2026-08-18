import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * StickyProductStory — Phase 4 shared building block for "sticky visual +
 * scrolling explanation" sections (brief §6).
 *
 * Desktop (`lg` and up): the visual pins in place while up to a few short
 * steps scroll past beside it, with the step nearest viewport-center
 * highlighted. Active-step detection uses a single `IntersectionObserver`
 * with narrow trigger bands rather than a scroll listener, per the
 * performance brief (§28) — no per-frame work, no fake data, nothing
 * fabricated to animate.
 *
 * Mobile (below `lg`): position is never set to `sticky`, so the grid
 * collapses to one column and reads top-to-bottom — visual, then each step
 * in order — which is exactly the "sequential storytelling" conversion the
 * brief calls for (§24). Nothing needs a separate mobile code path.
 *
 * This component only lays out and highlights; it never renders the visual
 * itself, so it stays reusable across every production surface (Smart Map
 * today) without knowing anything about what's inside.
 */

export interface StickyStoryStep {
  title: string;
  description: string;
}

export function StickyProductStory({
  steps,
  visual,
  accentColor = "var(--color-primary)",
  className = "",
}: {
  steps: readonly StickyStoryStep[];
  visual: ReactNode;
  /** CSS color value used for the active step's index badge and heading. */
  accentColor?: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const indexAttr = entry.target.getAttribute("data-step-index");
          const index = indexAttr ? Number.parseInt(indexAttr, 10) : NaN;
          if (!Number.isNaN(index)) setActiveStep(index);
        }
      },
      // A narrow horizontal band around vertical center — the step whose
      // text crosses the middle of the viewport becomes "active".
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );

    for (const node of stepRefs.current) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [steps.length]);

  return (
    <div
      className={cn(
        "grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-14",
        className,
      )}
    >
      <div className="lg:sticky lg:top-28 lg:self-start">{visual}</div>

      <div className="flex flex-col gap-6 lg:gap-4">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          return (
            <div
              key={step.title}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
              data-step-index={index}
              className="lg:flex lg:min-h-[26vh] lg:flex-col lg:justify-center"
            >
              <motion.div
                initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-colors duration-300"
                    style={{
                      borderColor: isActive
                        ? "transparent"
                        : "color-mix(in oklab, var(--color-border) 100%, transparent)",
                      background: isActive ? accentColor : "transparent",
                      color: isActive ? "var(--color-background)" : "var(--color-muted-foreground)",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="text-lg font-semibold tracking-tight transition-colors duration-300 lg:text-xl"
                    style={{
                      color: isActive ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                    }}
                  >
                    {step.title}
                  </h3>
                </div>
                <p
                  className={cn(
                    "mt-2 pl-10 text-sm leading-relaxed transition-colors duration-300 lg:text-base",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {step.description}
                </p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
