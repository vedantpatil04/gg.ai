/**
 * WhatMattersNow — Phase 1: Dashboard Foundation & Realism
 *
 * Replaces the old oversized AI Daily Brief. Maximum 3 items, each built
 * from real numbers already on the page (see lib/ai-brief.ts
 * `deriveWhatMattersNow`). Deliberately free of AI branding — no confidence
 * score, no bot avatar, no "GreenGuard Intelligence" language. The user
 * should care about the condition, not that an AI wrote the sentence.
 */

import { useReducedMotion, motion } from "framer-motion";
import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { STAGGER, FADE_UP } from "@/lib/motion";
import type { MattersItem } from "@/lib/ai-brief";
import { Info } from "lucide-react";

const TONE_COLOR: Record<MattersItem["tone"], string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
  muted: "var(--color-muted-foreground)",
};

export function WhatMattersNow({
  items,
  isLoading,
}: {
  items: MattersItem[];
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <Panel title="What Matters Now">
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Info className="size-4" />}
          title="Nothing notable to report right now."
        />
      ) : (
        <motion.div
          role="list"
          className="space-y-4"
          variants={STAGGER(0.08)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {items.map((item) => {
            const color = TONE_COLOR[item.tone];
            return (
              <motion.div key={item.id} role="listitem" variants={FADE_UP} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 size-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">{item.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </Panel>
  );
}
