/**
 * WhatMattersNow — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 *
 * Replaces the old oversized AI Daily Brief. Maximum 3 items, each built
 * from real numbers already on the page (see lib/ai-brief.ts
 * `deriveWhatMattersNow`). Deliberately free of AI branding — no confidence
 * score, no bot avatar, no "GreenGuard Intelligence" language. The user
 * should care about the condition, not that an AI wrote the sentence.
 *
 * Phase 2 change (UI only, same data/props): items no longer look uniform
 * regardless of severity. Warning/destructive items get a small tinted,
 * left-accented treatment and an "Active" eyebrow; routine good-news or
 * neutral items stay quiet with just a status dot. No new content is
 * invented — the visual weight is derived entirely from the existing
 * `tone` field.
 */

import { useReducedMotion, motion } from "framer-motion";
import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { STAGGER, FADE_UP } from "@/lib/motion";
import type { MattersItem } from "@/lib/ai-brief";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

const TONE_COLOR: Record<MattersItem["tone"], string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
  muted: "var(--color-muted-foreground)",
};

function isElevated(tone: MattersItem["tone"]): boolean {
  return tone === "warning" || tone === "destructive";
}

export function WhatMattersNow({
  items,
  isLoading,
}: {
  items: MattersItem[];
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <Panel title="What Matters Now" surface="card">
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
          className="space-y-2.5"
          variants={STAGGER(0.08)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {items.map((item) => {
            const color = TONE_COLOR[item.tone];
            const elevated = isElevated(item.tone);
            return (
              <motion.div
                key={item.id}
                role="listitem"
                variants={FADE_UP}
                className={cn("flex gap-3 rounded-lg", elevated ? "p-2.5 -mx-0.5" : "px-0.5 py-0.5")}
                style={
                  elevated
                    ? {
                        background: `color-mix(in oklab, ${color} 7%, transparent)`,
                        borderLeft: `2px solid ${color}`,
                      }
                    : undefined
                }
              >
                <span
                  aria-hidden
                  className={cn("mt-1.5 rounded-full shrink-0", elevated ? "size-2" : "size-1.5")}
                  style={{ background: color }}
                />
                <div className="min-w-0">
                  {elevated && (
                    <div
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                      style={{ color }}
                    >
                      Active
                    </div>
                  )}
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
