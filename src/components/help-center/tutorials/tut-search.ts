import { TUTORIALS } from "./tut-data";
import type { Tutorial, TutDifficulty, TutFormat } from "./tut-data";

export type TutSortOption = "popular" | "newest" | "alpha" | "duration" | "rating";

export interface TutFilterState {
  query: string;
  categoryId: string | null;
  difficulty: TutDifficulty | null;
  format: TutFormat | null;
  sort: TutSortOption;
}

export const DEFAULT_TUT_FILTER: TutFilterState = {
  query: "",
  categoryId: null,
  difficulty: null,
  format: null,
  sort: "popular",
};

function scoreTutorial(t: Tutorial, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  let score = 0;
  if (t.title.toLowerCase().includes(q))       score += 10;
  if (t.description.toLowerCase().includes(q)) score += 5;
  if (t.tags.some(tag => tag.toLowerCase().includes(q))) score += 4;
  if (t.categoryId.toLowerCase().includes(q))  score += 2;
  return score;
}

export function filterTutorials(filters: TutFilterState): Tutorial[] {
  let results = [...TUTORIALS];

  if (filters.categoryId) results = results.filter(t => t.categoryId === filters.categoryId);
  if (filters.difficulty)  results = results.filter(t => t.difficulty === filters.difficulty);
  if (filters.format)      results = results.filter(t => t.format === filters.format);

  if (filters.query.trim()) {
    return results
      .map(t => ({ t, score: scoreTutorial(t, filters.query.trim()) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ t }) => t);
  }

  switch (filters.sort) {
    case "popular":  results.sort((a, b) => b.views - a.views); break;
    case "newest":   break; // insertion order = newest first in source
    case "alpha":    results.sort((a, b) => a.title.localeCompare(b.title)); break;
    case "duration": results.sort((a, b) => parseInt(a.duration) - parseInt(b.duration)); break;
    case "rating":   results.sort((a, b) => b.rating - a.rating); break;
  }

  return results;
}

export function getTutSuggestions(query: string, limit = 5): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return TUTORIALS
    .filter(t => t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map(t => t.title);
}

export function getFeaturedTutorials(limit = 4): Tutorial[] {
  return TUTORIALS.filter(t => t.featured).sort((a, b) => b.views - a.views).slice(0, limit);
}

export function getRelatedTutorials(tutorialId: string, limit = 3): Tutorial[] {
  const tut = TUTORIALS.find(t => t.id === tutorialId);
  if (!tut) return [];
  return tut.relatedIds
    .slice(0, limit)
    .map(id => TUTORIALS.find(t => t.id === id))
    .filter(Boolean) as Tutorial[];
}

export function getTutorialsByDifficulty(difficulty: TutDifficulty, limit = 6): Tutorial[] {
  return TUTORIALS.filter(t => t.difficulty === difficulty)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}
