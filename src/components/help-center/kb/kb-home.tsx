import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Calendar,
  Eye,
  FileText,
  Layers,
  RefreshCw,
  Star,
  ChevronRight,
  X,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FADE_UP,
  STAGGER,
  FADE,
  DUR_MD,
  DUR_SM,
  EASE_OUT,
  HOVER_LIFT_SM,
  TAP_PRESS_SM,
} from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import {
  KbArticleCard,
  KbCategoryCard,
  SearchChips,
  KbSearchInput,
  DifficultyBadge,
} from "./kb-ui";
import {
  KB_CATEGORIES,
  KB_ARTICLES,
  KB_ARTICLES_BY_ID,
  POPULAR_SEARCH_CHIPS,
} from "./kb-data";
import { getFeaturedArticles } from "./kb-search";
import { useBookmarks, useReadingProgress } from "./kb-store";

// ─── Documentation statistics bar ─────────────────────────────────────────────

const DOC_STATS = [
  { value: "120+", label: "Articles", icon: FileText },
  { value: "12", label: "Categories", icon: Layers },
  { value: "40+", label: "Guides", icon: BookOpen },
  { value: "Weekly", label: "Updates", icon: RefreshCw },
];

// ─── 1. Hero ───────────────────────────────────────────────────────────────────

