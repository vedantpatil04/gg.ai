import { useState, useCallback } from "react";

const TUT_BOOKMARKS_KEY  = "gg-tut-bookmarks";
const TUT_RECENT_KEY     = "gg-tut-recent";
const TUT_PROGRESS_KEY   = "gg-tut-progress";
const TUT_PATH_KEY       = "gg-tut-path-progress";
const MAX_RECENT         = 10;

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export function useTutBookmarks() {
  const [ids, setIds] = useState<string[]>(() => readLS<string[]>(TUT_BOOKMARKS_KEY, []));

  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [id, ...prev];
      writeLS(TUT_BOOKMARKS_KEY, next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids]);
  return { bookmarkedIds: ids, toggleBookmark: toggle, isBookmarked };
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────

export function useTutRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => readLS<string[]>(TUT_RECENT_KEY, []));

  const addRecent = useCallback((id: string) => {
    setIds(prev => {
      const next = [id, ...prev.filter(i => i !== id)].slice(0, MAX_RECENT);
      writeLS(TUT_RECENT_KEY, next);
      return next;
    });
  }, []);

  return { recentIds: ids, addRecent };
}

// ─── Tutorial Step Progress ───────────────────────────────────────────────────

export interface TutProgress {
  tutorialId: string;
  completedSteps: string[];
  currentStepId: string | null;
  startedAt: number;
  completedAt: number | null;
}

export function useTutProgress() {
  const [progress, setProgress] = useState<Record<string, TutProgress>>(
    () => readLS<Record<string, TutProgress>>(TUT_PROGRESS_KEY, {}),
  );

  const startTutorial = useCallback((tutorialId: string, firstStepId: string) => {
    setProgress(prev => {
      if (prev[tutorialId]) return prev;
      const next = {
        ...prev,
        [tutorialId]: {
          tutorialId,
          completedSteps: [],
          currentStepId: firstStepId,
          startedAt: Date.now(),
          completedAt: null,
        },
      };
      writeLS(TUT_PROGRESS_KEY, next);
      return next;
    });
  }, []);

  const completeStep = useCallback((tutorialId: string, stepId: string, nextStepId: string | null, totalSteps: number) => {
    setProgress(prev => {
      const existing = prev[tutorialId] ?? {
        tutorialId,
        completedSteps: [],
        currentStepId: stepId,
        startedAt: Date.now(),
        completedAt: null,
      };
      const completedSteps = existing.completedSteps.includes(stepId)
        ? existing.completedSteps
        : [...existing.completedSteps, stepId];
      const isComplete = completedSteps.length >= totalSteps;
      const next = {
        ...prev,
        [tutorialId]: {
          ...existing,
          completedSteps,
          currentStepId: nextStepId,
          completedAt: isComplete ? Date.now() : null,
        },
      };
      writeLS(TUT_PROGRESS_KEY, next);
      return next;
    });
  }, []);

  const getProgress = useCallback((tutorialId: string) => progress[tutorialId] ?? null, [progress]);

  const getStepPercent = useCallback((tutorialId: string, totalSteps: number): number => {
    const p = progress[tutorialId];
    if (!p || totalSteps === 0) return 0;
    return Math.round((p.completedSteps.length / totalSteps) * 100);
  }, [progress]);

  const isStepCompleted = useCallback((tutorialId: string, stepId: string): boolean => {
    return progress[tutorialId]?.completedSteps.includes(stepId) ?? false;
  }, [progress]);

  const isTutorialComplete = useCallback((tutorialId: string): boolean => {
    return progress[tutorialId]?.completedAt !== null && progress[tutorialId]?.completedAt !== undefined;
  }, [progress]);

  const inProgress = Object.values(progress)
    .filter(p => p.completedSteps.length > 0 && !p.completedAt)
    .sort((a, b) => b.startedAt - a.startedAt);

  return {
    startTutorial,
    completeStep,
    getProgress,
    getStepPercent,
    isStepCompleted,
    isTutorialComplete,
    inProgress,
  };
}

// ─── Learning Path Progress ───────────────────────────────────────────────────

export function useLearningPathProgress() {
  const [progress, setProgress] = useState<Record<string, string[]>>(
    () => readLS<Record<string, string[]>>(TUT_PATH_KEY, {}),
  );

  const markTutorialComplete = useCallback((pathId: string, tutorialId: string) => {
    setProgress(prev => {
      const existing = prev[pathId] ?? [];
      if (existing.includes(tutorialId)) return prev;
      const next = { ...prev, [pathId]: [...existing, tutorialId] };
      writeLS(TUT_PATH_KEY, next);
      return next;
    });
  }, []);

  const getPathPercent = useCallback((pathId: string, totalTutorials: number): number => {
    const done = progress[pathId]?.length ?? 0;
    return totalTutorials === 0 ? 0 : Math.round((done / totalTutorials) * 100);
  }, [progress]);

  return { markTutorialComplete, getPathPercent };
}
