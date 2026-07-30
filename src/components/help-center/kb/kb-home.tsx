import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Eye,
  FileText,
  Layers,
  RefreshCw,
  Star,
  ChevronRight,
  X,
  Circle,
  Search,
  ShieldCheck,
  History,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FADE_UP,
  STAGGER,
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
  BookmarkButton,
} from "./kb-ui";
import {
  KB_CATEGORIES,
  KB_ARTICLES,
  KB_ARTICLES_BY_ID,
  POPULAR_SEARCH_CHIPS,
} from "./kb-data";
import { getFeaturedArticles, getSuggestions } from "./kb-search";
import { useBookmarks, useReadingProgress, useRecentlyViewed } from "./kb-store";

// ─── Enterprise Statistics Data ───────────────────────────────────────────────

const ENTERPRISE_DOC_STATS = [
  {
    value: "124",
    label: "Total Articles",
    subtext: "Across 13 core modules",
    icon: FileText,
    color: "var(--color-primary)",
  },
  {
    value: "14",
    label: "Categories",
    subtext: "Platform & role topics",
    icon: Layers,
    color: "var(--color-info)",
  },
  {
    value: "52",
    label: "Guides",
    subtext: "Step-by-step walkthroughs",
    icon: BookOpen,
    color: "var(--color-warning)",
  },
  {
    value: "Daily",
    label: "Updated",
    subtext: "Continuous platform syncing",
    icon: RefreshCw,
    color: "var(--color-success)",
  },
];

// ─── 1. Hero Section ──────────────────────────────────────────────────────────

