/**
 * GreenGuard AI — i18n: Language detector
 *
 * All functions guard every browser-only API (`window`, `localStorage`,
 * `navigator`) behind `typeof` checks so this module is safe to import in
 * TanStack Start's SSR (Nitro) environment.
 *
 * Detection order when no value is stored yet:
 *   1. localStorage  → fast path on reload / new tab
 *   2. navigator.language → browser hint on first visit
 *   3. DEFAULT_LANGUAGE  → always-safe fallback ("en")
 */

import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type Language,
} from "./config";

// ─── Read / write localStorage ────────────────────────────────────────────────

/**
 * Read the persisted language from localStorage synchronously.
 * Returns `undefined` on the server or when the stored value is not in our
 * supported set — callers fall back cleanly.
 */
export function readStoredLanguage(): Language | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // Private-browsing / quota exceeded — non-fatal.
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

// ─── Initial detection (called once at module load time) ──────────────────────

/**
 * Detect the language to use before the first React render.
 * Returns a value synchronously — no async, no network, no flicker.
 */
export function detectInitialLanguage(): Language {
  // 1. Persisted preference — fastest path on subsequent visits.
  const stored = readStoredLanguage();
  if (stored) return stored;

  // 2. Browser language hint — take only the primary subtag (en-IN → en).
  if (typeof navigator !== "undefined" && navigator.language) {
    const primaryTag = navigator.language.split("-")[0]?.toLowerCase() ?? "";
    if (primaryTag && SUPPORTED_LANGUAGES.includes(primaryTag as Language)) {
      return primaryTag as Language;
    }
  }

  // 3. Hardcoded default.
  return DEFAULT_LANGUAGE;
}
