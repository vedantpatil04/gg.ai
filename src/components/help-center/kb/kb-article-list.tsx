import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  LayoutList,
  ChevronDown,
  Filter,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, EASE_OUT } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { KbSearchInput, ArticleGrid } from "./kb-ui";
import { KB_CATEGORIES } from "./kb-data";
import type { Difficulty } from "./kb-data";
import {
  filterArticles,
  DEFAULT_FILTER_STATE,
  type KbFilterState,
  type SortOption,
} from "./kb-search";
import { BookOpen } from "lucide-react";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "updated", label: "Recently Updated" },
  { value: "alpha", label: "Alphabetical" },
  { value: "readtime", label: "Read Time" },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onRemove,
}: {
  label: string;
  active: boolean;
  onRemove: () => void;
}) {
  if (!active) return null;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
    >
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`}>
        <X className="size-3" />
      </button>
    </motion.span>
  );
}

// ─── Select dropdown (native, accessible) ─────────────────────────────────────

function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value ?? ""}
        onChange={e => onChange((e.target.value as T) || null)}
        className={cn(
          "appearance-none w-full pl-3 pr-8 py-2 text-xs rounded-lg border border-border bg-card text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
          "transition-colors duration-150 cursor-pointer",
          !value && "text-muted-foreground",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  filters: KbFilterState;
  onFiltersChange: (f: Partial<KbFilterState>) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (v: "grid" | "list") => void;
  resultCount: number;
}

function ArticleListToolbar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  resultCount,
}: ToolbarProps) {
  const categoryOptions = KB_CATEGORIES.map(c => ({ value: c.id, label: c.title }));
  const difficultyOptions = DIFFICULTY_OPTIONS.map(d => ({ value: d, label: d }));

  const hasActiveFilters = !!filters.categoryId || !!filters.difficulty;

  return (
    <div className="space-y-3">
      {/* Row 1: search + view toggle */}
      <div className="flex gap-2">
        <KbSearchInput
          value={filters.query}
          onChange={q => onFiltersChange({ query: q })}
          placeholder="Filter articles…"
          className="flex-1"
        />
        <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => onViewModeChange("grid")}
            aria-pressed={viewMode === "grid"}
            className={cn(
              "p-2.5 transition-colors duration-150",
              viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            aria-pressed={viewMode === "list"}
            className={cn(
              "p-2.5 transition-colors duration-150",
              viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="List view"
          >
            <LayoutList className="size-4" />
          </button>
        </div>
      </div>

      {/* Row 2: filters + sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
        <SelectDropdown
          value={filters.categoryId}
          options={categoryOptions}
          onChange={v => onFiltersChange({ categoryId: v })}
          placeholder="All Categories"
          className="w-44"
        />
        <SelectDropdown
          value={filters.difficulty as Difficulty | null}
          options={difficultyOptions}
          onChange={v => onFiltersChange({ difficulty: v as Difficulty })}
          placeholder="All Levels"
          className="w-36"
        />
        <SelectDropdown
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={v => onFiltersChange({ sort: v ?? "popular" })}
          placeholder="Sort by"
          className="w-44"
        />

        <div className="ml-auto text-[10px] text-muted-foreground">
          {resultCount} article{resultCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="size-3 text-muted-foreground" />
            {filters.categoryId && (
              <FilterChip
                label={KB_CATEGORIES.find(c => c.id === filters.categoryId)?.title ?? filters.categoryId}
                active
                onRemove={() => onFiltersChange({ categoryId: null })}
              />
            )}
            {filters.difficulty && (
              <FilterChip
                label={filters.difficulty}
                active
                onRemove={() => onFiltersChange({ difficulty: null })}
              />
            )}
            <button
              onClick={() => onFiltersChange({ categoryId: null, difficulty: null, query: "" })}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Article list page ────────────────────────────────────────────────────────

interface KbArticleListProps {
  initialCategoryId?: string | null;
  initialQuery?: string;
  onArticleClick: (id: string) => void;
}

export function KbArticleList({
  initialCategoryId,
  initialQuery,
  onArticleClick,
}: KbArticleListProps) {
  const [filters, setFilters] = useState<KbFilterState>({
    ...DEFAULT_FILTER_STATE,
    categoryId: initialCategoryId ?? null,
    query: initialQuery ?? "",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const results = useMemo(() => filterArticles(filters), [filters]);

  const patchFilters = (patch: Partial<KbFilterState>) =>
    setFilters(prev => ({ ...prev, ...patch }));

  const currentCategoryTitle = KB_CATEGORIES.find(c => c.id === filters.categoryId)?.title;

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
      >
        <SectionHeader
          eyebrow={currentCategoryTitle ?? "Browse"}
          title={currentCategoryTitle ? `${currentCategoryTitle} Articles` : "All Articles"}
          description="Search, filter, and explore every article in the knowledge base"
          className="mb-6"
        />

        <ArticleListToolbar
          filters={filters}
          onFiltersChange={patchFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          resultCount={results.length}
        />
      </motion.div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {results.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                icon={BookOpen}
                title="No articles found"
                description={
                  filters.query
                    ? `No articles match "${filters.query}". Try different keywords or clear the filters.`
                    : "No articles match the selected filters."
                }
                action={
                  <button
                    onClick={() => setFilters(DEFAULT_FILTER_STATE)}
                    className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                  >
                    Clear filters
                  </button>
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArticleGrid
                articles={results}
                onArticleClick={onArticleClick}
                variant={viewMode === "list" ? "horizontal" : "default"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
