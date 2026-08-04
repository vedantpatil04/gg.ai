/**
 * GreenGuard AI — i18n Phase 1: Language Detector
 *
 * Reads the persisted language synchronously so i18next can be initialized
 * before React's first render — no flicker, no Suspense boundary required.
 *
 * Detection order:
 *   1. Persisted localStorage value  → fast path on reload / new tab
 *   2. Browser's navigator.language  → graceful first-time detection
 *   3. DEFAULT_LANGUAGE ("en")       → always-safe fallback
 *
 * All functions are SSR-safe: they guard every `window`/`document`/
 * `localStorage`/`navigator` access behind a `typeof` check.
 */

import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type Language,
} from "./config";

// ─── Read / write ─────────────────────────────────────────────────────────────

/**
 * Read the persisted language from localStorage synchronously.
 * Returns `undefined` when running server-side or when the stored value
 * is not in our supported set — callers fall back cleanly.
 */
export function readStoredLanguage(): Language | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // Private-browsing / quota error — non-fatal.
  }
  return undefined;
}

/**
 * Persist the active language so the next page load restores it
 * synchronously, before the backend preference arrives.
 */
export function writeStoredLanguage(lang: Language): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Non-fatal.
  }
}

// ─── Initial detection ────────────────────────────────────────────────────────

/**
 * Detect the language to use at module-load time.
 * Called once during `src/i18n/index.ts` initialization — must be
 * synchronous and side-effect-free (apart from reading storage).
 */
export function detectInitialLanguage(): Language {
  // 1. Persisted preference (fastest — same value every reload)
  const stored = readStoredLanguage();
  if (stored) return stored;

  // 2. Browser language hint — take only the primary subtag (en-IN → en)
  if (typeof navigator !== "undefined" && navigator.language) {
    const browserLang = navigator.language.split("-")[0]?.toLowerCase();
    if (
      browserLang &&
      SUPPORTED_LANGUAGES.includes(browserLang as Language)
    ) {
      return browserLang as Language;
    }
  }

  // 3. Hardcoded default
  return DEFAULT_LANGUAGE;
}
