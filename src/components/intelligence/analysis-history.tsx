/**
 * AnalysisHistory — searchable, filterable, sortable analysis history.
 * History is session-local (WorkspaceHistoryEntry[] managed in copilot.tsx).
 * No database, no backend changes.
 *
 * Features: search, filter by type, sort by date, delete, pin.
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FileText, ImageIcon, BarChart3, Trash2, Pin, Search, Clock, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "./workspace-tabs";

// ─── Shared type (imported by copilot.tsx) ────────────────────────────────────

export interface WorkspaceHistoryEntry {
  id:         string;
  type:       Exclude<WorkspaceTab, "chat">;
  fileName:   string;
  mode:       string;
  resultSnippet: string;   // first 120 chars of AI result
  analyzedAt: string;      // ISO timestamp
  durationMs?: number;     // processing time
  pinned?:    boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<Exclude<WorkspaceTab, "chat">, { icon: typeof FileText; label: string; accent: string }> = {
  documents: { icon: FileText,   label: "Document", accent: "var(--color-primary)" },
  images:    { icon: ImageIcon,  label: "Image",    accent: "var(--color-info)" },
  data:      { icon: BarChart3,  label: "Dataset",  accent: "var(--color-success)" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AnalysisHistoryProps {
  history:   WorkspaceHistoryEntry[];
  onDelete:  (id: string) => void;
  onPin:     (id: string) => void;
  onReopen:  (entry: WorkspaceHistoryEntry) => void;
}

export function AnalysisHistory({ history, onDelete, onPin, onReopen }: AnalysisHistoryProps) {
  const reduced = useReducedMotion();

  const [query,      setQuery]  = useState("");
  const [filterType, setFilter] = useState<Exclude<WorkspaceTab, "chat"> | "all">("all");
  const [sortOrder,  setSort]   = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    let list = [...history];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(e => e.fileName.toLowerCase().includes(q) || e.resultSnippet.toLowerCase().includes(q));
    }
    if (filterType !== "all") list = list.filter(e => e.type === filterType);
    list.sort((a, b) => {
      const diff = new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
    // Pinned items first
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return list;
  }, [history, query, filterType, sortOrder]);

  const handleClear = useCallback(() => setQuery(""), []);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="size-10 rounded-xl glass grid place-items-center">
          <Clock className="size-4 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">No analysis history yet</div>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Analyse a document, image, or dataset to build your history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search history…"
          aria-label="Search analysis history"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-muted/30 border border-border rounded-xl pl-8 pr-8 py-2 text-xs outline-none focus:border-primary/50 transition-colors"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {(["all", "documents", "images", "data"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            aria-pressed={filterType === t}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full border capitalize transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              filterType === t
                ? "aurora text-primary-foreground border-transparent"
                : "glass text-muted-foreground border-border/60 hover:text-foreground",
            )}
          >
            {t === "all" ? "All" : t === "data" ? "Datasets" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={sortOrder}
            onChange={e => setSort(e.target.value as "newest" | "oldest")}
            aria-label="Sort order"
            className="text-[10px] bg-muted/30 border border-border rounded-lg px-2 py-1 outline-none focus:border-primary/50 transition-colors"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* History list */}
      <AnimatePresence initial={false}>
        {filtered.length === 0 ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center py-4">
            No results match your search.
          </motion.p>
        ) : (
          <motion.div className="space-y-1.5">
            {filtered.map((entry, i) => {
              const cfg  = TYPE_CONFIG[entry.type];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8, height: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : i * 0.03 }}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3 group",
                    "hover:border-primary/30 transition-colors",
                    entry.pinned ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/4" : "border-border",
                  )}
                >
                  {/* Icon */}
                  <div
                    className="size-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
                    style={{ background: `color-mix(in oklab, ${cfg.accent} 14%, transparent)` }}
                  >
                    <Icon className="size-3.5" style={{ color: cfg.accent }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{entry.fileName}</span>
                      {entry.pinned && <Pin className="size-2.5 text-[var(--color-warning)] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span style={{ color: cfg.accent }}>{cfg.label}</span>
                      <span>·</span>
                      <span>{entry.mode}</span>
                      <span>·</span>
                      <span>{relativeTime(entry.analyzedAt)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{entry.resultSnippet}</p>
                  </div>

                  {/* Actions — show on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => onReopen(entry)}
                      className="text-[10px] px-2 py-1 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Reopen ${entry.fileName}`}
                      title="Quick reopen"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onPin(entry.id)}
                      className={cn(
                        "p-1 rounded-lg transition-colors",
                        entry.pinned ? "text-[var(--color-warning)]" : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-label={entry.pinned ? "Unpin" : "Pin"}
                      title={entry.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className="size-3" />
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-[var(--color-destructive)] transition-colors"
                      aria-label={`Delete ${entry.fileName}`}
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
