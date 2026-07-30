import { useState, useEffect, useCallback } from "react";

const BOOKMARK_KEY = "gg-kb-bookmarks";
const RECENT_KEY = "gg-kb-recent";
const PROGRESS_KEY = "gg-kb-progress";
const MAX_RECENT = 8;

// ─── Local storage helpers ────────────────────────────────────────────────────

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export function useBookmarks() {
  const [ids, setIds] = useState<string[]>(() => readLS<string[]>(BOOKMARK_KEY, []));

  const toggle = useCallback((articleId: string) => {
    setIds(prev => {
      const next = prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [articleId, ...prev];
      writeLS(BOOKMARK_KEY, next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((articleId: string) => ids.includes(articleId), [ids]);

  return { bookmarkedIds: ids, toggleBookmark: toggle, isBookmarked };
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => readLS<string[]>(RECENT_KEY, []));

  const addRecent = useCallback((articleId: string) => {
    setIds(prev => {
      const next = [articleId, ...prev.filter(id => id !== articleId)].slice(0, MAX_RECENT);
      writeLS(RECENT_KEY, next);
      return next;
    });
  }, []);

  return { recentIds: ids, addRecent };
}

// ─── Reading Progress ─────────────────────────────────────────────────────────

export interface ProgressEntry {
  articleId: string;
  percent: number;
  updatedAt: number;
}

export function useReadingProgress() {
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>(
    () => readLS<Record<string, ProgressEntry>>(PROGRESS_KEY, {}),
  );

  const setArticleProgress = useCallback((articleId: string, percent: number) => {
    setProgress(prev => {
      const next = {
        ...prev,
        [articleId]: { articleId, percent, updatedAt: Date.now() },
      };
      writeLS(PROGRESS_KEY, next);
      return next;
    });
  }, []);

  const getProgress = useCallback(
    (articleId: string) => progress[articleId]?.percent ?? 0,
    [progress],
  );

  /** Articles with some progress, sorted by most recently read */
  const inProgress = Object.values(progress)
    .filter(p => p.percent > 0 && p.percent < 100)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return { setArticleProgress, getProgress, inProgress };
}

// ─── Inline reading-scroll tracker ───────────────────────────────────────────

/**
 * Hook that watches a scrollable container ref and updates reading progress.
 * Attach to the article content wrapper.
 */
export function useScrollProgress(
  containerRef: React.RefObject<HTMLElement | null>,
  onProgress: (pct: number) => void,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const max = scrollHeight - clientHeight;
      if (max <= 0) {
        onProgress(100);
        return;
      }
      onProgress(Math.round((scrollTop / max) * 100));
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [containerRef, onProgress]);
}
