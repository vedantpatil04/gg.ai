/**
 * WorkspaceStats — session-local workspace usage statistics.
 * Shows total uploads, per-type counts, and average processing time.
 * No database. All stats derived from WorkspaceHistoryEntry[] passed as props.
 */
import { motion, useReducedMotion } from "framer-motion";
import { FileText, ImageIcon, BarChart3, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceHistoryEntry } from "./analysis-history";

interface WorkspaceStatsProps {
  history: WorkspaceHistoryEntry[];
}

export function WorkspaceStats({ history }: WorkspaceStatsProps) {
  const reduced = useReducedMotion();

  const docs   = history.filter(e => e.type === "document").length;
  const imgs   = history.filter(e => e.type === "image").length;
  const csvs   = history.filter(e => e.type === "data").length;
  const total  = history.length;
  const avgMs  = total === 0 ? 0
    : Math.round(history.reduce((s, e) => s + (e.durationMs ?? 0), 0) / total);

  const stats = [
    { label: "Total analyses", value: total,          icon: TrendingUp,  accent: "var(--color-primary)" },
    { label: "Documents",      value: docs,           icon: FileText,    accent: "var(--color-primary)" },
    { label: "Images",         value: imgs,           icon: ImageIcon,   accent: "var(--color-info)" },
    { label: "Datasets",       value: csvs,           icon: BarChart3,   accent: "var(--color-success)" },
    { label: "Avg. time",      value: avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : "—",
                                                       icon: Clock,       accent: "var(--color-warning)" },
  ];

  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Workspace Statistics · this session
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduced ? 0 : i * 0.06, ease: "easeOut" }}
              className="glass rounded-xl p-3 border border-border/60 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="size-5 rounded-md grid place-items-center"
                  style={{ background: `color-mix(in oklab, ${s.accent} 14%, transparent)` }}
                >
                  <Icon className="size-3" style={{ color: s.accent }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-xl font-semibold tabular-nums leading-none" style={{ color: s.accent }}>
                {s.value}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
