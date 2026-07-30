import type { ComponentType, ReactNode } from "react";
import { Bookmark, BookmarkCheck, Clock, Eye, ChevronRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HOVER_LIFT_SM, TAP_PRESS_SM, FADE_UP, STAGGER } from "@/lib/motion";
import type { KbArticle, KbCategory, Difficulty } from "./kb-data";
import { DIFFICULTY_COLOR } from "./kb-data";
import { useBookmarks } from "./kb-store";

// ─── Difficulty badge ─────────────────────────────────────────────────────────

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <span
      className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", className)}
      style={{
        color: DIFFICULTY_COLOR[difficulty],
        background: `color-mix(in oklab, ${DIFFICULTY_COLOR[difficulty]} 12%, transparent)`,
      }}
    >
      {difficulty}
    </span>
  );
}

// ─── Bookmark button ──────────────────────────────────────────────────────────

export function BookmarkButton({
  articleId,
  className,
  size = "md",
}: {
  articleId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const saved = isBookmarked(articleId);
  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <motion.button
      whileTap={TAP_PRESS_SM}
      onClick={e => {
        e.stopPropagation();
        toggleBookmark(articleId);
      }}
      aria-label={saved ? "Remove bookmark" : "Bookmark article"}
      className={cn(
        "rounded-lg flex items-center justify-center transition-colors duration-200",
        size === "sm" ? "size-7" : "size-8",
        saved
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/50 hover:text-foreground hover:bg-muted",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </motion.button>
  );
}

// ─── KB Article Card — full variant ──────────────────────────────────────────

interface KbArticleCardProps {
  article: KbArticle;
  onClick: () => void;
  variant?: "default" | "compact" | "horizontal";
}

export function KbArticleCard({ article, onClick, variant = "default" }: KbArticleCardProps) {
  if (variant === "horizontal") {
    return (
      <motion.div
        whileHover={HOVER_LIFT_SM}
        whileTap={TAP_PRESS_SM}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
        className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/20 transition-all duration-200 group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {article.categoryId.replace(/-/g, " ")}
            </span>
            <DifficultyBadge difficulty={article.difficulty} />
          </div>
          <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors duration-200 mb-1">
            {article.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{article.excerpt}</p>
          <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1"><Clock className="size-3" />{article.readTime}</span>
            <span className="flex items-center gap-1"><Eye className="size-3" />{article.views.toLocaleString()}</span>
            <span>Updated {article.updatedAt}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <BookmarkButton articleId={article.id} size="sm" />
          <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
        </div>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        whileHover={HOVER_LIFT_SM}
        whileTap={TAP_PRESS_SM}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors duration-150"
      >
        <div className="size-1.5 rounded-full bg-primary/40 shrink-0 mt-0.5" />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-150 flex-1 line-clamp-1">
          {article.title}
        </span>
        <span className="text-[10px] text-muted-foreground/60 shrink-0">{article.readTime}</span>
      </motion.div>
    );
  }

  // default card
  return (
    <motion.div
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/20 transition-all duration-200 group relative overflow-hidden"
    >
      <div className="absolute -bottom-8 -right-8 size-28 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none" />
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {article.categoryId.replace(/-/g, " ")}
          </span>
          <DifficultyBadge difficulty={article.difficulty} />
        </div>
        <BookmarkButton articleId={article.id} size="sm" />
      </div>
      <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors duration-200 mb-1.5">
        {article.title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{article.excerpt}</p>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
        <span className="flex items-center gap-1"><Clock className="size-3" />{article.readTime}</span>
        <span className="flex items-center gap-1"><Eye className="size-3" />{article.views.toLocaleString()} views</span>
        <span className="ml-auto">Updated {article.updatedAt}</span>
      </div>
    </motion.div>
  );
}

// ─── KB Category Card — extended version with article count + last updated ────

interface KbCategoryCardProps {
  category: KbCategory;
  onClick: () => void;
}

export function KbCategoryCard({ category, onClick }: KbCategoryCardProps) {
  const Icon = category.icon;
  return (
    <motion.div
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-all duration-200 overflow-hidden group relative"
    >
      <div
        className="absolute -bottom-8 -right-8 size-28 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 pointer-events-none"
        style={{ background: category.accentColor }}
      />
      <div
        className="size-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `color-mix(in oklab, ${category.accentColor} 12%, transparent)` }}
      >
        <Icon className="size-5" style={{ color: category.accentColor }} />
      </div>
      <h3 className="text-sm font-semibold leading-tight mb-1">{category.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{category.description}</p>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
        <span>{category.articleCount} articles</span>
        <span>Updated {category.lastUpdated}</span>
      </div>
    </motion.div>
  );
}

// ─── Popular search chips ─────────────────────────────────────────────────────

export function SearchChips({
  chips,
  onSelect,
}: {
  chips: string[];
  onSelect: (chip: string) => void;
}) {
  return (
    <motion.div
      variants={STAGGER(0.04, 0.05)}
      initial="hidden"
      animate="show"
      className="flex flex-wrap gap-2"
    >
      {chips.map(chip => (
        <motion.button
          key={chip}
          variants={FADE_UP}
          whileHover={HOVER_LIFT_SM}
          whileTap={TAP_PRESS_SM}
          onClick={() => onSelect(chip)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/50 transition-all duration-200"
        >
          <Search className="size-3 opacity-60" />
          {chip}
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─── Article list with stagger ────────────────────────────────────────────────

export function ArticleGrid({
  articles,
  onArticleClick,
  variant = "default",
  emptySlot,
}: {
  articles: KbArticle[];
  onArticleClick: (id: string) => void;
  variant?: "default" | "horizontal";
  emptySlot?: ReactNode;
}) {
  if (articles.length === 0) return <>{emptySlot}</>;

  const isHorizontal = variant === "horizontal";

  return (
    <motion.div
      variants={STAGGER(0.05, 0.05)}
      initial="hidden"
      animate="show"
      className={cn(
        isHorizontal
          ? "space-y-3"
          : "grid grid-cols-1 sm:grid-cols-2 gap-4",
      )}
    >
      {articles.map(article => (
        <motion.div key={article.id} variants={FADE_UP}>
          <KbArticleCard
            article={article}
            onClick={() => onArticleClick(article.id)}
            variant={variant}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Reading progress bar ─────────────────────────────────────────────────────

export function ReadingProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Reading progress: ${percent}%`}
    >
      <motion.div
        className="h-full aurora"
        initial={{ width: "0%" }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.2, ease: "linear" }}
      />
    </div>
  );
}

// ─── Section loading skeleton ─────────────────────────────────────────────────

export function KbSkeleton({ variant = "card", rows = 3 }: { variant?: "card" | "article"; rows?: number }) {
  if (variant === "article") {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl mx-auto p-6">
        <div className="h-4 skeleton rounded w-1/4" />
        <div className="h-8 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-1/3" />
        <div className="h-px bg-border my-6" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("h-4 skeleton rounded", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-3 skeleton rounded w-1/4" />
          <div className="h-4 skeleton rounded w-3/4" />
          <div className="h-3 skeleton rounded w-full" />
          <div className="h-3 skeleton rounded w-2/3" />
          <div className="flex gap-3 mt-2">
            <div className="h-3 skeleton rounded w-16" />
            <div className="h-3 skeleton rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Table of Contents ────────────────────────────────────────────────────────

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({
  items,
  activeId,
  onItemClick,
}: {
  items: TocItem[];
  activeId: string | null;
  onItemClick: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="space-y-1">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
        On this page
      </div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          className={cn(
            "w-full text-left text-xs py-1 px-2 rounded-md transition-all duration-150 leading-snug",
            item.level === 3 && "pl-4",
            activeId === item.id
              ? "text-primary font-medium bg-primary/8"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}

// ─── KB Search bar (inline, KB-specific) ─────────────────────────────────────

export function KbSearchInput({
  value,
  onChange,
  placeholder = "Search articles…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5",
        "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10",
        "transition-all duration-200 group",
        className,
      )}
    >
      <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors duration-200" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="size-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
          aria-label="Clear search"
        >
          <span className="text-[10px] text-muted-foreground">✕</span>
        </button>
      )}
    </div>
  );
}
