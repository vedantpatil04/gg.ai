/**
 * GreenGuard AI — i18n Phase 1: Initialization
 *
 * i18next is initialized here at module load time, synchronously, using
 * statically bundled resources — so translations are available before
 * React's first render, with zero flicker and no Suspense boundaries.
 *
 * PHASE 2 UPGRADE PATH (lazy loading):
 *   Remove the `resources` key and the static imports below.
 *   Install `i18next-http-backend` and add:
 *     .use(HttpBackend)
 *   plus backend config:
 *     backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' }
 *   Move the JSON files from src/i18n/locales/ → public/locales/ (or serve
 *   them from your CDN). The rest of the infrastructure stays the same.
 */

// Type augmentation must be imported first so i18next's `CustomTypeOptions`
// is extended before any call to `t()`.
import "./types";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectInitialLanguage, writeStoredLanguage } from "./language-detector";
import { FALLBACK_LANGUAGE, NAMESPACES, type Language } from "./config";

// ── English (source of truth) ─────────────────────────────────────────────────
import enCommon from "./locales/en/common.json";
import enNavigation from "./locales/en/navigation.json";
import enSettings from "./locales/en/settings.json";
import enDashboard from "./locales/en/dashboard.json";
import enAuthentication from "./locales/en/authentication.json";
import enCitizen from "./locales/en/citizen.json";
import enAuthority from "./locales/en/authority.json";
import enAdministrator from "./locales/en/administrator.json";
import enErrors from "./locales/en/errors.json";
import enValidation from "./locales/en/validation.json";
import enNotifications from "./locales/en/notifications.json";

// ── Hindi ─────────────────────────────────────────────────────────────────────
import hiCommon from "./locales/hi/common.json";
import hiNavigation from "./locales/hi/navigation.json";
import hiSettings from "./locales/hi/settings.json";
import hiDashboard from "./locales/hi/dashboard.json";
import hiAuthentication from "./locales/hi/authentication.json";
import hiCitizen from "./locales/hi/citizen.json";
import hiAuthority from "./locales/hi/authority.json";
import hiAdministrator from "./locales/hi/administrator.json";
import hiErrors from "./locales/hi/errors.json";
import hiValidation from "./locales/hi/validation.json";
import hiNotifications from "./locales/hi/notifications.json";

// ── Kannada ───────────────────────────────────────────────────────────────────
import knCommon from "./locales/kn/common.json";
import knNavigation from "./locales/kn/navigation.json";
import knSettings from "./locales/kn/settings.json";
import knDashboard from "./locales/kn/dashboard.json";
import knAuthentication from "./locales/kn/authentication.json";
import knCitizen from "./locales/kn/citizen.json";
import knAuthority from "./locales/kn/authority.json";
import knAdministrator from "./locales/kn/administrator.json";
import knErrors from "./locales/kn/errors.json";
import knValidation from "./locales/kn/validation.json";
import knNotifications from "./locales/kn/notifications.json";

// ── Marathi ───────────────────────────────────────────────────────────────────
import mrCommon from "./locales/mr/common.json";
import mrNavigation from "./locales/mr/navigation.json";
import mrSettings from "./locales/mr/settings.json";
import mrDashboard from "./locales/mr/dashboard.json";
import mrAuthentication from "./locales/mr/authentication.json";
import mrCitizen from "./locales/mr/citizen.json";
import mrAuthority from "./locales/mr/authority.json";
import mrAdministrator from "./locales/mr/administrator.json";
import mrErrors from "./locales/mr/errors.json";
import mrValidation from "./locales/mr/validation.json";
import mrNotifications from "./locales/mr/notifications.json";

// ── Resource bundle ───────────────────────────────────────────────────────────
const resources = {
  en: {
    common: enCommon, navigation: enNavigation, settings: enSettings,
    dashboard: enDashboard, authentication: enAuthentication, citizen: enCitizen,
    authority: enAuthority, administrator: enAdministrator, errors: enErrors,
    validation: enValidation, notifications: enNotifications,
  },
  hi: {
    common: hiCommon, navigation: hiNavigation, settings: hiSettings,
    dashboard: hiDashboard, authentication: hiAuthentication, citizen: hiCitizen,
    authority: hiAuthority, administrator: hiAdministrator, errors: hiErrors,
    validation: hiValidation, notifications: hiNotifications,
  },
  kn: {
    common: knCommon, navigation: knNavigation, settings: knSettings,
    dashboard: knDashboard, authentication: knAuthentication, citizen: knCitizen,
    authority: knAuthority, administrator: knAdministrator, errors: knErrors,
    validation: knValidation, notifications: knNotifications,
  },
  mr: {
    common: mrCommon, navigation: mrNavigation, settings: mrSettings,
    dashboard: mrDashboard, authentication: mrAuthentication, citizen: mrCitizen,
    authority: mrAuthority, administrator: mrAdministrator, errors: mrErrors,
    validation: mrValidation, notifications: mrNotifications,
  },
} as const;

// ── Detect initial language before first render ───────────────────────────────
const initialLanguage = detectInitialLanguage();

// ── Initialize i18next ────────────────────────────────────────────────────────
// `initImmediate: false` forces synchronous initialization when resources
// are already bundled — no async, no Suspense, no flash of untranslated UI.
void i18next.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: FALLBACK_LANGUAGE,
  ns: [...NAMESPACES],
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    // Disable Suspense integration — translations load synchronously so
    // there is nothing to suspend on. Components work without any
    // <Suspense> boundary in the tree.
    useSuspense: false,
  },
  // Silence missing-key warnings in production; log them in development
  // so translators can find gaps during Phase 2.
  missingKeyHandler:
    import.meta.env.DEV
      ? (lngs, ns, key) => {
          console.warn(`[i18n] Missing key: ${ns}:${key} for lang(s): ${lngs.join(", ")}`);
        }
      : false,
  initImmediate: false,
});

// ── Side effects on language change ──────────────────────────────────────────
i18next.on("languageChanged", (lng: string) => {
  // 1. Persist so the next page load restores the language synchronously.
  writeStoredLanguage(lng as Language);

  // 2. Keep <html lang="..."> in sync for screen readers and browser features.
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

// Apply lang to the document for the initial language too (SSR sets lang="en").
if (typeof document !== "undefined" && initialLanguage !== "en") {
  document.documentElement.lang = initialLanguage;
}

export default i18next;

// Named export for explicit imports: `import { i18n } from "@/i18n"`.
export { i18next as i18n };
