/**
 * GreenGuard AI — i18n Phase 1: I18nProvider
 *
 * This provider has two jobs:
 *
 *   1. Initialize   — imports `@/i18n` (which runs synchronously at module
 *                     load time), so i18next is ready before this component
 *                     mounts. No loading state, no flicker.
 *
 *   2. Sync         — once the user is authenticated, fetches the backend-
 *                     persisted language preference and applies it if it
 *                     differs from the cached localStorage value. This ensures
 *                     a consistent experience across devices and browsers.
 *
 * PLACEMENT in the provider tree (see src/routes/__root.tsx):
 *   QueryClientProvider → ThemeProvider → AuthProvider → I18nProvider → ...
 *
 * WHY inside AuthProvider?
 *   The backend sync needs `useAuth()` to know when a user is logged in,
 *   and which user's preference to fetch. The synchronous language init
 *   (from localStorage) still runs immediately via the module import — auth
 *   state only gates the backend reconciliation step.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Importing the i18n module here triggers initialization (synchronous).
// Must be a side-effect import so tree-shaking doesn't remove it.
import { i18n } from "@/i18n";

import { useAuth } from "@/lib/auth-context";
import { languageRegionApi } from "@/lib/api/language-region.api";
import { writeStoredLanguage } from "@/i18n/language-detector";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type Language,
} from "@/i18n/config";

// ─── Context shape ────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** The currently active i18next language code. */
  language: Language;
  /** Programmatically switch language — updates i18next, localStorage, and
   *  the DOM `<html lang>` attribute. Does NOT call the backend (the Settings
   *  panel is responsible for persisting via the API). */
  changeLanguage: (lang: Language) => void;
  /** Whether the initial backend reconciliation is still in flight.
   *  UI code rarely needs this — the language is already set from localStorage
   *  before the fetch completes, so there is no visible loading state. */
  isSyncing: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  changeLanguage: () => {},
  isSyncing: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  // Mirror i18next's active language in React state so consumers re-render
  // when the language changes (i18next is not observable by React on its own).
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
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);

  // ── Backend reconciliation ─────────────────────────────────────────────────
  // Once auth resolves and the user is logged in, fetch their persisted
  // language preference and apply it if it differs from the local cache.
  // This handles the "new device" case: the user's saved preference wins
  // over the browser default.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsSyncing(true);

    languageRegionApi
      .get()
      .then((res) => {
        if (cancelled) return;
        const backendLang = res.data.languageRegion.language;

        // Only switch if the backend value is a supported language that
        // differs from what's already active — avoids an unnecessary re-render
        // and the accompanying localStorage write.
        if (
          backendLang &&
          SUPPORTED_LANGUAGES.includes(backendLang as Language) &&
          backendLang !== i18n.language
        ) {
          void i18n.changeLanguage(backendLang);
          // writeStoredLanguage is also called by the languageChanged listener
          // in src/i18n/index.ts, but we call it here too as a safety net in
          // case the event fires before the listener is registered.
          writeStoredLanguage(backendLang as Language);
        }
      })
      .catch(() => {
        // Silently ignore — the localStorage language is already applied and
        // the user can always change it via Settings.
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  // ── Public changeLanguage ──────────────────────────────────────────────────
  const changeLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang);
    // The languageChanged listener in index.ts handles writeStoredLanguage
    // and document.documentElement.lang updates.
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, isSyncing }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Primary hook — use in any component that needs to read or change the
 *  active language, or show a syncing indicator. */
export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/** Convenience hook — just the active language code.
 *  @example const lang = useLanguage(); // "en" | "hi" | "kn" | "mr" */
export function useLanguage(): Language {
  return useContext(I18nContext).language;
}

/** Returns the display metadata for the currently active language.
 *  @example const { native } = useLanguageName(); // "हिन्दी" */
export function useLanguageName() {
  const lang = useLanguage();
  return LANGUAGE_NAMES[lang];
}
