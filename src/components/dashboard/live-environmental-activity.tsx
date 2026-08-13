/**
 * LiveEnvironmentalActivity — Phase 1: Dashboard Foundation & Realism
 * Phase 2: Production UI & Information Hierarchy
 *
 * Replaces the old `LiveActivityFeed`, which fabricated random events on a
 * timer. This version is built exclusively from real data:
 *   - genuine active alerts (from the alerts API)
 *   - one row for the last real reading update, using the city's actual
 *     `updatedAt` timestamp — a true event, not an invented one
 *
 * If neither exists, it says so plainly instead of inventing activity to
 * look busy.
 *
 * Phase 2 change (UI only, same data/props): rows now sit on a thin
 * connecting rail — this is a real chronological log, so a timeline is
 * structurally honest, not decorative. Critical rows get a touch more
 * visual weight (bigger marker, tinted row) so they don't read at the
 * same priority as a routine reading update.
 */

import { useReducedMotion, motion } from "framer-motion";
import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { STAGGER, FADE_UP } from "@/lib/motion";
import { formatRelativeTime } from "@/lib/format-time";
import type { DashboardAlert } from "@/components/dashboard/alerts-card";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle } from "lucide-react";

interface ActivityRow {
  id: string;
  timeLabel: string;
  title: string;
  detail: string;
  tone: "critical" | "warning" | "info" | "success";
  sortTime: number;
}

const TONE_COLOR: Record<ActivityRow["tone"], string> = {
  critical: "var(--color-destructive)",
  warning: "var(--color-warning)",
  info: "var(--color-primary)",
  success: "var(--color-success)",
};

function severityTone(severity: string): ActivityRow["tone"] {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "info";
}

function buildActivityRows({
  alerts,
  cityName,
  updatedAt,
}: {
  alerts: DashboardAlert[];
  cityName: string;
  updatedAt?: string;
}): ActivityRow[] {
  const rows: ActivityRow[] = [];

  for (const a of alerts.slice(0, 5)) {
    const created = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
    rows.push({
      id: a.id ?? a._id ?? a.title,
      timeLabel: a.createdAt ? formatRelativeTime(a.createdAt) : (a.time ?? "Recent"),
      title: a.title,
      detail: a.area || cityName,
      tone: severityTone(a.severity),
      sortTime: created,
    });
  }

  if (updatedAt) {
    rows.push({
      id: "reading-update",
      timeLabel: formatRelativeTime(updatedAt),
      title: "Air quality reading updated",
      detail: `${cityName} monitoring network`,
      tone: "success",
      sortTime: new Date(updatedAt).getTime(),
    });
  }

  return rows.sort((a, b) => b.sortTime - a.sortTime).slice(0, 6);
}

export function LiveEnvironmentalActivity({
  alerts,
  cityName,
  updatedAt,
  isLoading,
}: {
  alerts: DashboardAlert[];
  cityName: string;
  updatedAt?: string;
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const rows = buildActivityRows({ alerts, cityName, updatedAt });

  return (
    <Panel title="Live Environmental Activity" surface="card">
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Activity className="size-4" />}
          title="No significant environmental events detected."
        />
      ) : (
        <motion.div
          className="relative space-y-3.5"
          variants={STAGGER(0.06)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {/* Connecting rail — this is a real chronological sequence, so the
              line encodes something true about the data rather than decorating it. */}
          {rows.length > 1 && (
            <div aria-hidden className="absolute top-2 bottom-2 left-[71px] w-px bg-border" />
          )}

          {rows.map((row) => {
            const critical = row.tone === "critical";
            return (
              <motion.div
                key={row.id}
                variants={FADE_UP}
                className={cn(
                  "relative flex items-start gap-3 text-sm rounded-lg",
                  critical && "-mx-2 px-2 py-1.5",
                )}
                style={
                  critical
                    ? { background: `color-mix(in oklab, ${TONE_COLOR.critical} 7%, transparent)` }
                    : undefined
                }
              >
                <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums pt-px">
                  {row.timeLabel}
                </span>
                <span
                  aria-hidden
                  className={cn("relative rounded-full shrink-0", critical ? "size-2 mt-1.5" : "size-1.5 mt-1.5")}
                  style={{ background: TONE_COLOR[row.tone] }}
                />
                <div className="min-w-0">
                  <div className="font-medium leading-snug flex items-center gap-1.5">
                    {critical && (
                      <AlertTriangle className="size-3.5 text-[var(--color-destructive)] shrink-0" />
                    )}
                    {row.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{row.detail}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </Panel>
  );
}
