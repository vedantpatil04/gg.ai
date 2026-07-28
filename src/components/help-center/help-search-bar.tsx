import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Search, X, Clock, TrendingUp, ArrowRight, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Static data (UI only — no backend yet) ────────────────────────────────────

const SUGGESTED_SEARCHES = [
  "How to submit an environmental report",
  "Air quality index explained",
  "Reset my password",
  "Configure alert thresholds",
  "Export data as PDF",
];

const POPULAR_SEARCHES = [
  "AQI monitoring",
  "Complaint workflow",
  "Authority permissions",
  "Dashboard overview",
  "Mobile app setup",
];

const RECENT_SEARCHES: string[] = ["water quality alerts", "authority portal login"];

// ─── Global search modal ──────────────────────────────────────────────────────

interface HelpSearchBarProps {
  open: boolean;
  onClose: () => void;
}

export function HelpSearchBar({ open, onClose }: HelpSearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) onClose(); // caller toggles
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") onClose();
  };

  const filteredSuggestions = query
    ? SUGGESTED_SEARCHES.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : [];

  const showDropdown = focused || query.length > 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="search-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        key="search-modal"
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Search help articles, guides, tutorials…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              aria-label="Search help center"
              aria-autocomplete="list"
            />
            <div className="flex items-center gap-2 shrink-0">
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="size-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-[10px] border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close search"
              >
                ESC
              </button>
            </div>
          </div>

          {/* Results / suggestions panel */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Filtered suggestions */}
            {query && filteredSuggestions.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Suggestions
                </div>
                {filteredSuggestions.map((s) => (
                  <SearchResultRow key={s} label={s} />
                ))}
              </div>
            )}

            {/* No results */}
            {query && filteredSuggestions.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No results for <span className="font-medium text-foreground">"{query}"</span>
                <p className="text-xs mt-1 text-muted-foreground/70">
                  Full search functionality coming soon.
                </p>
              </div>
            )}

            {/* Recent searches */}
            {!query && RECENT_SEARCHES.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Recent
                  </span>
                </div>
                {RECENT_SEARCHES.map((s) => (
                  <SearchResultRow key={s} label={s} icon={<Clock className="size-3.5" />} />
                ))}
              </div>
            )}

            {/* Popular searches */}
            {!query && (
              <div className="p-2 border-t border-border">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <TrendingUp className="size-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Popular
                  </span>
                </div>
                {POPULAR_SEARCHES.map((s) => (
                  <SearchResultRow key={s} label={s} icon={<TrendingUp className="size-3.5" />} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/60">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="border border-border rounded px-1 font-mono">↵</kbd> to open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border border-border rounded px-1 font-mono">↑↓</kbd> to navigate
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="size-3" />
              <span>K to search</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Individual search result row ─────────────────────────────────────────────

function SearchResultRow({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 group text-left"
      tabIndex={0}
    >
      {icon ? (
        <span className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors shrink-0">
          {icon}
        </span>
      ) : (
        <Search className="size-3.5 text-muted-foreground/40 shrink-0" />
      )}
      <span className="flex-1 truncate">{label}</span>
      <ArrowRight className="size-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-150 shrink-0 -translate-x-1 group-hover:translate-x-0" />
    </button>
  );
}

// ─── Inline search bar (hero variant) ────────────────────────────────────────

interface InlineSearchBarProps {
  onFocus?: () => void;
  className?: string;
}

export function InlineSearchBar({ onFocus, className }: InlineSearchBarProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 cursor-text",
        "hover:border-primary/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10",
        "transition-all duration-200 group",
        className,
      )}
      onClick={onFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onFocus?.();
      }}
    >
      <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors duration-200" />
      <span className="flex-1 text-sm text-muted-foreground/60 select-none">
        Search help articles, guides, and tutorials…
      </span>
      <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/40 font-mono border border-border rounded px-1.5 py-0.5 shrink-0">
        ⌘K
      </div>
    </div>
  );
}
