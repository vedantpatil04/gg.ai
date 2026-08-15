/**
 * GreenGuard AI — i18n: Core initialization
 *
 * This module is the entry point for `@/i18n`.
 * It initializes i18next synchronously using statically bundled JSON resources
 * so translations are ready before React's first render — zero flicker, no
 * Suspense boundary required anywhere in the tree.
 *
 * SSR (TanStack Start / Nitro):
 *   On the server, `detectInitialLanguage()` returns "en" because
 *   `localStorage` and `navigator` are guarded by `typeof window` checks.
 *   The server always renders in English; the client rehydrates with the
 *   correct language from localStorage before the first paint.
 *
 * Phase 2 lazy-loading upgrade path (no other files need to change):
 *   1. Remove the `resources` key and all static JSON imports below.
 *   2. Install `i18next-http-backend`.
 *   3. Add `.use(HttpBackend)` to the chain.
 *   4. Add `backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' }` to init.
 *   5. Move the JSON files from src/i18n/locales/ → public/locales/.
 *   6. Switch `useSuspense` back to `true` if you want Suspense loading states.
 */

// Augment i18next types first — must run before any t() call is type-checked.
import "./types";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectInitialLanguage, writeStoredLanguage } from "./language-detector";
import { FALLBACK_LANGUAGE, NAMESPACES, type Language } from "./config";

// ── English (source of truth) ─────────────────────────────────────────────────
import enCommon         from "./locales/en/common.json";
import enNavigation     from "./locales/en/navigation.json";
import enSettings       from "./locales/en/settings.json";
import enDashboard      from "./locales/en/dashboard.json";
import enAuthentication from "./locales/en/authentication.json";
import enCitizen        from "./locales/en/citizen.json";
import enAuthority      from "./locales/en/authority.json";
import enAdministrator  from "./locales/en/administrator.json";
import enErrors         from "./locales/en/errors.json";
import enValidation     from "./locales/en/validation.json";
import enNotifications  from "./locales/en/notifications.json";
import enForecast       from "./locales/en/forecast.json";
import enCopilot        from "./locales/en/copilot.json";
import enMap            from "./locales/en/map.json";
import enReports        from "./locales/en/reports.json";
import enSimulator      from "./locales/en/simulator.json";
import enSustainability from "./locales/en/sustainability.json";
import enProfile        from "./locales/en/profile.json";

// ── Hindi ─────────────────────────────────────────────────────────────────────
import hiCommon         from "./locales/hi/common.json";
import hiNavigation     from "./locales/hi/navigation.json";
import hiSettings       from "./locales/hi/settings.json";
import hiDashboard      from "./locales/hi/dashboard.json";
import hiAuthentication from "./locales/hi/authentication.json";
import hiCitizen        from "./locales/hi/citizen.json";
import hiAuthority      from "./locales/hi/authority.json";
import hiAdministrator  from "./locales/hi/administrator.json";
import hiErrors         from "./locales/hi/errors.json";
import hiValidation     from "./locales/hi/validation.json";
import hiNotifications  from "./locales/hi/notifications.json";
import hiForecast       from "./locales/hi/forecast.json";
import hiCopilot        from "./locales/hi/copilot.json";
import hiMap            from "./locales/hi/map.json";
import hiReports        from "./locales/hi/reports.json";
import hiSimulator      from "./locales/hi/simulator.json";
import hiSustainability from "./locales/hi/sustainability.json";
import hiProfile        from "./locales/hi/profile.json";

// ── Kannada ───────────────────────────────────────────────────────────────────
import knCommon         from "./locales/kn/common.json";
import knNavigation     from "./locales/kn/navigation.json";
import knSettings       from "./locales/kn/settings.json";
import knDashboard      from "./locales/kn/dashboard.json";
import knAuthentication from "./locales/kn/authentication.json";
import knCitizen        from "./locales/kn/citizen.json";
import knAuthority      from "./locales/kn/authority.json";
import knAdministrator  from "./locales/kn/administrator.json";
import knErrors         from "./locales/kn/errors.json";
import knValidation     from "./locales/kn/validation.json";
import knNotifications  from "./locales/kn/notifications.json";
import knForecast       from "./locales/kn/forecast.json";
import knCopilot        from "./locales/kn/copilot.json";
import knMap            from "./locales/kn/map.json";
import knReports        from "./locales/kn/reports.json";
import knSimulator      from "./locales/kn/simulator.json";
import knSustainability from "./locales/kn/sustainability.json";
import knProfile        from "./locales/kn/profile.json";

