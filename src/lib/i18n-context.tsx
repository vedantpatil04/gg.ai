/**
 * GreenGuard AI — i18n: I18nProvider
 *
 * Two responsibilities:
 *
 *   1. INITIALIZE  — Importing `@/i18n` runs its module-level code, which
 *                    calls i18next.init() synchronously before React renders.
 *                    No loading screen, no flicker.
 *
 *   2. SYNC        — Once the user is authenticated, the provider fetches the
 *                    backend-persisted language preference and applies it if it
 *                    differs from the localStorage cache.  This handles the
 *                    "new device / new browser" case silently.
 *
 * Provider tree position (src/routes/__root.tsx):
 *   QueryClientProvider → ThemeProvider → AuthProvider
 *     → I18nProvider          ← here
 *       → CityProvider → TooltipProvider → Outlet
 *
 * Placed inside AuthProvider so it can call useAuth() to know when a user
 * is logged in and whose language preference to fetch.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Importing the i18n module triggers its synchronous initialization.
// This must remain a side-effect import — do not tree-shake it away.
import { i18n } from "@/i18n";

import { useAuth } from "@/lib/auth-context";
import { languageRegionApi } from "@/lib/api/language-region.api";
import { writeStoredLanguage } from "@/i18n/language-detector";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type Language,
} from "@/i18n/config";

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** Currently active BCP 47 language code. */
  language: Language;
  /**
   * Switch language immediately.
   * - Updates i18next (triggers re-render of all useTranslation consumers).
   * - Persists to localStorage via the `languageChanged` listener in index.ts.
   * - Updates `<html lang>` for screen readers.
   * - Does NOT call the backend — the Settings panel owns that responsibility.
   */
  changeLanguage: (lang: Language) => void;
  /**
   * True while the initial backend language reconciliation is in flight.
   * In practice the language is already set from localStorage before the
   * fetch completes, so no visible loading state is necessary.
   */
  isSyncing: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  language:       "en",
  changeLanguage: () => {},
  isSyncing:      false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  // Mirror i18next's language in React state so downstream consumers
  // re-render on language changes (i18next is not a React observable by itself).
  const [language, setLanguage] = useState<Language>(
    () => (i18n.language as Language) ?? "en",
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ── Keep React state in sync with i18next ──────────────────────────────────
  useEffect(() => {
    const handler = (lng: string) => {
      if (SUPPORTED_LANGUAGES.includes(lng as Language)) {
        setLanguage(lng as Language);
      }
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  // ── Backend reconciliation ─────────────────────────────────────────────────
  // Runs once after authentication resolves.  Fetches the server-persisted
  // language preference and applies it if it differs from the cached value.
  //
  // `languageRegionApi.get()` resolves to:
  //   { success: boolean; data: { languageRegion: LanguageRegionPreferences } }
  //
  // (The API already unwraps the Axios response via `.then((r) => r.data)`.)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsSyncing(true);

    languageRegionApi
      .get()
      .then((res) => {
        if (cancelled) return;

        const backendLang = res.data.languageRegion.language as string;

        // Only switch when the backend value is supported and differs from
        // the active language — avoids a redundant re-render + localStorage
        // write on every mount for users whose preference already matches.
        if (
          backendLang &&
          SUPPORTED_LANGUAGES.includes(backendLang as Language) &&
          backendLang !== i18n.language
        ) {
          void i18n.changeLanguage(backendLang);
          // writeStoredLanguage is also called by the languageChanged listener
          // in index.ts, but calling it here too is a safety net for race
          // conditions where the event fires before the listener is attached.
          writeStoredLanguage(backendLang as Language);
        }
      })
      .catch(() => {
        // Silently ignore — the localStorage language is already active and
        // the user can always correct it via Settings.
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const changeLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang);
    // The languageChanged listener in index.ts handles:
    //   writeStoredLanguage(lang) and document.documentElement.lang = lang
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, isSyncing }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Full context — language, changeLanguage, isSyncing. */
export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/** Just the active language code.
 *  @example const lang = useLanguage(); // "en" | "hi" | "kn" | "mr" */
export function useLanguage(): Language {
  return useContext(I18nContext).language;
}

/** Native + English display name for the active language.
 *  @example const { native } = useLanguageName(); // "हिन्दी" */
export function useLanguageName() {
  return LANGUAGE_NAMES[useLanguage()];
}