function KbHero({
  onSearch,
  onBrowseClick,
  onCategoryClick,
}: {
  onSearch: (q: string) => void;
  onBrowseClick: () => void;
  onCategoryClick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { recentIds } = useRecentlyViewed();

  const suggestions = useMemo(() => getSuggestions(query, 4), [query]);

  const recentArticles = useMemo(
    () => recentIds.map((id) => KB_ARTICLES_BY_ID[id]).filter(Boolean).slice(0, 3),
    [recentIds],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-3xl border border-border bg-card overflow-hidden shadow-sm"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-36 -right-36 size-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-info/6 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative p-6 sm:p-10 md:p-12">
        <div className="max-w-3xl">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <BookOpen className="size-3.5 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
              GreenGuard Enterprise Knowledge Base
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-none mb-4">
            Documentation Portal
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            Official technical guides, API references, architecture blueprints,
            and operational workflows for citizens, environmental officers, and
            platform administrators.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={onBrowseClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm"
            >
              <Compass className="size-4" />
              Browse Documentation
            </motion.button>
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => onCategoryClick("all")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background/80 text-sm font-semibold hover:bg-muted transition-colors text-foreground"
            >
              <Layers className="size-4 text-muted-foreground" />
              View Categories
            </motion.button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="flex gap-2">
              <KbSearchInput
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  setIsFocused(true);
                }}
                placeholder="Search articles, guides, topics, or error codes..."
                className="flex-1 text-sm sm:text-base py-3 rounded-2xl shadow-inner"
                autoFocus={false}
              />
              <motion.button
                whileHover={HOVER_LIFT_SM}
                whileTap={TAP_PRESS_SM}
                onClick={() => {
                  if (query.trim()) onSearch(query.trim());
                }}
                className="px-6 sm:px-8 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 shadow-sm flex items-center gap-2"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Search</span>
              </motion.button>
            </div>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {isFocused && (query.trim() || recentArticles.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: DUR_SM, ease: EASE_OUT }}
                  className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-xl z-30"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-xs text-muted-foreground">
                    <span>Search Suggestions</span>
                    <button
                      onClick={() => setIsFocused(false)}
                      className="hover:text-foreground p-1"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {query.trim() && suggestions.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {suggestions.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuery(item);
                            onSearch(item);
                            setIsFocused(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/70 text-xs font-medium text-left transition-colors"
                        >
                          <Search className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">{item}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {recentArticles.length > 0 && !query.trim() && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        <History className="size-3" />
                        Recently Viewed Articles
                      </div>
                      <div className="space-y-1">
                        {recentArticles.map((art) => (
                          <button
                            key={art.id}
                            onClick={() => {
                              onSearch(art.title);
                              setIsFocused(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/70 text-xs text-left transition-colors group"
                          >
                            <span className="truncate group-hover:text-primary transition-colors">
                              {art.title}
                            </span>
                            <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Statistics bar */}
        <div className="mt-8 pt-6 border-t border-border/70 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {ENTERPRISE_DOC_STATS.map(({ value, label, subtext, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div
                className="size-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}
              >
                <Icon className="size-5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-extrabold tabular-nums leading-none tracking-tight">
                  {value}
                </div>
                <div className="text-xs font-semibold text-foreground/90 mt-0.5 truncate">
                  {label}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{subtext}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 2. Popular Searches Section ──────────────────────────────────────────────

function PopularSearchesSection({ onSelectChip }: { onSelectChip: (chip: string) => void }) {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-1">
            Fast Lookup
          </div>
          <h2 className="text-lg font-bold tracking-tight">Popular Searches</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Frequently searched enterprise topics
        </span>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-card/60">
        <SearchChips chips={POPULAR_SEARCH_CHIPS} onSelect={onSelectChip} />
      </div>
    </section>
  );
}

// ─── 3. Enterprise Documentation Statistics ────────────────────────────────────

function EnterpriseDocStatistics() {
  return (
    <section>
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card/90 to-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-primary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-primary font-extrabold mb-2">
              <ShieldCheck className="size-3.5" />
              Verified Enterprise Standard
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Enterprise Documentation Hub
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Curated by GreenGuard platform architects and environmental compliance
              specialists. Updated continuously with release notes and API specifications.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-2xl">
            {[
              { num: "124", label: "Articles", sub: "Comprehensive", color: "var(--color-primary)" },
              { num: "14", label: "Categories", sub: "Structured", color: "var(--color-info)" },
              { num: "52", label: "Guides", sub: "Step-by-step", color: "var(--color-warning)" },
              { num: "Daily", label: "Updated", sub: "Sync status", color: "var(--color-success)" },
            ].map(({ num, label, sub, color }) => (
              <div
                key={label}
                className="p-4 rounded-xl bg-background/80 border border-border text-center"
              >
                <div
                  className="text-2xl font-extrabold tabular-nums"
                  style={{ color }}
                >
                  {num}
                </div>
                <div className="text-xs font-semibold mt-1">{label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 4. Browse Categories Section ─────────────────────────────────────────────

function BrowseCategoriesSection({ onCategoryClick }: { onCategoryClick: (id: string) => void }) {
  return (
    <section id="categories">
      <SectionHeader
        eyebrow="Browse Portal"
        title="Documentation Categories"
        description="Comprehensive guides and technical reference organized by topic"
        action={
          <button
            onClick={() => onCategoryClick("all")}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-all group"
          >
            Explore all articles
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        }
      />

      <motion.div
        variants={STAGGER(0.04, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {KB_CATEGORIES.map((cat) => (
          <motion.div key={cat.id} variants={FADE_UP}>
            <KbCategoryCard category={cat} onClick={() => onCategoryClick(cat.id)} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── 5. Featured Documentation ────────────────────────────────────────────────

function FeaturedDocumentationSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const articles = getFeaturedArticles(4);

  return (
    <section id="documentation">
      <SectionHeader
        eyebrow="Recommended"
        title="Featured Documentation"
        description="Handpicked technical references and core operational guides"
      />

      <motion.div
        variants={STAGGER(0.06, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {articles.map((article) => (
          <motion.div key={article.id} variants={FADE_UP}>
            <KbArticleCard article={article} onClick={() => onArticleClick(article.id)} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── 6. Latest Documentation Timeline ─────────────────────────────────────────

const TIMELINE_TYPE_CONFIG = {
  feature: { label: "New Guide", color: "var(--color-primary)" },
  update: { label: "Updated", color: "var(--color-info)" },
  fix: { label: "Correction", color: "var(--color-success)" },
} as const;

type TimelineType = keyof typeof TIMELINE_TYPE_CONFIG;

interface TimelineEntry {
  id: string;
  title: string;
  category: string;
  date: string;
  type: TimelineType;
  articleId: string;
}

const LATEST_DOC_TIMELINE: TimelineEntry[] = [
  {
    id: "t1",
    title: "Smart Maps: Hazard Intelligence Layer & Wildfire Risk Setup",
    category: "Smart Maps",
    date: "Today",
    type: "feature",
    articleId: "map-001",
  },
  {
    id: "t2",
    title: "AI Copilot Data Sources, Rate Limits & Citation Accuracy",
    category: "AI Copilot",
    date: "Yesterday",
    type: "update",
    articleId: "ai-002",
  },
  {
    id: "t3",
    title: "Configuring AQI Alert Thresholds & Escalation Workflows",
    category: "Environmental Monitoring",
    date: "2 days ago",
    type: "update",
    articleId: "env-002",
  },
  {
    id: "t4",
    title: "Two-Factor Authentication Setup & Emergency Backup Keys",
    category: "Security",
    date: "4 days ago",
    type: "fix",
    articleId: "sec-001",
  },
  {
    id: "t5",
    title: "Authority Command Center Walkthrough: Dispatching & Triage",
    category: "Authority Portal",
    date: "5 days ago",
    type: "update",
    articleId: "auth-001",
  },
];

function LatestDocumentationTimeline({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  return (
    <section>
      <SectionHeader eyebrow="Recent Additions" title="Latest Documentation" />

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <motion.div
          variants={STAGGER(0.06, 0.05)}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {LATEST_DOC_TIMELINE.map((entry, i) => {
            const style = TIMELINE_TYPE_CONFIG[entry.type];
            const isLast = i === LATEST_DOC_TIMELINE.length - 1;

            return (
              <motion.div key={entry.id} variants={FADE_UP} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="size-3 rounded-full mt-1 shrink-0"
                    style={{
                      background: style.color,
                      boxShadow: `0 0 0 4px color-mix(in oklab, ${style.color} 18%, transparent)`,
                    }}
                  />
                  {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
                </div>

                <button
                  onClick={() => onArticleClick(entry.articleId)}
                  className={cn(
                    "text-left flex-1 min-w-0 hover:opacity-85 transition-opacity group",
                    !isLast ? "pb-4" : "pb-0",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        color: style.color,
                        background: `color-mix(in oklab, ${style.color} 12%, transparent)`,
                      }}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                    <span className="text-[10px] text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {entry.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                    {entry.title}
                  </h4>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ─── 7. Most Popular Articles ──────────────────────────────────────────────────

type PopularTab = "views" | "trending" | "bookmarked";

function MostPopularArticlesSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const [tab, setTab] = useState<PopularTab>("views");
  const { bookmarkedIds } = useBookmarks();

  const articles = useMemo(() => {
    const base = [...KB_ARTICLES];
    if (tab === "views") return base.sort((a, b) => b.views - a.views).slice(0, 5);
    if (tab === "trending") return base.sort((a, b) => b.views - a.views).reverse().slice(0, 5);
    if (tab === "bookmarked") return base.filter((a) => bookmarkedIds.includes(a.id)).slice(0, 5);
    return base.slice(0, 5);
  }, [tab, bookmarkedIds]);

  const TABS: { id: PopularTab; label: string; icon: typeof TrendingUp }[] = [
    { id: "views", label: "Most Viewed", icon: Eye },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "bookmarked", label: "Bookmarked", icon: Star },
  ];

  return (
    <section>
      <SectionHeader eyebrow="Ranked" title="Most Popular Articles" />

      <div className="flex gap-1.5 mb-4 p-1 rounded-xl border border-border bg-muted/40 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
              tab === id
                ? "bg-background text-foreground shadow-xs border border-border/40"
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
              title="No bookmarked articles yet"
              description="Click the bookmark icon on any article to add it to your saved list."
            />
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DUR_SM, ease: EASE_OUT }}
            className="space-y-2.5"
          >
            {articles.map((article, idx) => (
              <motion.div
                key={article.id}
                whileHover={HOVER_LIFT_SM}
                whileTap={TAP_PRESS_SM}
                onClick={() => onArticleClick(article.id)}
                className="w-full flex items-center gap-4 p-3.5 sm:p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-200 text-left group cursor-pointer"
              >
                <span className="text-lg font-black tabular-nums text-muted-foreground/30 w-7 shrink-0 text-center">
                  #{idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                    <span className="uppercase tracking-wider font-semibold">
                      {article.categoryId.replace(/-/g, " ")}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" />
                      {article.views.toLocaleString()} views
                    </span>
                    <span>·</span>
                    <DifficultyBadge difficulty={article.difficulty} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <BookmarkButton articleId={article.id} size="sm" />
                  <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── 8. Recently Updated Section ──────────────────────────────────────────────

function RecentlyUpdatedSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const articles = KB_ARTICLES.slice(0, 5);

  return (
    <section>
      <SectionHeader eyebrow="Activity" title="Recently Updated" />

      <div className="space-y-2.5">
        {articles.map((art) => (
          <motion.div
            key={art.id}
            whileHover={HOVER_LIFT_SM}
            whileTap={TAP_PRESS_SM}
            onClick={() => onArticleClick(art.id)}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all cursor-pointer group"
          >
            <div className="size-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
              <RefreshCw className="size-4 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">
                {art.title}
              </h4>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{art.excerpt}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/70 shrink-0 font-medium">
              {art.updatedAt}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── 9. Continue Reading Section ──────────────────────────────────────────────

function CircularProgress({ percent }: { percent: number }) {
  const size = 40;
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <div className="relative size-10 flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        />
      </svg>
      <span className="absolute text-[9px] font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

function ContinueReadingSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const { inProgress } = useReadingProgress();

  const articles = inProgress
    .map((p) => ({ article: KB_ARTICLES_BY_ID[p.articleId], percent: p.percent }))
    .filter(({ article }) => !!article)
    .slice(0, 4);

  if (articles.length === 0) {
    return (
      <section>
        <SectionHeader eyebrow="In Progress" title="Continue Reading" />
        <EmptyState
          icon={BookOpen}
          title="No articles in progress"
          description="Open any documentation guide to automatically track your reading position."
        />
      </section>
    );
  }

  return (
    <section>
      <SectionHeader eyebrow="Resume" title="Continue Reading" />
      <div className="space-y-3">
        {articles.map(({ article, percent }) => {
          const readTimeNum = parseInt(article.readTime) || 5;
          const remainingMins = Math.ceil(readTimeNum * ((100 - percent) / 100));

          return (
            <motion.div
              key={article.id}
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => onArticleClick(article.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-200 text-left group cursor-pointer"
            >
              <CircularProgress percent={percent} />

              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {article.categoryId.replace(/-/g, " ")}
                </span>
                <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {article.title}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ~{remainingMins} min remaining
                </p>
              </div>

              <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ─── 10. Bookmarked Articles Section ──────────────────────────────────────────

function BookmarkedArticlesSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const { bookmarkedIds, toggleBookmark } = useBookmarks();

  const articles = bookmarkedIds
    .map((id) => KB_ARTICLES_BY_ID[id])
    .filter(Boolean)
    .slice(0, 6);

  return (
    <section>
      <SectionHeader
        eyebrow="Saved Items"
        title="Bookmarked Articles"
        action={
          bookmarkedIds.length > 0 ? (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {bookmarkedIds.length} saved
            </span>
          ) : undefined
        }
      />

      {articles.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="No bookmarks saved"
          description="Bookmark important technical articles to keep them available offline and in your quick menu."
        />
      ) : (
        <motion.div
          variants={STAGGER(0.05, 0.05)}
          initial="hidden"
          animate="show"
          className="space-y-2.5"
        >
          {articles.map((art) => (
            <motion.div
              key={art.id}
              variants={FADE_UP}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card group"
            >
              <button
                onClick={() => onArticleClick(art.id)}
                className="flex-1 min-w-0 text-left"
              >
                <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {art.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-wider font-semibold">
                    {art.categoryId.replace(/-/g, " ")}
                  </span>
                  <span>·</span>
                  <span>{art.readTime}</span>
                  <span>·</span>
                  <DifficultyBadge difficulty={art.difficulty} />
                </div>
              </button>
              <motion.button
                whileTap={TAP_PRESS_SM}
                onClick={() => toggleBookmark(art.id)}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                aria-label="Remove bookmark"
              >
                <X className="size-4" />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

// ─── 11. Documentation Footer ─────────────────────────────────────────────────

function DocumentationFooter({ onCategoryClick }: { onCategoryClick: (id: string) => void }) {
  const topCategories = KB_CATEGORIES.slice(0, 6);

  return (
    <footer className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm mt-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="size-8 rounded-xl bg-primary flex items-center justify-center shadow-xs">
              <BookOpen className="size-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">GreenGuard Documentation</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Official technical knowledge base for GreenGuard Enterprise AI. Built for
            environmental agencies, smart city teams, and public users.
          </p>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-semibold border border-success/20">
            <Circle className="size-2 fill-success text-success animate-pulse" />
            All documentation systems operational
          </div>
        </div>

        {/* Categories quick links */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-3">
            Core Topics
          </div>
          <div className="space-y-2">
            {topCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left group"
              >
                <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* Documentation Stats */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-3">
            System Specifications
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Total Knowledge Articles", value: `${KB_ARTICLES.length}` },
              { label: "Documentation Modules", value: `${KB_CATEGORIES.length}` },
              { label: "Compliance Standard", value: "ISO 14001 / W3C" },
              { label: "Last System Sync", value: "Today" },
              { label: "Documentation Build", value: "v2.6.4" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root Knowledge Base Home Component ───────────────────────────────────────

interface KbHomeProps {
  onSearch: (q: string) => void;
  onArticleClick: (id: string) => void;
  onCategoryClick: (id: string) => void;
}

export function KbHome({ onSearch, onArticleClick, onCategoryClick }: KbHomeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToCategories = () => {
    const el = document.getElementById("categories");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      onCategoryClick("all");
    }
  };

  return (
    <div ref={containerRef} className="p-4 sm:p-6 max-w-[1280px] mx-auto space-y-12 pb-20">
      {/* 1. Hero */}
      <KbHero
        onSearch={onSearch}
        onBrowseClick={scrollToCategories}
        onCategoryClick={onCategoryClick}
      />

      {/* 2. Popular Searches */}
      <PopularSearchesSection onSelectChip={onSearch} />

      {/* 3. Documentation Statistics */}
      <EnterpriseDocStatistics />

      {/* 4. Documentation Categories */}
      <BrowseCategoriesSection onCategoryClick={onCategoryClick} />

      {/* 5 & 6. Featured + Latest (two column) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
        <div className="xl:col-span-3">
          <FeaturedDocumentationSection onArticleClick={onArticleClick} />
        </div>
        <div className="xl:col-span-2">
          <LatestDocumentationTimeline onArticleClick={onArticleClick} />
        </div>
      </div>

      {/* 7 & 8. Most Popular + Recently Updated (two column) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
        <div className="xl:col-span-3">
          <MostPopularArticlesSection onArticleClick={onArticleClick} />
        </div>
        <div className="xl:col-span-2">
          <RecentlyUpdatedSection onArticleClick={onArticleClick} />
        </div>
      </div>

      {/* 9 & 10. Continue Reading + Bookmarked Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ContinueReadingSection onArticleClick={onArticleClick} />
        <BookmarkedArticlesSection onArticleClick={onArticleClick} />
      </div>

      {/* 11. Documentation Footer */}
      <DocumentationFooter onCategoryClick={onCategoryClick} />
    </div>
  );
}
