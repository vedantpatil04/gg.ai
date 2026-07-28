import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, ArrowUpRight, Clock } from "lucide-react";
import { FADE_UP, STAGGER, DUR_MD, EASE_OUT } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { KbArticleCard, KbCategoryCard, SearchChips, KbSearchInput, ArticleGrid } from "./kb-ui";
import { KB_CATEGORIES, POPULAR_SEARCH_CHIPS, KB_ARTICLES_BY_ID } from "./kb-data";
import { getFeaturedArticles, getRecentlyUpdated } from "./kb-search";
import { useRecentlyViewed } from "./kb-store";

// ─── Hero ──────────────────────────────────────────────────────────────────────

function KbHero({
  onSearch,
  onChipSelect,
}: {
  onSearch: (q: string) => void;
  onChipSelect: (q: string) => void;
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = (q: string) => {
    if (q.trim()) onSearch(q.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 size-48 rounded-full bg-info/5 blur-3xl" />
      </div>

      <div className="relative p-6 md:p-8">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <BookOpen className="size-3 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
            Knowledge Base
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">How can we help you?</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-6">
          Search our knowledge base to find answers, step-by-step guides, and reference
          documentation for every area of GreenGuard AI.
        </p>

        {/* Search */}
        <div className="flex gap-2 mb-5">
          <KbSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search articles, guides, and tutorials…"
            className="flex-1"
          />
          <button
            onClick={() => handleSubmit(query)}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            Search
          </button>
        </div>

        {/* Popular chips */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Popular searches
          </div>
          <SearchChips chips={POPULAR_SEARCH_CHIPS} onSelect={onChipSelect} />
        </div>

        {/* Stats row */}
        <div className="mt-6 pt-5 border-t border-border flex flex-wrap gap-6">
          {[
            { value: "110+", label: "Help Articles" },
            { value: "12", label: "Categories" },
            { value: "< 2h", label: "Avg. Response" },
            { value: "97%", label: "Satisfaction" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Featured categories ───────────────────────────────────────────────────────

function FeaturedCategories({ onCategoryClick }: { onCategoryClick: (id: string) => void }) {
  const featured = KB_CATEGORIES.filter((c) => c.featured);

  return (
    <section>
      <SectionHeader
        eyebrow="Browse"
        title="Featured Categories"
        action={
          <button
            onClick={() => onCategoryClick("all")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            View all
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        }
      />
      <motion.div
        variants={STAGGER(0.05, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {featured.map((cat) => (
          <motion.div key={cat.id} variants={FADE_UP}>
            <KbCategoryCard category={cat} onClick={() => onCategoryClick(cat.id)} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── All categories ────────────────────────────────────────────────────────────

function AllCategoriesGrid({ onCategoryClick }: { onCategoryClick: (id: string) => void }) {
  const nonFeatured = KB_CATEGORIES.filter((c) => !c.featured);

  return (
    <section>
      <SectionHeader eyebrow="All Topics" title="Browse by Category" />
      <motion.div
        variants={STAGGER(0.04, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {nonFeatured.map((cat) => (
          <motion.div key={cat.id} variants={FADE_UP}>
            <KbCategoryCard category={cat} onClick={() => onCategoryClick(cat.id)} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Featured articles ─────────────────────────────────────────────────────────

function FeaturedArticlesSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const articles = getFeaturedArticles(6);

  return (
    <section>
      <SectionHeader
        eyebrow="Must Read"
        title="Featured Articles"
        description="Top guides handpicked by the GreenGuard team"
      />
      <ArticleGrid articles={articles} onArticleClick={onArticleClick} />
    </section>
  );
}

// ─── Recently updated ──────────────────────────────────────────────────────────

function RecentlyUpdatedSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const articles = getRecentlyUpdated(4);

  return (
    <section>
      <SectionHeader
        eyebrow="Latest"
        title="Recently Updated"
        action={
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
            View all
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        }
      />
      <div className="space-y-3">
        {articles.map((article) => (
          <KbArticleCard
            key={article.id}
            article={article}
            onClick={() => onArticleClick(article.id)}
            variant="horizontal"
          />
        ))}
      </div>
    </section>
  );
}

// ─── Recently viewed ───────────────────────────────────────────────────────────

function RecentlyViewedSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const { recentIds } = useRecentlyViewed();
  const articles = recentIds
    .map((id) => KB_ARTICLES_BY_ID[id])
    .filter(Boolean)
    .slice(0, 4);

  if (articles.length === 0) {
    return (
      <section>
        <SectionHeader eyebrow="History" title="Recently Viewed" />
        <EmptyState
          icon={Clock}
          title="No reading history yet"
          description="Articles you open will appear here for quick access."
        />
      </section>
    );
  }

  return (
    <section>
      <SectionHeader eyebrow="History" title="Recently Viewed" />
      <div className="space-y-1.5">
        {articles.map((article) => (
          <KbArticleCard
            key={article.id}
            article={article}
            onClick={() => onArticleClick(article.id)}
            variant="compact"
          />
        ))}
      </div>
    </section>
  );
}

// ─── AI Shortcut banner ────────────────────────────────────────────────────────

function AiShortcutBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="rounded-xl border border-primary/20 bg-card relative overflow-hidden p-4 md:p-5 flex items-center gap-4"
    >
      <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
      <div className="size-10 rounded-xl aurora grid place-items-center shrink-0">
        <Sparkles className="size-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold mb-0.5">Can't find what you're looking for?</h3>
        <p className="text-xs text-muted-foreground">
          Ask the AI Copilot — it has access to all platform data and can answer questions in
          natural language.
        </p>
      </div>
      <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
        Ask AI
      </button>
    </motion.div>
  );
}

// ─── Knowledge Base Home ───────────────────────────────────────────────────────

interface KbHomeProps {
  onSearch: (q: string) => void;
  onArticleClick: (id: string) => void;
  onCategoryClick: (id: string) => void;
}

export function KbHome({ onSearch, onArticleClick, onCategoryClick }: KbHomeProps) {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-10 pb-16">
      <KbHero onSearch={onSearch} onChipSelect={onSearch} />
      <AiShortcutBanner />
      <FeaturedCategories onCategoryClick={onCategoryClick} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
        <div className="xl:col-span-3">
          <FeaturedArticlesSection onArticleClick={onArticleClick} />
        </div>
        <div className="xl:col-span-2 space-y-10">
          <RecentlyUpdatedSection onArticleClick={onArticleClick} />
          <RecentlyViewedSection onArticleClick={onArticleClick} />
        </div>
      </div>

      <AllCategoriesGrid onCategoryClick={onCategoryClick} />
    </div>
  );
}
