/**
 * RecentWorkspace — recently analyzed files panel.
 * Desktop: right sidebar inside the workspace layout.
 * Mobile: compact list that collapses via a toggle button.
 * No database — session-local WorkspaceHistoryEntry[] from copilot.tsx.
 */
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FileText, ImageIcon, BarChart3, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceHistoryEntry } from "./analysis-history";
import type { WorkspaceTab } from "./workspace-tabs";

const TYPE_CONFIG: Record<Exclude<WorkspaceTab, "chat">, { icon: typeof FileText; accent: string }> = {
  documents: { icon: FileText,   accent: "var(--color-primary)" },
  images:    { icon: ImageIcon,  accent: "var(--color-info)" },
  data:      { icon: BarChart3,  accent: "var(--color-success)" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface RecentWorkspaceProps {
  history:  WorkspaceHistoryEntry[];
  onReopen: (entry: WorkspaceHistoryEntry) => void;
}

export function RecentWorkspace({ history, onReopen }: RecentWorkspaceProps) {
  const reduced    = useReducedMotion();
  const [open, setOpen] = useState(false);
  const recent     = history.slice(0, 6);

  if (history.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent</div>
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <Clock className="size-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No workspace activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header — acts as toggle on mobile */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border/50 md:cursor-default md:pointer-events-none"
        aria-expanded={open}
        aria-controls="recent-list"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3" />
          Recent · {history.length} {history.length === 1 ? "analysis" : "analyses"}
        </div>
        <span className="md:hidden text-muted-foreground">
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </span>
      </button>

      {/* List — always visible on md+, collapsible on mobile */}
      <div className={cn("hidden md:block")} id="recent-list">
        <RecentList recent={recent} onReopen={onReopen} reduced={!!reduced} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
          >
            <RecentList recent={recent} onReopen={onReopen} reduced={!!reduced} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecentList({ recent, onReopen, reduced }: {
  recent: WorkspaceHistoryEntry[];
  onReopen: (e: WorkspaceHistoryEntry) => void;
  reduced: boolean;
}) {
  return (
    <ul className="divide-y divide-border/40">
      {recent.map((entry, i) => {
        const cfg  = TYPE_CONFIG[entry.type];
        const Icon = cfg.icon;
        return (
          <motion.li
            key={entry.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0 : 0.18, delay: reduced ? 0 : i * 0.04 }}
          >
            <button
              onClick={() => onReopen(entry)}
              className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-muted/30 transition-colors group text-left"
              aria-label={`Reopen ${entry.fileName}`}
            >
              <div
                className="size-7 rounded-lg grid place-items-center shrink-0"
                style={{ background: `color-mix(in oklab, ${cfg.accent} 14%, transparent)` }}
              >
                <Icon className="size-3.5" style={{ color: cfg.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate group-hover:text-foreground transition-colors text-muted-foreground">
                  {entry.fileName}
                </div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {entry.mode} · {relativeTime(entry.analyzedAt)}
                </div>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                style={{ background: `color-mix(in oklab, ${cfg.accent} 12%, transparent)`, color: cfg.accent }}
              >
                Open
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
