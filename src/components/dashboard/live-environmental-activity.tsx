/**
 * LiveEnvironmentalActivity — Phase 1: Dashboard Foundation & Realism
 *
 * Replaces the old `LiveActivityFeed`, which fabricated random events on a
 * timer. This version is built exclusively from real data:
 *   - genuine active alerts (from the alerts API)
 *   - one row for the last real reading update, using the city's actual
 *     `updatedAt` timestamp — a true event, not an invented one
 *
 * If neither exists, it says so plainly instead of inventing activity to
 * look busy.
 */

import { useReducedMotion, motion } from "framer-motion";
import { Panel, EmptyState } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { STAGGER, FADE_UP } from "@/lib/motion";
import { formatRelativeTime } from "@/lib/format-time";
import type { DashboardAlert } from "@/components/dashboard/alerts-card";
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
    <Panel title="Live Environmental Activity">
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Activity className="size-4" />}
          title="No significant environmental events detected."
        />
      ) : (
        <motion.div
          className="space-y-3"
          variants={STAGGER(0.06)}
          initial={prefersReduced ? false : "hidden"}
          animate="show"
        >
          {rows.map((row) => (
            <motion.div key={row.id} variants={FADE_UP} className="flex items-start gap-3 text-sm">
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums pt-px">
                {row.timeLabel}
              </span>
              <span
                aria-hidden
                className="mt-1.5 size-1.5 rounded-full shrink-0"
                style={{ background: TONE_COLOR[row.tone] }}
              />
              <div className="min-w-0">
                <div className="font-medium leading-snug flex items-center gap-1.5">
                  {row.tone === "critical" && (
                    <AlertTriangle className="size-3.5 text-[var(--color-destructive)] shrink-0" />
                  )}
                  {row.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{row.detail}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </Panel>
  );
}