// ── Marathi ───────────────────────────────────────────────────────────────────
import mrCommon         from "./locales/mr/common.json";
import mrNavigation     from "./locales/mr/navigation.json";
import mrSettings       from "./locales/mr/settings.json";
import mrDashboard      from "./locales/mr/dashboard.json";
import mrAuthentication from "./locales/mr/authentication.json";
import mrCitizen        from "./locales/mr/citizen.json";
import mrAuthority      from "./locales/mr/authority.json";
import mrAdministrator  from "./locales/mr/administrator.json";
import mrErrors         from "./locales/mr/errors.json";
import mrValidation     from "./locales/mr/validation.json";
import mrNotifications  from "./locales/mr/notifications.json";
import mrForecast       from "./locales/mr/forecast.json";
import mrCopilot        from "./locales/mr/copilot.json";
import mrMap            from "./locales/mr/map.json";
import mrReports        from "./locales/mr/reports.json";
import mrSimulator      from "./locales/mr/simulator.json";
import mrSustainability from "./locales/mr/sustainability.json";
import mrProfile        from "./locales/mr/profile.json";

// ── Bundled resource map ──────────────────────────────────────────────────────
const resources = {
  en: {
    common: enCommon, navigation: enNavigation, settings: enSettings,
    dashboard: enDashboard, authentication: enAuthentication, citizen: enCitizen,
    authority: enAuthority, administrator: enAdministrator, errors: enErrors,
    validation: enValidation, notifications: enNotifications,
    forecast: enForecast, copilot: enCopilot, map: enMap, reports: enReports,
    simulator: enSimulator, sustainability: enSustainability, profile: enProfile,
  },
  hi: {
    common: hiCommon, navigation: hiNavigation, settings: hiSettings,
    dashboard: hiDashboard, authentication: hiAuthentication, citizen: hiCitizen,
    authority: hiAuthority, administrator: hiAdministrator, errors: hiErrors,
    validation: hiValidation, notifications: hiNotifications,
    forecast: hiForecast, copilot: hiCopilot, map: hiMap, reports: hiReports,
    simulator: hiSimulator, sustainability: hiSustainability, profile: hiProfile,
  },
  kn: {
    common: knCommon, navigation: knNavigation, settings: knSettings,
    dashboard: knDashboard, authentication: knAuthentication, citizen: knCitizen,
    authority: knAuthority, administrator: knAdministrator, errors: knErrors,
    validation: knValidation, notifications: knNotifications,
    forecast: knForecast, copilot: knCopilot, map: knMap, reports: knReports,
    simulator: knSimulator, sustainability: knSustainability, profile: knProfile,
  },
  mr: {
    common: mrCommon, navigation: mrNavigation, settings: mrSettings,
    dashboard: mrDashboard, authentication: mrAuthentication, citizen: mrCitizen,
    authority: mrAuthority, administrator: mrAdministrator, errors: mrErrors,
    validation: mrValidation, notifications: mrNotifications,
    forecast: mrForecast, copilot: mrCopilot, map: mrMap, reports: mrReports,
    simulator: mrSimulator, sustainability: mrSustainability, profile: mrProfile,
  },
} as const;

// ── Detect language synchronously before React mounts ─────────────────────────
// Returns "en" on the server (localStorage is unavailable), the stored
// preference on subsequent client visits, or the browser's primary language
// tag on the very first visit.
const initialLanguage = detectInitialLanguage();

// ── Initialize i18next ────────────────────────────────────────────────────────
// `initImmediate: false` forces synchronous initialization when resources are
// already bundled. Combined with `useSuspense: false`, components using
// `useTranslation` never suspend and never show a loading fallback.
void i18next
  .use(initReactI18next)
  .init({
    resources:   resources as any,
    lng:         initialLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
    ns:          [...NAMESPACES],
    defaultNS:   "common",

    interpolation: {
      // React escapes output by default — double-escaping breaks special chars.
      escapeValue: false,
    },

    react: {
      // Disable Suspense — translations load synchronously from the bundle,
      // so there is nothing to suspend on. No <Suspense> needed in the tree.
      useSuspense: false,
    },

    // Log missing translation keys to the console in development so
    // translators can spot gaps during Phase 2 without impacting production.
    missingKeyHandler: (function () {
      let devMode = false;
      try { devMode = import.meta.env.DEV === true; } catch { /* SSR */ }
      if (!devMode) return false;
      return (_lngs: readonly string[], ns: string, key: string) => {
        console.warn(`[i18n] Missing key "${ns}:${key}"`);
      };
    })(),
  });

// ── Side-effects on every language change ─────────────────────────────────────
i18next.on("languageChanged", (lng: string) => {
  // 1. Persist so the next page load restores the language synchronously.
  writeStoredLanguage(lng as Language);

  // 2. Keep <html lang="…"> in sync for screen readers and spell-check.
  //    Guarded: document is undefined during SSR.
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

// Apply the correct lang attribute immediately on the client if it differs
// from the SSR default ("en").  The check prevents a no-op write on first
// render when the language already matches.
if (typeof document !== "undefined" && initialLanguage !== "en") {
  document.documentElement.lang = initialLanguage;
}

// ── Exports ───────────────────────────────────────────────────────────────────
// Default export for `import i18n from "@/i18n"`.
// Named export  for `import { i18n } from "@/i18n"` (used by i18n-context).
export { i18next as i18n };
export default i18next;
