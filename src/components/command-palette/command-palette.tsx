/**
 * Phase 6 — Enterprise Command Palette & Quick Navigation
 *
 * Fast keyboard-driven navigation across GreenGuard AI.
 *
 * Features
 * ─────────
 *  • ⌘K / Ctrl+K global shortcut (and Escape to close)
 *  • Built on the existing `cmdk` library (already in project)
 *  • Searches all navigation items from the sidebar nav data
 *    (imported via ALL_NAV_GROUPS from app-layout — single source of truth)
 *  • Permission-filtered: only shows pages the current user can access
 *  • Recent pages  — persisted to localStorage "gg-cmd-recent" (max 5)
 *  • Grouped results: Recent · Workspace · AI Intelligence · Community ·
 *    Operations · Administration · Account
 *  • Mobile: full-screen Drawer (vaul); desktop/tablet: centered Dialog
 *  • Framer-motion backdrop + panel entrance; respects prefers-reduced-motion
 *
 * Architecture notes
 * ──────────────────
 *  • This component does NOT duplicate any nav data — it imports
 *    ALL_NAV_GROUPS exported from app-layout.tsx.
 *  • Navigation uses `useNavigate` from @tanstack/react-router — same as
 *    every other navigation action in the project.
 *  • The `openCommandPalette` / `useCommandPalette` context is the single
 *    integration point for the navbar search pill and future callers.
 *
 * Future-compatibility hooks
 * ──────────────────────────
 *  The COMMAND_GROUPS array can be extended with new sections (AI Commands,
 *  Report Search, City Search, etc.) without modifying this file's structure.
 *  Each group just adds an entry to COMMAND_GROUPS with its own items array.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
  type ComponentType,
} from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Clock, Hash } from "lucide-react";
import { ALL_NAV_GROUPS } from "@/components/app-layout";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommandEntry {
  id: string;
  label: string;
  /** Section label shown in grouped results */
  group: string;
  /** Route path to navigate to */
  to: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional kbd shortcut hint shown on the right */
  shortcut?: string;
  /** Restrict to authenticated users with these roles */
  roles?: UserRole[];
  /** Allow unauthenticated users */
  public?: boolean;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const RECENT_KEY = "gg-cmd-recent";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(to: string) {
  try {
    const prev = readRecent();
    const next = [to, ...prev.filter((p) => p !== to)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

// ─── Palette context — single open/close control point ───────────────────────

interface PaletteCtx {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

const PaletteContext = createContext<PaletteCtx>({
  open: false,
  openPalette: () => {},
  closePalette: () => {},
});

export function useCommandPalette() {
  return useContext(PaletteContext);
}

// ─── Provider — wrap around AppLayout children ────────────────────────────────

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPalette  = useCallback(() => setOpen(true),  []);
  const closePalette = useCallback(() => setOpen(false), []);

  // Global Ctrl+K / ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, openPalette, closePalette }}>
      {children}
      <CommandPalette open={open} onClose={closePalette} />
    </PaletteContext.Provider>
  );
}

// ─── Build command entries from nav data ──────────────────────────────────────
// Single source of truth: ALL_NAV_GROUPS exported from app-layout.tsx.
// The same icons, labels, routes, and permission flags used by the sidebar.

function buildEntries(
  isAuthenticated: boolean,
  role: UserRole | undefined,
): CommandEntry[] {
  const entries: CommandEntry[] = [];

  for (const group of ALL_NAV_GROUPS) {
    for (const item of group.items) {
      // Permission check mirrors isNavItemVisible in app-layout.tsx
      if (!item.public) {
        if (!isAuthenticated) continue;
        if (item.roles && !(role && item.roles.includes(role))) continue;
      }
      entries.push({
        id:    item.to,
        label: item.label,
        group: group.label,
        to:    item.to,
        icon:  item.icon,
        roles: item.roles,
        public: item.public,
      });
    }
  }

  return entries;
}

// Fuzzy match: returns true if all chars of `query` appear in order in `text`
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

// ─── CommandPalette ───────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const isMobile       = useIsMobile();
  const prefersReduced = useReducedMotion();
  const navigate       = useNavigate();
  const pathname       = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAuthenticated } = useAuth();

  const [query, setQuery] = useState("");
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refresh recents on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setRecentPaths(readRecent());
      // Auto-focus handled by cmdk CommandInput
    }
  }, [open]);

  // All navigable entries (permission-filtered)
  const allEntries = buildEntries(isAuthenticated, user?.role);

  // Entries keyed by route for O(1) lookup
  const entryByPath = Object.fromEntries(allEntries.map((e) => [e.to, e]));

  // Recent entries (filter to still-accessible pages, exclude current page)
  const recentEntries = recentPaths
    .map((p) => entryByPath[p])
    .filter((e): e is CommandEntry => !!e && e.to !== pathname);

  // Filtered entries for search
  const isSearching = query.trim().length > 0;
  const filteredEntries = isSearching
    ? allEntries.filter((e) => fuzzyMatch(e.label, query) || fuzzyMatch(e.group, query))
    : [];

  // Group filtered results
  const groupedFiltered = filteredEntries.reduce<Record<string, CommandEntry[]>>((acc, e) => {
    if (!acc[e.group]) acc[e.group] = [];
    acc[e.group].push(e);
    return acc;
  }, {});

  const handleSelect = useCallback(
    (entry: CommandEntry) => {
      pushRecent(entry.to);
      onClose();
      navigate({ to: entry.to as Parameters<typeof navigate>[0]["to"] });
    },
    [navigate, onClose],
  );

  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const kbdHint = isMac ? "⌘K" : "Ctrl K";

  const paletteContent = (
    <Command
      className="flex flex-col h-full"
      shouldFilter={false} // we handle filtering ourselves for fuzzy match
      loop
    >
      {/* Search input */}
      <div className="flex items-center border-b border-border px-3 shrink-0">
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder="Search pages, sections…"
          className="h-12 text-sm flex-1 bg-transparent outline-none border-0 ring-0 focus:ring-0 placeholder:text-muted-foreground/60"
          aria-label="Command palette search"
        />
        <kbd className="hidden sm:flex items-center gap-0.5 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70 shrink-0 ml-2">
          Esc
        </kbd>
      </div>

      {/* Results */}
      <CommandList className="flex-1 overflow-y-auto max-h-[min(480px,70dvh)] py-2">
        {/* Empty state */}
        {isSearching && filteredEntries.length === 0 && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Hash className="size-8 opacity-30" />
              <p className="text-sm font-medium">No matching pages</p>
              <p className="text-xs opacity-70">Try a different search term</p>
            </div>
          </CommandEmpty>
        )}

        {/* Search results — grouped */}
        {isSearching &&
          Object.entries(groupedFiltered).map(([groupLabel, entries], gi) => (
            <CommandGroup key={groupLabel} heading={groupLabel}>
              {gi > 0 && <CommandSeparator />}
              {entries.map((entry) => (
                <PaletteItem
                  key={entry.id}
                  entry={entry}
                  onSelect={() => handleSelect(entry)}
                  isActive={pathname === entry.to}
                />
              ))}
            </CommandGroup>
          ))}

        {/* Default state — recents + suggested */}
        {!isSearching && (
          <>
            {recentEntries.length > 0 && (
              <CommandGroup heading="Recent">
                {recentEntries.map((entry) => (
                  <PaletteItem
                    key={entry.id}
                    entry={entry}
                    onSelect={() => handleSelect(entry)}
                    isActive={false}
                    showRecent
                  />
                ))}
              </CommandGroup>
            )}

            {recentEntries.length > 0 && <CommandSeparator />}

            {/* All pages grouped by section */}
            {Object.entries(
              allEntries.reduce<Record<string, CommandEntry[]>>((acc, e) => {
                if (!acc[e.group]) acc[e.group] = [];
                acc[e.group].push(e);
                return acc;
              }, {}),
            ).map(([groupLabel, entries]) => (
              <CommandGroup key={groupLabel} heading={groupLabel}>
                {entries.map((entry) => (
                  <PaletteItem
                    key={entry.id}
                    entry={entry}
                    onSelect={() => handleSelect(entry)}
                    isActive={pathname === entry.to}
                  />
                ))}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground/60 shrink-0">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono">↑↓</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono">↵</kbd>
          Open
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono">Esc</kbd>
          Close
        </span>
        <span className="ml-auto opacity-50">{kbdHint} to toggle</span>
      </div>
    </Command>
  );

  // ── Mobile: vaul Drawer (bottom sheet) ───────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent className="flex flex-col max-h-[92dvh] p-0">
          {paletteContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop/tablet: centered modal with framer-motion backdrop + panel ───
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.15 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
            <motion.div
              key="palette-panel"
              initial={prefersReduced ? false : { opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{
                duration: prefersReduced ? 0 : 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "pointer-events-auto w-full max-w-lg",
                "rounded-2xl border border-border",
                "bg-background shadow-2xl",
                "overflow-hidden flex flex-col",
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
              }}
            >
              {paletteContent}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── PaletteItem ──────────────────────────────────────────────────────────────

interface PaletteItemProps {
  entry: CommandEntry;
  onSelect: () => void;
  isActive: boolean;
  showRecent?: boolean;
}

function PaletteItem({ entry, onSelect, isActive, showRecent }: PaletteItemProps) {
  const Icon = entry.icon;

  return (
    <CommandItem
      value={`${entry.group} ${entry.label}`}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer mx-1",
        "transition-colors duration-100",
        "aria-selected:bg-accent aria-selected:text-accent-foreground",
        isActive && "text-primary",
      )}
      aria-label={`Navigate to ${entry.label}`}
    >
      {/* Icon */}
      <div
        className={cn(
          "size-8 rounded-lg border flex items-center justify-center shrink-0",
          isActive
            ? "bg-primary/10 border-primary/20 text-primary"
            : "bg-muted/50 border-border/50 text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
      </div>

      {/* Label + group */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-tight", isActive && "text-primary")}>
          {entry.label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{entry.group}</p>
      </div>

      {/* Right side */}
      <div className="shrink-0 flex items-center gap-1.5">
        {isActive && (
          <span className="text-[9px] font-medium text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
            Current
          </span>
        )}
        {showRecent && !isActive && (
          <Clock className="size-3 text-muted-foreground/50" />
        )}
        {entry.shortcut && (
          <kbd className="text-[9px] font-mono text-muted-foreground/60 border border-border bg-muted/60 rounded px-1.5 py-0.5">
            {entry.shortcut}
          </kbd>
        )}
      </div>
    </CommandItem>
  );
}
