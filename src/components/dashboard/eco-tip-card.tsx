/**
 * EcoTipCard — Phase 7
 *
 * Modern callout with a leaf SVG accent, hover interaction, tinted surface.
 */

import { Panel } from "@/components/ui-bits";
import { Leaf, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FADE_UP, HOVER_LIFT_SM, TAP_PRESS } from "@/lib/motion";

export function EcoTipCard() {
  const prefersReduced = useReducedMotion();

  return (
    <Panel
      eyebrow="Today"
      title={
        <div className="flex items-center gap-2">
          <Leaf className="size-4" style={{ color: "var(--color-success)" }} />
          Today's Eco Tip
        </div>
      }
    >
      <motion.div
        variants={FADE_UP}
        initial={prefersReduced ? false : "hidden"}
        animate="show"
        whileHover={prefersReduced ? undefined : HOVER_LIFT_SM}
        className="relative overflow-hidden rounded-xl p-4 group cursor-default"
        style={{
          background: "color-mix(in oklab, var(--color-success) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-success) 20%, transparent)",
        }}
      >
        {/* Corner glow */}
        <div
          className="absolute -top-8 -right-8 size-24 rounded-full blur-2xl opacity-25 transition-opacity duration-300 group-hover:opacity-40 pointer-events-none"
          style={{ background: "var(--color-success)" }}
        />

        {/* Leaf watermark */}
        <div className="absolute -bottom-4 -right-4 opacity-6 pointer-events-none" aria-hidden>
          <Leaf className="size-20" style={{ color: "var(--color-success)" }} />
        </div>

        <p className="relative text-sm leading-relaxed" style={{ color: "color-mix(in oklab, var(--color-success) 75%, var(--color-foreground))" }}>
          Swapping short car trips for walking or cycling meaningfully cuts neighbourhood-level PM2.5 and CO₂.
          Personalised, data-driven tips are coming in a future update.
        </p>

        <div
          className="relative mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-60 group-hover:opacity-90 transition-opacity duration-200"
          style={{ color: "var(--color-success)" }}
        >
          Learn more <ArrowRight className="size-3" />
        </div>
      </motion.div>
    </Panel>
  );
}
