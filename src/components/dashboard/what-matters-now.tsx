/**
 * WhatMattersNow — Section 1: What Matters Now
 *
 * High-value citizen intelligence section.
 * Translates raw data into a small number of useful observations:
 *   1. Air quality status & recent trend
 *   2. Key weather / comfort observation (e.g. humidity, wind)
 *   3. Active environmental alert status
 *
 * Plus one concise GreenGuard AI interpretation where real AI insight is available.
 */

import { useReducedMotion, motion } from "framer-motion";
import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { STAGGER, FADE_UP } from "@/lib/motion";
import type { MattersItem } from "@/lib/ai-brief";
import { cn } from "@/lib/utils";
import { Info, Sparkles } from "lucide-react";

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
  aiInterpretation,
  isLoading,
}: {
  items: MattersItem[];
  aiInterpretation?: string;
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <Panel eyebrow="Citizen Intelligence" title="What Matters Now" surface="card">
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Info className="size-4" />}
          title="Nothing notable to report right now."
        />
      ) : (
        <div className="space-y-3.5">
          <motion.div
            role="list"
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
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
                  className={cn(
                    "flex flex-col justify-between p-3.5 rounded-xl border transition-all",
                    elevated
                      ? "border-l-[3px] bg-muted/25"
                      : "bg-muted/15 border-border/60 hover:bg-muted/25",
                  )}
                  style={
                    elevated
                      ? {
                          borderLeftColor: color,
                          background: `color-mix(in oklab, ${color} 7%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          aria-hidden
                          className={cn("rounded-full shrink-0", elevated ? "size-2" : "size-1.5")}
                          style={{ background: color }}
                        />
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground truncate">
                          {item.id === "aqi-status"
                            ? "Air Quality"
                            : item.id === "watch"
                              ? "Conditions"
                              : "Alert Status"}
                        </span>
                      </div>
                      {elevated && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded"
                          style={{
                            color,
                            background: `color-mix(in oklab, ${color} 15%, transparent)`,
                          }}
                        >
                          Notice
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-foreground leading-snug">{item.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* GreenGuard AI Interpretation Callout */}
          {aiInterpretation && (
            <motion.div
              variants={FADE_UP}
              initial={prefersReduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex items-start gap-3 text-xs leading-relaxed"
            >
              <div className="size-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-3.5" />
              </div>
              <div className="text-foreground/90">
                <strong className="text-primary font-semibold mr-1.5">GreenGuard AI:</strong>
                {aiInterpretation}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </Panel>
  );
}