function KbHero({
  onSearch,
  onChipSelect,
}: {
  onSearch: (q: string) => void;
  onChipSelect: (q: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 size-80 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-56 rounded-full bg-info/4 blur-3xl" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative p-6 md:p-10">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <BookOpen className="size-3 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
              Documentation
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
            GreenGuard Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Comprehensive documentation for every role and feature on the GreenGuard AI platform. Find step-by-step guides, reference articles, and best practices.
          </p>

          {/* Search */}
          <div className="flex gap-2 mb-6">
            <KbSearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search documentation…"
              className="flex-1 text-sm"
              autoFocus={false}
            />
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => { if (query.trim()) onSearch(query.trim()); }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              Search
            </motion.button>
          </div>

          {/* Popular searches */}
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mr-3">
              Popular:
            </span>
            <SearchChips
              chips={POPULAR_SEARCH_CHIPS.slice(0, 6)}
              onSelect={onChipSelect}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 gap-4">
          {DOC_STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-base font-bold tabular-nums leading-none">{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 2. Browse categories ──────────────────────────────────────────────────────

function BrowseCategories({
  onCategoryClick,
}: {
  onCategoryClick: (id: string) => void;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="Browse"
        title="Documentation Categories"
        description="Every area of the platform, organised by topic"
        action={
          <button
            onClick={() => onCategoryClick("all")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            View all articles
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        }
      />
      <motion.div
        variants={STAGGER(0.04, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
      >
        {KB_CATEGORIES.map(cat => (
          <motion.div key={cat.id} variants={FADE_UP}>
            <KbCategoryCard
              category={cat}
              onClick={() => onCategoryClick(cat.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── 3. Featured articles ──────────────────────────────────────────────────────

function FeaturedArticles({
  onArticleClick,
}: {
  onArticleClick: (id: string) => void;
}) {
  const articles = getFeaturedArticles(4);

  return (
    <section>
      <SectionHeader
        eyebrow="Recommended"
        title="Featured Articles"
        description="Top documentation selected by the GreenGuard team"
        action={
          <button
            onClick={() => onArticleClick("list")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            Browse all
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        }
      />
      <motion.div
        variants={STAGGER(0.06, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
      >
        {articles.map(article => (
          <motion.div key={article.id} variants={FADE_UP}>
            <KbArticleCard
              article={article}
              onClick={() => onArticleClick(article.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── 4. Latest documentation (timeline) ───────────────────────────────────────

const TIMELINE_TYPE_STYLES = {
  feature: { label: "New Article", color: "var(--color-primary)" },
  update:  { label: "Updated",     color: "var(--color-info)" },
  fix:     { label: "Improved",    color: "var(--color-success)" },
} as const;
type TimelineType = keyof typeof TIMELINE_TYPE_STYLES;

interface TimelineEntry {
  id: string;
  title: string;
  category: string;
  date: string;
  type: TimelineType;
  articleId: string;
}

const TIMELINE_ENTRIES: TimelineEntry[] = [
  { id: "t1", title: "Smart Maps: Hazard Intelligence Layer Guide", category: "Smart Maps",            date: "Today",      type: "feature", articleId: "map-001" },
  { id: "t2", title: "AI Copilot Data Sources and Limitations",    category: "AI Copilot",            date: "Yesterday",  type: "update",  articleId: "ai-002"  },
  { id: "t3", title: "Configuring AQI Alert Thresholds",           category: "Environmental Monitoring", date: "2 days ago", type: "update",  articleId: "env-002" },
  { id: "t4", title: "Two-Factor Authentication Setup",            category: "Security",              date: "4 days ago", type: "fix",     articleId: "sec-001" },
  { id: "t5", title: "Authority Command Center Walkthrough",       category: "Authority Portal",      date: "5 days ago", type: "update",  articleId: "auth-001"},
];

function LatestDocumentation({
  onArticleClick,
}: {
  onArticleClick: (id: string) => void;
}) {
  return (
    <section>
      <SectionHeader eyebrow="Latest" title="Recently Updated" />
      <div className="rounded-xl border border-border bg-card p-4">
        <motion.div
          variants={STAGGER(0.07, 0.05)}
          initial="hidden"
          animate="show"
        >
          {TIMELINE_ENTRIES.map((entry, i) => {
            const style = TIMELINE_TYPE_STYLES[entry.type];
            const isLast = i === TIMELINE_ENTRIES.length - 1;
            return (
              <motion.div key={entry.id} variants={FADE_UP} className="flex gap-4">
                {/* Dot + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="size-2.5 rounded-full mt-1.5 shrink-0 ring-4 ring-offset-0"
                    style={{
                      background: style.color,
                      boxShadow: `0 0 0 4px color-mix(in oklab, ${style.color} 18%, transparent)`,
                    }}
                  />
                  {!isLast && <div className="w-px flex-1 bg-border/50 mt-1.5" />}
                </div>

                {/* Content */}
                <button
                  onClick={() => onArticleClick(entry.articleId)}
                  className={cn(
                    "text-left flex-1 min-w-0 hover:opacity-80 transition-opacity group",
                    !isLast ? "pb-5" : "pb-1",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: style.color,
                        background: `color-mix(in oklab, ${style.color} 12%, transparent)`,
                      }}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground">{entry.category}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors duration-150">
                    {entry.title}
                  </p>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ─── 5. Popular articles ───────────────────────────────────────────────────────

type PopularTab = "views" | "trending" | "bookmarked";

function PopularArticles({
  onArticleClick,
}: {
  onArticleClick: (id: string) => void;
}) {
  const [tab, setTab] = useState<PopularTab>("views");
  const { bookmarkedIds } = useBookmarks();

  const articles = useMemo(() => {
    const base = [...KB_ARTICLES];
    if (tab === "views")      return base.sort((a, b) => b.views - a.views).slice(0, 5);
    if (tab === "trending")   return base.sort((a, b) => b.views - a.views).reverse().slice(0, 5);
    if (tab === "bookmarked") return base.filter(a => bookmarkedIds.includes(a.id)).slice(0, 5);
    return base.slice(0, 5);
  }, [tab, bookmarkedIds]);

  const TABS: { id: PopularTab; label: string; icon: typeof TrendingUp }[] = [
    { id: "views",      label: "Most Viewed", icon: Eye       },
    { id: "trending",   label: "Trending",    icon: TrendingUp },
    { id: "bookmarked", label: "Bookmarked",  icon: Star       },
  ];

  return (
    <section>
      <SectionHeader eyebrow="Popular" title="Popular Articles" />

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl border border-border bg-muted/30 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {articles.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState
              icon={Bookmark}
              title="No bookmarks yet"
              description="Bookmark articles while reading to find them here quickly."
            />
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DUR_SM, ease: EASE_OUT }}
            className="space-y-2"
          >
            {articles.map((article, idx) => (
              <motion.button
                key={article.id}
                whileHover={HOVER_LIFT_SM}
                whileTap={TAP_PRESS_SM}
                onClick={() => onArticleClick(article.id)}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-200 text-left group"
              >
                {/* Rank */}
                <span className="text-lg font-bold tabular-nums text-muted-foreground/30 w-6 shrink-0 text-center">
                  {idx + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-150">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{article.categoryId.replace(/-/g, " ")}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye className="size-3" />{article.views.toLocaleString()}</span>
                    <span>·</span>
                    <DifficultyBadge difficulty={article.difficulty} />
                  </div>
                </div>

                <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── 6. Continue reading (progress rings) ─────────────────────────────────────

function ProgressRing({
  percent,
  size = 44,
  stroke = 3,
  color = "var(--color-primary)",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth={stroke}
      />
      {/* Progress */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 }}
      />
    </svg>
  );
}

function ContinueReading({
  onArticleClick,
}: {
  onArticleClick: (id: string) => void;
}) {
  const { inProgress, getProgress } = useReadingProgress();

  const articles = inProgress
    .map(p => ({ article: KB_ARTICLES_BY_ID[p.articleId], percent: p.percent }))
    .filter(({ article }) => !!article)
    .slice(0, 4);

  if (articles.length === 0) {
    return (
      <section>
        <SectionHeader eyebrow="In Progress" title="Continue Reading" />
        <EmptyState
          icon={BookOpen}
          title="Nothing in progress"
          description="Open any article to start tracking your reading progress here."
        />
      </section>
    );
  }

  return (
    <section>
      <SectionHeader eyebrow="In Progress" title="Continue Reading" />
      <div className="space-y-3">
        {articles.map(({ article, percent }) => {
          const readTime = parseInt(article.readTime) || 5;
          const remaining = Math.ceil(readTime * ((100 - percent) / 100));
          return (
            <motion.button
              key={article.id}
              variants={FADE_UP}
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => onArticleClick(article.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-200 text-left group"
            >
              {/* Progress ring */}
              <div className="relative shrink-0">
                <ProgressRing percent={percent} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold tabular-nums">{percent}%</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                  {article.categoryId.replace(/-/g, " ")}
                </div>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-150">
                  {article.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ~{remaining} min remaining
                </p>
              </div>

              <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

// ─── 7. Bookmarks ─────────────────────────────────────────────────────────────

function BookmarkedArticles({
  onArticleClick,
}: {
  onArticleClick: (id: string) => void;
}) {
  const { bookmarkedIds, toggleBookmark } = useBookmarks();

  const articles = bookmarkedIds
    .map(id => KB_ARTICLES_BY_ID[id])
    .filter(Boolean)
    .slice(0, 6);

  return (
    <section>
      <SectionHeader
        eyebrow="Saved"
        title="Bookmarked Articles"
        action={
          bookmarkedIds.length > 0 ? (
            <span className="text-[10px] text-muted-foreground">
              {bookmarkedIds.length} saved
            </span>
          ) : undefined
        }
      />

      {articles.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="No bookmarks yet"
          description="Click the bookmark icon on any article to save it for later."
        />
      ) : (
        <motion.div
          variants={STAGGER(0.05, 0.05)}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {articles.map(article => (
            <motion.div
              key={article.id}
              variants={FADE_UP}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card group"
            >
              <button
                onClick={() => onArticleClick(article.id)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-150">
                  {article.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{article.categoryId.replace(/-/g, " ")}</span>
                  <span>·</span>
                  <span>{article.readTime}</span>
                  <DifficultyBadge difficulty={article.difficulty} />
                </div>
              </button>
              <motion.button
                whileTap={TAP_PRESS_SM}
                onClick={() => toggleBookmark(article.id)}
                className="size-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
                aria-label="Remove bookmark"
              >
                <X className="size-3.5" />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

// ─── 8. Documentation footer ───────────────────────────────────────────────────

function DocumentationFooter({
  onCategoryClick,
}: {
  onCategoryClick: (id: string) => void;
}) {
  const topCategories = KB_CATEGORIES.slice(0, 6);

  return (
    <footer className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-lg aurora grid place-items-center">
              <BookOpen className="size-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Knowledge Base</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Official documentation for GreenGuard AI. Updated weekly by the platform team.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Circle className="size-1.5 fill-success text-success" />
            All systems operational
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
            Categories
          </div>
          <div className="space-y-1.5">
            {topCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                <ChevronRight className="size-3 shrink-0" />
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* Meta */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
            Documentation Stats
          </div>
          <div className="space-y-2">
            {[
              { label: "Total articles",   value: `${KB_ARTICLES.length}` },
              { label: "Categories",       value: `${KB_CATEGORIES.length}` },
              { label: "Last updated",     value: "Today"                  },
              { label: "Documentation v",  value: "2.4"                    },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root KB Home ──────────────────────────────────────────────────────────────

interface KbHomeProps {
  onSearch: (q: string) => void;
  onArticleClick: (id: string) => void;
  onCategoryClick: (id: string) => void;
}

export function KbHome({ onSearch, onArticleClick, onCategoryClick }: KbHomeProps) {
  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none space-y-10 pb-16">
      {/* 1. Hero */}
      <KbHero onSearch={onSearch} onChipSelect={onSearch} />

      {/* 2. Browse categories */}
      <BrowseCategories onCategoryClick={onCategoryClick} />

      {/* 3 + 4. Featured articles (wide) + Latest (narrow) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 xl:gap-10">
        <div className="xl:col-span-3">
          <FeaturedArticles onArticleClick={onArticleClick} />
        </div>
        <div className="xl:col-span-2">
          <LatestDocumentation onArticleClick={onArticleClick} />
        </div>
      </div>

      {/* 5. Popular articles (tabbed) */}
      <PopularArticles onArticleClick={onArticleClick} />

      {/* 6 + 7. Continue reading + Bookmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-10">
        <ContinueReading onArticleClick={onArticleClick} />
        <BookmarkedArticles onArticleClick={onArticleClick} />
      </div>

      {/* 8. Documentation footer */}
      <DocumentationFooter onCategoryClick={onCategoryClick} />
    </div>
  );
}
