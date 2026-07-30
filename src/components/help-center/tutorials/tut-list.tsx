import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, LayoutList, SlidersHorizontal, ChevronDown, Filter, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, EASE_OUT } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { TutSearchInput, TutGrid } from "./tut-ui";
import { TUT_CATEGORIES } from "./tut-data";
import type { TutDifficulty, TutFormat } from "./tut-data";
import {
  filterTutorials, DEFAULT_TUT_FILTER,
  type TutFilterState, type TutSortOption,
} from "./tut-search";

const SORT_OPTIONS: { value: TutSortOption; label: string }[] = [
  { value: "popular",  label: "Most Popular"       },
  { value: "newest",   label: "Newest First"        },
  { value: "alpha",    label: "Alphabetical"        },
  { value: "duration", label: "Shortest First"      },
  { value: "rating",   label: "Highest Rated"       },
];

const DIFFICULTIES: TutDifficulty[] = ["Beginner", "Intermediate", "Advanced"];
const FORMATS: { value: TutFormat; label: string }[] = [
  { value: "guide",       label: "Step-by-Step" },
  { value: "video",       label: "Video"        },
  { value: "interactive", label: "Interactive"  },
];

function SelectDropdown<T extends string>({
  value, options, onChange, placeholder, className,
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
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors cursor-pointer",
          !value && "text-muted-foreground",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

interface TutListPageProps {
  initialCategoryId?: string | null;
  initialQuery?: string;
  onTutorialClick: (id: string) => void;
}

export function TutListPage({ initialCategoryId, initialQuery, onTutorialClick }: TutListPageProps) {
  const [filters, setFilters] = useState<TutFilterState>({
    ...DEFAULT_TUT_FILTER,
    categoryId: initialCategoryId ?? null,
    query: initialQuery ?? "",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const results = useMemo(() => filterTutorials(filters), [filters]);
  const patch = (p: Partial<TutFilterState>) => setFilters(prev => ({ ...prev, ...p }));

  const catOptions = TUT_CATEGORIES.map(c => ({ value: c.id, label: c.title }));
  const diffOptions = DIFFICULTIES.map(d => ({ value: d, label: d }));
  const hasFilters = !!filters.categoryId || !!filters.difficulty || !!filters.format;
  const currentCat = TUT_CATEGORIES.find(c => c.id === filters.categoryId);

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
      >
        <SectionHeader
          eyebrow={currentCat?.title ?? "Browse"}
          title={currentCat ? `${currentCat.title} Tutorials` : "All Tutorials"}
          description="Search, filter, and explore every tutorial and guide"
          className="mb-6"
        />

        {/* Toolbar */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <TutSearchInput
              value={filters.query}
              onChange={q => patch({ query: q })}
              placeholder="Filter tutorials…"
              className="flex-1"
            />
            <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
              {(["grid", "list"] as const).map(mode => {
                const Icon = mode === "grid" ? LayoutGrid : LayoutList;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    className={cn(
                      "p-2.5 transition-colors duration-150",
                      viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                    aria-label={`${mode} view`}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
            <SelectDropdown value={filters.categoryId} options={catOptions} onChange={v => patch({ categoryId: v })} placeholder="All Categories" className="w-44" />
            <SelectDropdown value={filters.difficulty as TutDifficulty | null} options={diffOptions} onChange={v => patch({ difficulty: v as TutDifficulty })} placeholder="All Levels" className="w-36" />
            <SelectDropdown value={filters.format as TutFormat | null} options={FORMATS} onChange={v => patch({ format: v as TutFormat })} placeholder="All Formats" className="w-36" />
            <SelectDropdown value={filters.sort} options={SORT_OPTIONS} onChange={v => patch({ sort: v ?? "popular" })} placeholder="Sort by" className="w-40" />
            <div className="ml-auto text-[10px] text-muted-foreground">{results.length} tutorial{results.length !== 1 ? "s" : ""}</div>
          </div>

          <AnimatePresence>
            {hasFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 items-center overflow-hidden"
              >
                <Filter className="size-3 text-muted-foreground" />
                {filters.categoryId && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    {currentCat?.title ?? filters.categoryId}
                    <button onClick={() => patch({ categoryId: null })}><X className="size-3" /></button>
                  </span>
                )}
                {filters.difficulty && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    {filters.difficulty}
                    <button onClick={() => patch({ difficulty: null })}><X className="size-3" /></button>
                  </span>
                )}
                {filters.format && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    {FORMATS.find(f => f.value === filters.format)?.label ?? filters.format}
                    <button onClick={() => patch({ format: null })}><X className="size-3" /></button>
                  </span>
                )}
                <button onClick={() => setFilters(DEFAULT_TUT_FILTER)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1">
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {results.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={BookOpen}
                title="No tutorials found"
                description={filters.query ? `No tutorials match "${filters.query}". Try different keywords.` : "No tutorials match the selected filters."}
                action={
                  <button onClick={() => setFilters(DEFAULT_TUT_FILTER)} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors">
                    Clear filters
                  </button>
                }
              />
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TutGrid tutorials={results} onTutorialClick={onTutorialClick} variant={viewMode === "list" ? "horizontal" : "default"} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
