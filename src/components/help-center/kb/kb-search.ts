import type { KbArticle, Difficulty } from "./kb-data";
import { KB_ARTICLES } from "./kb-data";

// ─── Filter/sort options ───────────────────────────────────────────────────────

export type SortOption = "popular" | "updated" | "alpha" | "readtime";

export interface KbFilterState {
  query: string;
  categoryId: string | null;
  difficulty: Difficulty | null;
  sort: SortOption;
}

export const DEFAULT_FILTER_STATE: KbFilterState = {
  query: "",
  categoryId: null,
  difficulty: null,
  sort: "popular",
};

// ─── Search scoring ───────────────────────────────────────────────────────────

function scoreArticle(article: KbArticle, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  let score = 0;
  if (article.title.toLowerCase().includes(q)) score += 10;
  if (article.excerpt.toLowerCase().includes(q)) score += 5;
  if (article.tags.some(t => t.toLowerCase().includes(q))) score += 4;
  if (article.categoryId.toLowerCase().includes(q)) score += 2;
  // Check content text fields
  for (const section of article.content) {
    if (section.text?.toLowerCase().includes(q)) score += 1;
    if (section.items?.some(item => item.toLowerCase().includes(q))) score += 1;
  }
  return score;
}

// ─── Main filter function ─────────────────────────────────────────────────────

export function filterArticles(filters: KbFilterState): KbArticle[] {
  let results = [...KB_ARTICLES];

  // Category
  if (filters.categoryId) {
    results = results.filter(a => a.categoryId === filters.categoryId);
  }

  // Difficulty
  if (filters.difficulty) {
    results = results.filter(a => a.difficulty === filters.difficulty);
  }

  // Query
  if (filters.query.trim()) {
    results = results
      .map(a => ({ article: a, score: scoreArticle(a, filters.query.trim()) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ article }) => article);
    return results; // score-sort takes precedence
  }

  // Sort (no query)
  switch (filters.sort) {
    case "popular":
      results.sort((a, b) => b.views - a.views);
      break;
    case "alpha":
      results.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "readtime":
      results.sort((a, b) => {
        const mins = (s: string) => parseInt(s) || 0;
        return mins(a.readTime) - mins(b.readTime);
      });
      break;
    case "updated":
    default:
      // Keep insertion order (already sorted by recency in source data)
      break;
  }

  return results;
}

// ─── Suggestion generator ─────────────────────────────────────────────────────

export function getSuggestions(query: string, limit = 5): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return KB_ARTICLES.filter(
    a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)),
  )
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map(a => a.title);
}

// ─── Featured articles ────────────────────────────────────────────────────────

export function getFeaturedArticles(limit = 4): KbArticle[] {
  return KB_ARTICLES.filter(a => a.featured)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ─── Recently updated ─────────────────────────────────────────────────────────

export function getRecentlyUpdated(limit = 5): KbArticle[] {
  return KB_ARTICLES.slice(0, limit);
}

// ─── Related articles ─────────────────────────────────────────────────────────

export function getRelatedArticles(articleId: string, limit = 3): KbArticle[] {
  const article = KB_ARTICLES.find(a => a.id === articleId);
  if (!article) return [];
  return article.relatedIds
    .slice(0, limit)
    .map(id => KB_ARTICLES.find(a => a.id === id))
    .filter(Boolean) as KbArticle[];
}
