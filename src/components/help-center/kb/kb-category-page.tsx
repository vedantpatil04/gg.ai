import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen } from "lucide-react";
import { DUR_MD, EASE_OUT } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { KbArticleCard, ArticleGrid, KbSearchInput } from "./kb-ui";
import type { KbCategory } from "./kb-data";
import { KB_ARTICLES_BY_CATEGORY } from "./kb-data";
// import { KB_ARTICLES_BY_CATEGORY } from "./kb-data";

interface KbCategoryPageProps {
  category: KbCategory;
  onBack: () => void;
  onArticleClick: (id: string) => void;
}

export function KbCategoryPage({ category, onBack, onArticleClick }: KbCategoryPageProps) {
  const [query, setQuery] = useState("");
  const Icon = category.icon;

  const allArticles = KB_ARTICLES_BY_CATEGORY[category.id] ?? [];
  const featuredArticles = allArticles.filter(a => a.featured);
  const latestArticles = [...allArticles].slice(0, 4);
  const popularArticles = [...allArticles].sort((a, b) => b.views - a.views).slice(0, 4);

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return allArticles;
    const q = query.toLowerCase();
    return allArticles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)),
    );
  }, [query, allArticles]);

  const isFiltering = query.trim().length > 0;

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none pb-16 space-y-10">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Knowledge Base
      </motion.button>

      {/* Category hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
        className="relative rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div
          className="absolute -top-24 -right-24 size-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: category.accentColor }}
        />
        <div className="relative p-6 md:p-8 flex items-start gap-5">
          <div
            className="size-14 md:size-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in oklab, ${category.accentColor} 12%, transparent)` }}
          >
            <Icon className="size-7 md:size-8" style={{ color: category.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
              style={{ color: category.accentColor }}
            >
              Category
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{category.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{category.description}</p>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
              <span>{category.articleCount} articles</span>
              <span>Updated {category.lastUpdated}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search within category */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT, delay: 0.05 }}
      >
        <KbSearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Search within ${category.title}…`}
        />
      </motion.div>

      {/* Filtered results */}
      {isFiltering ? (
        <div>
          <div className="text-xs text-muted-foreground mb-4">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for "{query}"
          </div>
          <ArticleGrid
            articles={filteredArticles}
            onArticleClick={onArticleClick}
            emptySlot={
              <EmptyState
                icon={BookOpen}
                title="No articles found"
                description={`No articles in ${category.title} match "${query}".`}
                action={
                  <button
                    onClick={() => setQuery("")}
                    className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                  >
                    Clear search
                  </button>
                }
              />
            }
          />
        </div>
      ) : (
        <>
          {/* Featured */}
          {featuredArticles.length > 0 && (
            <section>
              <SectionHeader eyebrow="Recommended" title="Featured Articles" />
              <ArticleGrid articles={featuredArticles} onArticleClick={onArticleClick} />
            </section>
          )}

          {/* Latest */}
          <section>
            <SectionHeader
              eyebrow="Newest"
              title="Latest Articles"
              action={
                <span className="text-[10px] text-muted-foreground">{allArticles.length} total</span>
              }
            />
            <div className="space-y-3">
              {latestArticles.map(article => (
                <KbArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => onArticleClick(article.id)}
                  variant="horizontal"
                />
              ))}
            </div>
          </section>

          {/* Popular */}
          {popularArticles.length > 0 && (
            <section>
              <SectionHeader eyebrow="Top Reads" title="Most Popular" />
              <ArticleGrid articles={popularArticles} onArticleClick={onArticleClick} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
