/**
 * use-complaint-draft.ts — Phase 12
 *
 * Production-ready draft system for the New Complaint form.
 * Supports auto-save, manual save, resume, edit, and delete.
 * Drafts persist in localStorage so they survive browser refresh/close.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { LocationSelection } from "./complaint-location-map";

// ─── Draft data shape ─────────────────────────────────────────────────────────

export interface ComplaintDraft {
  id: string;
  title: string;
  issueType: string;
  severity: string;
  description: string;
  address: string;
  location: LocationSelection | null;
  fileNames: string[]; // we can't store File objects in localStorage
  savedAt: string; // ISO date string
  isAutoSave: boolean;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "gg-complaint-drafts";

function loadDrafts(): ComplaintDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ComplaintDraft[];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: ComplaintDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDraftOptions {
  autoSaveIntervalMs?: number;
}

export interface UseDraftReturn {
  drafts: ComplaintDraft[];
  currentDraftId: string | null;
  hasDraftSaved: boolean;
  lastSavedAt: Date | null;
  saveDraft: (data: Omit<ComplaintDraft, "id" | "savedAt" | "isAutoSave">, manual?: boolean) => void;
  deleteDraft: (id: string) => void;
  clearAllDrafts: () => void;
  loadDraft: (id: string) => ComplaintDraft | null;
  clearCurrentDraft: () => void;
}

export function useComplaintDraft(options: UseDraftOptions = {}): UseDraftReturn {
  const { autoSaveIntervalMs = 30_000 } = options;

  const [drafts, setDrafts] = useState<ComplaintDraft[]>(() => loadDrafts());
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [hasDraftSaved, setHasDraftSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSaveRef = useRef<Omit<ComplaintDraft, "id" | "savedAt" | "isAutoSave"> | null>(null);

  // Flush auto-save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        if (pendingAutoSaveRef.current) {
          // Save immediately on unmount if there's pending data
          const id = currentDraftId ?? generateDraftId();
          const draft: ComplaintDraft = {
            ...pendingAutoSaveRef.current,
            id,
            savedAt: new Date().toISOString(),
            isAutoSave: true,
          };
          const existing = loadDrafts();
          const updated = existing.filter((d) => d.id !== id).concat(draft).slice(-10);
          saveDrafts(updated);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = useCallback(
    (data: Omit<ComplaintDraft, "id" | "savedAt" | "isAutoSave">, manual = false) => {
      // Only save if there's meaningful content
      const hasContent =
        data.description.trim().length > 5 ||
        data.title.trim().length > 0 ||
        data.location != null;

      if (!hasContent) return;

      if (!manual) {
        // Queue auto-save (debounced)
        pendingAutoSaveRef.current = data;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          if (!pendingAutoSaveRef.current) return;
          const id = currentDraftId ?? generateDraftId();
          const draft: ComplaintDraft = {
            ...pendingAutoSaveRef.current,
            id,
            savedAt: new Date().toISOString(),
            isAutoSave: true,
          };
          const existing = loadDrafts();
          const updated = existing.filter((d) => d.id !== id).concat(draft).slice(-10);
          saveDrafts(updated);
          setDrafts(updated);
          setCurrentDraftId(id);
          setHasDraftSaved(true);
          setLastSavedAt(new Date());
          pendingAutoSaveRef.current = null;
        }, autoSaveIntervalMs);
      } else {
        // Immediate manual save
        const id = currentDraftId ?? generateDraftId();
        const draft: ComplaintDraft = {
          ...data,
          id,
          savedAt: new Date().toISOString(),
          isAutoSave: false,
        };
        const existing = loadDrafts();
        const updated = existing.filter((d) => d.id !== id).concat(draft).slice(-10);
        saveDrafts(updated);
        setDrafts(updated);
        setCurrentDraftId(id);
        setHasDraftSaved(true);
        setLastSavedAt(new Date());
      }
    },
    [currentDraftId, autoSaveIntervalMs],
  );

  const deleteDraft = useCallback((id: string) => {
    const existing = loadDrafts();
    const updated = existing.filter((d) => d.id !== id);
    saveDrafts(updated);
    setDrafts(updated);
    if (currentDraftId === id) {
      setCurrentDraftId(null);
      setHasDraftSaved(false);
      setLastSavedAt(null);
    }
  }, [currentDraftId]);

  const clearAllDrafts = useCallback(() => {
    saveDrafts([]);
    setDrafts([]);
    setCurrentDraftId(null);
    setHasDraftSaved(false);
    setLastSavedAt(null);
  }, []);

  const loadDraftById = useCallback((id: string): ComplaintDraft | null => {
    const existing = loadDrafts();
    const found = existing.find((d) => d.id === id) ?? null;
    if (found) {
      setCurrentDraftId(id);
      setHasDraftSaved(true);
      setLastSavedAt(new Date(found.savedAt));
    }
    return found;
  }, []);

  const clearCurrentDraft = useCallback(() => {
    if (currentDraftId) {
      const existing = loadDrafts();
      const updated = existing.filter((d) => d.id !== currentDraftId);
      saveDrafts(updated);
      setDrafts(updated);
    }
    setCurrentDraftId(null);
    setHasDraftSaved(false);
    setLastSavedAt(null);
  }, [currentDraftId]);

  return {
    drafts,
    currentDraftId,
    hasDraftSaved,
    lastSavedAt,
    saveDraft,
    deleteDraft,
    clearAllDrafts,
    loadDraft: loadDraftById,
    clearCurrentDraft,
  };
}
